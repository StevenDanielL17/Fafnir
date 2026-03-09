/**
 * LANGCHAIN AGENT SERVICE
 *
 * Single Responsibility: LLM-powered agent for Fafnir.
 *   - Wraps OpenAI via LangChain
 *   - Provides Hedera Agent Kit tools to the LLM
 *   - Handles conversational queries (balance, history, rule changes)
 *
 * Low Coupling:
 *   This service owns the LLM interaction.
 *   agentService calls langchainAgent for smart parsing/decisions.
 *   If we swap OpenAI for Claude, ONLY this file changes.
 */

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const {
  HederaLangchainToolkit,
  coreAccountPlugin,
  coreConsensusPlugin,
  coreTokenPlugin,
} = require('hedera-agent-kit');
const { Client } = require('@hashgraph/sdk');

let chatModel = null;
let hederaToolkit = null;

// ── INITIALIZATION ─────────────────────────────────────

/**
 * Initialize the LangChain ChatOpenAI model.
 * Called once at startup (after env is loaded).
 */
function initialize() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn(
      '  ⚠ OPENAI_API_KEY not set. LLM features will use fallback keyword parser.'
    );
    return false;
  }

  chatModel = new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: 'gpt-4o-mini',
    temperature: 0.2, // Low temp for deterministic financial parsing
    maxTokens: 1024,
  });

  // Initialize Hedera Agent Kit toolkit with LangChain
  try {
    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
    const network = process.env.HEDERA_NETWORK || 'testnet';

    let client;
    if (network === 'testnet') {
      client = Client.forTestnet();
    } else if (network === 'mainnet') {
      client = Client.forMainnet();
    } else {
      client = Client.forPreviewnet();
    }
    client.setOperator(operatorId, operatorKey);

    hederaToolkit = new HederaLangchainToolkit({
      client,
      configuration: {
        plugins: [coreAccountPlugin, coreConsensusPlugin, coreTokenPlugin],
        context: {
          operatorId,
        },
      },
    });

    console.log(
      `  LangChain + Hedera Agent Kit initialized (${hederaToolkit.getTools().length} tools loaded)`
    );
  } catch (err) {
    console.warn('  ⚠ Hedera Agent Kit LangChain tools failed to load:', err.message);
    console.warn('  Agent will run with LLM parsing only (no autonomous tool calls).');
    hederaToolkit = null;
  }

  console.log('  LangChain OpenAI model initialized (gpt-4o-mini)');
  return true;
}

/**
 * Check whether the LLM is available.
 */
function isAvailable() {
  return chatModel !== null;
}

/**
 * Get the Hedera Agent Kit tools for LangChain.
 */
function getHederaTools() {
  return hederaToolkit ? hederaToolkit.getTools() : [];
}

// ── INTENT PARSING (LLM) ──────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are Fafnir, an AI personal finance agent. Your job is to parse a user's natural language savings goal into a structured rule object.

Extract the following fields from the user's input:
- description: the original text (string)
- triggerType: one of "spending_category", "scheduled", "manual" (string)
- triggerValue: the category name (e.g. "food", "coffee") or schedule (e.g. "daily", "weekly", "monthly", "every_48h") or null for manual (string or null)
- amount: the dollar amount per save action (number)
- maxPerTransaction: max dollars per single action, defaults to amount (number)
- monthlyMax: max dollars per month, defaults to amount * 30 (number)
- isActive: always true for new rules (boolean)

Respond with ONLY valid JSON. No markdown, no explanation. Example:
{"description":"Save $5 whenever I spend on food, max $30/month","triggerType":"spending_category","triggerValue":"food","amount":5,"maxPerTransaction":5,"monthlyMax":30,"isActive":true}`;

/**
 * Parse a natural language goal into a rule object using the LLM.
 *
 * @param {string} goalText - e.g. "Save $5 whenever I spend on food, max $30/month"
 * @returns {object} Parsed rule object
 */
async function parseGoalWithLLM(goalText) {
  if (!chatModel) {
    return null; // Caller should fall back to keyword parser
  }

  try {
    const response = await chatModel.invoke([
      new SystemMessage(PARSE_SYSTEM_PROMPT),
      new HumanMessage(goalText),
    ]);

    const content = response.content.trim();
    // Strip markdown code fences if present
    const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    const parsed = JSON.parse(jsonStr);

    // Validate required fields and apply defaults
    return {
      description: parsed.description || goalText,
      triggerType: parsed.triggerType || 'manual',
      triggerValue: parsed.triggerValue || null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : 5,
      maxPerTransaction:
        typeof parsed.maxPerTransaction === 'number'
          ? parsed.maxPerTransaction
          : parsed.amount || 5,
      monthlyMax:
        typeof parsed.monthlyMax === 'number'
          ? parsed.monthlyMax
          : (parsed.amount || 5) * 30,
      isActive: true,
    };
  } catch (err) {
    console.error('  LLM parseGoal error:', err.message);
    return null; // Caller falls back to keyword parser
  }
}

// ── RULE EVALUATION (LLM) ─────────────────────────────

const EVALUATE_SYSTEM_PROMPT = `You are Fafnir, an AI personal finance agent. Decide whether a savings rule should fire right now.

You will receive:
- rule: the user's savings rule (JSON)
- context: the user's financial context (balance, monthly spent, etc.)

Analyze the rule conditions against the context. Respond with ONLY valid JSON:
{"shouldExecute": true/false, "amount": <number>, "reasoning": "<one sentence explanation>"}

Rules:
- Never exceed monthlyMax (monthly spent + amount must be <= monthlyMax)
- Never exceed maxPerTransaction
- Don't save if balance is too low (need at least the save amount)
- For scheduled triggers, assume it's time to execute if the scheduler is calling
- Be conservative: when in doubt, don't execute`;

/**
 * Use LLM to decide if a rule should fire.
 *
 * @param {object} rule - The savings rule
 * @param {object} context - { balance, monthlySpent }
 * @returns {{ shouldExecute: boolean, amount: number, reasoning: string }}
 */
async function evaluateRuleWithLLM(rule, context) {
  if (!chatModel) {
    return null; // Caller falls back to simple evaluator
  }

  try {
    const response = await chatModel.invoke([
      new SystemMessage(EVALUATE_SYSTEM_PROMPT),
      new HumanMessage(
        JSON.stringify({ rule, context }, null, 2)
      ),
    ]);

    const content = response.content.trim();
    const jsonStr = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    const decision = JSON.parse(jsonStr);

    return {
      shouldExecute: Boolean(decision.shouldExecute),
      amount: typeof decision.amount === 'number' ? decision.amount : 0,
      reasoning: decision.reasoning || 'LLM decision',
    };
  } catch (err) {
    console.error('  LLM evaluateRule error:', err.message);
    return null; // Caller falls back
  }
}

// ── CONVERSATIONAL CHAT ────────────────────────────────

const CHAT_SYSTEM_PROMPT = `You are Fafnir, a friendly AI personal finance assistant built on Hedera. You help users manage their micro-savings.

You can:
- Answer questions about savings progress (totals, recent actions)
- Explain what you've been doing on their behalf
- Help them create, modify, or pause savings rules
- Provide encouragement and financial tips

Context about the user will be provided. Keep responses concise, warm, and actionable. Use plain English — never mention blockchain, Hedera, HCS, HTS, or crypto terminology to the user. They just see a smart savings assistant.

If the user wants to create a new goal, respond with a confirmation message AND include a JSON block at the end tagged with [GOAL_JSON]: followed by the goal text to parse.

If the user wants to pause a rule, include [PAUSE_RULE]: followed by a keyword or description.
If the user wants to resume a rule, include [RESUME_RULE]: followed by a keyword or description.
If the user wants to change a limit/amount, include [UPDATE_RULE]: followed by JSON {"field": "amount|monthlyMax|maxPerTransaction", "value": <number>, "keyword": "<rule description keyword>"}.`;

/**
 * Chat with the user using LLM + their financial context.
 *
 * @param {string} userMessage - What the user typed
 * @param {object} userContext - { totalSaved, monthlyTotal, recentTransactions, activeRules, notifications }
 * @returns {{ reply: string, action: object|null }}
 */
async function chat(userMessage, userContext) {
  if (!chatModel) {
    return {
      reply: "I'm running in basic mode right now. You can still create goals by typing something like: \"Save $5 whenever I spend on food\"",
      action: null,
    };
  }

  try {
    const contextSummary = buildContextSummary(userContext);

    const response = await chatModel.invoke([
      new SystemMessage(CHAT_SYSTEM_PROMPT),
      new SystemMessage(`Current user context:\n${contextSummary}`),
      new HumanMessage(userMessage),
    ]);

    const content = response.content.trim();
    const action = extractAction(content);
    const reply = cleanReply(content);

    return { reply, action };
  } catch (err) {
    console.error('  LLM chat error:', err.message);
    return {
      reply: "Sorry, I had a brief hiccup. Could you try again?",
      action: null,
    };
  }
}

// ── HELPERS ────────────────────────────────────────────

function buildContextSummary(ctx) {
  const lines = [];

  if (ctx.totalSaved !== undefined) {
    lines.push(`Total saved all-time: $${ctx.totalSaved.toFixed(2)}`);
  }
  if (ctx.monthlyTotal !== undefined) {
    lines.push(`Saved this month: $${ctx.monthlyTotal.toFixed(2)}`);
  }
  if (ctx.balance !== undefined) {
    lines.push(`Current balance: ${ctx.balance} HBAR`);
  }

  if (ctx.activeRules && ctx.activeRules.length > 0) {
    lines.push(`\nActive rules:`);
    ctx.activeRules.forEach((r, i) => {
      lines.push(
        `  ${i + 1}. "${r.description}" — $${r.amount} per action, $${r.monthlyMax}/month max [${r.isActive ? 'active' : 'paused'}]`
      );
    });
  } else {
    lines.push('No active savings rules yet.');
  }

  if (ctx.recentTransactions && ctx.recentTransactions.length > 0) {
    lines.push(`\nRecent actions:`);
    ctx.recentTransactions.slice(0, 5).forEach((tx) => {
      lines.push(
        `  - ${tx.action}: $${tx.amount} (${tx.reasoning}) at ${tx.createdAt}`
      );
    });
  } else {
    lines.push('No recent transactions.');
  }

  return lines.join('\n');
}

/**
 * Extract structured actions from LLM response (goal creation, pause, etc.)
 */
function extractAction(content) {
  // Check for goal creation
  const goalMatch = content.match(/\[GOAL_JSON\]:\s*(.+)/);
  if (goalMatch) {
    return { type: 'create_goal', goalText: goalMatch[1].trim() };
  }

  // Check for pause
  const pauseMatch = content.match(/\[PAUSE_RULE\]:\s*(.+)/);
  if (pauseMatch) {
    return { type: 'pause_rule', keyword: pauseMatch[1].trim() };
  }

  // Check for resume
  const resumeMatch = content.match(/\[RESUME_RULE\]:\s*(.+)/);
  if (resumeMatch) {
    return { type: 'resume_rule', keyword: resumeMatch[1].trim() };
  }

  // Check for update
  const updateMatch = content.match(/\[UPDATE_RULE\]:\s*(.+)/);
  if (updateMatch) {
    try {
      const update = JSON.parse(updateMatch[1].trim());
      return { type: 'update_rule', ...update };
    } catch {
      // Ignore parse error
    }
  }

  return null;
}

/**
 * Remove action tags from the user-facing reply.
 */
function cleanReply(content) {
  return content
    .replace(/\[GOAL_JSON\]:.*/g, '')
    .replace(/\[PAUSE_RULE\]:.*/g, '')
    .replace(/\[RESUME_RULE\]:.*/g, '')
    .replace(/\[UPDATE_RULE\]:.*/g, '')
    .trim();
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  initialize,
  isAvailable,
  getHederaTools,
  parseGoalWithLLM,
  evaluateRuleWithLLM,
  chat,
};

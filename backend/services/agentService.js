/**
 * AGENT SERVICE
 * 
 * Single Responsibility: Decision-making engine.
 *   - Parse natural language goals into rule objects
 *   - Evaluate whether rules should fire given current context
 *   - Orchestrate execution by calling OTHER services (never Hedera directly)
 * 
 * Low Coupling:
 *   agentService → hederaService  (for on-chain execution)
 *   agentService → notificationService  (for user messages)
 *   agentService → langchainAgent  (for LLM-powered parsing/decisions)
 *   agentService NEVER imports @hashgraph/sdk directly
 * 
 * Week 2 upgrade: LLM-first with keyword fallback.
 */

const hederaService = require('./hederaService');
const notificationService = require('./notificationService');
const langchainAgent = require('./langchainAgent');
const transactionModel = require('../models/transaction');

const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const INTENT_PATTERNS = {
  create_rule: [
    /add.*rule/i,
    /new.*rule/i,
    /create.*rule/i,
    /start.*sav/i,
    /set.*sav/i,
    /save\s*\$/i,
    /save.*when/i,
    /save.*every/i,
    /save.*whenever/i,
    /save.*max/i,
    /i want to save/i,
  ],
  check_balance: [
    /how much/i,
    /what.*saved/i,
    /my.*balance/i,
    /total.*saved/i,
    /savings.*so far/i,
  ],
  pause_rule: [
    /pause/i,
    /stop.*sav/i,
    /disable/i,
  ],
  resume_rule: [
    /resume/i,
    /start.*again/i,
    /re-?enable/i,
    /turn on/i,
  ],
  show_history: [
    /history/i,
    /what.*did you/i,
    /show.*transactions/i,
  ],
};

function detectIntent(message = '') {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(message))) {
      return intent;
    }
  }
  return 'general_chat';
}

async function callLLMWithRetry(model, messages, retries = 2) {
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS || 10000);

  for (let i = 0; i <= retries; i += 1) {
    try {
      const llmCall = model.invoke(messages);
      const timeoutCall = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`LLM timeout after ${timeoutMs}ms`)), timeoutMs);
      });
      return await Promise.race([llmCall, timeoutCall]);
    } catch (err) {
      const errText = String(err && (err.message || err)).toLowerCase();
      const isAuthFailure =
        errText.includes('401') ||
        errText.includes('authentication') ||
        errText.includes('model_authentication') ||
        errText.includes('invalid_api_key') ||
        errText.includes('insufficient_quota');

      if (isAuthFailure) {
        throw err;
      }

      const isLastAttempt = i === retries;
      console.error(`LLM attempt ${i + 1} failed: ${err.message}`);
      if (isLastAttempt) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('LLM retry loop ended unexpectedly');
}

// ── INTENT PARSING ─────────────────────────────────────

/**
 * Parse a plain English goal into a structured rule object.
 * Week 2: LLM-powered via LangChain, with keyword fallback.
 * 
 * @param {string} goalText - e.g. "Save $5 whenever I spend on food, max $30/month"
 * @returns {object} Parsed rule object
 */
async function parseGoal(goalText) {
  // Try LLM first (Week 2 upgrade)
  if (langchainAgent.isAvailable()) {
    const llmResult = await langchainAgent.parseGoalWithLLM(goalText);
    if (llmResult) {
      console.log('  ✓ Goal parsed via LLM');
      return llmResult;
    }
  }

  // Fallback: keyword-based parser (Week 1 logic preserved)
  console.log('  ↩ Using keyword fallback parser');
  return parseGoalKeyword(goalText);
}

/**
 * Keyword-based parser (original Week 1 logic — kept as fallback).
 */
function parseGoalKeyword(goalText) {
  const text = goalText.toLowerCase();

  // Extract amount (e.g. "$5" → 5)
  const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 5.0;

  // Extract monthly max (e.g. "max $30" or "maximum $30")
  const maxMatch = text.match(/max(?:imum)?\s*\$(\d+(?:\.\d{2})?)/);
  const monthlyMax = maxMatch ? parseFloat(maxMatch[1]) : null;

  // Extract per-transaction max (e.g. "never more than $5")
  const perTxMatch = text.match(/never more than \$(\d+(?:\.\d{2})?)/);
  const maxPerTransaction = perTxMatch ? parseFloat(perTxMatch[1]) : amount;

  // Detect trigger type
  let triggerType = 'manual';
  let triggerValue = null;

  const categories = ['food', 'coffee', 'transport', 'shopping', 'entertainment', 'dining'];
  for (const cat of categories) {
    if (text.includes(cat)) {
      triggerType = 'spending_category';
      triggerValue = cat;
      break;
    }
  }

  if (text.includes('every week') || text.includes('weekly') || text.includes('end of week')) {
    triggerType = 'scheduled';
    triggerValue = 'weekly';
  } else if (text.includes('every day') || text.includes('daily')) {
    triggerType = 'scheduled';
    triggerValue = 'daily';
  } else if (text.includes('every month') || text.includes('monthly')) {
    triggerType = 'scheduled';
    triggerValue = 'monthly';
  } else if (text.match(/every\s+(\d+)\s*hours?/)) {
    triggerType = 'scheduled';
    triggerValue = `every_${text.match(/every\s+(\d+)\s*hours?/)[1]}h`;
  }

  return {
    description: goalText,
    triggerType,
    triggerValue,
    amount,
    maxPerTransaction: maxPerTransaction || amount,
    monthlyMax: monthlyMax || amount * 30, // Default: 30x per month
    isActive: true,
  };
}

// ── RULE EVALUATION ────────────────────────────────────

/**
 * Decide whether a rule should fire given current context.
 * Week 2: LLM-powered reasoning with simple fallback.
 * 
 * @param {object} rule - The saved rule object
 * @param {object} context - User's financial context (balance, monthly spent, etc.)
 * @returns {{ shouldExecute: boolean, amount: number, reasoning: string }}
 */
async function evaluateRule(rule, context) {
  // Try LLM first (Week 2 upgrade)
  if (langchainAgent.isAvailable()) {
    const llmResult = await langchainAgent.evaluateRuleWithLLM(rule, context);
    if (llmResult) {
      console.log(`  ✓ Rule evaluated via LLM: ${llmResult.reasoning}`);
      return llmResult;
    }
  }

  // Fallback: simple condition check
  return evaluateRuleFallback(rule, context);
}

/**
 * Simple condition-based rule evaluator (Week 1 logic — kept as fallback).
 */
function evaluateRuleFallback(rule, context) {
  // Don't execute if rule is paused
  if (!rule.isActive) {
    return { shouldExecute: false, amount: 0, reasoning: 'Rule is paused' };
  }

  // Don't exceed monthly cap
  const monthlySpent = context.monthlySpent || 0;
  if (rule.monthlyMax && monthlySpent + rule.amount > rule.monthlyMax) {
    return {
      shouldExecute: false,
      amount: 0,
      reasoning: `Monthly cap reached ($${monthlySpent}/$${rule.monthlyMax})`,
    };
  }

  // Don't exceed balance
  const balance = context.balance || 0;
  if (balance < rule.amount) {
    return {
      shouldExecute: false,
      amount: 0,
      reasoning: `Insufficient balance ($${balance})`,
    };
  }

  // Check per-transaction limit
  const amount = Math.min(rule.amount, rule.maxPerTransaction);

  return {
    shouldExecute: true,
    amount,
    reasoning: `Rule "${rule.description}" triggered. Saving $${amount}.`,
  };
}

// ── AGENT EXECUTION CYCLE ──────────────────────────────

/**
 * Run one full agent cycle for a user.
 * Called by the scheduler every 15 minutes.
 * 
 * THIS is the core loop. It coordinates services but
 * never does Hedera or notification work itself.
 * 
 * @param {object} user - { id, email, hederaAccountId, hcsTopicId }
 * @param {Array} rules - User's active rules
 */
async function runCycle(user, rules) {
  // Get user's current financial context
  const balance = await hederaService.getBalance(user.hederaAccountId);
  const monthlySpent = transactionModel.getMonthlyTotal(user.id);
  const context = {
    balance,
    monthlySpent,
  };

  for (const rule of rules) {
    const decision = await evaluateRule(rule, context);

    if (decision.shouldExecute) {
      try {
        // Execute on-chain (via hederaService — never directly)
        const result = await hederaService.transferHbar(
          user.hederaAccountId,
          process.env.HEDERA_OPERATOR_ID, // Savings vault (operator for now)
          decision.amount
        );

        // Log immutably to HCS (via hederaService)
        const hcsResult = await hederaService.submitLog(user.hcsTopicId, {
          action: 'SAVE',
          amount: decision.amount,
          ruleId: rule.id,
          reasoning: decision.reasoning,
          transactionId: result.transactionId,
        });

        // Record transaction locally (mirrors HCS for fast queries)
        transactionModel.create({
          userId: user.id,
          ruleId: rule.id,
          action: 'SAVE',
          amount: decision.amount,
          hcsSequenceNumber: hcsResult.sequenceNumber,
          reasoning: decision.reasoning,
          transactionId: result.transactionId,
        });

        // Notify user (via notificationService — never directly)
        await notificationService.send(user.id, {
          type: 'save_executed',
          message: `Saved $${decision.amount} today. Reason: ${decision.reasoning}`,
        });

        console.log(`  Agent: Saved $${decision.amount} for user ${user.email}`);
      } catch (err) {
        console.error(`  Agent error for user ${user.email}:`, err.message);

        // Log the failure to HCS
        if (user.hcsTopicId) {
          await hederaService.submitLog(user.hcsTopicId, {
            action: 'SAVE_FAILED',
            amount: decision.amount,
            ruleId: rule.id,
            error: err.message,
          });
        }

        // Record failed transaction locally
        transactionModel.create({
          userId: user.id,
          ruleId: rule.id,
          action: 'SAVE_FAILED',
          amount: decision.amount,
          reasoning: err.message,
        });
      }
    }
  }
}

// ── SPEC-COMPLIANT FUNCTIONS (Tasks 2) ─────────────────

const PARSE_GOAL_SYSTEM = `You are a rule parser for a savings app. 
Extract saving rules from user messages.
Return ONLY valid JSON. No markdown. No explanation. No backticks.
Use this exact format:
{
  "trigger_type": "scheduled" or "spending_category",
  "trigger_value": "daily" or "weekly" or "food" or "transport" etc,
  "amount": number (how much to save each time),
  "max_per_transaction": number (same as amount if not specified),
  "monthly_max": number (amount * 10 if not specified),
  "description": "plain english summary of the rule"
}
If the user mentions a category like food/transport/shopping, 
use trigger_type: spending_category.
If they say daily/weekly/every day, use trigger_type: scheduled.`;

const CHAT_SYSTEM = `You are Fafnir, a personal savings agent. 
You help users save money automatically.
Rules you must follow:
- Never mention crypto, blockchain, HBAR, or wallets
- Always say "savings account" not "wallet"  
- Always say "saved" not "transferred"
- Be concise — max 2 sentences per reply
- When user sets a goal, confirm it clearly
- When asked about savings, give specific numbers
- You have access to the user's current context below`;

/**
 * Parse a user message into a structured savings rule using OpenAI.
 * 
 * @param {string} userMessage - e.g. "Save $5 whenever I eat out, max $30 a month"
 * @returns {object} Parsed rule object with trigger_type, amount, etc.
 */
async function parseGoalToRule(userMessage) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback to keyword parser
    return parseGoalKeyword(userMessage);
  }

  try {
    const model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
      maxTokens: 512,
      maxRetries: 0,
      ...(process.env.OPENAI_BASE_URL ? { configuration: { baseURL: process.env.OPENAI_BASE_URL } } : {}),
    });

    const response = await callLLMWithRetry(model, [
      new SystemMessage(PARSE_GOAL_SYSTEM),
      new HumanMessage(userMessage),
    ]);

    let content = response.content.trim();
    // Strip markdown code fences if present
    content = content.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '');
    const parsed = JSON.parse(content);

    return {
      trigger_type: parsed.trigger_type || 'scheduled',
      trigger_value: parsed.trigger_value || 'daily',
      amount: typeof parsed.amount === 'number' ? parsed.amount : 5,
      max_per_transaction: typeof parsed.max_per_transaction === 'number'
        ? parsed.max_per_transaction : (parsed.amount || 5),
      monthly_max: typeof parsed.monthly_max === 'number'
        ? parsed.monthly_max : (parsed.amount || 5) * 10,
      description: parsed.description || userMessage,
    };
  } catch (err) {
    console.error('  parseGoalToRule LLM error:', err.message);
    // Fallback to keyword parser
    return parseGoalKeyword(userMessage);
  }
}

function formatCurrency(value) {
  return Number(value || 0).toFixed(2);
}

function buildRuleFallback(rule, message) {
  const amount = Number(rule.amount || 0);
  const monthlyMax = Number(rule.monthly_max || rule.monthlyMax || amount * 10);
  const triggerValue = rule.trigger_value || rule.triggerValue || 'the trigger fires';

  return {
    trigger_type: rule.trigger_type || rule.triggerType || 'scheduled',
    trigger_value: triggerValue,
    amount,
    max_per_transaction: Number(rule.max_per_transaction || rule.maxPerTransaction || amount),
    monthly_max: monthlyMax,
    description: rule.description || message,
  };
}

async function handleRuleCreation(message, userContext) {
  const amountMatches = message.match(/\$?(\d+(?:\.\d+)?)/g);
  const hasAmount = Boolean(amountMatches && amountMatches.length > 0);

  if (!hasAmount) {
    return {
      reply: "Sure, I can set that up. How much should I save each time, and what's your monthly maximum? For example: '$5 per save, max $30/month'",
      action: 'awaiting_rule_details',
      rule: null,
    };
  }

  const parsed = await parseGoalToRule(message);

  if (!parsed.amount || parsed.amount <= 0) {
    return {
      reply: "I couldn't figure out the amount. How much should I save per trigger?",
      action: 'awaiting_rule_details',
      rule: null,
    };
  }

  const normalizedRule = buildRuleFallback(parsed, message);
  const triggerText = normalizedRule.trigger_value || 'the condition is met';

  return {
    reply: `Got it. I'll save $${formatCurrency(normalizedRule.amount)} each time ${triggerText}, up to $${formatCurrency(normalizedRule.monthly_max)}/month. Creating rule now...`,
    action: 'create_rule',
    rule: normalizedRule,
  };
}

function handleBalanceQuery(userContext) {
  const totalSaved = formatCurrency(userContext.totalSaved || 0);
  const monthSaved = formatCurrency(userContext.monthSaved || 0);
  const activeRules = (userContext.activeRules || []).length;

  return {
    reply: `You've saved $${totalSaved} total and $${monthSaved} this month. You currently have ${activeRules} active rule${activeRules === 1 ? '' : 's'}.`,
    action: 'balance_summary',
  };
}

function handlePauseIntent(userContext) {
  const activeRules = (userContext.activeRules || []).length;
  if (activeRules === 0) {
    return {
      reply: 'You do not have any active rules right now. Say "create a new rule" and I can help set one up.',
      action: 'pause_rule',
    };
  }

  return {
    reply: 'I can pause a rule for you. Tell me which one by name, for example: "pause my food savings rule".',
    action: 'pause_rule',
  };
}

function handleResumeIntent(userContext) {
  const activeRules = userContext.activeRules || [];
  if (activeRules.length === 0) {
    return {
      reply: 'Which rule should I resume? Say the rule name or say "resume all".',
      action: 'awaiting_resume_target',
    };
  }

  return {
    reply: 'Tell me which paused rule to resume by name, or say "resume all" if you want everything running again.',
    action: 'awaiting_resume_target',
  };
}

function handleHistoryIntent(userContext) {
  const recent = userContext.recentTransactions || [];
  if (recent.length === 0) {
    return {
      reply: 'No transactions yet. Once a rule executes, your savings history will show up here.',
      action: 'show_history',
    };
  }

  const summary = recent
    .slice(0, 3)
    .map((tx) => `$${formatCurrency(tx.amount)} (${tx.action})`)
    .join(', ');

  return {
    reply: `Your latest savings activity: ${summary}.`,
    action: 'show_history',
  };
}

async function handleGeneralChat(message, history, userContext, model) {
  let activeModel = model;
  if (!activeModel) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        reply: "I'm running in basic mode right now. You can still create goals by typing something like: \"Save $5 whenever I spend on food\"",
        action: 'general_chat',
      };
    }

    activeModel = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 512,
      maxRetries: 0,
      ...(process.env.OPENAI_BASE_URL ? { configuration: { baseURL: process.env.OPENAI_BASE_URL } } : {}),
    });
  }

  const contextStr = [
    `Total saved all-time: $${formatCurrency(userContext.totalSaved || 0)}`,
    `Saved this month: $${formatCurrency(userContext.monthSaved || 0)}`,
    `Active rules: ${(userContext.activeRules || []).length}`,
    ...(userContext.activeRules || []).map(
      (r, i) => `  ${i + 1}. "${r.description}" - $${r.amount}/save, $${r.monthlyMax}/month`
    ),
    `Recent transactions: ${(userContext.recentTransactions || []).length}`,
  ].join('\n');

  const messages = [
    new SystemMessage(CHAT_SYSTEM),
    new SystemMessage(`Current user context:\n${contextStr}`),
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new SystemMessage(m.content)
    ),
    new HumanMessage(message),
  ];

  try {
    const response = await callLLMWithRetry(activeModel, messages);
    return {
      reply: response.content.trim(),
      action: 'general_chat',
    };
  } catch (err) {
    console.error('  handleGeneralChat LLM error:', err.message);
    return {
      reply: buildChatFallback(userContext),
      action: 'general_chat',
    };
  }
}

async function handleChat(message, history = [], userContext = {}, model) {
  const intent = detectIntent(message);
  console.log(`[Agent] Intent detected: ${intent} for message: "${message}"`);

  switch (intent) {
    case 'create_rule':
      return handleRuleCreation(message, userContext);
    case 'check_balance':
      return handleBalanceQuery(userContext);
    case 'pause_rule':
      return handlePauseIntent(userContext);
    case 'resume_rule':
      return handleResumeIntent(userContext);
    case 'show_history':
      return handleHistoryIntent(userContext);
    default:
      return handleGeneralChat(message, history, userContext, model);
  }
}

function buildChatFallback(userContext = {}) {
  const activeRuleCount = (userContext.activeRules || []).length;
  if (activeRuleCount === 0) {
    return "I'm having trouble connecting right now. When I'm back, try: 'Save $5 on food, max $30/month'.";
  }
  return `I'm having trouble right now. Your ${activeRuleCount} active rule${activeRuleCount === 1 ? '' : 's'} are still running fine.`;
}

/**
 * Chat with Fafnir using OpenAI, context-aware.
 * 
 * @param {string} userMessage 
 * @param {Array<{role: string, content: string}>} conversationHistory 
 * @param {{ totalSaved: number, monthSaved: number, activeRules: any[], recentTransactions: any[] }} userContext
 * @returns {string} Agent reply text
 */
async function chatWithFafnir(userMessage, conversationHistory = [], userContext = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "I'm running in basic mode right now. You can still create goals by typing something like: \"Save $5 whenever I spend on food\"";
  }

  try {
    const model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 512,
      maxRetries: 0,
      ...(process.env.OPENAI_BASE_URL ? { configuration: { baseURL: process.env.OPENAI_BASE_URL } } : {}),
    });

    const result = await handleChat(userMessage, conversationHistory, userContext, model);
    return result.reply;
  } catch (err) {
    console.error('  chatWithFafnir error:', err.message);
    return buildChatFallback(userContext);
  }
}

/**
 * Pure logic: decide if a rule should execute given context.
 * No LLM needed.
 * 
 * @param {object} rule 
 * @param {{ monthlyTotal: number, lastTrigger: Date|null }} context 
 * @returns {{ execute: boolean, reason: string }}
 */
function shouldRuleExecute(rule, context) {
  // Monthly limit check
  if (context.monthlyTotal >= (rule.monthly_max || rule.monthlyMax)) {
    return { execute: false, reason: 'Monthly limit reached' };
  }

  const lastTrigger = context.lastTrigger ? new Date(context.lastTrigger) : null;

  if (lastTrigger) {
    const hoursSince = (Date.now() - lastTrigger.getTime()) / (1000 * 60 * 60);
    const trigType = rule.trigger_type || rule.triggerType;
    const trigVal = rule.trigger_value || rule.triggerValue;

    if (trigType === 'scheduled' && trigVal === 'daily' && hoursSince < 24) {
      return { execute: false, reason: 'Not time yet' };
    }
    if (trigType === 'scheduled' && trigVal === 'weekly' && hoursSince < 168) {
      return { execute: false, reason: 'Not time yet' };
    }
  }

  return { execute: true, reason: 'Trigger condition met' };
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  parseGoal,
  evaluateRule,
  runCycle,
  // Task 2 additions
  parseGoalToRule,
  chatWithFafnir,
  handleChat,
  shouldRuleExecute,
};

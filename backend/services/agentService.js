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

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  parseGoal,
  evaluateRule,
  runCycle,
};

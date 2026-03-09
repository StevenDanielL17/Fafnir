/**
 * CHAT ROUTES
 * 
 * POST /api/chat  — Send a message to Fafnir and get a response
 * 
 * This is the conversational interface. The user types natural language,
 * Fafnir responds with context-aware answers and can take actions
 * (create goals, pause/resume rules, etc.) based on the conversation.
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('./auth');
const langchainAgent = require('../services/langchainAgent');
const agentService = require('../services/agentService');
const ruleModel = require('../models/rule');
const transactionModel = require('../models/transaction');
const userModel = require('../models/user');
const hederaService = require('../services/hederaService');
const notificationService = require('../services/notificationService');

// All chat routes require authentication
router.use(requireAuth);

// ── POST /api/chat ─────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const user = userModel.getById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build user context for the LLM
    const activeRules = ruleModel.getByUserId(req.userId);
    const recentTransactions = transactionModel.getByUserId(req.userId, { limit: 10 });
    const monthlyTotal = transactionModel.getMonthlyTotal(req.userId);
    const totalSaved = transactionModel.getTotalSaved(req.userId);

    let balance = null;
    try {
      if (user.hederaAccountId) {
        balance = await hederaService.getBalance(user.hederaAccountId);
      }
    } catch {
      // Balance check may fail if account doesn't exist yet
    }

    const userContext = {
      totalSaved,
      monthlyTotal,
      balance,
      activeRules,
      recentTransactions,
    };

    // Get LLM response
    const { reply, action } = await langchainAgent.chat(message, userContext);

    // Process any actions the LLM decided to take
    let actionResult = null;
    if (action) {
      actionResult = await processAction(action, req.userId, user);
    }

    res.json({
      reply,
      action: actionResult,
    });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

// ── ACTION PROCESSOR ───────────────────────────────────

/**
 * Process structured actions extracted from LLM response.
 * Actions: create_goal, pause_rule, resume_rule, update_rule
 */
async function processAction(action, userId, user) {
  switch (action.type) {
    case 'create_goal': {
      const parsed = await agentService.parseGoal(action.goalText);
      const rule = ruleModel.create(userId, parsed);

      // Log to HCS
      if (user.hcsTopicId) {
        await hederaService.submitLog(user.hcsTopicId, {
          action: 'RULE_CREATED',
          ruleId: rule.id,
          description: action.goalText,
          source: 'chat',
        });
      }

      return { type: 'goal_created', rule };
    }

    case 'pause_rule': {
      const rules = ruleModel.getByUserId(userId);
      const match = rules.find(
        (r) =>
          r.isActive &&
          r.description.toLowerCase().includes(action.keyword.toLowerCase())
      );
      if (match) {
        ruleModel.update(match.id, { isActive: false });
        if (user.hcsTopicId) {
          await hederaService.submitLog(user.hcsTopicId, {
            action: 'RULE_PAUSED',
            ruleId: match.id,
            source: 'chat',
          });
        }
        return { type: 'rule_paused', ruleId: match.id };
      }
      return { type: 'no_match', message: 'Could not find a matching active rule to pause.' };
    }

    case 'resume_rule': {
      const rules = ruleModel.getByUserId(userId);
      const match = rules.find(
        (r) =>
          !r.isActive &&
          r.description.toLowerCase().includes(action.keyword.toLowerCase())
      );
      if (match) {
        ruleModel.update(match.id, { isActive: true });
        if (user.hcsTopicId) {
          await hederaService.submitLog(user.hcsTopicId, {
            action: 'RULE_RESUMED',
            ruleId: match.id,
            source: 'chat',
          });
        }
        return { type: 'rule_resumed', ruleId: match.id };
      }
      return { type: 'no_match', message: 'Could not find a matching paused rule to resume.' };
    }

    case 'update_rule': {
      const rules = ruleModel.getByUserId(userId);
      const match = rules.find(
        (r) =>
          r.description.toLowerCase().includes((action.keyword || '').toLowerCase())
      );
      if (match && action.field && action.value !== undefined) {
        const updateData = { [action.field]: action.value };
        ruleModel.update(match.id, updateData);
        if (user.hcsTopicId) {
          await hederaService.submitLog(user.hcsTopicId, {
            action: 'RULE_UPDATED',
            ruleId: match.id,
            changes: updateData,
            source: 'chat',
          });
        }
        return { type: 'rule_updated', ruleId: match.id, changes: updateData };
      }
      return { type: 'no_match', message: 'Could not find a matching rule to update.' };
    }

    default:
      return null;
  }
}

module.exports = router;

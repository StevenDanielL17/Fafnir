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
const agentService = require('../services/agentService');
const ruleModel = require('../models/rule');
const transactionModel = require('../models/transaction');
const userModel = require('../models/user');
const hederaService = require('../services/hederaService');
const { validate, chatSchema } = require('../middleware/validation');
const { chatLimiter } = require('../middleware/rateLimiter');

// All chat routes require authentication
router.use(requireAuth);

// ── POST /api/chat ─────────────────────────────────────
// Input validation: message length, format
// Rate limiting: max 100 messages per hour per user
router.post('/', chatLimiter, validate(chatSchema), async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const user = userModel.getById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build user context
    const activeRules = ruleModel.getByUserId(req.userId).filter(r => r.isActive);
    const recentTransactions = transactionModel.getByUserId(req.userId, { limit: 5 });
    const monthSaved = transactionModel.getMonthlyTotal(req.userId);
    const totalSaved = transactionModel.getTotalSaved(req.userId);

    const userContext = {
      totalSaved,
      monthSaved,
      activeRules,
      recentTransactions,
    };

    let createdRule = null;

    const conversationHistory = history || [];
    const result = await agentService.handleChat(message, conversationHistory, userContext);
    let reply = result.reply;

    if (result.action === 'create_rule' && result.rule) {
      try {
        createdRule = ruleModel.create(req.userId, {
          description: result.rule.description || message,
          triggerType: result.rule.trigger_type || 'scheduled',
          triggerValue: result.rule.trigger_value || 'daily',
          amount: result.rule.amount,
          maxPerTransaction: result.rule.max_per_transaction || result.rule.amount,
          monthlyMax: result.rule.monthly_max || result.rule.amount * 10,
          isActive: true,
        });

        reply = `${reply}\n\n✓ Rule saved and active.`;

        // Log rule creation to HCS (fire-and-forget)
        if (user.hcsTopicId) {
          hederaService.logToHCS(user.hcsTopicId, {
            event: 'RULE_CREATED',
            rule: result.rule.description || message,
            source: 'chat',
          }).catch(() => {});
        }
      } catch (err) {
        console.error('  Auto-create rule from chat failed:', err.message);
      }
    }

    // Log chat to HCS (fire-and-forget)
    if (user.hcsTopicId) {
      hederaService.logToHCS(user.hcsTopicId, {
        event: 'CHAT',
        userMessage: message,
      }).catch(() => {});
    }

    res.json({
      reply,
      rule: createdRule || null,
      action: createdRule
        ? { type: 'goal_created', rule: createdRule }
        : (result.action ? { type: result.action } : null),
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

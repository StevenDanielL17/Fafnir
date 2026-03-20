/**
 * GOALS ROUTES
 * 
 * POST   /api/goals       — Create a new saving goal (natural language)
 * GET    /api/goals       — List user's goals/rules
 * PATCH  /api/goals/:id   — Update a rule (change amount, pause/resume)
 * DELETE /api/goals/:id   — Delete a rule
 * POST   /api/goals/parse — Preview: parse goal text without saving
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('./auth');
const ruleModel = require('../models/rule');
const userModel = require('../models/user');
const agentService = require('../services/agentService');
const hederaService = require('../services/hederaService');
const auditService = require('../services/auditService');
const { validate, createGoalSchema, updateGoalSchema } = require('../middleware/validation');
const { goalCreationLimiter } = require('../middleware/rateLimiter');

// All goals routes require authentication
router.use(requireAuth);

// ── POST /api/goals ────────────────────────────────────
// Input validation: goal text format and length
// Rate limiting: max 30 rule creations per hour per user
router.post('/', goalCreationLimiter, validate(createGoalSchema), async (req, res) => {
  try {
    const goalText = req.body.goalText || req.body.description;

    if (!goalText) {
      return res.status(400).json({ error: 'goalText or description is required' });
    }

    // Parse natural language → rule object (using parseGoalToRule from spec)
    const parsed = await agentService.parseGoalToRule(goalText);

    // Save rule — map from spec field names to model field names
    const rule = ruleModel.create(req.userId, {
      description: parsed.description || goalText,
      triggerType: parsed.trigger_type || parsed.triggerType || 'scheduled',
      triggerValue: parsed.trigger_value || parsed.triggerValue || 'daily',
      amount: parsed.amount,
      maxPerTransaction: parsed.max_per_transaction || parsed.maxPerTransaction || parsed.amount,
      monthlyMax: parsed.monthly_max || parsed.monthlyMax || parsed.amount * 10,
      isActive: true,
    });

    // Log rule creation to audit trail
    auditService.logRuleEvent(req.userId, 'RULE_CREATED', rule.id, {
      description: rule.description,
      amount: rule.amount,
      trigger: rule.triggerType,
    });

    // Log to HCS (fire-and-forget — never blocks response)
    const user = userModel.getById(req.userId);
    if (user?.hcsTopicId) {
      hederaService.logToHCS(user.hcsTopicId, {
        event: 'RULE_CREATED',
        rule: parsed.description || goalText,
      }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      rule,
      message: `Got it! I'll save $${parsed.amount} ${(parsed.trigger_type || parsed.triggerType) === 'spending_category' ? `when you spend on ${parsed.trigger_value || parsed.triggerValue}` : (parsed.trigger_value || parsed.triggerValue) || 'when triggered'}. Monthly max: $${parsed.monthly_max || parsed.monthlyMax || parsed.amount * 10}.`,
    });
  } catch (err) {
    console.error('Create goal error:', err.message);
    auditService.logSecurityEvent('GOAL_CREATION_ERROR', req.ipAddress, { error: err.message });
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ── POST /api/goals/parse (preview only) ──────────────
router.post('/parse', validate(createGoalSchema), async (req, res) => {
  const goalText = req.body.goalText || req.body.description;

  if (!goalText) {
    return res.status(400).json({ error: 'goalText or description is required' });
  }

  const parsed = await agentService.parseGoalToRule(goalText);
  res.json({ parsed });
});

// ── GET /api/goals ─────────────────────────────────────
router.get('/', (req, res) => {
  const rules = ruleModel.getByUserId(req.userId);
  res.json({ goals: rules, rules }); // Both keys for compatibility
});

// ── PATCH /api/goals/:id ───────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const rule = ruleModel.getById(req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    if (rule.userId !== req.userId) return res.status(403).json({ error: 'Not your rule' });

    const { amount, maxPerTransaction, monthlyMax, isActive } = req.body;

    const updated = ruleModel.update(req.params.id, {
      ...(amount !== undefined && { amount }),
      ...(maxPerTransaction !== undefined && { maxPerTransaction }),
      ...(monthlyMax !== undefined && { monthlyMax }),
      ...(isActive !== undefined && { isActive }),
    });

    // Log change to HCS
    const user = userModel.getById(req.userId);
    if (user?.hcsTopicId) {
      await hederaService.submitLog(user.hcsTopicId, {
        action: 'RULE_UPDATED',
        ruleId: rule.id,
        changes: req.body,
      });
    }

    res.json({ rule: updated });
  } catch (err) {
    console.error('Update goal error:', err.message);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// ── DELETE /api/goals/:id ──────────────────────────────
router.delete('/:id', async (req, res) => {
  const rule = ruleModel.getById(req.params.id);
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  if (rule.userId !== req.userId) return res.status(403).json({ error: 'Not your rule' });

  ruleModel.remove(req.params.id);

  // Log to HCS
  const user = userModel.getById(req.userId);
  if (user?.hcsTopicId) {
    await hederaService.submitLog(user.hcsTopicId, {
      action: 'RULE_DELETED',
      ruleId: req.params.id,
    });
  }

  res.json({ message: 'Rule deleted' });
});

module.exports = router;

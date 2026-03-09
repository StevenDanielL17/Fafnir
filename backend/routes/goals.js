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

// All goals routes require authentication
router.use(requireAuth);

// ── POST /api/goals ────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { goalText } = req.body;

    if (!goalText) {
      return res.status(400).json({ error: 'goalText is required' });
    }

    // Parse natural language → rule object (agentService responsibility)
    const parsed = await agentService.parseGoal(goalText);

    // Save rule
    const rule = ruleModel.create(req.userId, parsed);

    // Log to HCS
    const user = userModel.getById(req.userId);
    if (user?.hcsTopicId) {
      await hederaService.submitLog(user.hcsTopicId, {
        action: 'RULE_CREATED',
        ruleId: rule.id,
        description: goalText,
        parsed: {
          triggerType: parsed.triggerType,
          triggerValue: parsed.triggerValue,
          amount: parsed.amount,
          monthlyMax: parsed.monthlyMax,
        },
      });
    }

    res.status(201).json({
      rule,
      message: `Got it! I'll save $${parsed.amount} ${parsed.triggerType === 'spending_category' ? `when you spend on ${parsed.triggerValue}` : parsed.triggerValue || 'when triggered'}. Monthly max: $${parsed.monthlyMax}.`,
    });
  } catch (err) {
    console.error('Create goal error:', err.message);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// ── POST /api/goals/parse (preview only) ──────────────
router.post('/parse', async (req, res) => {
  const { goalText } = req.body;

  if (!goalText) {
    return res.status(400).json({ error: 'goalText is required' });
  }

  const parsed = await agentService.parseGoal(goalText);
  res.json({ parsed });
});

// ── GET /api/goals ─────────────────────────────────────
router.get('/', (req, res) => {
  const rules = ruleModel.getByUserId(req.userId);
  res.json({ rules });
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

/**
 * HISTORY ROUTES
 * 
 * GET /api/history            — Get user's transaction history
 * GET /api/history/summary    — Get savings summary (total, monthly, etc.)
 * POST /api/history/trigger   — Manually trigger agent cycle (for testing/demo)
 */

const express = require('express');
const router = express.Router();

const { requireAuth } = require('./auth');
const transactionModel = require('../models/transaction');
const notificationService = require('../services/notificationService');
const schedulerService = require('../services/schedulerService');
const auditService = require('../services/auditService');
const { agentTriggerLimiter } = require('../middleware/rateLimiter');

// All history routes require authentication
router.use(requireAuth);

// ── GET /api/history ───────────────────────────────────
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const transactions = transactionModel.getByUserId(req.userId, { limit });

  res.json({ transactions });
});

// ── GET /api/history/summary ───────────────────────────
router.get('/summary', (req, res) => {
  const monthlyTotal = transactionModel.getMonthlyTotal(req.userId);
  const allTimeTotal = transactionModel.getTotalSaved(req.userId);
  const recent = transactionModel.getByUserId(req.userId, { limit: 5 });

  res.json({
    summary: {
      totalSaved: allTimeTotal,
      savedThisMonth: monthlyTotal,
      recentActions: recent,
    },
  });
});

// ── GET /api/history/notifications ─────────────────────
router.get('/notifications', async (req, res) => {
  const messages = await notificationService.getMessages(req.userId, {
    limit: parseInt(req.query.limit) || 20,
  });

  res.json({ notifications: messages });
});

// ── POST /api/history/trigger ──────────────────────────
// For demo/testing: manually trigger the agent cycle
// Rate limited: max 10 triggers per hour per user
router.post('/trigger', agentTriggerLimiter, async (req, res) => {
  try {
    auditService.logAgentEvent(req.userId, 'MANUAL_TRIGGER', {
      ipAddress: req.ipAddress,
      timestamp: new Date().toISOString(),
    });

    await schedulerService.triggerNow();
    res.json({ message: 'Agent cycle triggered manually' });
  } catch (err) {
    auditService.logSecurityEvent('AGENT_TRIGGER_ERROR', req.ipAddress, {
      error: err.message,
      userId: req.userId,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

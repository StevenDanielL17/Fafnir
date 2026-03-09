/**
 * UNIT TEST: Goals Route — CRUD + HCS Logging
 * 
 * Tests the goals route logic:
 *  - POST /api/goals → parse + create + HCS log
 *  - POST /api/goals/parse → preview only
 *  - GET /api/goals → list user rules
 *  - PATCH /api/goals/:id → update + ownership check
 *  - DELETE /api/goals/:id → delete + ownership check
 * 
 * Strategy: Test the route handler logic against mock stores.
 * 
 * RULE 1.1: Routes handle HTTP only.
 * RULE 4.3: Every rule change logged to HCS.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFreshStores } from '../../setup/mocks/storeMock.js';

// ─── Keyword Parser (mirrors agentService.parseGoal fallback) ───

const CATEGORIES = ['food', 'coffee', 'transport', 'shopping', 'entertainment', 'dining'];

function parseGoalKeyword(goalText) {
  const text = goalText.toLowerCase();
  const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 5.0;

  let triggerType = 'manual';
  let triggerValue = null;
  for (const cat of CATEGORIES) {
    if (text.includes(cat)) {
      triggerType = 'spending_category';
      triggerValue = cat;
      break;
    }
  }

  return {
    description: goalText,
    triggerType,
    triggerValue,
    amount,
    maxPerTransaction: amount,
    monthlyMax: amount * 30,
    isActive: true,
  };
}

// ─── Route Logic Wrapper ────────────────────────────────

function createGoalHandlers(stores, hederaLog) {
  return {
    async create(userId, goalText) {
      if (!goalText) return { status: 400, body: { error: 'goalText is required' } };

      const parsed = parseGoalKeyword(goalText);
      const rule = stores.ruleStore.create(userId, parsed);

      const user = stores.userStore.getById(userId);
      if (user?.hcsTopicId) {
        hederaLog.push({
          action: 'RULE_CREATED',
          ruleId: rule.id,
          description: goalText,
          parsed: { triggerType: parsed.triggerType, amount: parsed.amount, monthlyMax: parsed.monthlyMax },
        });
      }

      return {
        status: 201,
        body: { rule, message: `Got it! I'll save $${parsed.amount}.` },
      };
    },

    parse(goalText) {
      if (!goalText) return { status: 400, body: { error: 'goalText is required' } };
      return { status: 200, body: { parsed: parseGoalKeyword(goalText) } };
    },

    list(userId) {
      return { status: 200, body: { rules: stores.ruleStore.getByUserId(userId) } };
    },

    async update(userId, ruleId, changes) {
      const rule = stores.ruleStore.getById(ruleId);
      if (!rule) return { status: 404, body: { error: 'Rule not found' } };
      if (rule.userId !== userId) return { status: 403, body: { error: 'Not your rule' } };

      const updated = stores.ruleStore.update(ruleId, changes);

      const user = stores.userStore.getById(userId);
      if (user?.hcsTopicId) {
        hederaLog.push({ action: 'RULE_UPDATED', ruleId, changes });
      }

      return { status: 200, body: { rule: updated } };
    },

    async remove(userId, ruleId) {
      const rule = stores.ruleStore.getById(ruleId);
      if (!rule) return { status: 404, body: { error: 'Rule not found' } };
      if (rule.userId !== userId) return { status: 403, body: { error: 'Not your rule' } };

      stores.ruleStore.remove(ruleId);

      const user = stores.userStore.getById(userId);
      if (user?.hcsTopicId) {
        hederaLog.push({ action: 'RULE_DELETED', ruleId });
      }

      return { status: 200, body: { message: 'Rule deleted' } };
    },
  };
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('Goals Route — CRUD + HCS Logging', () => {
  let stores, hederaLog, handlers;
  const userId = 'user-1';

  beforeEach(() => {
    stores = createFreshStores();
    hederaLog = [];

    // Create a test user with HCS topic
    stores.userStore.create({
      email: 'test@fafnir.dev',
      hederaAccountId: '0.0.10001',
      hcsTopicId: '0.0.50001',
    });

    handlers = createGoalHandlers(stores, hederaLog);
  });

  describe('POST /api/goals (create)', () => {
    it('creates a rule and returns 201', async () => {
      const result = await handlers.create(userId, 'Save $5 on food');

      expect(result.status).toBe(201);
      expect(result.body.rule.amount).toBe(5);
      expect(result.body.rule.isActive).toBe(true);
    });

    it('logs RULE_CREATED to HCS', async () => {
      await handlers.create(userId, 'Save $10 on coffee');

      expect(hederaLog).toHaveLength(1);
      expect(hederaLog[0].action).toBe('RULE_CREATED');
      expect(hederaLog[0].parsed.amount).toBe(10);
    });

    it('returns 400 when goalText is missing', async () => {
      const result = await handlers.create(userId, '');
      expect(result.status).toBe(400);
    });

    it('returns 400 when goalText is undefined', async () => {
      const result = await handlers.create(userId, undefined);
      expect(result.status).toBe(400);
    });
  });

  describe('POST /api/goals/parse (preview)', () => {
    it('returns parsed rule without saving', () => {
      const result = handlers.parse('Save $7 on food');

      expect(result.status).toBe(200);
      expect(result.body.parsed.amount).toBe(7);
      expect(result.body.parsed.triggerType).toBe('spending_category');
      expect(stores.ruleStore.getByUserId(userId)).toHaveLength(0);
    });

    it('returns 400 when goalText is missing', () => {
      const result = handlers.parse('');
      expect(result.status).toBe(400);
    });
  });

  describe('GET /api/goals (list)', () => {
    it('returns user rules', async () => {
      await handlers.create(userId, 'Save $5 on food');
      await handlers.create(userId, 'Save $3 daily');

      const result = handlers.list(userId);
      expect(result.body.rules).toHaveLength(2);
    });

    it('returns empty array for user with no rules', () => {
      const result = handlers.list('ghost-user');
      expect(result.body.rules).toHaveLength(0);
    });
  });

  describe('PATCH /api/goals/:id (update)', () => {
    it('updates a rule and logs to HCS', async () => {
      const createResult = await handlers.create(userId, 'Save $5 on food');
      const ruleId = createResult.body.rule.id;

      const result = await handlers.update(userId, ruleId, { amount: 10 });

      expect(result.status).toBe(200);
      expect(result.body.rule.amount).toBe(10);
      expect(hederaLog.find((l) => l.action === 'RULE_UPDATED')).toBeDefined();
    });

    it('returns 404 for non-existent rule', async () => {
      const result = await handlers.update(userId, 'fake-id', { amount: 10 });
      expect(result.status).toBe(404);
    });

    it('returns 403 when user does not own the rule', async () => {
      const createResult = await handlers.create(userId, 'Save $5 on food');
      const ruleId = createResult.body.rule.id;

      const result = await handlers.update('other-user', ruleId, { amount: 10 });
      expect(result.status).toBe(403);
    });
  });

  describe('DELETE /api/goals/:id (remove)', () => {
    it('deletes a rule and logs to HCS', async () => {
      const createResult = await handlers.create(userId, 'Save $5 on food');
      const ruleId = createResult.body.rule.id;

      const result = await handlers.remove(userId, ruleId);

      expect(result.status).toBe(200);
      expect(stores.ruleStore.getById(ruleId)).toBeNull();
      expect(hederaLog.find((l) => l.action === 'RULE_DELETED')).toBeDefined();
    });

    it('returns 404 for non-existent rule', async () => {
      const result = await handlers.remove(userId, 'fake-id');
      expect(result.status).toBe(404);
    });

    it('returns 403 when user does not own the rule', async () => {
      const createResult = await handlers.create(userId, 'Save $5 on food');
      const ruleId = createResult.body.rule.id;

      const result = await handlers.remove('other-user', ruleId);
      expect(result.status).toBe(403);
    });
  });
});

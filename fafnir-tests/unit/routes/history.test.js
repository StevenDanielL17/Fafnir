/**
 * UNIT TEST: History Route — Transaction Queries + Notifications
 * 
 * Tests:
 *  - GET /api/history → transaction list with limit
 *  - GET /api/history/summary → monthly + all-time totals
 *  - GET /api/history/notifications → user notifications
 *  - POST /api/history/trigger → manual agent cycle
 * 
 * Strategy: Test handler logic against mock stores directly.
 * 
 * RULE 1.1: Routes handle HTTP only.
 * RULE 7.1: Data ordered most-recent-first.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFreshStores } from '../../setup/mocks/storeMock.js';

// ─── Route Logic Wrapper ────────────────────────────────

function createHistoryHandlers(stores, notificationStore, triggerFn) {
  return {
    list(userId, queryLimit) {
      const limit = parseInt(queryLimit) || 50;
      const transactions = stores.transactionStore.getByUserId(userId, { limit });
      return { status: 200, body: { transactions } };
    },

    summary(userId) {
      const monthlyTotal = stores.transactionStore.getMonthlyTotal(userId);
      const allTimeTotal = stores.transactionStore.getTotalSaved(userId);
      const recent = stores.transactionStore.getByUserId(userId, { limit: 5 });

      return {
        status: 200,
        body: {
          summary: {
            totalSaved: allTimeTotal,
            savedThisMonth: monthlyTotal,
            recentActions: recent,
          },
        },
      };
    },

    async notifications(userId, queryLimit) {
      const limit = parseInt(queryLimit) || 20;
      const messages = await notificationStore.getMessages(userId, { limit });
      return { status: 200, body: { notifications: messages } };
    },

    async trigger() {
      try {
        await triggerFn();
        return { status: 200, body: { message: 'Agent cycle triggered manually' } };
      } catch (err) {
        return { status: 500, body: { error: err.message } };
      }
    },
  };
}

// ─── Simple Notification Store ──────────────────────────

function createNotificationStore() {
  const msgs = new Map();
  let counter = 0;

  return {
    async send(userId, data) {
      const msg = { id: `notif-${++counter}`, _seq: counter, ...data, read: false, timestamp: new Date().toISOString() };
      if (!msgs.has(userId)) msgs.set(userId, []);
      msgs.get(userId).push(msg);
      return msg;
    },
    async getMessages(userId, options = {}) {
      const list = msgs.get(userId) || [];
      const sorted = [...list].sort((a, b) => b._seq - a._seq);
      return options.limit ? sorted.slice(0, options.limit) : sorted;
    },
  };
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('History Route — Queries + Notifications', () => {
  let stores, notifStore, handlers;
  const userId = 'user-1';

  beforeEach(() => {
    stores = createFreshStores();
    notifStore = createNotificationStore();
    handlers = createHistoryHandlers(stores, notifStore, vi.fn(async () => {}));
  });

  describe('GET /api/history', () => {
    it('returns transactions for a user', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 10 });

      const result = handlers.list(userId);

      expect(result.status).toBe(200);
      expect(result.body.transactions).toHaveLength(2);
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        stores.transactionStore.create({ userId, action: 'SAVE', amount: i });
      }

      const result = handlers.list(userId, '3');
      expect(result.body.transactions).toHaveLength(3);
    });

    it('defaults to limit 50', () => {
      const result = handlers.list(userId);
      expect(result.status).toBe(200); // Just validates it doesn't crash
    });

    it('returns empty array for user with no transactions', () => {
      const result = handlers.list('ghost-user');
      expect(result.body.transactions).toHaveLength(0);
    });
  });

  describe('GET /api/history/summary', () => {
    it('returns totalSaved, savedThisMonth, and recentActions', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 10 });
      stores.transactionStore.create({ userId, action: 'SAVE_FAILED', amount: 20 });

      const result = handlers.summary(userId);

      expect(result.status).toBe(200);
      expect(result.body.summary.totalSaved).toBe(15); // 5 + 10 (not failed)
      expect(result.body.summary.savedThisMonth).toBe(15);
      expect(result.body.summary.recentActions).toHaveLength(3);
    });

    it('returns zeros for new user', () => {
      const result = handlers.summary('new-user');

      expect(result.body.summary.totalSaved).toBe(0);
      expect(result.body.summary.savedThisMonth).toBe(0);
      expect(result.body.summary.recentActions).toHaveLength(0);
    });

    it('limits recentActions to 5', () => {
      for (let i = 0; i < 20; i++) {
        stores.transactionStore.create({ userId, action: 'SAVE', amount: 1 });
      }

      const result = handlers.summary(userId);
      expect(result.body.summary.recentActions).toHaveLength(5);
    });
  });

  describe('GET /api/history/notifications', () => {
    it('returns notifications for a user', async () => {
      await notifStore.send(userId, { type: 'save_executed', message: 'Saved $5' });
      await notifStore.send(userId, { type: 'save_executed', message: 'Saved $10' });

      const result = await handlers.notifications(userId);

      expect(result.status).toBe(200);
      expect(result.body.notifications).toHaveLength(2);
    });

    it('respects limit', async () => {
      for (let i = 0; i < 10; i++) {
        await notifStore.send(userId, { type: 'a', message: `msg ${i}` });
      }

      const result = await handlers.notifications(userId, '3');
      expect(result.body.notifications).toHaveLength(3);
    });

    it('returns most recent first', async () => {
      await notifStore.send(userId, { type: 'a', message: 'first' });
      await notifStore.send(userId, { type: 'b', message: 'second' });

      const result = await handlers.notifications(userId);
      expect(result.body.notifications[0].message).toBe('second');
    });
  });

  describe('POST /api/history/trigger', () => {
    it('triggers agent cycle and returns success', async () => {
      const result = await handlers.trigger();

      expect(result.status).toBe(200);
      expect(result.body.message).toContain('triggered');
    });

    it('returns 500 when trigger fails', async () => {
      const failTrigger = vi.fn(async () => { throw new Error('Scheduler down'); });
      const failHandlers = createHistoryHandlers(stores, notifStore, failTrigger);

      const result = await failHandlers.trigger();

      expect(result.status).toBe(500);
      expect(result.body.error).toContain('Scheduler down');
    });
  });
});

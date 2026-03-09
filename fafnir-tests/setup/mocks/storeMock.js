/**
 * STORE MOCK
 * 
 * Provides clean, resettable in-memory data stores for testing.
 * Used when you need deterministic state without side effects
 * between tests. Wraps the real model modules with reset capability.
 */

import { vi } from 'vitest';

/**
 * Create a fresh set of model stores.
 * Each call returns isolated instances.
 */
export function createFreshStores() {
  const users = new Map();
  const rules = new Map();
  const transactions = new Map();
  let userCounter = 0;
  let ruleCounter = 0;
  let txCounter = 0;

  return {
    userStore: {
      create(data) {
        const id = `user-${++userCounter}`;
        const user = {
          id,
          email: data.email,
          hederaAccountId: data.hederaAccountId || null,
          hederaPrivateKey: data.hederaPrivateKey || null,
          hcsTopicId: data.hcsTopicId || null,
          createdAt: new Date().toISOString(),
        };
        users.set(id, user);
        return user;
      },
      getById: (id) => users.get(id) || null,
      getByEmail: (email) => Array.from(users.values()).find((u) => u.email === email) || null,
      getAll: () => Array.from(users.values()),
      update(id, data) {
        const user = users.get(id);
        if (!user) return null;
        Object.assign(user, data);
        return user;
      },
      remove: (id) => users.delete(id),
      _size: () => users.size,
      _clear: () => users.clear(),
    },

    ruleStore: {
      create(userId, data) {
        const id = `rule-${++ruleCounter}`;
        const rule = { id, userId, ...data, createdAt: new Date().toISOString() };
        rules.set(id, rule);
        return rule;
      },
      getByUserId: (userId) => Array.from(rules.values()).filter((r) => r.userId === userId),
      getById: (id) => rules.get(id) || null,
      update(id, data) {
        const rule = rules.get(id);
        if (!rule) return null;
        Object.assign(rule, data);
        return rule;
      },
      toggleActive(id) {
        const rule = rules.get(id);
        if (!rule) return null;
        rule.isActive = !rule.isActive;
        return rule;
      },
      remove: (id) => rules.delete(id),
      _size: () => rules.size,
      _clear: () => rules.clear(),
    },

    transactionStore: {
      create(data) {
        const id = `tx-${++txCounter}`;
        const tx = { id, ...data, _seq: txCounter, createdAt: new Date().toISOString() };
        transactions.set(id, tx);
        return tx;
      },
      getByUserId(userId, options = {}) {
        let result = Array.from(transactions.values()).filter((t) => t.userId === userId);
        result.sort((a, b) => b._seq - a._seq);
        if (options.limit) result = result.slice(0, options.limit);
        return result;
      },
      getMonthlyTotal(userId) {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return Array.from(transactions.values())
          .filter((t) => t.userId === userId && t.action === 'SAVE' && new Date(t.createdAt) >= start)
          .reduce((sum, t) => sum + t.amount, 0);
      },
      getTotalSaved(userId) {
        return Array.from(transactions.values())
          .filter((t) => t.userId === userId && t.action === 'SAVE')
          .reduce((sum, t) => sum + t.amount, 0);
      },
      _size: () => transactions.size,
      _clear: () => transactions.clear(),
    },

    // Reset everything
    resetAll() {
      users.clear();
      rules.clear();
      transactions.clear();
      userCounter = 0;
      ruleCounter = 0;
      txCounter = 0;
    },
  };
}

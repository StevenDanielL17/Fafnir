/**
 * UNIT TEST: Transaction Model
 * Tests: CRUD, monthly totals, all-time totals, ordering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFreshStores } from '../../setup/mocks/storeMock.js';

describe('Transaction Model', () => {
  let stores;
  const userId = 'user-1';

  beforeEach(() => {
    stores = createFreshStores();
  });

  describe('create()', () => {
    it('creates a transaction with all fields', () => {
      const tx = stores.transactionStore.create({
        userId,
        ruleId: 'rule-1',
        action: 'SAVE',
        amount: 5,
        hcsSequenceNumber: 1,
        reasoning: 'Food detected',
        transactionId: '0.0.12345@123.000',
      });

      expect(tx.id).toBeDefined();
      expect(tx.userId).toBe(userId);
      expect(tx.action).toBe('SAVE');
      expect(tx.amount).toBe(5);
    });

    it('creates a failed transaction', () => {
      const tx = stores.transactionStore.create({
        userId,
        ruleId: 'rule-1',
        action: 'SAVE_FAILED',
        amount: 5,
        reasoning: 'Insufficient balance',
      });

      expect(tx.action).toBe('SAVE_FAILED');
      expect(tx.transactionId).toBeUndefined();
    });
  });

  describe('getByUserId()', () => {
    it('returns transactions ordered by most recent first', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 1 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 2 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 3 });

      const txs = stores.transactionStore.getByUserId(userId);
      // Most recent should be first (amount: 3 was created last)
      expect(txs[0].amount).toBe(3);
    });

    it('respects limit option', () => {
      for (let i = 0; i < 10; i++) {
        stores.transactionStore.create({ userId, action: 'SAVE', amount: i });
      }

      const txs = stores.transactionStore.getByUserId(userId, { limit: 3 });
      expect(txs).toHaveLength(3);
    });

    it('returns only specified user transactions', () => {
      stores.transactionStore.create({ userId: 'user-1', action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId: 'user-2', action: 'SAVE', amount: 10 });

      const txs = stores.transactionStore.getByUserId('user-1');
      expect(txs).toHaveLength(1);
      expect(txs[0].userId).toBe('user-1');
    });
  });

  describe('getMonthlyTotal()', () => {
    it('sums only SAVE actions for current month', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 10 });
      stores.transactionStore.create({ userId, action: 'SAVE_FAILED', amount: 20 });

      const total = stores.transactionStore.getMonthlyTotal(userId);
      expect(total).toBe(15); // 5 + 10, not 20 (failed)
    });

    it('returns 0 for user with no transactions', () => {
      expect(stores.transactionStore.getMonthlyTotal('ghost-user')).toBe(0);
    });
  });

  describe('getTotalSaved()', () => {
    it('sums all SAVE actions across all time', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 10 });
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 15 });

      expect(stores.transactionStore.getTotalSaved(userId)).toBe(30);
    });

    it('excludes SAVE_FAILED from totals', () => {
      stores.transactionStore.create({ userId, action: 'SAVE', amount: 5 });
      stores.transactionStore.create({ userId, action: 'SAVE_FAILED', amount: 100 });

      expect(stores.transactionStore.getTotalSaved(userId)).toBe(5);
    });
  });
});

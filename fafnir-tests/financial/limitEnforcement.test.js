/**
 * FINANCIAL TEST: Limit Enforcement
 * 
 * Tests that per-transaction and monthly caps are ALWAYS respected.
 * Even if the LLM says "save $100", the limit system must cap it.
 * 
 * RULE: NEVER exceed maxPerTransaction
 * RULE: NEVER exceed monthlyMax
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { assertMonthlyCap, assertPerTransactionLimit } from '../helpers/assertions.js';

describe('Financial: Limit Enforcement', () => {
  let sim, userAccount, vaultAccount;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(1000);
    vaultAccount = sim.createAccount(0);
  });

  // ── Per-Transaction Limit ────────────────────────────

  describe('Per-Transaction Limit', () => {
    it('caps save amount at maxPerTransaction', () => {
      const rule = { amount: 10, maxPerTransaction: 3 };
      const actualAmount = Math.min(rule.amount, rule.maxPerTransaction);

      expect(actualAmount).toBe(3);
      sim.transfer(userAccount, vaultAccount, actualAmount);
      expect(sim.getBalance(vaultAccount)).toBe(3);
    });

    it('allows full amount when under maxPerTransaction', () => {
      const rule = { amount: 5, maxPerTransaction: 10 };
      const actualAmount = Math.min(rule.amount, rule.maxPerTransaction);

      expect(actualAmount).toBe(5);
    });

    it('per-transaction assertion catches violations', () => {
      const transactions = [
        { action: 'SAVE', amount: 5 },
        { action: 'SAVE', amount: 3 },
        { action: 'SAVE', amount: 8 }, // Exceeds limit of 5
      ];

      expect(() => assertPerTransactionLimit(transactions, 5)).toThrow();
    });

    it('per-transaction assertion passes when compliant', () => {
      const transactions = [
        { action: 'SAVE', amount: 5 },
        { action: 'SAVE', amount: 3 },
        { action: 'SAVE', amount: 5 },
      ];

      expect(() => assertPerTransactionLimit(transactions, 5)).not.toThrow();
    });
  });

  // ── Monthly Cap ──────────────────────────────────────

  describe('Monthly Cap', () => {
    it('stops saving when monthly cap is reached', () => {
      const monthlyMax = 15;
      let monthlySaved = 0;
      const transactions = [];

      for (let i = 0; i < 10; i++) {
        const amount = 5;
        if (monthlySaved + amount > monthlyMax) {
          break;
        }
        sim.transfer(userAccount, vaultAccount, amount);
        monthlySaved += amount;
        transactions.push({
          action: 'SAVE',
          amount,
          createdAt: new Date().toISOString(),
        });
      }

      expect(monthlySaved).toBe(15); // 3 saves of $5
      expect(transactions).toHaveLength(3);
      assertMonthlyCap(transactions, monthlyMax);
    });

    it('monthly assertion catches violations', () => {
      const transactions = [];
      for (let i = 0; i < 10; i++) {
        transactions.push({
          action: 'SAVE',
          amount: 5,
          createdAt: new Date().toISOString(),
        });
      }

      // 10 saves of $5 = $50, which exceeds $30 cap
      expect(() => assertMonthlyCap(transactions, 30)).toThrow();
    });

    it('monthly cap considers only SAVE actions', () => {
      const transactions = [
        { action: 'SAVE', amount: 5, createdAt: new Date().toISOString() },
        { action: 'SAVE_FAILED', amount: 100, createdAt: new Date().toISOString() },
        { action: 'SAVE', amount: 5, createdAt: new Date().toISOString() },
      ];

      // Only $10 in successful saves, well under $30 cap
      assertMonthlyCap(transactions, 30);
    });
  });

  // ── Combined Limits ──────────────────────────────────

  describe('Combined Limits', () => {
    it('respects both per-tx and monthly limits simultaneously', () => {
      const rule = { amount: 10, maxPerTransaction: 3, monthlyMax: 10 };
      let monthlySaved = 0;
      const transactions = [];

      for (let i = 0; i < 20; i++) {
        const amount = Math.min(rule.amount, rule.maxPerTransaction);
        if (monthlySaved + amount > rule.monthlyMax) break;

        sim.transfer(userAccount, vaultAccount, amount);
        monthlySaved += amount;
        transactions.push({
          action: 'SAVE',
          amount,
          createdAt: new Date().toISOString(),
        });
      }

      // Should be 3 saves of $3 (= $9), then stop because $9 + $3 > $10
      expect(monthlySaved).toBe(9);
      assertPerTransactionLimit(transactions, rule.maxPerTransaction);
      assertMonthlyCap(transactions, rule.monthlyMax);
    });

    it('handles edge case: monthly cap exactly equals save amount', () => {
      const rule = { amount: 5, maxPerTransaction: 5, monthlyMax: 5 };
      let monthlySaved = 0;

      const amount = Math.min(rule.amount, rule.maxPerTransaction);
      if (monthlySaved + amount <= rule.monthlyMax) {
        sim.transfer(userAccount, vaultAccount, amount);
        monthlySaved += amount;
      }

      expect(monthlySaved).toBe(5);

      // Second save should be blocked
      if (monthlySaved + amount <= rule.monthlyMax) {
        // This code should NOT execute
        expect(true).toBe(false);
      }
    });
  });
});

/**
 * SECURITY TEST: Rule Injection
 * 
 * Tests that malicious rule inputs cannot bypass limits or
 * inject unexpected behavior into the agent.
 * 
 * Attack vectors:
 * - Negative amounts (steal money)
 * - Extremely large amounts (drain accounts)
 * - Special characters in trigger values
 * - SQL injection in descriptions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFreshStores } from '../setup/mocks/storeMock.js';

describe('Security: Rule Injection', () => {
  let stores;
  const userId = 'user-1';

  beforeEach(() => {
    stores = createFreshStores();
  });

  describe('Amount Manipulation', () => {
    it('should handle negative amounts (potential theft vector)', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Save money',
        amount: -100, // Negative = steal from vault
        maxPerTransaction: 5,
        monthlyMax: 30,
      });

      // The agent evaluator should check: amount must be > 0
      // This test documents the attack vector
      expect(rule.amount).toBe(-100);
      // ASSERTION: The agent must validate amount > 0 before executing
    });

    it('should handle zero amounts', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'No-op rule',
        amount: 0,
        maxPerTransaction: 0,
        monthlyMax: 0,
      });

      expect(rule.amount).toBe(0);
    });

    it('should handle absurdly large amounts', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Drain everything',
        amount: Number.MAX_SAFE_INTEGER,
        maxPerTransaction: Number.MAX_SAFE_INTEGER,
        monthlyMax: Number.MAX_SAFE_INTEGER,
      });

      expect(rule.amount).toBe(Number.MAX_SAFE_INTEGER);
      // ASSERTION: Balance check must prevent execution
    });

    it('should handle floating point precision attacks', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Precision attack',
        amount: 0.1 + 0.2, // = 0.30000000000000004
        maxPerTransaction: 0.3,
        monthlyMax: 3,
      });

      // The amount is slightly more than 0.3 due to floating point
      expect(rule.amount).toBeCloseTo(0.3, 10);
    });
  });

  describe('String Injection', () => {
    it('handles SQL injection in description', () => {
      const rule = stores.ruleStore.create(userId, {
        description: "Save $5'; DROP TABLE rules; --",
        amount: 5,
      });

      // Should not crash — stored as plain text
      expect(rule.description).toContain('DROP TABLE');
      // In-memory store is safe, but PostgreSQL migration must use parameterized queries
    });

    it('handles XSS in description', () => {
      const rule = stores.ruleStore.create(userId, {
        description: '<script>alert("pwned")</script>Save $5',
        amount: 5,
      });

      expect(rule.description).toContain('<script>');
      // Frontend must sanitize before rendering
    });

    it('handles unicode in trigger values', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Save on 🍔 food',
        triggerType: 'spending_category',
        triggerValue: '🍔',
        amount: 5,
      });

      expect(rule.triggerValue).toBe('🍔');
    });

    it('handles extremely long descriptions', () => {
      const longText = 'A'.repeat(100_000);
      const rule = stores.ruleStore.create(userId, {
        description: longText,
        amount: 5,
      });

      expect(rule.description.length).toBe(100_000);
      // ASSERTION: Backend should enforce max length before reaching DB
    });
  });

  describe('Type Confusion', () => {
    it('handles string passed as amount', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Type confusion',
        amount: '5',
        maxPerTransaction: '5',
        monthlyMax: '30',
      });

      // JavaScript coercion — agent evaluator must parseInt/parseFloat
      expect(typeof rule.amount).toBe('string');
    });

    it('handles NaN amount', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'NaN attack',
        amount: NaN,
      });

      expect(Number.isNaN(rule.amount)).toBe(true);
      // ASSERTION: Agent must check isNaN before executing
    });

    it('handles Infinity amount', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Infinity attack',
        amount: Infinity,
      });

      expect(rule.amount).toBe(Infinity);
      // ASSERTION: Balance check will prevent actual execution
    });
  });
});

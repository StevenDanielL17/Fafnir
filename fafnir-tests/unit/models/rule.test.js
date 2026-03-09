/**
 * UNIT TEST: Rule Model
 * Tests: CRUD, user isolation, toggle, validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFreshStores } from '../../setup/mocks/storeMock.js';

describe('Rule Model', () => {
  let stores;
  const userId = 'user-1';

  beforeEach(() => {
    stores = createFreshStores();
  });

  describe('create()', () => {
    it('creates a rule with all fields', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Save $5 on food',
        triggerType: 'spending_category',
        triggerValue: 'food',
        amount: 5,
        maxPerTransaction: 5,
        monthlyMax: 30,
        isActive: true,
      });

      expect(rule.id).toBeDefined();
      expect(rule.userId).toBe(userId);
      expect(rule.description).toBe('Save $5 on food');
      expect(rule.amount).toBe(5);
      expect(rule.maxPerTransaction).toBe(5);
      expect(rule.monthlyMax).toBe(30);
      expect(rule.isActive).toBe(true);
    });

    it('generates unique IDs', () => {
      const r1 = stores.ruleStore.create(userId, { description: 'rule 1', amount: 1 });
      const r2 = stores.ruleStore.create(userId, { description: 'rule 2', amount: 2 });
      expect(r1.id).not.toBe(r2.id);
    });
  });

  describe('getByUserId()', () => {
    it('returns only rules for the specified user', () => {
      stores.ruleStore.create('user-1', { description: 'rule A', amount: 1 });
      stores.ruleStore.create('user-1', { description: 'rule B', amount: 2 });
      stores.ruleStore.create('user-2', { description: 'rule C', amount: 3 });

      const user1Rules = stores.ruleStore.getByUserId('user-1');
      expect(user1Rules).toHaveLength(2);
      expect(user1Rules.every((r) => r.userId === 'user-1')).toBe(true);
    });

    it('returns empty array for user with no rules', () => {
      expect(stores.ruleStore.getByUserId('ghost-user')).toHaveLength(0);
    });
  });

  describe('update()', () => {
    it('updates specific fields without overwriting others', () => {
      const rule = stores.ruleStore.create(userId, {
        description: 'Save $5 on food',
        amount: 5,
        monthlyMax: 30,
      });

      stores.ruleStore.update(rule.id, { amount: 10 });
      const updated = stores.ruleStore.getById(rule.id);

      expect(updated.amount).toBe(10);
      expect(updated.description).toBe('Save $5 on food');
      expect(updated.monthlyMax).toBe(30);
    });
  });

  describe('toggleActive()', () => {
    it('toggles isActive from true to false', () => {
      const rule = stores.ruleStore.create(userId, { isActive: true, amount: 5 });
      stores.ruleStore.toggleActive(rule.id);
      expect(stores.ruleStore.getById(rule.id).isActive).toBe(false);
    });

    it('toggles isActive from false to true', () => {
      const rule = stores.ruleStore.create(userId, { isActive: false, amount: 5 });
      stores.ruleStore.toggleActive(rule.id);
      expect(stores.ruleStore.getById(rule.id).isActive).toBe(true);
    });
  });

  describe('remove()', () => {
    it('removes a rule', () => {
      const rule = stores.ruleStore.create(userId, { amount: 5 });
      stores.ruleStore.remove(rule.id);
      expect(stores.ruleStore.getById(rule.id)).toBeNull();
    });
  });
});

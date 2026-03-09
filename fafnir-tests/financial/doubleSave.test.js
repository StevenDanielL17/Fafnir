/**
 * FINANCIAL TEST: Double-Save Prevention
 * 
 * The same rule must NOT fire twice within 60 seconds.
 * Without this guard, a scheduler bug could save $5 twice
 * in one cycle — draining the user's balance faster than expected.
 * 
 * RULE 4.3: No duplicate saves within dedup window.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { assertNoDoubleSave } from '../helpers/assertions.js';

describe('Financial: Double-Save Prevention', () => {
  let sim, userAccount, vaultAccount;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
  });

  it('allows saves from different rules at the same time', () => {
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, createdAt: new Date().toISOString() },
      { ruleId: 'rule-2', action: 'SAVE', amount: 10, createdAt: new Date().toISOString() },
    ];

    expect(() => assertNoDoubleSave(transactions)).not.toThrow();
  });

  it('DETECTS same rule firing twice within 60 seconds', () => {
    const now = new Date();
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-1', createdAt: now.toISOString() },
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-2', createdAt: new Date(now.getTime() + 30_000).toISOString() },
    ];

    expect(() => assertNoDoubleSave(transactions)).toThrow('DOUBLE SAVE');
  });

  it('allows same rule to fire after 60-second window', () => {
    const now = new Date();
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-1', createdAt: now.toISOString() },
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-2', createdAt: new Date(now.getTime() + 61_000).toISOString() },
    ];

    expect(() => assertNoDoubleSave(transactions)).not.toThrow();
  });

  it('DETECTS triple-fire within window', () => {
    const now = new Date();
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-1', createdAt: now.toISOString() },
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-2', createdAt: new Date(now.getTime() + 10_000).toISOString() },
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-3', createdAt: new Date(now.getTime() + 20_000).toISOString() },
    ];

    expect(() => assertNoDoubleSave(transactions)).toThrow('DOUBLE SAVE');
  });

  it('ignores SAVE_FAILED in dedup check', () => {
    const now = new Date();
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-1', createdAt: now.toISOString() },
      { ruleId: 'rule-1', action: 'SAVE_FAILED', amount: 5, id: 'tx-2', createdAt: new Date(now.getTime() + 10_000).toISOString() },
    ];

    // Only SAVE actions are checked, SAVE_FAILED is ignored
    expect(() => assertNoDoubleSave(transactions)).not.toThrow();
  });

  it('handles empty transaction list', () => {
    expect(() => assertNoDoubleSave([])).not.toThrow();
  });

  it('handles single transaction', () => {
    const transactions = [
      { ruleId: 'rule-1', action: 'SAVE', amount: 5, id: 'tx-1', createdAt: new Date().toISOString() },
    ];
    expect(() => assertNoDoubleSave(transactions)).not.toThrow();
  });
});

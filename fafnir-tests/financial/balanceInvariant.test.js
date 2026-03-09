/**
 * FINANCIAL TEST: Balance Invariant
 * 
 * The fundamental law: Money is neither created nor destroyed.
 * Total supply must remain constant across all operations.
 * 
 * RULE 4.1: Total HBAR debited = Total HBAR credited. Always.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../helpers/balanceInvariant.js';

describe('Financial: Balance Invariant', () => {
  let sim, operatorId, invariant;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    operatorId = setup.operatorId;
    invariant = new BalanceInvariantChecker(sim);
  });

  it('total supply is constant after any transfer', () => {
    const user = sim.createAccount(100);
    const vault = sim.createAccount(0);
    const supplyAfterCreation = sim.getTotalSupply();

    // Re-initialize invariant after account creation (new money entered system)
    const invariant2 = new BalanceInvariantChecker(sim);

    sim.transfer(user, vault, 25);
    invariant2.check('transfer 1');

    sim.transfer(user, vault, 30);
    invariant2.check('transfer 2');

    sim.transfer(user, vault, 10);
    invariant2.check('transfer 3');

    expect(sim.getTotalSupply()).toBe(supplyAfterCreation);
  });

  it('detects supply creation (money appearing from nowhere)', () => {
    const user = sim.createAccount(100);
    const invariant2 = new BalanceInvariantChecker(sim);

    // Manually corrupt the balance (simulate a bug)
    sim.accounts.get(user).balance += 50;

    expect(() => invariant2.check('after corruption')).toThrow('INVARIANT VIOLATION');
  });

  it('detects supply destruction (money disappearing)', () => {
    const user = sim.createAccount(100);
    const invariant2 = new BalanceInvariantChecker(sim);

    // Manually corrupt the balance
    sim.accounts.get(user).balance -= 50;

    expect(() => invariant2.check('after destruction')).toThrow('INVARIANT VIOLATION');
  });

  it('detects negative balance creation', () => {
    const user = sim.createAccount(10);
    const invariant2 = new BalanceInvariantChecker(sim);

    // Force negative balance (bypass transfer checks)
    sim.accounts.get(user).balance = -5;

    expect(() => invariant2.check('negative balance')).toThrow('NEGATIVE_BALANCE');
  });

  it('invariant holds through 100 random-amount transfers', () => {
    const users = [];
    for (let i = 0; i < 10; i++) {
      users.push(sim.createAccount(100));
    }
    const vault = sim.createAccount(0);
    const invariant2 = new BalanceInvariantChecker(sim);

    for (let i = 0; i < 100; i++) {
      const userIdx = i % users.length;
      const balance = sim.getBalance(users[userIdx]);
      if (balance > 0) {
        const amount = Math.min(Math.ceil(Math.random() * 5), balance);
        sim.transfer(users[userIdx], vault, amount);
        invariant2.check(`transfer ${i}`);
      }
    }

    const report = invariant2.report();
    expect(report.violations).toBe(0);
    expect(report.totalChecks).toBeGreaterThanOrEqual(100);
  });

  it('invariant checker wraps async operations', async () => {
    const user = sim.createAccount(50);
    const vault = sim.createAccount(0);
    const invariant2 = new BalanceInvariantChecker(sim);

    await invariant2.wrap('async transfer', async () => {
      sim.transfer(user, vault, 10);
    });

    expect(sim.getBalance(user)).toBe(40);
    expect(sim.getBalance(vault)).toBe(10);
  });
});

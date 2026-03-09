/**
 * BRIDGE TEST: Token Transfer Integrity
 * 
 * Tests the core financial bridge: User account → Savings vault via HTS.
 * Every HBAR that leaves a user's account MUST arrive at the vault.
 * 
 * RULE: Conservation of Value — money is never created or destroyed.
 * RULE: Direction enforcement — agent can ONLY move user → vault.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../helpers/balanceInvariant.js';

describe('Bridge: Token Transfer Integrity', () => {
  let sim, operatorId, invariant;
  let userAccount, vaultAccount;

  beforeEach(() => {
    const setup = createSimulator(1000);
    sim = setup.sim;
    operatorId = setup.operatorId;

    // Create user and vault accounts
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);

    invariant = new BalanceInvariantChecker(sim);
  });

  it('transfers exact amount from user to vault', () => {
    sim.transfer(userAccount, vaultAccount, 5);

    expect(sim.getBalance(userAccount)).toBe(95);
    expect(sim.getBalance(vaultAccount)).toBe(5);
    invariant.check('after transfer');
  });

  it('preserves total supply across multiple transfers', () => {
    const totalBefore = sim.getTotalSupply();

    sim.transfer(userAccount, vaultAccount, 5);
    sim.transfer(userAccount, vaultAccount, 10);
    sim.transfer(userAccount, vaultAccount, 15);

    expect(sim.getTotalSupply()).toBe(totalBefore);
    invariant.check('after 3 transfers');
  });

  it('rejects transfer when user has insufficient balance', () => {
    expect(() => sim.transfer(userAccount, vaultAccount, 999)).toThrow('INSUFFICIENT');
    // Balance unchanged
    expect(sim.getBalance(userAccount)).toBe(100);
    expect(sim.getBalance(vaultAccount)).toBe(0);
  });

  it('handles multiple users saving to the same vault', () => {
    const user2 = sim.createAccount(50);
    const user3 = sim.createAccount(75);

    // Re-capture invariant after account creation (which adds supply)
    const localInvariant = new BalanceInvariantChecker(sim);

    sim.transfer(userAccount, vaultAccount, 5);
    sim.transfer(user2, vaultAccount, 10);
    sim.transfer(user3, vaultAccount, 15);

    expect(sim.getBalance(vaultAccount)).toBe(30); // 5 + 10 + 15
    expect(sim.getBalance(userAccount)).toBe(95);
    expect(sim.getBalance(user2)).toBe(40);
    expect(sim.getBalance(user3)).toBe(60);

    localInvariant.check('multi-user transfers');
  });

  it('correctly tracks transfer history per account', () => {
    sim.transfer(userAccount, vaultAccount, 5);
    sim.transfer(userAccount, vaultAccount, 10);

    const history = sim.getTransferHistory(userAccount);
    expect(history).toHaveLength(2);
    expect(history[0].amount).toBe(5);
    expect(history[1].amount).toBe(10);
  });

  it('transfer record contains all required fields', () => {
    const record = sim.transfer(userAccount, vaultAccount, 7);

    expect(record.id).toBeDefined();
    expect(record.from).toBe(userAccount);
    expect(record.to).toBe(vaultAccount);
    expect(record.amount).toBe(7);
    expect(record.timestamp).toBeDefined();
    expect(record.status).toBe('SUCCESS');
  });

  it('handles rapid successive transfers correctly', () => {
    for (let i = 0; i < 20; i++) {
      sim.transfer(userAccount, vaultAccount, 1);
    }

    expect(sim.getBalance(userAccount)).toBe(80); // 100 - 20
    expect(sim.getBalance(vaultAccount)).toBe(20);
    invariant.check('rapid transfers');
  });

  it('balance never goes negative during transfers', () => {
    // Try to drain the account
    for (let i = 0; i < 100; i++) {
      const balance = sim.getBalance(userAccount);
      if (balance >= 1) {
        sim.transfer(userAccount, vaultAccount, 1);
        invariant.check(`transfer ${i}`);
      }
    }

    expect(sim.getBalance(userAccount)).toBe(0);
    expect(sim.getBalance(vaultAccount)).toBe(100);
  });
});

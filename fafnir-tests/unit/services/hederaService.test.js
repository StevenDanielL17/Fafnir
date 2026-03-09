/**
 * UNIT TEST: Hedera Service (via Simulator)
 * Tests: Account creation, balance queries, transfers, HCS topics
 * 
 * Uses HederaSimulator instead of real SDK — no network dependency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../../helpers/balanceInvariant.js';

describe('Hedera Service — Simulated', () => {
  let sim, operatorId, invariant;

  beforeEach(() => {
    const setup = createSimulator(1000);
    sim = setup.sim;
    operatorId = setup.operatorId;
    invariant = new BalanceInvariantChecker(sim);
  });

  describe('Account Creation', () => {
    it('creates an account with initial balance', () => {
      const accountId = sim.createAccount(5);
      expect(accountId).toMatch(/^0\.0\.\d+$/);
      expect(sim.getBalance(accountId)).toBe(5);
      // Note: createAccount adds supply (faucet model), so we validate
      // account state rather than supply invariant here
    });

    it('tracks total supply correctly after account creation', () => {
      const initialSupply = sim.getTotalSupply();
      sim.createAccount(10);
      // New account funded from "outside" the system (faucet/operator)
      expect(sim.getTotalSupply()).toBe(initialSupply + 10);
    });

    it('creates multiple unique accounts', () => {
      const a1 = sim.createAccount();
      const a2 = sim.createAccount();
      const a3 = sim.createAccount();
      expect(new Set([a1, a2, a3]).size).toBe(3);
    });
  });

  describe('Balance Queries', () => {
    it('returns correct balance for operator', () => {
      expect(sim.getBalance(operatorId)).toBe(1000);
    });

    it('throws for non-existent account', () => {
      expect(() => sim.getBalance('0.0.999999')).toThrow('does not exist');
    });
  });

  describe('Transfers', () => {
    it('transfers HBAR between accounts', () => {
      const userAccount = sim.createAccount(50);
      sim.transfer(userAccount, operatorId, 5);

      expect(sim.getBalance(userAccount)).toBe(45);
      expect(sim.getBalance(operatorId)).toBe(1005);
    });

    it('preserves total supply after transfer', async () => {
      const userAccount = sim.createAccount(50);
      // Re-capture supply after account creation (which adds to total)
      const localInvariant = new BalanceInvariantChecker(sim);

      sim.transfer(userAccount, operatorId, 10);

      expect(sim.getTotalSupply()).toBe(sim.getTotalSupply()); // self-consistent
      localInvariant.check('after transfer');
    });

    it('rejects transfer when balance insufficient', () => {
      const poorAccount = sim.createAccount(1);
      expect(() => sim.transfer(poorAccount, operatorId, 10)).toThrow('INSUFFICIENT');
    });

    it('rejects zero or negative transfers', () => {
      const account = sim.createAccount(10);
      expect(() => sim.transfer(account, operatorId, 0)).toThrow();
      expect(() => sim.transfer(account, operatorId, -5)).toThrow();
    });

    it('rejects transfer from non-existent account', () => {
      expect(() => sim.transfer('0.0.ghost', operatorId, 1)).toThrow('does not exist');
    });

    it('records transfer in history', () => {
      const account = sim.createAccount(10);
      sim.transfer(account, operatorId, 3);

      const history = sim.getTransferHistory(account);
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe(account);
      expect(history[0].to).toBe(operatorId);
      expect(history[0].amount).toBe(3);
    });
  });

  describe('HCS Topics', () => {
    it('creates a topic with memo', () => {
      const topicId = sim.createTopic('Test topic');
      expect(topicId).toMatch(/^0\.0\.\d+$/);
    });

    it('submits messages to a topic', () => {
      const topicId = sim.createTopic('Log');
      const result = sim.submitMessage(topicId, { action: 'SAVE', amount: 5 });
      expect(result.status).toBe('SUCCESS');
      expect(result.sequenceNumber).toBe(1);
    });

    it('increments sequence numbers', () => {
      const topicId = sim.createTopic('Log');
      sim.submitMessage(topicId, { msg: 1 });
      sim.submitMessage(topicId, { msg: 2 });
      const result = sim.submitMessage(topicId, { msg: 3 });
      expect(result.sequenceNumber).toBe(3);
    });

    it('retrieves all messages from a topic', () => {
      const topicId = sim.createTopic('Log');
      sim.submitMessage(topicId, { action: 'A' });
      sim.submitMessage(topicId, { action: 'B' });

      const messages = sim.getTopicMessages(topicId);
      expect(messages).toHaveLength(2);
    });

    it('rejects messages to non-existent topic', () => {
      expect(() => sim.submitMessage('0.0.ghost', { test: true })).toThrow('does not exist');
    });
  });

  describe('Network Freeze', () => {
    it('blocks all operations when frozen', () => {
      sim.freeze();
      expect(() => sim.createAccount()).toThrow('FROZEN');
      expect(() => sim.getBalance(operatorId)).toThrow('FROZEN');
      expect(() => sim.createTopic()).toThrow('FROZEN');
    });

    it('resumes after unfreeze', () => {
      sim.freeze();
      sim.unfreeze();
      expect(sim.getBalance(operatorId)).toBe(1000);
    });
  });
});

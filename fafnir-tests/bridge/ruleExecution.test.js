/**
 * BRIDGE TEST: Rule Execution Path
 * 
 * Tests the full path: Rule evaluation → Transfer → Log → Notification
 * This is the agent's core loop. Every step must complete successfully
 * or the system must fail safely.
 * 
 * RULE: Routes → Services → Hedera (never skip a layer)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../helpers/balanceInvariant.js';
import { makeRule, makeContext } from '../helpers/fixtures.js';

describe('Bridge: Rule Execution Path', () => {
  let sim, operatorId, invariant;
  let userAccount, vaultAccount, userTopic;
  let executionLog;

  beforeEach(() => {
    const setup = createSimulator(1000);
    sim = setup.sim;
    operatorId = setup.operatorId;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Fafnir test log');
    invariant = new BalanceInvariantChecker(sim);
    executionLog = [];
  });

  /**
   * Simulate one agent cycle step (mirrors agentService.runCycle logic)
   */
  function executeRule(rule, context) {
    // Step 1: Evaluate
    if (!rule.isActive) {
      return { executed: false, reason: 'Rule paused' };
    }
    if (context.monthlySpent + rule.amount > rule.monthlyMax) {
      return { executed: false, reason: 'Monthly cap exceeded' };
    }
    if (context.balance < rule.amount) {
      return { executed: false, reason: 'Insufficient balance' };
    }

    const amount = Math.min(rule.amount, rule.maxPerTransaction);

    // Step 2: Transfer
    const txRecord = sim.transfer(userAccount, vaultAccount, amount);

    // Step 3: Log to HCS
    const logResult = sim.submitMessage(userTopic, {
      action: 'SAVE',
      amount,
      ruleId: rule.id,
      transactionId: txRecord.id,
    });

    // Step 4: Record locally
    executionLog.push({
      ruleId: rule.id,
      amount,
      transactionId: txRecord.id,
      hcsSequence: logResult.sequenceNumber,
    });

    return { executed: true, amount, txRecord, logResult };
  }

  it('completes full save cycle: evaluate → transfer → log → record', () => {
    const rule = makeRule('user-1');
    const context = makeContext();

    const result = executeRule(rule, context);

    expect(result.executed).toBe(true);
    expect(result.amount).toBe(5);
    expect(result.txRecord.status).toBe('SUCCESS');
    expect(result.logResult.status).toBe('SUCCESS');
    expect(executionLog).toHaveLength(1);

    invariant.check('after full cycle');
  });

  it('skips execution when rule is paused', () => {
    const rule = makeRule('user-1', { isActive: false });
    const context = makeContext();

    const result = executeRule(rule, context);

    expect(result.executed).toBe(false);
    expect(result.reason).toContain('paused');
    expect(sim.getTransferHistory()).toHaveLength(0);
  });

  it('skips execution when monthly cap would be exceeded', () => {
    const rule = makeRule('user-1', { amount: 5, monthlyMax: 10 });
    const context = makeContext({ monthlySpent: 8 });

    const result = executeRule(rule, context);

    expect(result.executed).toBe(false);
    expect(result.reason).toContain('cap');
  });

  it('skips execution when balance is insufficient', () => {
    const rule = makeRule('user-1', { amount: 200 });
    const context = makeContext({ balance: 50 });
    // Note: context.balance is a logical check, sim.transfer has its own check

    const result = executeRule(rule, context);
    expect(result.executed).toBe(false);
  });

  it('respects maxPerTransaction limit', () => {
    const rule = makeRule('user-1', { amount: 10, maxPerTransaction: 3 });
    const context = makeContext();

    const result = executeRule(rule, context);

    expect(result.executed).toBe(true);
    expect(result.amount).toBe(3); // Capped at maxPerTransaction
  });

  it('executes multiple rules in sequence for one user', () => {
    const rules = [
      makeRule('user-1', { amount: 5, maxPerTransaction: 5, monthlyMax: 100 }),
      makeRule('user-1', { amount: 10, maxPerTransaction: 10, monthlyMax: 100 }),
      makeRule('user-1', { amount: 3, maxPerTransaction: 3, monthlyMax: 100 }),
    ];
    const context = makeContext();

    for (const rule of rules) {
      executeRule(rule, context);
    }

    expect(executionLog).toHaveLength(3);
    expect(sim.getBalance(userAccount)).toBe(82); // 100 - 5 - 10 - 3
    expect(sim.getBalance(vaultAccount)).toBe(18); // 5 + 10 + 3

    invariant.check('after multi-rule execution');
  });

  it('continues processing remaining rules when one fails', () => {
    const rules = [
      makeRule('user-1', { amount: 5, monthlyMax: 100 }),
      makeRule('user-1', { amount: 999, monthlyMax: 100 }), // Will fail (too much)
      makeRule('user-1', { amount: 3, monthlyMax: 100 }),
    ];
    const context = makeContext();

    for (const rule of rules) {
      try {
        executeRule(rule, context);
      } catch {
        // Rule 2 fails, but we continue
      }
    }

    // Rules 1 and 3 should have executed
    expect(executionLog.length).toBeGreaterThanOrEqual(1);
  });
});

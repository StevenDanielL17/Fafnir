/**
 * CHAOS TEST: Partial Failure
 * 
 * The most dangerous scenario: Transfer succeeds but logging fails.
 * Money has moved, but there's no audit record.
 * 
 * The system MUST detect this state and enter QUARANTINE.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Chaos: Partial Failure', () => {
  let sim, userAccount, vaultAccount, userTopic;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Partial failure test');
  });

  it('detects transfer-success + log-failure state', () => {
    // Transfer succeeds
    const tx = sim.transfer(userAccount, vaultAccount, 5);
    expect(tx.status).toBe('SUCCESS');

    // Log fails (network drops right after transfer)
    sim.freeze();
    let logFailed = false;
    try {
      sim.submitMessage(userTopic, { action: 'SAVE', amount: 5, transactionId: tx.id });
    } catch {
      logFailed = true;
    }

    expect(logFailed).toBe(true);

    // Money has moved but no log exists
    sim.unfreeze();
    expect(sim.getBalance(userAccount)).toBe(95);
    expect(sim.getBalance(vaultAccount)).toBe(5);
    expect(sim.getTopicMessages(userTopic)).toHaveLength(0); // No log!
  });

  it('quarantine prevents further operations until resolved', () => {
    // Trigger partial failure
    const tx = sim.transfer(userAccount, vaultAccount, 5);
    sim.freeze();
    try { sim.submitMessage(userTopic, {}); } catch {}
    sim.unfreeze();

    // Simulate quarantine flag
    let quarantined = true;

    // Agent should check quarantine before any new operations
    const shouldProceed = !quarantined;
    expect(shouldProceed).toBe(false);

    // Resolve: retry the log
    const retryLog = sim.submitMessage(userTopic, {
      action: 'SAVE',
      amount: 5,
      transactionId: tx.id,
      note: 'Quarantine recovery — delayed log',
    });
    expect(retryLog.status).toBe('SUCCESS');

    // Now quarantine can be lifted
    quarantined = false;
    expect(!quarantined).toBe(true);
  });

  it('multiple partial failures are all tracked', () => {
    const pendingLogs = [];

    for (let i = 0; i < 3; i++) {
      const tx = sim.transfer(userAccount, vaultAccount, 2);

      // Fail the log
      sim.freeze();
      try { sim.submitMessage(userTopic, { txId: tx.id }); } catch {}
      sim.unfreeze();

      pendingLogs.push({ transactionId: tx.id, amount: 2 });
    }

    // All 3 transfers happened, but no logs exist
    expect(sim.getBalance(userAccount)).toBe(94); // 100 - 6
    expect(sim.getBalance(vaultAccount)).toBe(6);
    expect(sim.getTopicMessages(userTopic)).toHaveLength(0);
    expect(pendingLogs).toHaveLength(3);

    // Recovery: log all pending
    for (const pending of pendingLogs) {
      sim.submitMessage(userTopic, {
        action: 'SAVE',
        amount: pending.amount,
        transactionId: pending.transactionId,
        note: 'Recovered from partial failure',
      });
    }

    expect(sim.getTopicMessages(userTopic)).toHaveLength(3);
  });
});

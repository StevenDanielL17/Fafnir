/**
 * BRIDGE TEST: Consensus Logging Integrity
 * 
 * Tests that every agent action is logged immutably to HCS.
 * If a transfer happens but the log doesn't, we have an audit gap.
 * 
 * RULE: Every agent action MUST be logged to HCS.
 * RULE: If HCS logging fails after transfer → QUARANTINE.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Bridge: Consensus Logging', () => {
  let sim, operatorId;
  let userAccount, vaultAccount, userTopic;

  beforeEach(() => {
    const setup = createSimulator(1000);
    sim = setup.sim;
    operatorId = setup.operatorId;

    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Fafnir log: test@user.com');
  });

  it('logs SAVE action after successful transfer', () => {
    const txRecord = sim.transfer(userAccount, vaultAccount, 5);
    const logResult = sim.submitMessage(userTopic, {
      action: 'SAVE',
      amount: 5,
      ruleId: 'rule-1',
      reasoning: 'Food spending detected',
      transactionId: txRecord.id,
    });

    expect(logResult.status).toBe('SUCCESS');
    expect(logResult.sequenceNumber).toBeGreaterThan(0);
  });

  it('every transfer has a corresponding HCS log', () => {
    // Simulate 5 save operations
    for (let i = 1; i <= 5; i++) {
      const txRecord = sim.transfer(userAccount, vaultAccount, i);
      sim.submitMessage(userTopic, {
        action: 'SAVE',
        amount: i,
        transactionId: txRecord.id,
      });
    }

    const messages = sim.getTopicMessages(userTopic);
    const transfers = sim.getTransferHistory(userAccount);

    // Count of logs must match count of transfers
    expect(messages.length).toBe(transfers.length);

    // Verify each transfer ID appears in a log
    for (const tx of transfers) {
      const hasLog = messages.some((m) => {
        const parsed = JSON.parse(m.contents);
        return parsed.transactionId === tx.id;
      });
      expect(hasLog).toBe(true);
    }
  });

  it('logs SAVE_FAILED when transfer fails', () => {
    // Attempt transfer that will fail
    try {
      sim.transfer(userAccount, vaultAccount, 999);
    } catch (err) {
      // Expected failure
    }

    // Log the failure
    const logResult = sim.submitMessage(userTopic, {
      action: 'SAVE_FAILED',
      amount: 999,
      error: 'Insufficient balance',
    });

    expect(logResult.status).toBe('SUCCESS');

    const messages = sim.getTopicMessages(userTopic);
    const lastMsg = JSON.parse(messages[messages.length - 1].contents);
    expect(lastMsg.action).toBe('SAVE_FAILED');
  });

  it('log entries contain all required fields', () => {
    const txRecord = sim.transfer(userAccount, vaultAccount, 5);
    sim.submitMessage(userTopic, {
      action: 'SAVE',
      amount: 5,
      ruleId: 'rule-1',
      reasoning: 'Test reason',
      transactionId: txRecord.id,
      timestamp: new Date().toISOString(),
      agent: 'fafnir',
    });

    const messages = sim.getTopicMessages(userTopic);
    const log = JSON.parse(messages[0].contents);

    expect(log.action).toBeDefined();
    expect(log.amount).toBeDefined();
    expect(log.ruleId).toBeDefined();
    expect(log.reasoning).toBeDefined();
    expect(log.transactionId).toBeDefined();
    expect(log.agent).toBe('fafnir');
  });

  it('HCS messages are ordered by sequence number', () => {
    for (let i = 1; i <= 10; i++) {
      sim.submitMessage(userTopic, { action: 'SAVE', seq: i });
    }

    const messages = sim.getTopicMessages(userTopic);
    for (let i = 0; i < messages.length - 1; i++) {
      expect(messages[i].sequenceNumber).toBeLessThan(messages[i + 1].sequenceNumber);
    }
  });

  it('each user has their own isolated topic', () => {
    const user2Topic = sim.createTopic('Fafnir log: user2@test.com');

    sim.submitMessage(userTopic, { action: 'SAVE', user: 'user1' });
    sim.submitMessage(user2Topic, { action: 'SAVE', user: 'user2' });

    const user1Messages = sim.getTopicMessages(userTopic);
    const user2Messages = sim.getTopicMessages(user2Topic);

    expect(user1Messages).toHaveLength(1);
    expect(user2Messages).toHaveLength(1);
    expect(JSON.parse(user1Messages[0].contents).user).toBe('user1');
    expect(JSON.parse(user2Messages[0].contents).user).toBe('user2');
  });
});

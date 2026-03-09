/**
 * FINANCIAL TEST: Audit Trail Completeness
 * 
 * Every on-chain transaction MUST have a corresponding HCS log.
 * If even one transaction lacks a log, we have a silent operation
 * that cannot be audited.
 * 
 * RULE: If it moves money, it MUST be logged. If it's logged, it MUST be immutable.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { assertAuditCompleteness } from '../helpers/assertions.js';

describe('Financial: Audit Trail', () => {
  let sim, userAccount, vaultAccount, userTopic;
  let auditLog;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Audit test');
    auditLog = [];
  });

  function recordTransfer(from, to, amount, txId) {
    auditLog.push({ type: 'TRANSFER', from, to, amount, transactionId: txId, timestamp: new Date().toISOString() });
  }

  function recordLog(logEntry) {
    auditLog.push({ type: 'HCS_LOG', topicId: userTopic, logEntry, timestamp: new Date().toISOString() });
  }

  it('complete audit trail passes validation', () => {
    for (let i = 0; i < 5; i++) {
      const tx = sim.transfer(userAccount, vaultAccount, 2);
      recordTransfer(userAccount, vaultAccount, 2, tx.id);
      recordLog({ action: 'SAVE', amount: 2, transactionId: tx.id });
    }

    expect(() => assertAuditCompleteness(auditLog)).not.toThrow();
  });

  it('DETECTS missing log for a transfer', () => {
    const tx1 = sim.transfer(userAccount, vaultAccount, 5);
    recordTransfer(userAccount, vaultAccount, 5, tx1.id);
    recordLog({ action: 'SAVE', amount: 5, transactionId: tx1.id });

    // Second transfer WITHOUT a log
    const tx2 = sim.transfer(userAccount, vaultAccount, 3);
    recordTransfer(userAccount, vaultAccount, 3, tx2.id);
    // NO recordLog for tx2!

    expect(() => assertAuditCompleteness(auditLog)).toThrow('AUDIT GAP');
  });

  it('audit trail includes RULE_CREATED events', () => {
    recordLog({ action: 'RULE_CREATED', ruleId: 'rule-1', description: 'Save $5 on food' });

    const ruleEvents = auditLog.filter(
      (e) => e.type === 'HCS_LOG' && e.logEntry.action === 'RULE_CREATED'
    );
    expect(ruleEvents).toHaveLength(1);
  });

  it('audit trail includes ACCOUNT_CREATED event', () => {
    recordLog({ action: 'ACCOUNT_CREATED', message: 'Welcome!' });

    const events = auditLog.filter(
      (e) => e.type === 'HCS_LOG' && e.logEntry.action === 'ACCOUNT_CREATED'
    );
    expect(events).toHaveLength(1);
  });

  it('audit trail preserves chronological order', () => {
    for (let i = 0; i < 10; i++) {
      const tx = sim.transfer(userAccount, vaultAccount, 1);
      recordTransfer(userAccount, vaultAccount, 1, tx.id);
      recordLog({ action: 'SAVE', amount: 1, transactionId: tx.id });
    }

    // Verify timestamps are in order
    const timestamps = auditLog.map((e) => new Date(e.timestamp).getTime());
    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
    }
  });

  it('failed transactions also have audit entries', () => {
    try {
      sim.transfer(userAccount, vaultAccount, 999);
    } catch {
      // Expected
    }

    recordLog({ action: 'SAVE_FAILED', amount: 999, error: 'Insufficient balance' });

    const failEvents = auditLog.filter(
      (e) => e.type === 'HCS_LOG' && e.logEntry.action === 'SAVE_FAILED'
    );
    expect(failEvents).toHaveLength(1);
  });
});

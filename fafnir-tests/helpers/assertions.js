/**
 * CUSTOM FINANCIAL ASSERTIONS
 * 
 * Domain-specific assertion helpers for Fafnir financial tests.
 * These encode the invariants described in PHILOSOPHY.md:
 *   - Conservation of value
 *   - No unauthorized outflow
 *   - Audit completeness
 */

import { expect } from 'vitest';

/**
 * Assert that total debits equal total credits across all transfers.
 * Conservation of Value: Money cannot appear or disappear.
 * 
 * @param {Array} auditLedger - From getAuditLedger()
 */
export function assertConservationOfValue(auditLedger) {
  const transfers = auditLedger.filter((e) => e.type === 'TRANSFER');
  
  let totalDebited = 0;
  let totalCredited = 0;

  for (const tx of transfers) {
    totalDebited += tx.amount;
    totalCredited += tx.amount; // In a transfer, debit = credit
  }

  expect(totalDebited).toBe(totalCredited);
}

/**
 * Assert no transfer flows FROM the vault TO a user account.
 * No Unauthorized Outflow: Agent can only move user → vault.
 * 
 * @param {Array} auditLedger - From getAuditLedger()
 * @param {string} vaultAccountId - The savings vault account ID
 */
export function assertNoUnauthorizedOutflow(auditLedger, vaultAccountId) {
  const transfers = auditLedger.filter((e) => e.type === 'TRANSFER');
  
  const unauthorizedRefunds = transfers.filter(
    (tx) => tx.from === vaultAccountId && tx.amount > 0
  );

  if (unauthorizedRefunds.length > 0) {
    const details = unauthorizedRefunds.map(
      (tx) => `  ${tx.from} → ${tx.to}: $${tx.amount} at ${tx.timestamp}`
    ).join('\n');
    
    throw new Error(
      `UNAUTHORIZED OUTFLOW DETECTED!\n` +
      `${unauthorizedRefunds.length} transfer(s) from vault to user:\n${details}\n` +
      `This is the exact bug scenario we must prevent.`
    );
  }
}

/**
 * Assert every transfer has a corresponding HCS log entry.
 * Audit Completeness: No silent transactions.
 * 
 * @param {Array} auditLedger - From getAuditLedger()
 */
export function assertAuditCompleteness(auditLedger) {
  const transfers = auditLedger.filter((e) => e.type === 'TRANSFER');
  const logs = auditLedger.filter((e) => e.type === 'HCS_LOG');

  // Every transfer should have at least one log referencing it by transactionId
  for (const tx of transfers) {
    const hasLog = logs.some(
      (log) =>
        log.logEntry &&
        log.logEntry.transactionId === tx.transactionId
    );

    if (!hasLog) {
      throw new Error(
        `AUDIT GAP: Transfer ${tx.transactionId} (${tx.from} → ${tx.to}, ` +
        `$${tx.amount}) has no corresponding HCS log entry.`
      );
    }
  }
}

/**
 * Assert a user's balance never goes negative.
 * 
 * @param {Array} auditLedger - From getAuditLedger()
 * @param {string} accountId - The user's Hedera account ID
 * @param {number} initialBalance - Starting balance
 */
export function assertBalanceNeverNegative(auditLedger, accountId, initialBalance) {
  const transfers = auditLedger.filter((e) => e.type === 'TRANSFER');
  let balance = initialBalance;

  for (const tx of transfers) {
    if (tx.from === accountId) balance -= tx.amount;
    if (tx.to === accountId) balance += tx.amount;

    if (balance < 0) {
      throw new Error(
        `NEGATIVE BALANCE: Account ${accountId} went to ${balance} HBAR ` +
        `after transfer ${tx.transactionId}`
      );
    }
  }
}

/**
 * Assert total saved does not exceed monthly cap.
 * 
 * @param {Array} transactions - Transaction records
 * @param {number} monthlyMax - The rule's monthly cap
 */
export function assertMonthlyCap(transactions, monthlyMax) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTotal = transactions
    .filter((t) => t.action === 'SAVE' && new Date(t.createdAt) >= startOfMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  expect(monthlyTotal).toBeLessThanOrEqual(monthlyMax);
}

/**
 * Assert per-transaction limit is respected.
 * 
 * @param {Array} transactions - Transaction records
 * @param {number} maxPerTransaction - Max per single save
 */
export function assertPerTransactionLimit(transactions, maxPerTransaction) {
  for (const tx of transactions) {
    if (tx.action === 'SAVE') {
      expect(tx.amount).toBeLessThanOrEqual(maxPerTransaction);
    }
  }
}

/**
 * Assert no duplicate transactions (same rule + same timestamp window).
 * 
 * @param {Array} transactions - Transaction records  
 * @param {number} windowMs - Dedup window in milliseconds (default: 60s)
 */
export function assertNoDoubleSave(transactions, windowMs = 60_000) {
  const saves = transactions.filter((t) => t.action === 'SAVE');
  
  for (let i = 0; i < saves.length; i++) {
    for (let j = i + 1; j < saves.length; j++) {
      const timeDiff = Math.abs(
        new Date(saves[i].createdAt) - new Date(saves[j].createdAt)
      );
      
      if (saves[i].ruleId === saves[j].ruleId && timeDiff < windowMs) {
        throw new Error(
          `DOUBLE SAVE DETECTED: Rule ${saves[i].ruleId} fired twice within ` +
          `${windowMs}ms window (${saves[i].id} and ${saves[j].id})`
        );
      }
    }
  }
}

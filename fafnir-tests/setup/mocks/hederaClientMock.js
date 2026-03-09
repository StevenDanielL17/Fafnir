/**
 * HEDERA CLIENT MOCK
 * 
 * Deterministic replacement for @hashgraph/sdk.
 * Every Hedera SDK method returns predictable, controllable results.
 * NO network calls. NO testnet dependency. Instant execution.
 * 
 * This mock tracks ALL operations in an audit log so financial tests
 * can verify money conservation, transfer direction, and log completeness.
 */

import { vi } from 'vitest';

// ── Audit Ledger ───────────────────────────────────────
// Every mock operation is recorded here for financial verification
let auditLedger = [];
let accountCounter = 10000;
let topicCounter = 50000;
let sequenceCounter = 0;
let balances = new Map();

/**
 * Reset the mock state. Call in beforeEach().
 */
export function resetHederaMock() {
  auditLedger = [];
  accountCounter = 10000;
  topicCounter = 50000;
  sequenceCounter = 0;
  balances = new Map();
  // Set default operator balance
  balances.set(process.env.HEDERA_OPERATOR_ID || '0.0.99999', 1000);
}

/**
 * Get the full audit ledger for verification.
 */
export function getAuditLedger() {
  return [...auditLedger];
}

/**
 * Get current mock balance for an account.
 */
export function getMockBalance(accountId) {
  return balances.get(accountId) || 0;
}

/**
 * Set mock balance for an account (for test setup).
 */
export function setMockBalance(accountId, amount) {
  balances.set(accountId, amount);
}

/**
 * Inject a failure for the next N operations of a given type.
 */
let injectedFailures = {};
export function injectFailure(operationType, error, count = 1) {
  injectedFailures[operationType] = { error, count };
}

function checkFailure(operationType) {
  const failure = injectedFailures[operationType];
  if (failure && failure.count > 0) {
    failure.count--;
    if (failure.count === 0) delete injectedFailures[operationType];
    throw failure.error;
  }
}

// ── Mock Hedera Service ────────────────────────────────

export const mockHederaService = {
  initialize: vi.fn(() => {
    checkFailure('initialize');
    return true;
  }),

  getClient: vi.fn(() => ({
    _mock: true,
    network: 'testnet-mock',
  })),

  createAccount: vi.fn(async () => {
    checkFailure('createAccount');
    const accountId = `0.0.${++accountCounter}`;
    balances.set(accountId, 5); // 5 HBAR initial funding
    const entry = {
      type: 'ACCOUNT_CREATED',
      accountId,
      initialBalance: 5,
      timestamp: new Date().toISOString(),
    };
    auditLedger.push(entry);
    return {
      accountId,
      privateKey: `mock-key-${accountId}`,
    };
  }),

  getBalance: vi.fn(async (accountId) => {
    checkFailure('getBalance');
    return balances.get(accountId) || 0;
  }),

  transferHbar: vi.fn(async (fromAccountId, toAccountId, amountHbar) => {
    checkFailure('transferHbar');

    // Enforce balance check (like real Hedera)
    const fromBalance = balances.get(fromAccountId) || 0;
    if (fromBalance < amountHbar) {
      throw new Error(`Insufficient balance: ${fromAccountId} has ${fromBalance} HBAR, needs ${amountHbar}`);
    }

    // Execute transfer
    balances.set(fromAccountId, fromBalance - amountHbar);
    balances.set(toAccountId, (balances.get(toAccountId) || 0) + amountHbar);

    const txId = `${fromAccountId}@${Date.now()}.000`;
    const entry = {
      type: 'TRANSFER',
      from: fromAccountId,
      to: toAccountId,
      amount: amountHbar,
      transactionId: txId,
      timestamp: new Date().toISOString(),
    };
    auditLedger.push(entry);

    return {
      status: 'SUCCESS',
      transactionId: txId,
    };
  }),

  createTopic: vi.fn(async (memo) => {
    checkFailure('createTopic');
    const topicId = `0.0.${++topicCounter}`;
    const entry = {
      type: 'TOPIC_CREATED',
      topicId,
      memo,
      timestamp: new Date().toISOString(),
    };
    auditLedger.push(entry);
    return topicId;
  }),

  submitLog: vi.fn(async (topicId, logEntry) => {
    checkFailure('submitLog');
    const seq = ++sequenceCounter;
    const entry = {
      type: 'HCS_LOG',
      topicId,
      sequenceNumber: seq,
      logEntry,
      timestamp: new Date().toISOString(),
    };
    auditLedger.push(entry);
    return {
      status: 'SUCCESS',
      sequenceNumber: seq,
    };
  }),

  subscribeTopic: vi.fn((topicId, onMessage) => {
    checkFailure('subscribeTopic');
    // No-op in mock — tests can manually invoke onMessage
  }),
};

/**
 * Install the mock by replacing the real hederaService module.
 * Call this in your test file's beforeAll/beforeEach.
 */
export function installHederaMock() {
  resetHederaMock();

  // Use vi.mock to replace the real service
  vi.mock('../../backend/services/hederaService', () => mockHederaService);

  return mockHederaService;
}

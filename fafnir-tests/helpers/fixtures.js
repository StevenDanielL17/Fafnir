/**
 * TEST FIXTURES
 * 
 * Factory functions for creating test data.
 * Every factory returns deterministic, overridable objects.
 */

let counter = 0;

export function resetFixtures() {
  counter = 0;
}

// ── User Fixtures ──────────────────────────────────────

export function makeUser(overrides = {}) {
  const n = ++counter;
  return {
    id: `user-${n}`,
    email: `user${n}@fafnir.dev`,
    hederaAccountId: `0.0.${10000 + n}`,
    hederaPrivateKey: `mock-key-${n}`,
    hcsTopicId: `0.0.${50000 + n}`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Rule Fixtures ──────────────────────────────────────

export function makeRule(userId, overrides = {}) {
  const n = ++counter;
  return {
    id: `rule-${n}`,
    userId,
    description: 'Save $5 whenever I spend on food',
    triggerType: 'spending_category',
    triggerValue: 'food',
    amount: 5,
    maxPerTransaction: 5,
    monthlyMax: 30,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeScheduledRule(userId, overrides = {}) {
  return makeRule(userId, {
    description: 'Save $10 every week',
    triggerType: 'scheduled',
    triggerValue: 'weekly',
    amount: 10,
    maxPerTransaction: 10,
    monthlyMax: 300,
    ...overrides,
  });
}

export function makeDailyRule(userId, overrides = {}) {
  return makeRule(userId, {
    description: 'Save $3 daily',
    triggerType: 'scheduled',
    triggerValue: 'daily',
    amount: 3,
    maxPerTransaction: 3,
    monthlyMax: 90,
    ...overrides,
  });
}

// ── Transaction Fixtures ───────────────────────────────

export function makeTransaction(userId, overrides = {}) {
  const n = ++counter;
  return {
    id: `tx-${n}`,
    userId,
    ruleId: `rule-1`,
    action: 'SAVE',
    amount: 5,
    hcsSequenceNumber: n,
    reasoning: 'Rule triggered: food spending detected',
    transactionId: `0.0.${10000 + n}@${Date.now()}.000`,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeFailedTransaction(userId, overrides = {}) {
  return makeTransaction(userId, {
    action: 'SAVE_FAILED',
    reasoning: 'Insufficient balance',
    transactionId: null,
    hcsSequenceNumber: null,
    ...overrides,
  });
}

// ── Context Fixtures ───────────────────────────────────

export function makeContext(overrides = {}) {
  return {
    balance: 100,
    monthlySpent: 10,
    ...overrides,
  };
}

export function makeLowBalanceContext() {
  return makeContext({ balance: 2, monthlySpent: 0 });
}

export function makeNearCapContext(monthlyMax = 30) {
  return makeContext({ balance: 100, monthlySpent: monthlyMax - 1 });
}

export function makeOverCapContext(monthlyMax = 30) {
  return makeContext({ balance: 100, monthlySpent: monthlyMax + 5 });
}

// ── Chat Context Fixtures ──────────────────────────────

export function makeChatContext(overrides = {}) {
  return {
    totalSaved: 23.0,
    monthlyTotal: 15.0,
    balance: 95,
    activeRules: [
      {
        description: 'Save $5 on food',
        amount: 5,
        monthlyMax: 30,
        isActive: true,
      },
    ],
    recentTransactions: [
      {
        action: 'SAVE',
        amount: 5,
        reasoning: 'Food spending triggered',
        createdAt: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}

// ── Hedera Fixtures ────────────────────────────────────

export function makeHederaTransferResult(overrides = {}) {
  return {
    status: 'SUCCESS',
    transactionId: `0.0.99999@${Date.now()}.000`,
    ...overrides,
  };
}

export function makeHCSLogResult(overrides = {}) {
  const n = ++counter;
  return {
    status: 'SUCCESS',
    sequenceNumber: n,
    ...overrides,
  };
}

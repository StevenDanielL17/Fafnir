/**
 * HEDERA SIMULATOR
 * 
 * A higher-level simulation layer that models Hedera-like behavior
 * for integration tests. Unlike the mock (which stubs individual methods),
 * the simulator models the ENTIRE state machine of accounts, balances,
 * topics, and token flows.
 * 
 * Used in bridge/ and financial/ tests where we need realistic behavior
 * without real network calls.
 */

export class HederaSimulator {
  constructor() {
    this.accounts = new Map();   // accountId → { balance, publicKey, createdAt }
    this.topics = new Map();     // topicId → { memo, messages: [] }
    this.transfers = [];         // All transfer history
    this.accountCounter = 10000;
    this.topicCounter = 50000;
    this.frozen = false;         // Simulate network freeze
  }

  // ── Account Operations ─────────────────────────────

  createAccount(initialBalance = 5) {
    if (this.frozen) throw new Error('HEDERA_NETWORK_FROZEN');

    const accountId = `0.0.${++this.accountCounter}`;
    this.accounts.set(accountId, {
      balance: initialBalance,
      publicKey: `mock-pubkey-${accountId}`,
      createdAt: Date.now(),
    });
    return accountId;
  }

  getBalance(accountId) {
    if (this.frozen) throw new Error('HEDERA_NETWORK_FROZEN');
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} does not exist`);
    return account.balance;
  }

  fundAccount(accountId, amount) {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} does not exist`);
    account.balance += amount;
  }

  // ── Transfer Operations ────────────────────────────

  transfer(from, to, amount) {
    if (this.frozen) throw new Error('HEDERA_NETWORK_FROZEN');
    if (amount <= 0) throw new Error('Transfer amount must be positive');

    const fromAccount = this.accounts.get(from);
    const toAccount = this.accounts.get(to);

    if (!fromAccount) throw new Error(`Sender ${from} does not exist`);
    if (!toAccount) throw new Error(`Receiver ${to} does not exist`);
    if (fromAccount.balance < amount) {
      throw new Error(`INSUFFICIENT_PAYER_BALANCE: ${from} has ${fromAccount.balance}, needs ${amount}`);
    }

    fromAccount.balance -= amount;
    toAccount.balance += amount;

    const record = {
      id: `${from}@${Date.now()}.${this.transfers.length}`,
      from,
      to,
      amount,
      timestamp: Date.now(),
      status: 'SUCCESS',
    };
    this.transfers.push(record);
    return record;
  }

  // ── Topic Operations ───────────────────────────────

  createTopic(memo = '') {
    if (this.frozen) throw new Error('HEDERA_NETWORK_FROZEN');

    const topicId = `0.0.${++this.topicCounter}`;
    this.topics.set(topicId, {
      memo,
      messages: [],
    });
    return topicId;
  }

  submitMessage(topicId, message) {
    if (this.frozen) throw new Error('HEDERA_NETWORK_FROZEN');

    const topic = this.topics.get(topicId);
    if (!topic) throw new Error(`Topic ${topicId} does not exist`);

    const seq = topic.messages.length + 1;
    topic.messages.push({
      sequenceNumber: seq,
      contents: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: Date.now(),
    });
    return { status: 'SUCCESS', sequenceNumber: seq };
  }

  getTopicMessages(topicId) {
    const topic = this.topics.get(topicId);
    if (!topic) throw new Error(`Topic ${topicId} does not exist`);
    return [...topic.messages];
  }

  // ── State Queries ──────────────────────────────────

  getTotalSupply() {
    let total = 0;
    for (const account of this.accounts.values()) {
      total += account.balance;
    }
    return total;
  }

  getTransferHistory(accountId = null) {
    if (!accountId) return [...this.transfers];
    return this.transfers.filter((t) => t.from === accountId || t.to === accountId);
  }

  // ── Chaos Controls ────────────────────────────────

  freeze() {
    this.frozen = true;
  }

  unfreeze() {
    this.frozen = false;
  }

  reset() {
    this.accounts.clear();
    this.topics.clear();
    this.transfers = [];
    this.accountCounter = 10000;
    this.topicCounter = 50000;
    this.frozen = false;
  }
}

/**
 * Create a pre-configured simulator with an operator account.
 */
export function createSimulator(operatorBalance = 1000) {
  const sim = new HederaSimulator();
  const operatorId = '0.0.99999';
  sim.accounts.set(operatorId, {
    balance: operatorBalance,
    publicKey: 'operator-pubkey',
    createdAt: Date.now(),
  });
  return { sim, operatorId };
}

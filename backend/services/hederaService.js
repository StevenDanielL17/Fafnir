/**
 * HEDERA SERVICE
 * 
 * Single Responsibility: All Hedera SDK interactions.
 *   - Account creation (Account Abstraction)
 *   - HTS token transfers (micro-savings)
 *   - HCS topic creation & message submission (action logs)
 * 
 * Low Coupling: No other service imports Hedera SDK directly.
 * If Hedera changes their SDK, ONLY this file changes.
 */

const {
  Client,
  AccountCreateTransaction,
  AccountBalanceQuery,
  TransferTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery,
  Hbar,
  PrivateKey,
} = require('@hashgraph/sdk');

let client = null;

/**
 * Initialize the Hedera client.
 * Called once at server startup.
 */
function initialize() {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!operatorId || !operatorKey) {
    throw new Error(
      'Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY in environment variables.\n' +
      'Get a testnet account at https://portal.hedera.com'
    );
  }

  if (network === 'testnet') {
    client = Client.forTestnet();
  } else if (network === 'mainnet') {
    client = Client.forMainnet();
  } else {
    client = Client.forPreviewnet();
  }

  client.setOperator(operatorId, operatorKey);
  console.log(`  Hedera client configured for ${network}`);
  return client;
}

/**
 * Get the initialized client instance.
 */
function getClient() {
  if (!client) throw new Error('Hedera client not initialized. Call initialize() first.');
  return client;
}

// ── ACCOUNT ABSTRACTION ────────────────────────────────

/**
 * Create a new Hedera account silently for a user.
 * The user never sees keys or addresses.
 * 
 * @returns {{ accountId: string, privateKey: string }}
 */
async function createAccount() {
  const newKey = PrivateKey.generateED25519();
  const publicKey = newKey.publicKey;

  const tx = await new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(new Hbar(5)) // Fund with 5 testnet HBAR
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const accountId = receipt.accountId.toString();

  console.log(`  Created Hedera account: ${accountId}`);

  return {
    accountId,
    privateKey: newKey.toStringDer(), // Store securely server-side
  };
}

/**
 * Get account balance in HBAR.
 * 
 * @param {string} accountId - e.g. "0.0.12345"
 * @returns {number} Balance in HBAR
 */
async function getBalance(accountId) {
  const balance = await new AccountBalanceQuery()
    .setAccountId(accountId)
    .execute(client);

  return balance.hbars.toNumber();
}

// ── HEDERA TOKEN SERVICE (HTS) ────────────────────────

/**
 * Transfer HBAR between accounts (micro-savings).
 * 
 * @param {string} fromAccountId 
 * @param {string} toAccountId 
 * @param {number} amountHbar 
 * @returns {{ status: string, transactionId: string }}
 */
async function transferHbar(fromAccountId, toAccountId, amountHbar) {
  const tx = await new TransferTransaction()
    .addHbarTransfer(fromAccountId, new Hbar(-amountHbar))
    .addHbarTransfer(toAccountId, new Hbar(amountHbar))
    .execute(client);

  const receipt = await tx.getReceipt(client);

  return {
    status: receipt.status.toString(),
    transactionId: tx.transactionId.toString(),
  };
}

// ── HEDERA CONSENSUS SERVICE (HCS) ────────────────────

/**
 * Create a new HCS topic for a user's action log.
 * Each user gets their own topic for immutable audit trail.
 * 
 * @param {string} memo - e.g. "Fafnir action log for user@email.com"
 * @returns {string} topicId - e.g. "0.0.12345"
 */
async function createTopic(memo = 'Fafnir Agent Action Log') {
  const tx = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId.toString();

  console.log(`  Created HCS topic: ${topicId}`);
  return topicId;
}

/**
 * Submit an immutable log message to a user's HCS topic.
 * 
 * @param {string} topicId - The user's topic ID
 * @param {object} logEntry - The action to log
 * @returns {{ status: string, sequenceNumber: number }}
 */
async function submitLog(topicId, logEntry) {
  const message = JSON.stringify({
    ...logEntry,
    timestamp: new Date().toISOString(),
    agent: 'fafnir',
  });

  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(topicId)
    .setMessage(message)
    .execute(client);

  const receipt = await tx.getReceipt(client);

  return {
    status: receipt.status.toString(),
    sequenceNumber: receipt.topicSequenceNumber
      ? receipt.topicSequenceNumber.toNumber()
      : null,
  };
}

/**
 * Subscribe to a user's HCS topic to read their action history.
 * 
 * @param {string} topicId 
 * @param {function} onMessage - callback(message, sequenceNumber)
 */
function subscribeTopic(topicId, onMessage) {
  new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(client, null, (message) => {
      const contents = Buffer.from(message.contents).toString('utf-8');
      try {
        const parsed = JSON.parse(contents);
        onMessage(parsed, message.sequenceNumber.toNumber());
      } catch {
        onMessage(contents, message.sequenceNumber.toNumber());
      }
    });
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  initialize,
  getClient,
  // Account Abstraction
  createAccount,
  getBalance,
  // HTS
  transferHbar,
  // HCS
  createTopic,
  submitLog,
  subscribeTopic,
};

/**
 * TRANSACTION MODEL
 * 
 * Week 1: In-memory store.
 * Week 3: Replace with PostgreSQL.
 * 
 * Mirrors HCS logs locally for fast querying.
 * Schema: id, userId, ruleId, action, amount, hcsSequenceNumber, reasoning, createdAt
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// In-memory store
const transactions = new Map();

// Persistence file
const STORAGE_FILE = path.join(__dirname, '../../.fafnir-transactions.json');

function loadFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      data.forEach(tx => transactions.set(tx.id, tx));
      console.log(`  Loaded ${data.length} transactions from disk`);
    }
  } catch (err) {
    console.error('Error loading transactions:', err.message);
  }
}

function saveToDisk() {
  try {
    const data = Array.from(transactions.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving transactions:', err.message);
  }
}

loadFromDisk();

/**
 * Record a transaction.
 */
function create(data) {
  const tx = {
    id: uuidv4(),
    userId: data.userId,
    ruleId: data.ruleId || null,
    action: data.action,         // 'SAVE', 'SAVE_FAILED', 'YIELD', etc.
    amount: data.amount,
    hcsSequenceNumber: data.hcsSequenceNumber || null,
    reasoning: data.reasoning || '',
    transactionId: data.transactionId || null,
    createdAt: new Date().toISOString(),
  };

  transactions.set(tx.id, tx);
  saveToDisk();
  return tx;
}

/**
 * Get all transactions for a user.
 */
function getByUserId(userId, options = {}) {
  let result = Array.from(transactions.values()).filter((t) => t.userId === userId);

  // Most recent first
  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get total amount saved this month for a user.
 */
function getMonthlyTotal(userId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return Array.from(transactions.values())
    .filter(
      (t) =>
        t.userId === userId &&
        t.action === 'SAVE' &&
        new Date(t.createdAt) >= startOfMonth
    )
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Get total amount saved all-time for a user.
 */
function getTotalSaved(userId) {
  return Array.from(transactions.values())
    .filter((t) => t.userId === userId && t.action === 'SAVE')
    .reduce((sum, t) => sum + t.amount, 0);
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  create,
  getByUserId,
  getMonthlyTotal,
  getTotalSaved,
};

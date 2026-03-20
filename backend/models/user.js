/**
 * USER MODEL
 * 
 * Week 1: In-memory store.
 * Week 3: Replace with PostgreSQL via Sequelize/Knex.
 * 
 * Schema mirrors the database design from the spec:
 *   id, email, hederaAccountId, hcsTopicId, createdAt
 */

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// In-memory store (replaced by PostgreSQL in Week 3)
const users = new Map();

// Simple persistence file
const STORAGE_FILE = path.join(__dirname, '../../.fafnir-users.json');

// Load users from disk on startup
function loadFromDisk() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
      data.forEach(user => users.set(user.id, user));
      console.log(`  Loaded ${data.length} users from disk`);
    }
  } catch (err) {
    console.error('Error loading users:', err.message);
  }
}

// Save users to disk
function saveToDisk() {
  try {
    const data = Array.from(users.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving users:', err.message);
  }
}

// Auto-load on require
loadFromDisk();

/**
 * Create a new user.
 * 
 * @param {{ email: string, hederaAccountId: string, hcsTopicId: string }} data
 * @returns {object} The created user
 */
function create(data) {
  const user = {
    id: uuidv4(),
    email: data.email,
    hederaAccountId: data.hederaAccountId || null,
    hederaPrivateKey: data.hederaPrivateKey || null, // Stored securely server-side
    hcsTopicId: data.hcsTopicId || null,
    createdAt: new Date().toISOString(),
  };

  users.set(user.id, user);
  saveToDisk();
  return user;
}

/**
 * Find user by ID.
 */
function getById(id) {
  return users.get(id) || null;
}

/**
 * Find user by email.
 */
function getByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

/**
 * Get all users.
 */
function getAll() {
  return Array.from(users.values());
}

/**
 * Update user fields.
 */
function update(id, data) {
  const user = users.get(id);
  if (!user) return null;

  Object.assign(user, data);
  saveToDisk();
  return user;
}

/**
 * Delete user.
 */
function remove(id) {
  const result = users.delete(id);
  if (result) saveToDisk();
  return result;
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  create,
  getById,
  getByEmail,
  getAll,
  update,
  remove,
};

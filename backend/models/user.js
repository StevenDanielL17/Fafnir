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

// In-memory store (replaced by PostgreSQL in Week 3)
const users = new Map();

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
  return user;
}

/**
 * Delete user.
 */
function remove(id) {
  return users.delete(id);
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

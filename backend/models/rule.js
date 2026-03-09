/**
 * RULE MODEL
 * 
 * Week 1: In-memory store.
 * Week 3: Replace with PostgreSQL.
 * 
 * Schema:
 *   id, userId, description, triggerType, triggerValue,
 *   amount, maxPerTransaction, monthlyMax, isActive, createdAt
 */

const { v4: uuidv4 } = require('uuid');

// In-memory store
const rules = new Map();

/**
 * Create a new saving rule for a user.
 * 
 * @param {string} userId 
 * @param {object} ruleData - Parsed rule from agentService.parseGoal()
 * @returns {object} The created rule
 */
function create(userId, ruleData) {
  const rule = {
    id: uuidv4(),
    userId,
    description: ruleData.description,
    triggerType: ruleData.triggerType,
    triggerValue: ruleData.triggerValue,
    amount: ruleData.amount,
    maxPerTransaction: ruleData.maxPerTransaction,
    monthlyMax: ruleData.monthlyMax,
    isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
    createdAt: new Date().toISOString(),
  };

  rules.set(rule.id, rule);
  return rule;
}

/**
 * Get all rules for a user.
 */
function getByUserId(userId) {
  return Array.from(rules.values()).filter((r) => r.userId === userId);
}

/**
 * Get a single rule by ID.
 */
function getById(id) {
  return rules.get(id) || null;
}

/**
 * Update a rule (e.g., change amount, pause/resume).
 */
function update(id, data) {
  const rule = rules.get(id);
  if (!rule) return null;

  Object.assign(rule, data);
  return rule;
}

/**
 * Toggle a rule active/paused.
 */
function toggleActive(id) {
  const rule = rules.get(id);
  if (!rule) return null;

  rule.isActive = !rule.isActive;
  return rule;
}

/**
 * Delete a rule.
 */
function remove(id) {
  return rules.delete(id);
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  create,
  getByUserId,
  getById,
  update,
  toggleActive,
  remove,
};

/**
 * NOTIFICATION SERVICE
 * 
 * Single Responsibility: Telling the user what happened.
 *   - In-app messages (stored for chat UI to display)
 *   - Future: push notifications, email, SMS
 * 
 * Low Coupling: 
 *   agentService calls notificationService.send()
 *   agentService doesn't know HOW the notification is delivered.
 *   Swap email for SMS later — only this file changes.
 */

// In-memory message store (Week 1)
// Week 3: Replace with PostgreSQL
const messageStore = new Map(); // userId → [messages]

/**
 * Send a notification to a user.
 * 
 * @param {string} userId 
 * @param {object} notification - { type, message }
 */
async function send(userId, notification) {
  const entry = {
    id: Date.now().toString(),
    ...notification,
    timestamp: new Date().toISOString(),
    read: false,
  };

  if (!messageStore.has(userId)) {
    messageStore.set(userId, []);
  }

  messageStore.get(userId).push(entry);
  console.log(`  📬 Notification for ${userId}: ${notification.message}`);

  return entry;
}

/**
 * Get all notifications for a user.
 * 
 * @param {string} userId 
 * @param {object} options - { unreadOnly: boolean, limit: number }
 * @returns {Array} notifications
 */
async function getMessages(userId, options = {}) {
  const messages = messageStore.get(userId) || [];

  let result = messages;
  if (options.unreadOnly) {
    result = result.filter((m) => !m.read);
  }

  // Most recent first
  result = result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (options.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Mark a notification as read.
 * 
 * @param {string} userId 
 * @param {string} messageId 
 */
async function markRead(userId, messageId) {
  const messages = messageStore.get(userId) || [];
  const msg = messages.find((m) => m.id === messageId);
  if (msg) msg.read = true;
}

/**
 * Clear all notifications for a user (for testing).
 */
async function clear(userId) {
  messageStore.set(userId, []);
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  send,
  getMessages,
  markRead,
  clear,
};

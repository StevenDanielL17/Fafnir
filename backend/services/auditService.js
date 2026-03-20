/**
 * AUDIT LOGGING SERVICE
 * 
 * Logs all critical actions for security and compliance:
 * - Authentication events (login, logout, failed attempts)
 * - Rule creation/modification/deletion
 * - Manual agent triggers
 * - Admin actions
 * - Hedera transaction events
 * 
 * All logs are immutable and timestamped.
 */

const fs = require('fs');
const path = require('path');

const AUDIT_LOG_FILE = path.join(__dirname, '..', 'data', 'audit_log.jsonl');

// Ensure audit log file exists
function initializeAuditLog() {
  const dir = path.dirname(AUDIT_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, '');
  }
}

/**
 * Log an audit event (append-only)
 */
function logAuditEvent(eventType, userId, action, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: userId || 'SYSTEM',
    action,
    details,
    ipAddress: details.ipAddress || 'unknown',
  };

  try {
    fs.appendFileSync(
      AUDIT_LOG_FILE,
      JSON.stringify(logEntry) + '\n'
    );
  } catch (error) {
    console.error('⚠️  Failed to write audit log:', error.message);
  }
}

/**
 * Read all audit logs
 */
function readAuditLogs(filter = {}) {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) return [];

    const logs = fs
      .readFileSync(AUDIT_LOG_FILE, 'utf-8')
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    // Apply filters if provided
    if (filter.userId) {
      return logs.filter((log) => log.userId === filter.userId);
    }
    if (filter.eventType) {
      return logs.filter((log) => log.eventType === filter.eventType);
    }
    if (filter.action) {
      return logs.filter((log) => log.action === filter.action);
    }

    return logs;
  } catch (error) {
    console.error('⚠️  Failed to read audit log:', error.message);
    return [];
  }
}

/**
 * Get audit logs for a specific user
 */
function getUserAuditLog(userId) {
  return readAuditLogs({ userId });
}

/**
 * Log authentication events
 */
function logAuthEvent(userId, action, ipAddress) {
  logAuditEvent('AUTH', userId, action, {
    ipAddress,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log rule/goal events
 */
function logRuleEvent(userId, action, ruleId, details = {}) {
  logAuditEvent('RULE', userId, action, {
    ruleId,
    ...details,
  });
}

/**
 * Log agent execution events
 */
function logAgentEvent(userId, action, details = {}) {
  logAuditEvent('AGENT', userId, action, {
    ...details,
  });
}

/**
 * Log Hedera transaction events
 */
function logHederaEvent(userId, action, transactionId, amount, details = {}) {
  logAuditEvent('HEDERA', userId, action, {
    transactionId,
    amount,
    ...details,
  });
}

/**
 * Log security events (failed auth, injection attempts, etc.)
 */
function logSecurityEvent(action, ipAddress, details = {}) {
  logAuditEvent('SECURITY', 'SYSTEM', action, {
    ipAddress,
    ...details,
  });
}

// Initialize on module load
initializeAuditLog();

module.exports = {
  logAuditEvent,
  readAuditLogs,
  getUserAuditLog,
  logAuthEvent,
  logRuleEvent,
  logAgentEvent,
  logHederaEvent,
  logSecurityEvent,
};

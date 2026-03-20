/**
 * RATE LIMITING MIDDLEWARE
 * 
 * Prevents brute force attacks and DDoS.
 * Different limits for different endpoints (strictness scales with sensitivity).
 */

const rateLimit = require('express-rate-limit');

// ── AUTH ENDPOINTS (STRICTEST) ──────────────────────────
// Max 5 login/signup attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
});

// ── AGENT TRIGGER (STRICT) ──────────────────────────────
// Max 10 manual agent triggers per hour per user
const agentTriggerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Agent trigger limit exceeded. Try again later.',
  skip: (req) => process.env.NODE_ENV !== 'production',
});

// ── GOAL CREATION (MODERATE) ────────────────────────────
// Max 30 rule creation attempts per hour per user
const goalCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: 'Rule creation limit exceeded. Try again later.',
  skip: (req) => process.env.NODE_ENV !== 'production',
});

// ── CHAT ENDPOINT (LOOSE) ───────────────────────────────
// Max 100 messages per hour per user (conversational)
const chatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Chat message limit exceeded. Try again later.',
  skip: (req) => process.env.NODE_ENV !== 'production',
});

module.exports = {
  authLimiter,
  agentTriggerLimiter,
  goalCreationLimiter,
  chatLimiter,
};

/**
 * AUTH ROUTES
 * 
 * POST /api/auth/signup  — Create account (email → Hedera account silently)
 * POST /api/auth/login   — Login (returns JWT)
 * GET  /api/auth/me      — Get current user (requires JWT)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const userModel = require('../models/user');
const hederaService = require('../services/hederaService');

const JWT_SECRET = process.env.JWT_SECRET || 'fafnir-dev-secret-change-me';

// ── Middleware: Auth ───────────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── POST /api/auth/signup ──────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user already exists
    const existing = userModel.getByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // 1. Create Hedera account silently (Account Abstraction)
    console.log(`\n🔑 Creating Hedera account for ${email}...`);
    const hedera = await hederaService.createAccount();

    // 2. Create HCS topic for user's action log
    console.log(`📋 Creating HCS topic for ${email}...`);
    const hcsTopicId = await hederaService.createTopic(`Fafnir log: ${email}`);

    // 3. Log the account creation event
    await hederaService.submitLog(hcsTopicId, {
      action: 'ACCOUNT_CREATED',
      message: 'Welcome to Fafnir! Your account has been created.',
    });

    // 4. Store user (never expose private key to frontend)
    const user = userModel.create({
      email,
      hederaAccountId: hedera.accountId,
      hederaPrivateKey: hedera.privateKey,
      hcsTopicId,
    });

    // 5. Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    console.log(`✓ User ${email} onboarded successfully\n`);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        // User never sees: hederaAccountId, privateKey, hcsTopicId
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ── POST /api/auth/login ───────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = userModel.getByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please sign up first.' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const user = userModel.getById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  });
});

module.exports = router;
module.exports.requireAuth = requireAuth;

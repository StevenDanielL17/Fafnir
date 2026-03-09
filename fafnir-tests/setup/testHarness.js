/**
 * TEST HARNESS
 * 
 * Provides a clean, isolated test environment for each test suite.
 * Creates fresh instances of models, services, and Express app
 * with all external dependencies mocked.
 * 
 * Usage:
 *   import { createTestHarness } from '../setup/testHarness.js';
 *   const harness = createTestHarness();
 *   // harness.app         → Express app (use with supertest)
 *   // harness.services    → All services (mocked)
 *   // harness.models      → All models (fresh in-memory stores)
 *   // harness.authToken   → Pre-generated JWT for test user
 *   // harness.testUser    → Pre-created test user object
 */

import { vi } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Create an isolated test environment.
 * Every call returns a FRESH set of mocks and stores.
 */
export function createTestHarness() {
  // ── Fresh model stores ─────────────────────────────
  // We import the real models — they use in-memory Maps that reset per-process
  // In forked mode, each test file gets its own process
  const userModel = require('../../backend/models/user');
  const ruleModel = require('../../backend/models/rule');
  const transactionModel = require('../../backend/models/transaction');

  // ── Create a test user ─────────────────────────────
  const testUser = userModel.create({
    email: 'test@fafnir.dev',
    hederaAccountId: '0.0.12345',
    hederaPrivateKey: 'test-private-key-never-real',
    hcsTopicId: '0.0.67890',
  });

  // ── Generate auth token ────────────────────────────
  const authToken = jwt.sign({ userId: testUser.id }, JWT_SECRET, { expiresIn: '1h' });

  // ── Create a second user (for isolation tests) ─────
  const otherUser = userModel.create({
    email: 'other@fafnir.dev',
    hederaAccountId: '0.0.54321',
    hederaPrivateKey: 'other-private-key-never-real',
    hcsTopicId: '0.0.98765',
  });
  const otherToken = jwt.sign({ userId: otherUser.id }, JWT_SECRET, { expiresIn: '1h' });

  return {
    models: { userModel, ruleModel, transactionModel },
    testUser,
    authToken,
    otherUser,
    otherToken,
    JWT_SECRET,

    // Helper: create a rule for the test user
    createRule(overrides = {}) {
      return ruleModel.create(testUser.id, {
        description: 'Save $5 on food',
        triggerType: 'spending_category',
        triggerValue: 'food',
        amount: 5,
        maxPerTransaction: 5,
        monthlyMax: 30,
        isActive: true,
        ...overrides,
      });
    },

    // Helper: create a transaction for the test user
    createTransaction(overrides = {}) {
      return transactionModel.create({
        userId: testUser.id,
        ruleId: 'test-rule-id',
        action: 'SAVE',
        amount: 5,
        hcsSequenceNumber: 1,
        reasoning: 'Test transaction',
        transactionId: '0.0.12345@1234567890.000',
        ...overrides,
      });
    },
  };
}

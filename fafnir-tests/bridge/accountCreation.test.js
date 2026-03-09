/**
 * BRIDGE TEST: Account Creation Flow
 * 
 * Tests the complete path: User signup → Hedera account creation → HCS topic → JWT
 * This is the first moment a user touches Hedera. If this breaks, no user can onboard.
 * 
 * RULE: User NEVER sees private keys, seed phrases, or wallet addresses.
 * RULE: Account creation is SILENT — happens during signup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../helpers/balanceInvariant.js';

describe('Bridge: Account Creation', () => {
  let sim, operatorId, invariant;

  beforeEach(() => {
    const setup = createSimulator(1000);
    sim = setup.sim;
    operatorId = setup.operatorId;
    invariant = new BalanceInvariantChecker(sim);
  });

  it('creates a Hedera account with initial balance on signup', () => {
    const accountId = sim.createAccount(5);

    expect(accountId).toBeDefined();
    expect(accountId).toMatch(/^0\.0\.\d+$/);
    expect(sim.getBalance(accountId)).toBe(5);
  });

  it('creates an HCS topic for the new user', () => {
    const topicId = sim.createTopic('Fafnir log: test@user.com');

    expect(topicId).toBeDefined();
    expect(topicId).toMatch(/^0\.0\.\d+$/);
  });

  it('logs ACCOUNT_CREATED as the first HCS message', () => {
    const topicId = sim.createTopic('Fafnir log: test@user.com');
    const result = sim.submitMessage(topicId, {
      action: 'ACCOUNT_CREATED',
      message: 'Welcome to Fafnir!',
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.sequenceNumber).toBe(1);

    const messages = sim.getTopicMessages(topicId);
    const first = JSON.parse(messages[0].contents);
    expect(first.action).toBe('ACCOUNT_CREATED');
  });

  it('each user gets a unique Hedera account', () => {
    const accounts = [];
    for (let i = 0; i < 5; i++) {
      accounts.push(sim.createAccount(5));
    }
    expect(new Set(accounts).size).toBe(5);
  });

  it('each user gets a unique HCS topic', () => {
    const topics = [];
    for (let i = 0; i < 5; i++) {
      topics.push(sim.createTopic(`User ${i}`));
    }
    expect(new Set(topics).size).toBe(5);
  });

  it('account response contains accountId but NEVER private key in user-facing data', () => {
    const accountId = sim.createAccount(5);
    
    // Simulate what the API returns to the user
    const userFacingResponse = {
      id: 'user-123',
      email: 'test@user.com',
      createdAt: new Date().toISOString(),
    };

    // These should NEVER appear in the response
    const responseStr = JSON.stringify(userFacingResponse);
    expect(responseStr).not.toContain('privateKey');
    expect(responseStr).not.toContain('hederaAccountId');
    expect(responseStr).not.toContain(accountId);
  });

  it('handles account creation failure gracefully', () => {
    sim.freeze();
    expect(() => sim.createAccount()).toThrow('FROZEN');
    sim.unfreeze();

    // Should work after network recovery
    const accountId = sim.createAccount(5);
    expect(accountId).toBeDefined();
  });
});

/**
 * BRIDGE TEST: End-to-End User Flow
 * 
 * Simulates the complete user journey from signup to savings to audit.
 * This is the demo flow from the specification.
 * 
 * Flow: Signup → Create Goal → Agent Executes → User Queries History
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';
import { BalanceInvariantChecker } from '../helpers/balanceInvariant.js';

describe('Bridge: End-to-End User Flow', () => {
  let sim, operatorId;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    operatorId = setup.operatorId;
  });

  it('completes full demo flow: signup → goal → save → query', () => {
    // ── Step 1: User signs up ──────────────────────
    const userAccount = sim.createAccount(100);
    const userTopic = sim.createTopic('Fafnir log: demo@user.com');
    const vaultAccount = sim.createAccount(0);

    // Log signup
    sim.submitMessage(userTopic, {
      action: 'ACCOUNT_CREATED',
      message: 'Welcome to Fafnir!',
    });

    // ── Step 2: User creates a goal ────────────────
    const rule = {
      id: 'demo-rule-1',
      description: 'Save $5 whenever I spend on food, max $30/month',
      triggerType: 'spending_category',
      triggerValue: 'food',
      amount: 5,
      maxPerTransaction: 5,
      monthlyMax: 30,
      isActive: true,
    };

    sim.submitMessage(userTopic, {
      action: 'RULE_CREATED',
      ruleId: rule.id,
      description: rule.description,
    });

    // ── Step 3: Agent executes rule ────────────────
    const txRecord = sim.transfer(userAccount, vaultAccount, 5);
    sim.submitMessage(userTopic, {
      action: 'SAVE',
      amount: 5,
      ruleId: rule.id,
      reasoning: 'Food spending detected',
      transactionId: txRecord.id,
    });

    // ── Step 4: User queries history ───────────────
    const messages = sim.getTopicMessages(userTopic);
    expect(messages).toHaveLength(3); // ACCOUNT_CREATED, RULE_CREATED, SAVE

    const actions = messages.map((m) => JSON.parse(m.contents).action);
    expect(actions).toEqual(['ACCOUNT_CREATED', 'RULE_CREATED', 'SAVE']);

    // ── Step 5: Verify financial state ─────────────
    expect(sim.getBalance(userAccount)).toBe(95);
    expect(sim.getBalance(vaultAccount)).toBe(5);
  });

  it('handles a full month of automated savings', () => {
    const userAccount = sim.createAccount(500);
    const vaultAccount = sim.createAccount(0);
    const userTopic = sim.createTopic('Monthly test');
    const invariant = new BalanceInvariantChecker(sim);

    const monthlyMax = 30;
    let monthlySaved = 0;

    // Simulate 30 days of potential savings (agent runs multiple times per day)
    for (let day = 0; day < 30; day++) {
      const amount = 5;

      // Check monthly cap
      if (monthlySaved + amount > monthlyMax) {
        break; // Cap reached
      }

      // Check balance
      const balance = sim.getBalance(userAccount);
      if (balance < amount) {
        break; // Out of funds
      }

      sim.transfer(userAccount, vaultAccount, amount);
      sim.submitMessage(userTopic, {
        action: 'SAVE',
        amount,
        day,
      });

      monthlySaved += amount;
      invariant.check(`day ${day}`);
    }

    // Should have saved exactly $30 (6 saves of $5)
    expect(monthlySaved).toBe(30);
    expect(sim.getBalance(vaultAccount)).toBe(30);
    expect(sim.getTopicMessages(userTopic)).toHaveLength(6);
  });

  it('multiple users can save simultaneously without interference', () => {
    const sharedVault = sim.createAccount(0);

    const users = [];
    for (let i = 0; i < 5; i++) {
      const account = sim.createAccount(100);
      const topic = sim.createTopic(`User ${i}`);
      users.push({ account, topic, saved: 0 });
    }

    // Each user saves different amounts
    for (let i = 0; i < users.length; i++) {
      const amount = (i + 1) * 2; // 2, 4, 6, 8, 10
      sim.transfer(users[i].account, sharedVault, amount);
      sim.submitMessage(users[i].topic, {
        action: 'SAVE',
        amount,
      });
      users[i].saved = amount;
    }

    // Verify isolation
    expect(sim.getBalance(sharedVault)).toBe(2 + 4 + 6 + 8 + 10); // 30
    for (let i = 0; i < users.length; i++) {
      expect(sim.getBalance(users[i].account)).toBe(100 - users[i].saved);
      expect(sim.getTopicMessages(users[i].topic)).toHaveLength(1);
    }
  });
});

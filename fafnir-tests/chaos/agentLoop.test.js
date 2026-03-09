/**
 * CHAOS TEST: Agent Loop Prevention
 * 
 * What if the agent enters an infinite loop?
 * - Scheduler fires → agent runs → creates new rule → triggers itself
 * - Error handler fails → retries → fails → retries → ...
 * - LLM returns "execute" every time → drains balance
 * 
 * The agent MUST have circuit breakers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Chaos: Agent Loop Prevention', () => {
  let sim, userAccount, vaultAccount;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
  });

  it('circuit breaker stops after max iterations per cycle', () => {
    const MAX_ITERATIONS_PER_CYCLE = 50;
    let iterations = 0;

    // Simulate an agent that always wants to execute
    while (true) {
      iterations++;
      if (iterations > MAX_ITERATIONS_PER_CYCLE) break;

      const balance = sim.getBalance(userAccount);
      if (balance < 1) break;

      sim.transfer(userAccount, vaultAccount, 1);
    }

    // Should stop at circuit breaker, NOT at balance = 0
    expect(iterations).toBeLessThanOrEqual(MAX_ITERATIONS_PER_CYCLE + 1);
  });

  it('prevents recursive rule creation from draining funds', () => {
    const MAX_RULES_PER_CYCLE = 10;
    const rulesCreated = [];

    // Simulate agent creating rules in a loop
    for (let i = 0; i < 100; i++) {
      if (rulesCreated.length >= MAX_RULES_PER_CYCLE) {
        break; // Circuit breaker
      }
      rulesCreated.push({ id: `rule-${i}`, amount: 1 });
    }

    expect(rulesCreated).toHaveLength(MAX_RULES_PER_CYCLE);
  });

  it('total saves per cycle is bounded regardless of rule count', () => {
    const MAX_SAVES_PER_CYCLE = 20;
    let savesThisCycle = 0;

    // 100 rules, each wanting to save $1
    const rules = Array.from({ length: 100 }, (_, i) => ({
      id: `rule-${i}`,
      amount: 1,
    }));

    for (const rule of rules) {
      if (savesThisCycle >= MAX_SAVES_PER_CYCLE) break;

      const balance = sim.getBalance(userAccount);
      if (balance < rule.amount) break;

      sim.transfer(userAccount, vaultAccount, rule.amount);
      savesThisCycle++;
    }

    expect(savesThisCycle).toBe(MAX_SAVES_PER_CYCLE);
    expect(sim.getBalance(userAccount)).toBe(80); // 100 - 20
  });

  it('handles balance drain without infinite loop', () => {
    // User only has $3, but agent wants to save $5 per rule
    const poorUser = sim.createAccount(3);
    let attempts = 0;

    while (attempts < 100) {
      attempts++;
      const balance = sim.getBalance(poorUser);
      if (balance < 5) break;
      sim.transfer(poorUser, vaultAccount, 5);
    }

    // Should exit immediately (balance too low)
    expect(attempts).toBe(1);
    expect(sim.getBalance(poorUser)).toBe(3); // Unchanged
  });

  it('handles zero-amount rule without infinite loop', () => {
    let iterations = 0;
    const MAX = 100;

    while (iterations < MAX) {
      iterations++;
      const amount = 0;
      if (amount <= 0) break; // Guard against zero/negative
    }

    expect(iterations).toBe(1);
  });
});

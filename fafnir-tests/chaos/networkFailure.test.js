/**
 * CHAOS TEST: Network Failure
 * 
 * What happens when Hedera is down?
 * The agent must fail gracefully, never lose data, and never
 * execute partial operations that leave the system inconsistent.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Chaos: Network Failure', () => {
  let sim, userAccount, vaultAccount, userTopic;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Chaos test');
  });

  it('all operations fail during network freeze', () => {
    sim.freeze();

    expect(() => sim.createAccount()).toThrow('FROZEN');
    expect(() => sim.getBalance(userAccount)).toThrow('FROZEN');
    expect(() => sim.transfer(userAccount, vaultAccount, 1)).toThrow('FROZEN');
    expect(() => sim.createTopic()).toThrow('FROZEN');
    expect(() => sim.submitMessage(userTopic, {})).toThrow('FROZEN');
  });

  it('state is preserved during outage', () => {
    // Do some operations
    sim.transfer(userAccount, vaultAccount, 10);
    expect(sim.getBalance(userAccount)).toBe(90);

    // Network goes down
    sim.freeze();
    try { sim.transfer(userAccount, vaultAccount, 5); } catch {}

    // Network comes back
    sim.unfreeze();

    // State should be exactly as before the outage
    expect(sim.getBalance(userAccount)).toBe(90);
    expect(sim.getBalance(vaultAccount)).toBe(10);
  });

  it('operations resume normally after recovery', () => {
    sim.freeze();
    sim.unfreeze();

    // Should work fine
    sim.transfer(userAccount, vaultAccount, 5);
    expect(sim.getBalance(vaultAccount)).toBe(5);

    sim.submitMessage(userTopic, { action: 'SAVE', amount: 5 });
    expect(sim.getTopicMessages(userTopic)).toHaveLength(1);
  });

  it('handles intermittent failures (freeze/unfreeze cycles)', () => {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < 10; i++) {
      if (i % 3 === 0) sim.freeze();
      else sim.unfreeze();

      try {
        sim.transfer(userAccount, vaultAccount, 1);
        successCount++;
      } catch {
        failCount++;
      }
    }

    expect(successCount + failCount).toBe(10);
    // Some should have succeeded, some should have failed
    expect(successCount).toBeGreaterThan(0);
    expect(failCount).toBeGreaterThan(0);
  });
});

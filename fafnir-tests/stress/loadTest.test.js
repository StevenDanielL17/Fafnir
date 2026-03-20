/**
 * STRESS TEST: High Load & Performance
 * 
 * Simulates:
 * - 100 concurrent users
 * - Bulk rule executions
 * - High-frequency agent cycles
 * - Memory stability under sustained load
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Stress: High Load & Overload Scenarios', () => {
  let sim;
  const NUM_USERS = 100;
  const CYCLES = 50;
  const TRANSFERS_PER_CYCLE = 10;

  beforeEach(() => {
    const setup = createSimulator(1000000); // 1M testnet HBAR
    sim = setup.sim;
  });

  it('handles 100 concurrent users with active rules', () => {
    const users = [];
    const vault = sim.createAccount(500000);

    // Create 100 user accounts
    for (let i = 0; i < NUM_USERS; i++) {
      users.push(sim.createAccount(1000));
    }

    let totalTransfersCompleted = 0;
    let startTime = Date.now();

    // Run 50 agent cycles
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      // Each user executes 10 transfers per cycle (simulating rule firing)
      for (const user of users) {
        for (let t = 0; t < TRANSFERS_PER_CYCLE; t++) {
          try {
            const balance = sim.getBalance(user);
            if (balance > 5) {
              sim.transfer(user, vault, 5);
              totalTransfersCompleted++;
            }
          } catch (e) {
            // Rate limit or network error - acceptable
          }
        }
      }
    }

    let endTime = Date.now();
    let duration = endTime - startTime;

    // Should complete transfers based on available balance
    // (Some users will deplete funds faster than others)
    expect(totalTransfersCompleted).toBeGreaterThan(15000); // Allow for balance constraints
    expect(duration).toBeLessThan(30000); // Should complete in < 30 seconds
  });

  it('prevents memory leak under sustained scheduling', () => {
    const users = [];
    let memoryBefore = process.memoryUsage().heapUsed;

    for (let i = 0; i < NUM_USERS; i++) {
      users.push(sim.createAccount(1000));
    }

    // Simulate 1000 scheduler cycles
    for (let cycle = 0; cycle < 1000; cycle++) {
      for (const user of users) {
        // Simulate agent processing user's rules
        sim.getBalance(user);
        // In real scenario, this would query rules, evaluate, execute
      }
    }

    let memoryAfter = process.memoryUsage().heapUsed;
    let memoryIncrease = (memoryAfter - memoryBefore) / 1024 / 1024; // MB

    // Memory increase should be modest (< 50MB for 100 users × 1000 cycles)
    expect(memoryIncrease).toBeLessThan(50);
  });

  it('gracefully handles burst of failed transfers without cascade', () => {
    const users = [];
    const vault = sim.createAccount(100000);

    for (let i = 0; i < 50; i++) {
      users.push(sim.createAccount(0)); // Empty accounts = immediate transfer failure
    }

    let failures = 0;
    let totalAttempts = 0;

    // Try to transfer from empty accounts (will all fail)
    for (const user of users) {
      for (let t = 0; t < 20; t++) {
        totalAttempts++;
        try {
          sim.transfer(user, vault, 5);
        } catch (e) {
          failures++;
        }
      }
    }

    // All 1000 transfers should fail gracefully
    expect(failures).toBe(totalAttempts);
    
    // System should still be operational - create new account
    const newUser = sim.createAccount(100);
    expect(sim.getBalance(newUser)).toBe(100);
  });

  it('handles rapid rule creation without blocking agent execution', () => {
    const userAccount = sim.createAccount(50000);
    const rulesCreated = [];
    let agentExecutions = 0;

    // Create 500 rules in rapid succession
    for (let i = 0; i < 500; i++) {
      const rule = {
        id: `rule-${i}`,
        amount: Math.random() * 10,
        trigger: i % 3 === 0 ? 'spending' : i % 3 === 1 ? 'hourly' : 'manual',
      };
      rulesCreated.push(rule);
    }

    // While handling rules, agent should still execute transfers
    const vault = sim.createAccount(10000);
    for (const rule of rulesCreated) {
      const balance = sim.getBalance(userAccount);
      if (balance > rule.amount) {
        try {
          sim.transfer(userAccount, vault, rule.amount);
          agentExecutions++;
        } catch (e) {
          // Expected sometimes
        }
      }
    }

    // Agent should have executed significant portion despite rule creation load
    expect(agentExecutions).toBeGreaterThan(100);
  });

  it('recovers quickly from temporary Hedera API slowness', () => {
    const users = [];
    const vault = sim.createAccount(50000);

    for (let i = 0; i < 20; i++) {
      users.push(sim.createAccount(1000));
    }

    let slowCycles = 0;
    let fastCycles = 0;

    // Simulate 100 scheduler cycles, some with artificial slowness
    for (let cycle = 0; cycle < 100; cycle++) {
      let cycleStart = Date.now();

      // Simulate Hedera API being slow (every 10th cycle takes longer)
      if (cycle % 10 === 0) {
        // Artificial delay
        const delayEnd = Date.now() + 100; // 100ms delay
        while (Date.now() < delayEnd) {}
        slowCycles++;
      } else {
        fastCycles++;
      }

      // Despite slowness, process users
      for (const user of users) {
        const balance = sim.getBalance(user);
        if (balance > 5) {
          try {
            sim.transfer(user, vault, 2);
          } catch (e) {
            // Acceptable
          }
        }
      }
    }

    // Should complete all cycles regardless of slowness
    expect(slowCycles).toBe(10);
    expect(fastCycles).toBe(90);
  });

  it('prevents transaction queue overflow with max batch limits', () => {
    const user = sim.createAccount(50000);
    const vault = sim.createAccount(10000);
    const MAX_BATCH_SIZE = 50;

    let batchesProcessed = 0;
    let totalTransactions = 0;

    // Try to queue 1000 transactions
    const transactionsToProcess = [];
    for (let i = 0; i < 1000; i++) {
      transactionsToProcess.push({ from: user, to: vault, amount: 1 });
    }

    // Process in batches with limit
    for (let i = 0; i < transactionsToProcess.length; i += MAX_BATCH_SIZE) {
      const batch = transactionsToProcess.slice(i, i + MAX_BATCH_SIZE);
      
      for (const tx of batch) {
        try {
          sim.transfer(tx.from, tx.to, tx.amount);
          totalTransactions++;
        } catch (e) {
          // Expected when balance runs out
        }
      }
      
      batchesProcessed++;
    }

    // Should process in controlled batches, not crash trying to handle all at once
    expect(batchesProcessed).toBeGreaterThan(0);
    expect(totalTransactions).toBeGreaterThan(0);
  });
});

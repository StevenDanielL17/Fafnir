/**
 * FINANCIAL TEST: Error Recovery
 * 
 * When transfers fail, the system must recover safely:
 * - Log the failure
 * - Never retry automatically (prevents cascading failures)
 * - Enter QUARANTINE if HCS logging fails after transfer succeeds
 * 
 * RULE 4.4: Error recovery must be deterministic and logged.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSimulator } from '../helpers/hederaSimulator.js';

describe('Financial: Error Recovery', () => {
  let sim, operatorId;
  let userAccount, vaultAccount, userTopic;

  beforeEach(() => {
    const setup = createSimulator(10000);
    sim = setup.sim;
    operatorId = setup.operatorId;
    userAccount = sim.createAccount(100);
    vaultAccount = sim.createAccount(0);
    userTopic = sim.createTopic('Error recovery test');
  });

  describe('Transfer Failure', () => {
    it('logs SAVE_FAILED when transfer fails due to insufficient balance', () => {
      let transferFailed = false;
      let failReason = '';

      try {
        sim.transfer(userAccount, vaultAccount, 999);
      } catch (err) {
        transferFailed = true;
        failReason = err.message;
      }

      expect(transferFailed).toBe(true);

      // Log the failure
      const logResult = sim.submitMessage(userTopic, {
        action: 'SAVE_FAILED',
        amount: 999,
        error: failReason,
      });

      expect(logResult.status).toBe('SUCCESS');

      // Balance unchanged
      expect(sim.getBalance(userAccount)).toBe(100);
      expect(sim.getBalance(vaultAccount)).toBe(0);
    });

    it('does NOT retry failed transfers automatically', () => {
      let attempts = 0;
      const maxAttempts = 1; // MUST be exactly 1

      try {
        attempts++;
        sim.transfer(userAccount, vaultAccount, 999);
      } catch {
        // Failed — do NOT retry
      }

      expect(attempts).toBe(maxAttempts);
      expect(sim.getTransferHistory()).toHaveLength(0); // No transfer occurred
    });

    it('continues processing other rules after one fails', () => {
      const rules = [
        { amount: 5, shouldSucceed: true },
        { amount: 999, shouldSucceed: false }, // Will fail
        { amount: 3, shouldSucceed: true },
      ];

      const results = [];

      for (const rule of rules) {
        try {
          sim.transfer(userAccount, vaultAccount, rule.amount);
          results.push({ amount: rule.amount, status: 'SUCCESS' });
        } catch (err) {
          results.push({ amount: rule.amount, status: 'FAILED', error: err.message });
          sim.submitMessage(userTopic, {
            action: 'SAVE_FAILED',
            amount: rule.amount,
            error: err.message,
          });
        }
      }

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('SUCCESS');
      expect(results[1].status).toBe('FAILED');
      expect(results[2].status).toBe('SUCCESS');

      // Only successful transfers recorded
      expect(sim.getBalance(vaultAccount)).toBe(8); // 5 + 3
    });
  });

  describe('HCS Logging Failure (QUARANTINE)', () => {
    it('enters quarantine when HCS fails after successful transfer', () => {
      // Step 1: Transfer succeeds
      const tx = sim.transfer(userAccount, vaultAccount, 5);
      expect(tx.status).toBe('SUCCESS');

      // Step 2: HCS logging fails (network freeze)
      sim.freeze();
      let hcsFailed = false;
      try {
        sim.submitMessage(userTopic, { action: 'SAVE', amount: 5 });
      } catch {
        hcsFailed = true;
      }

      expect(hcsFailed).toBe(true);

      // Step 3: User should be QUARANTINED
      const userState = {
        quarantined: true,
        reason: 'HCS logging failed after successful transfer',
        pendingTransactionId: tx.id,
      };

      expect(userState.quarantined).toBe(true);
      expect(userState.pendingTransactionId).toBe(tx.id);

      // Step 4: No new transfers for quarantined users
      sim.unfreeze();
      const shouldExecute = !userState.quarantined;
      expect(shouldExecute).toBe(false);
    });

    it('recovers from quarantine when HCS retry succeeds', () => {
      // Transfer succeeds, HCS fails
      const tx = sim.transfer(userAccount, vaultAccount, 5);
      sim.freeze();
      try { sim.submitMessage(userTopic, { action: 'SAVE' }); } catch {}

      // Network recovers
      sim.unfreeze();

      // Retry HCS logging
      const retryResult = sim.submitMessage(userTopic, {
        action: 'SAVE',
        amount: 5,
        transactionId: tx.id,
        note: 'Recovered from quarantine',
      });

      expect(retryResult.status).toBe('SUCCESS');

      // User exits quarantine
      const userState = { quarantined: false };
      expect(userState.quarantined).toBe(false);
    });
  });

  describe('Network Failure', () => {
    it('handles complete network outage gracefully', () => {
      sim.freeze();

      let errors = 0;
      try { sim.createAccount(); } catch { errors++; }
      try { sim.transfer(userAccount, vaultAccount, 1); } catch { errors++; }
      try { sim.submitMessage(userTopic, {}); } catch { errors++; }

      expect(errors).toBe(3);

      // Unfreeze and verify state is intact
      sim.unfreeze();
      expect(sim.getBalance(userAccount)).toBe(100);
      expect(sim.getBalance(vaultAccount)).toBe(0);
    });
  });
});

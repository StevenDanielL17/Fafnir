/**
 * BALANCE INVARIANT CHECKER
 * 
 * Enforces the fundamental law of financial systems:
 * "Money is neither created nor destroyed — only transferred."
 * 
 * Wraps a HederaSimulator or mock ledger and continuously validates
 * that total supply remains constant across all operations.
 */

export class BalanceInvariantChecker {
  constructor(simulator) {
    this.sim = simulator;
    this.initialSupply = simulator.getTotalSupply();
    this.violations = [];
    this.checkCount = 0;
  }

  /**
   * Check all invariants. Call after every operation.
   * Throws immediately on violation.
   */
  check(label = 'unnamed operation') {
    this.checkCount++;

    // Invariant 1: No negative balances (check FIRST — more specific)
    for (const [accountId, account] of this.sim.accounts.entries()) {
      if (account.balance < 0) {
        const violation = {
          type: 'NEGATIVE_BALANCE',
          label,
          accountId,
          balance: account.balance,
          checkNumber: this.checkCount,
        };
        this.violations.push(violation);
        throw new Error(
          `NEGATIVE_BALANCE [${label}]: Account ${accountId} has ` +
          `negative balance: ${account.balance}`
        );
      }
    }

    // Invariant 2: Total supply conservation
    const currentSupply = this.sim.getTotalSupply();
    if (Math.abs(currentSupply - this.initialSupply) > 0.0001) {
      const violation = {
        type: 'SUPPLY_MISMATCH',
        label,
        expected: this.initialSupply,
        actual: currentSupply,
        diff: currentSupply - this.initialSupply,
        checkNumber: this.checkCount,
      };
      this.violations.push(violation);
      throw new Error(
        `INVARIANT VIOLATION [${label}]: Total supply changed from ` +
        `${this.initialSupply} to ${currentSupply} (diff: ${violation.diff})`
      );
    }

    return true;
  }

  /**
   * Run a function and check invariants before and after.
   */
  async wrap(label, fn) {
    this.check(`before: ${label}`);
    const result = await fn();
    this.check(`after: ${label}`);
    return result;
  }

  /**
   * Get summary report.
   */
  report() {
    return {
      totalChecks: this.checkCount,
      violations: this.violations.length,
      initialSupply: this.initialSupply,
      currentSupply: this.sim.getTotalSupply(),
      details: this.violations,
    };
  }
}

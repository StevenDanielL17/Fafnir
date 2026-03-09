# FAFNIR TESTING PHILOSOPHY

## Core Belief

> "If the agent can move money, every path it takes must be proven safe."

Fafnir is a bridge between users and Hedera. Users trust it with real money.
A single undetected bug could cause the agent to silently refund, double-spend,
or drain funds without the company's knowledge. **Testing is not optional — it
is the firewall between user trust and financial catastrophe.**

---

## Library Philosophy

We deliberately choose **minimal, fast, zero-magic** tools:

| Library | Why | Alternative Rejected |
|---------|-----|---------------------|
| **Vitest** | ESM-native, fast, built-in mocking, parallel runs | Jest (slow CJS transform, heavy) |
| **Sinon** | Surgical stubbing of Hedera SDK calls without touching the network | Proxyquire (too implicit) |
| **Nock** | HTTP-level interception for LLM API calls | MSW (overkill for server-side) |
| **Supertest** | Express route testing without starting a server | Axios (requires live server) |
| **@vitest/coverage-v8** | Native V8 coverage, no instrumentation overhead | Istanbul (slower, requires babel) |

**No test database.** We test against the in-memory stores that Fafnir already uses.
**No live Hedera calls.** Every Hedera SDK method is stubbed via a mock layer.
**No LLM calls in CI.** LLM responses are fixtures, not live API calls.

---

## File Structure Philosophy

```
fafnir-tests/
│
├── setup/          → Bootstrap: mocks, harness, global config
│   └── mocks/      → Deterministic replacements for external services
│
├── helpers/        → Reusable tools: fixtures, assertions, simulators
│
├── unit/           → One test file per source file. Isolated. Fast.
│   ├── models/     → Data integrity
│   ├── services/   → Business logic
│   └── routes/     → HTTP contract
│
├── bridge/         → User ↔ Hedera path integrity
│                     (The most critical layer. If this breaks, users lose money.)
│
├── financial/      → Money conservation, refund guards, double-spend prevention
│                     (Catches the bug where agent refunds without company knowledge.)
│
├── security/       → Auth bypass, injection, key exposure
│
├── chaos/          → Network failures, partial failures, infinite loops
│
└── self-upgrade/   → Meta-testing: the test suite tests itself and evolves
```

---

## Testing Pyramid

```
         ╱╲
        ╱ C ╲        Chaos (3-5 tests)
       ╱─────╲       "What if everything goes wrong?"
      ╱  SEC   ╲     Security (3-5 tests)
     ╱──────────╲    "Can someone exploit this?"
    ╱  FINANCIAL  ╲  Financial Safety (6-8 tests)
   ╱───────────────╲ "Is money conserved? Are refunds guarded?"
  ╱    BRIDGE        ╲  Bridge Integration (5-7 tests)
 ╱────────────────────╲ "Does the user↔Hedera path work end to end?"
╱        UNIT           ╲  Unit Tests (15-20 tests)
╱────────────────────────╲ "Does each function do what it claims?"
```

---

## The Refund Guard Principle

The user's core fear: **"An unsolved bug causes the agent to revert and send
back money as a refund to users without the company's knowledge."**

Our financial tests enforce three invariants:

1. **Conservation of Value**: Total HBAR debited from users must equal total
   HBAR credited to the savings vault. No money appears or disappears.

2. **No Unauthorized Outflow**: The agent can ONLY move money FROM user TO vault.
   Any transfer in the reverse direction (vault → user) requires an explicit
   `REFUND` action that is:
   - Logged to HCS immutably
   - Flagged with a `[REFUND_ALERT]` notification
   - Rate-limited (max 1 refund per user per hour)
   - Blocked entirely if no corresponding failed transaction exists

3. **Audit Completeness**: Every on-chain transaction MUST have a corresponding
   HCS log entry. If a transfer executes but the log fails, the system enters
   a `QUARANTINE` state and halts all operations for that user until manually
   reviewed.

---

## Self-Upgrading Test Philosophy

The `self-upgrade/` directory contains a meta-test runner that:

1. **Scans the main codebase** for new functions, routes, and services
2. **Compares against existing test coverage** to find gaps
3. **Generates skeleton test files** for uncovered code
4. **Reports coverage drift** — if new code is added without tests, CI fails

This ensures the test suite grows WITH the codebase, not behind it.

---

## Running Tests

```bash
# All tests
npm test

# By domain
npm run test:unit          # Fast, isolated
npm run test:bridge        # User↔Hedera paths
npm run test:financial     # Money safety
npm run test:security      # Attack vectors
npm run test:chaos         # Failure scenarios

# Coverage
npm run test:coverage

# Self-upgrade check
npm run test:upgrade
```

---

## Golden Rule

**Never merge code that moves money without a corresponding financial test.**

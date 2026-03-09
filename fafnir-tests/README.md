# FAFNIR TESTING CODEBASE

## Quick Start

```bash
cd fafnir-tests
npm install
npm test
```

## Architecture

```
fafnir-tests/
├── PHILOSOPHY.md       # Why we test the way we do
├── RULES.md            # Build rules (from SPECIFICATION.md)
├── vitest.config.js    # Test runner configuration
├── .env.test           # Fake credentials (never real keys)
│
├── setup/              # Test infrastructure
│   ├── globalSetup.js  # Runs before all tests
│   ├── testHarness.js  # Creates isolated test environments
│   └── mocks/
│       ├── hederaClientMock.js  # Mocked Hedera SDK
│       ├── llmMock.js           # Mocked LLM responses
│       └── storeMock.js         # Fresh in-memory stores
│
├── helpers/            # Reusable test utilities
│   ├── assertions.js   # Financial assertion helpers
│   ├── fixtures.js     # Test data factories
│   ├── hederaSimulator.js  # Simulated Hedera state machine
│   └── balanceInvariant.js # Balance conservation checker
│
├── unit/               # One test per source file
│   ├── models/         # Data integrity tests
│   └── services/       # Business logic tests
│
├── bridge/             # User ↔ Hedera path integrity
│   ├── accountCreation.test.js
│   ├── tokenTransfer.test.js
│   ├── consensusLogging.test.js
│   ├── ruleExecution.test.js
│   └── endToEnd.test.js
│
├── financial/          # Money safety (THE critical tests)
│   ├── balanceInvariant.test.js
│   ├── refundGuard.test.js      ← Catches unauthorized refunds
│   ├── doubleSave.test.js
│   ├── limitEnforcement.test.js
│   ├── errorRecovery.test.js
│   └── auditTrail.test.js
│
├── security/           # Attack vectors
│   ├── authBypass.test.js
│   ├── ruleInjection.test.js
│   └── keyExposure.test.js
│
├── chaos/              # Failure scenarios
│   ├── networkFailure.test.js
│   ├── partialFailure.test.js
│   └── agentLoop.test.js
│
└── self-upgrade/       # Meta-testing
    └── runner.js       # Detects coverage gaps automatically
```

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Unit tests only |
| `npm run test:bridge` | Bridge integration tests |
| `npm run test:financial` | Financial safety tests |
| `npm run test:security` | Security tests |
| `npm run test:chaos` | Chaos/failure tests |
| `npm run test:coverage` | With coverage report |
| `npm run test:watch` | Watch mode |
| `npm run test:upgrade` | Self-upgrade analysis |

## The Refund Guard

The `financial/refundGuard.test.js` suite specifically addresses the critical concern:

> *"An undetected bug causes the agent to revert and send money back as a refund without the company's knowledge."*

It enforces three invariants:
1. **Direction Enforcement** — Agent can ONLY move money user → vault
2. **Outflow Detection** — Any vault → user transfer triggers UNAUTHORIZED OUTFLOW alert
3. **Audit Completeness** — Every transfer must have an HCS log entry

## Library Choices

| Library | Purpose | Why This One |
|---------|---------|-------------|
| Vitest | Test runner | ESM-native, fast, built-in mocking |
| Sinon | Stubbing | Surgical replacement of Hedera SDK |
| Nock | HTTP mock | Intercepts LLM API calls |
| Supertest | Route testing | Tests Express without live server |

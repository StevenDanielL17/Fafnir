# FAFNIR BUILD RULES
### Copied from SPECIFICATION.md — Every developer and every test MUST respect these rules.

---

## 0. GOLDEN RULE

> "If it moves money, it MUST be tested. If it's tested, it MUST be logged. If it's logged, it MUST be immutable."

---

## 1. ARCHITECTURE RULES

### 1.1 Layer Discipline
```
Routes → Services → Hedera SDK
         ↕
       Models (data)
```

- **Routes** handle HTTP only. No business logic. No Hedera calls.
- **Services** own business logic. One responsibility per service.
- **Models** own data access. No service logic.
- **NEVER skip a layer.** A route must never call Hedera SDK directly.

### 1.2 Service Boundaries

| Service | Owns | Never Touches |
|---------|------|---------------|
| `hederaService` | All @hashgraph/sdk calls | Business logic, user data |
| `agentService` | Decision-making, rule evaluation | Hedera SDK directly |
| `langchainAgent` | LLM interaction | Hedera SDK, database |
| `schedulerService` | Cron timing | Decision logic, Hedera SDK |
| `notificationService` | User messaging | Hedera, decisions |
| `holService` | HOL Registry | Everything else |

### 1.3 Coupling Rule
If changing one service requires changing another, the architecture is broken. Fix the boundary.

---

## 2. HEDERA INTEGRATION RULES

### 2.1 Account Abstraction
- User NEVER sees private keys, seed phrases, or wallet addresses
- Account creation is SILENT — happens during signup
- Private keys stored server-side ONLY (never in JWT, never in frontend)

### 2.2 Token Service (HTS)
- All transfers go through `hederaService.transferHbar()`
- Agent can ONLY transfer: user → savings vault
- Reverse transfers (vault → user) require explicit `REFUND` action with logging
- Zero-amount transfers are valid (for testing pipeline)

### 2.3 Consensus Service (HCS)
- Every agent action MUST be logged to HCS
- Log format: `{ action, amount, ruleId, reasoning, timestamp, agent: 'fafnir' }`
- Each user gets their own topic (created at signup)
- If HCS logging fails after a transfer succeeds → QUARANTINE the user

### 2.4 Balance Rules
- NEVER transfer more than user's balance
- NEVER exceed `maxPerTransaction`
- NEVER exceed `monthlyMax`
- Check balance BEFORE every transfer, not after

---

## 3. AGENT RULES

### 3.1 Decision Flow
```
1. Get user rules (active only)
2. Get user context (balance, monthly spent)
3. For each rule:
   a. Evaluate (LLM or fallback)
   b. Check limits (per-tx, monthly cap, balance)
   c. Execute transfer if approved
   d. Log to HCS
   e. Record locally
   f. Notify user
```

### 3.2 LLM Rules
- LLM is OPTIONAL — keyword fallback must always work
- LLM temperature: 0.2 (deterministic for financial operations)
- LLM responses must be valid JSON — parse errors fall back to keyword parser
- NEVER let LLM decide to send money WITHOUT limit checks

### 3.3 Rule Parsing
- Input: plain English text
- Output: `{ description, triggerType, triggerValue, amount, maxPerTransaction, monthlyMax, isActive }`
- Defaults: `maxPerTransaction = amount`, `monthlyMax = amount * 30`
- `triggerType` must be one of: `spending_category`, `scheduled`, `manual`

### 3.4 Scheduler Rules
- Default interval: every 15 minutes
- Process users sequentially (not in parallel) to prevent race conditions
- If one user's cycle fails, continue to the next user
- Log failures to HCS

---

## 4. FINANCIAL SAFETY RULES

### 4.1 Conservation of Value
Total HBAR debited from all users MUST equal total HBAR credited to the savings vault. If they differ by even 0.0001 HBAR, the system has a bug.

### 4.2 No Unauthorized Refunds
The agent MUST NOT send money from vault back to user unless:
1. A corresponding failed transaction exists
2. The refund is explicitly logged to HCS with action `REFUND`
3. A `[REFUND_ALERT]` notification is sent
4. Rate limit: max 1 refund per user per hour

**This is the critical bug scenario:** An undetected bug causes the agent to revert a transaction and send back money as a refund without the company's knowledge. Our tests MUST catch this.

### 4.3 Double-Save Prevention
- Same rule MUST NOT fire twice within 60 seconds
- Check transaction history before executing
- If duplicate detected, log `DUPLICATE_PREVENTED` to HCS

### 4.4 Error Recovery
When a transfer fails:
1. Log `SAVE_FAILED` to HCS (with error message)
2. Record failed transaction locally
3. Do NOT retry automatically (prevents cascading failures)
4. Notify user if notification service is available

When HCS logging fails after a successful transfer:
1. Record transfer locally with `hcs_status: 'PENDING'`
2. Set user state to `QUARANTINE`
3. Retry HCS logging on next cycle
4. Do NOT execute new transfers for quarantined users

---

## 5. AUTH RULES

### 5.1 Authentication
- JWT-based (HS256, 7-day expiry)
- All goal, chat, and history endpoints require valid JWT
- JWT contains `userId` only (never hederaAccountId or private key)

### 5.2 Authorization
- Users can ONLY access their own data
- A user cannot read/modify another user's rules, transactions, or history
- Rule ownership verified on every PATCH/DELETE

---

## 6. API CONTRACT

### 6.1 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/goals` | Yes | Create saving goal |
| POST | `/api/goals/parse` | Yes | Preview parsed goal |
| GET | `/api/goals` | Yes | List rules |
| PATCH | `/api/goals/:id` | Yes | Update rule |
| DELETE | `/api/goals/:id` | Yes | Delete rule |
| POST | `/api/chat` | Yes | Chat with Fafnir |
| GET | `/api/history` | Yes | Transaction history |
| GET | `/api/history/summary` | Yes | Savings summary |
| GET | `/api/history/notifications` | Yes | User notifications |
| POST | `/api/history/trigger` | Yes | Manual agent trigger |
| GET | `/api/health` | No | Health check |

### 6.2 Response Format
- Success: `{ data... }` with 200/201
- Error: `{ error: "message" }` with appropriate status code
- All responses are JSON

---

## 7. DATA RULES

### 7.1 User Schema
```
id: UUID (primary key)
email: string (unique)
hederaAccountId: string
hederaPrivateKey: string (NEVER exposed to frontend)
hcsTopicId: string
createdAt: ISO timestamp
```

### 7.2 Rule Schema
```
id: UUID (primary key)
userId: UUID (foreign key → users)
description: string (original plain English)
triggerType: 'spending_category' | 'scheduled' | 'manual'
triggerValue: string | null
amount: number
maxPerTransaction: number
monthlyMax: number
isActive: boolean
createdAt: ISO timestamp
```

### 7.3 Transaction Schema
```
id: UUID (primary key)
userId: UUID (foreign key → users)
ruleId: UUID | null (foreign key → rules)
action: 'SAVE' | 'SAVE_FAILED' | 'YIELD' | 'REFUND'
amount: number
hcsSequenceNumber: number | null
reasoning: string
transactionId: string | null (Hedera tx ID)
createdAt: ISO timestamp
```

---

## 8. TESTING RULES

### 8.1 Test-Code Parity
Every source file MUST have a corresponding test file:
- `backend/services/hederaService.js` → `fafnir-tests/unit/services/hederaService.test.js`
- `backend/models/rule.js` → `fafnir-tests/unit/models/rule.test.js`
- `backend/routes/auth.js` → `fafnir-tests/unit/routes/auth.test.js`

### 8.2 Test Isolation
- No test depends on another test's output
- No test requires a live network connection
- No test requires an API key
- All external dependencies are mocked

### 8.3 Financial Tests Are Mandatory
Before merging ANY code that:
- Calls `transferHbar` → write a financial/balance test
- Modifies `agentService.runCycle` → write a bridge/refund guard test
- Changes rule evaluation logic → write a limit enforcement test

### 8.4 Coverage Requirements
- Statements: ≥ 70%
- Branches: ≥ 60%
- Functions: ≥ 70%
- Lines: ≥ 70%

---

## 9. DEPLOYMENT RULES

### 9.1 Environment
- Development: local + testnet
- Staging: Vercel preview + testnet
- Production: Vercel + Railway + testnet (hackathon scope)
- NEVER deploy to mainnet without auditing all financial tests

### 9.2 Environment Variables
- All secrets in `.env` (never committed)
- `.env.example` with placeholder values committed
- Test uses `.env.test` with FAKE values only

---

## 10. WORKFLOW RULES

### 10.1 Command Execution
- **Only the project owner runs commands.** AI assistants provide commands — they do NOT execute them.
- All shell commands, install commands, and deployment commands are provided as copy-paste snippets.
- This applies to: `npm install`, `npm test`, `npm run`, `git`, deployment scripts, and any terminal command.

### 10.2 Rationale
The human must see and approve every command before it touches the system. This prevents:
- Unintended side effects from automated execution
- Silent failures that go unnoticed
- Irreversible operations without human review

---

## 11. HOL REGISTRY RULES

### 11.1 Registration
- Agent name: `Fafnir`
- Capabilities: `['save', 'yield', 'audit', 'chat']`
- Protocol: HCS-10
- Registration happens at server startup (idempotent)

### 11.2 Independence
- HOL integration is fully optional
- Removing HOL does NOT affect any other service
- `holService.js` never imports from other services

---

*These rules are the contract between the Fafnir codebase and the Fafnir testing codebase. Break a rule, break a test. Break a test, fix the code.*

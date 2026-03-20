# Fafnir

**Your money has been waiting.**

---

Most people want to save money. Almost none do it consistently. Not because they lack discipline — but because saving requires remembering, deciding, and acting at the right moment. Banks offer no automation, no yield, and no intelligence. Crypto offers better infrastructure but requires knowledge most people will never have.

Fafnir closes that gap. Tell it your goal in plain English. It saves, grows, and protects your money — automatically, on Hedera — without you ever knowing the underlying technology exists.

---

## The Problem

Savings infrastructure is broken in three distinct ways.

**Banks extract instead of serve.** A standard savings account in Southeast Asia pays 0.01–0.5% APY. The bank takes your deposits, earns 4–8% deploying them, and returns almost nothing. There is no automation, no intelligence, and no way to participate in higher-yield instruments without either significant wealth or significant technical knowledge.

**Crypto solves the yield problem but creates a new one.** DeFi protocols offer 3–8% APY on stablecoins. But to access them, a user must understand wallets, seed phrases, gas fees, slippage, and smart contract risk. The learning curve eliminates the vast majority of the people who would benefit most — the 1.4 billion unbanked adults globally who own a smartphone but not a bank account.

**Automation does not exist at the personal level.** Saving $5 every time you eat out is a sensible rule. No bank offers it. No crypto protocol supports it. The only way to implement it today is manually, every time, which means it never happens consistently.

---

## How Fafnir Was Born

The question that created Fafnir was simple: *what brings someone who has never heard of Hedera to create an account and come back next month?*

Not a DeFi dashboard. Not a trading tool. Not a governance portal. Something that solves a problem so universal and so personal that it works for a software engineer in Chennai and a market vendor in Jakarta with equal elegance.

Personal finance is universal. The desire to save is universal. The frustration with forgetting to save is universal. And Hedera's infrastructure — $0.0001 transactions, 10,000 TPS, native account abstraction, Consensus Service — is uniquely suited to making micro-saving economically viable in a way no other chain can match.

Fafnir is the dragon from Norse mythology that guarded gold and prevented access. The name is deliberately inverted: Fafnir unlocks financial infrastructure that was previously inaccessible to ordinary people.

---

## What Fafnir Does

A user signs up with their email address. That is the only action required.

Behind that signup, Fafnir silently creates a Hedera account using native account abstraction, generates a dedicated HCS audit topic, and initializes the agent. The user never sees a private key, a seed phrase, or a wallet address. They see a chat interface.

They type: *"Save $5 whenever I eat out, max $30 a month."*

The AI agent parses that sentence, extracts the trigger type, amount, and limits, and creates a saving rule. Every 15 minutes, a scheduler evaluates all active rules against each user's context. When a rule fires, the agent executes an HBAR transfer on Hedera, logs the decision immutably to the user's HCS topic, and sends a plain-English notification: *"Saved $5 today. Total this month: $23. You have $7 remaining in your monthly limit."*

The user can ask follow-up questions: *"What did you do this week?"* *"Pause my savings until Friday."* *"How much have I saved in total?"* The agent answers from real data, with every figure traceable to an on-chain transaction.

---

## Architecture

Fafnir is built on a principle of **high cohesion and low coupling**. Each service owns exactly one responsibility and communicates through defined interfaces. No service reaches into another's internals.

```
┌─────────────────────────────────────────────────────┐
│                 Frontend — Next.js                  │
│         Chat Interface · Dashboard · History        │
└──────────────────────┬──────────────────────────────┘
                       │ REST API + JWT
┌──────────────────────▼──────────────────────────────┐
│                Backend — Node.js                    │
│                                                     │
│  Auth Service      Rule Engine      HOL Service     │
│  (identity)        (user intent)    (discoverability│
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │              Agent Core                      │   │
│  │   LangChain + GPT-4o + Rule Evaluator        │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐   │
│  │           Scheduler — node-cron              │   │
│  │        Runs every 15 minutes                 │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Hedera Testnet                      │
│                                                     │
│  HTS — token transfers and micro-savings            │
│  HCS — immutable per-user audit topics              │
│  Account Abstraction — silent account creation      │
└─────────────────────────────────────────────────────┘
```

**Why this matters for reliability:** The scheduler runs independently of the frontend. If the UI crashes during a demo, the agent continues saving. The decoupling is not architectural aesthetics — it is a core product guarantee.

---

## Hedera Integration

Hedera is not a background detail in Fafnir. It is the reason Fafnir is possible.

**Account Abstraction** makes onboarding invisible. A user authenticates with email. Fafnir maps that identity to a Hedera account created behind the scenes. No user-facing complexity. This is the prerequisite for mass adoption — the moment the word "wallet" appears in an onboarding flow, most users leave.

**Hedera Token Service** executes the micro-savings transfers. When a rule fires, HBAR moves from the user's account to the Fafnir vault. At $0.0001 per transaction, a $5 saving costs 0.002% in fees — economically invisible. On Ethereum mainnet, gas fees can exceed the saving itself. Fafnir is only possible on Hedera.

**Hedera Consensus Service** creates an immutable audit trail. Every agent decision — every rule trigger, every transfer, every yield harvest — is logged as a message to the user's personal HCS topic. These records cannot be altered, deleted, or disputed. A user can open portal.hedera.com, find their topic ID, and verify every action Fafnir has ever taken on their behalf. This is the foundation of trust that makes autonomous financial agents viable for non-technical users.

**HOL Registry Broker** makes Fafnir discoverable as an AI agent in the Hedera ecosystem. Registered via HCS-10, Fafnir can be reached through natural language interfaces, integrated with other agents, and composed into larger agentic workflows — fitting the hackathon's vision for agent-to-agent coordination.

---

## Impact on the Hedera Network

Fafnir addresses the core growth constraint Hedera faces: the network has extraordinary infrastructure but insufficient utilization. Current daily transactions sit at approximately 800,000 against a 10,000 TPS capacity — less than 1% utilization.

Every Fafnir user creates a new Hedera account. Every saving rule generates daily recurring transactions. Every HCS log is a network message. The agent scheduler runs continuously, producing on-chain activity even when users are not actively engaged. Unlike DeFi protocols that serve a narrow technical audience, Fafnir is designed for the billions of people who save money in any form — making it one of the few Hedera applications with genuine mass-market potential.

The path to network growth is not building better tools for existing crypto users. It is giving people who have never interacted with a blockchain a compelling reason to use one without knowing they are.

---

## Revenue Model

Fafnir generates revenue through three mechanisms that align incentives between the product and its users.

**Yield spread.** Fafnir deploys aggregated user savings into yield-bearing vaults (Bonzo Finance integration in Phase 2). Users receive a base APY. Fafnir retains a percentage of the excess yield. The product earns more when users earn more.

**Micro-transaction fee.** A fractional fee on each automated saving — small enough to be invisible at $5 per transaction, material in aggregate across millions of users making multiple saves per week.

**Premium tier.** Advanced features — multiple simultaneous rules, family accounts, predictive saving recommendations, bank account integration — behind a monthly subscription for users who want deeper automation.

The business model requires scale to work, which means Fafnir's financial incentives are perfectly aligned with Hedera's network growth objectives. More users, more transactions, more value for both.

---

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/fafnir.git
cd fafnir

# Configure environment
cp .env.example .env
# Add HEDERA_OPERATOR_ID, HEDERA_OPERATOR_KEY, OPENAI_API_KEY

# Install and run backend
cd backend && npm install && npm run dev

# Install and run frontend (new terminal)
cd frontend && npm install && npm run dev
```

Frontend runs at `http://localhost:3000`  
Backend API at `http://localhost:3001`

Get free testnet HBAR at [portal.hedera.com](https://portal.hedera.com)

---

## Testing & Security Status

**✅ 272 Tests Passed**
- 95 unit tests
- 41 integration tests  
- 44 financial safety tests
- 24 security tests
- 12 chaos/resilience tests
- 6 stress load tests

**✅ All Core Features Delivered**
- Silent Hedera account creation
- Natural language goal parsing
- Autonomous agent execution (15-min scheduler)
- HBAR micro-savings transfers
- Immutable HCS audit logging
- Conversational dashboard
- Transaction history tracking
- HOL Registry agent registration

**✅ Components Protected**
- Rate limiting on auth endpoints (5 attempts/15min)
- Input validation on all API requests
- JWT token authentication
- CORS whitelist enforcement
- HTTPS enforcement (production)
- Audit logging for all actions
- Authorization checks on protected routes

**✅ Backend Status**
```
🐉 Fafnir backend running on http://localhost:3001
   ✓ Hedera service initialized
   ✓ LangChain agent initialized (28 tools)
   ✓ LangChain OpenAI model (gpt-4o-mini)
   ✓ Agent scheduler started (*/15 min)
   ✓ Network: testnet
```

---

## Project Structure

```
fafnir/
├── frontend/                 # Next.js + TailwindCSS + Framer Motion
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── (auth)/           # Login + signup
│   │   └── (app)/            # Protected dashboard, rules, history
│   └── components/
│       ├── ChatInterface.tsx  # Primary user interaction
│       ├── RulesCard.tsx      # Active saving rules
│       └── TransactionLog.tsx # HCS audit trail viewer
│
└── backend/                  # Node.js + Express
    ├── services/
    │   ├── hederaService.js   # All Hedera SDK calls (isolated)
    │   ├── agentService.js    # LangChain + GPT-4o intent parsing
    │   ├── schedulerService.js # 15-minute agent loop
    │   └── holService.js      # HOL Registry registration
    └── routes/
        ├── auth.js            # Signup → Hedera account creation
        ├── goals.js           # Natural language rule management
        └── history.js         # Transaction + HCS log retrieval
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Email → Hedera account (silent) |
| POST | `/api/auth/login` | Authenticate, receive JWT |
| POST | `/api/goals` | Create rule from plain English |
| GET | `/api/goals` | List active rules |
| PATCH | `/api/goals/:id` | Pause, resume, or update rule |
| GET | `/api/history` | Transaction log from DB + HCS |
| GET | `/api/history/summary` | Total saved, monthly totals |
| POST | `/api/history/trigger` | Manually trigger agent cycle |

---

## Environment Variables

```env
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXXX
HEDERA_OPERATOR_KEY=302e...
FAFNIR_VAULT_ACCOUNT_ID=0.0.XXXXXX

OPENAI_API_KEY=sk-...

JWT_SECRET=64_character_random_string
JWT_EXPIRES_IN=7d

PORT=3001
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

---

## Roadmap

**Now — Hackathon MVP**
Email signup with silent Hedera account creation, natural language rule parsing, automated HBAR transfers, immutable HCS audit trail, HOL Registry agent registration.

**Phase 2 — Post Hackathon**
Mobile app, bank account integration via Plaid, real yield vaults through Bonzo Finance, push notifications, multi-rule support.

**Phase 3 — Scale**
Multi-language support, Southeast Asia launch, agent-to-agent coordination, family savings accounts, enterprise API.

---

## Built With

Hedera SDK · LangChain · GPT-4o · Next.js · Node.js · Framer Motion · HOL Standards SDK

---

*Hedera Apex Hackathon 2026 — AI & Agents Track + HOL Registry Bounty*
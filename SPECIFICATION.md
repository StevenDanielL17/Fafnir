# FAFNIR — Complete Project Specification
### Hedera Apex Hackathon 2026 | AI & Agents Track + HOL Registry Bounty

---

## 1. WHAT IS FAFNIR

Fafnir is an AI-powered personal financial agent that acts as a user's first Hedera account — without the user needing to understand crypto. It accepts plain English instructions, executes financial micro-tasks autonomously on Hedera, and logs every action immutably on-chain. The user interacts like they are texting a smart assistant. Under the hood, every action is a Hedera transaction.

**One-line pitch:** "Tell Fafnir your financial goal. It does the rest."

---

## 2. CORE USER FLOW

```
User opens Fafnir (web or mobile)
        ↓
Signs up with email (no crypto knowledge required)
        ↓
Fafnir silently creates a Hedera account via Account Abstraction
        ↓
User types: "Save $5 every time I spend on food"
        ↓
Fafnir AI parses intent → creates saving rule
        ↓
Agent monitors and executes rule autonomously (24/7)
        ↓
User receives message: "Saved $5 today. Total: $23. Earning 4% APY."
        ↓
Every action logged on Hedera Consensus Service (HCS)
        ↓
User can audit full history anytime
```

---

## 3. FEATURES (MVP SCOPE)

### 3.1 Account Creation (Silent Onboarding)
- User signs up with email/Google
- Fafnir creates a Hedera Testnet account in the background using Account Abstraction
- User never sees a private key, seed phrase, or wallet address
- Account ID stored securely server-side

### 3.2 Natural Language Goal Setting
- User types their financial goal in plain English
- Examples:
  - "Save $5 whenever I spend on food"
  - "Save maximum $50 per month, never more than $5 at once"
  - "Move any leftover money at end of week into savings"
  - "Harvest my earnings every 48 hours"
- AI parses intent using LLM (Claude/OpenAI)
- Converts to executable rule object stored in database

### 3.3 Save Limit Controls (User-Defined Rules)
- Maximum per transaction (e.g., never more than $5 at once)
- Monthly cap (e.g., max $50/month total)
- Pause/resume anytime via chat
- Rules stored and editable

### 3.4 Autonomous Agent Execution
- Agent runs on a scheduler (cron job every 15 minutes)
- Checks active rules for each user
- Executes micro-transactions on Hedera when rule conditions are met
- Uses Hedera Token Service (HTS) for token transfers
- No manual user action required after goal is set

### 3.5 Verifiable Action Logs (HCS)
- Every agent decision logged to Hedera Consensus Service
- Log includes: timestamp, action type, amount, rule triggered, result
- User can view full transparent history in the UI
- Immutable and auditable

### 3.6 HOL Registry Registration
- Fafnir agent registered in HOL Registry Broker
- Discoverable via natural language interface
- Supports HCS-10 communication protocol
- Users can chat with Fafnir agent via HOL-compatible interfaces

### 3.7 Conversational Dashboard
- Chat interface as the primary UI
- User can ask:
  - "How much have I saved this week?"
  - "What did you do yesterday?"
  - "Pause my savings rule"
  - "Change my limit to $10"
- Agent responds in plain English

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Next.js) + TailwindCSS |
| Backend | Node.js + Express |
| AI/LLM | OpenAI GPT-4o or Claude API |
| Agent Framework | Hedera Agent Kit + LangChain |
| Hedera Services | HTS (Token Service) + HCS (Consensus Service) |
| Account Abstraction | Hedera native AA (no third-party needed) |
| HOL Integration | @hashgraphonline/standards-sdk |
| Database | PostgreSQL (user rules, transaction history) |
| Scheduler | Node-cron (agent execution loop) |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

### 4.2 System Components

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                 │
│   Chat Interface | Dashboard | Goal Settings         │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│                  BACKEND (Node.js)                   │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth Service│  │ Rule Engine  │  │ HOL Service│  │
│  │ (email/SSO) │  │ (parse goals)│  │(registration│  │
│  └─────────────┘  └──────┬───────┘  └────────────┘  │
│                          │                           │
│  ┌───────────────────────▼──────────────────────┐    │
│  │           FAFNIR AGENT CORE                  │    │
│  │  LangChain + Hedera Agent Kit                │    │
│  │  - Intent Parser                             │    │
│  │  - Rule Executor                             │    │
│  │  - Decision Logger                           │    │
│  └───────────────────────┬──────────────────────┘    │
│                          │                           │
│  ┌───────────────────────▼──────────────────────┐    │
│  │           SCHEDULER (node-cron)              │    │
│  │  Runs every 15 min → checks all user rules   │    │
│  └───────────────────────┬──────────────────────┘    │
└──────────────────────────┼──────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────┐
│                  HEDERA TESTNET                      │
│                                                      │
│   HTS: Token transfers + micro-savings              │
│   HCS: Immutable action logs                        │
│   Account Abstraction: Silent account creation      │
└─────────────────────────────────────────────────────┘
```

### 4.3 Hedera Services Used

**Hedera Token Service (HTS)**
- Create a "savings token" representing HBAR-backed savings unit
- Transfer tokens when saving rules trigger
- Handle yield distribution

**Hedera Consensus Service (HCS)**
- Create a topic per user for their action log
- Submit messages: `{action: "SAVE", amount: 5, rule: "food_trigger", timestamp: ...}`
- Frontend reads topic messages to display history

**Account Abstraction (Native)**
- Use Hedera's native account abstraction
- User authenticates with email → maps to Hedera account ID
- Private key managed server-side securely (for hackathon scope)

### 4.4 HOL Registry Integration

```javascript
import { HCS10Client } from '@hashgraphonline/standards-sdk';

// Register Fafnir as discoverable agent
const client = new HCS10Client({
  network: 'testnet',
  operatorId: process.env.HEDERA_ACCOUNT_ID,
  operatorKey: process.env.HEDERA_PRIVATE_KEY,
});

await client.registerAgent({
  name: 'Fafnir',
  description: 'AI personal finance agent. Tell me your savings goal.',
  capabilities: ['save', 'yield', 'audit', 'chat'],
  communicationProtocol: 'HCS-10',
});
```

### 4.5 Agent Core Logic (Simplified)

```javascript
// Rule execution loop
async function runAgentCycle(userId) {
  const rules = await getUserRules(userId);
  const context = await getUserContext(userId); // spending data, balances

  for (const rule of rules) {
    const decision = await llm.decide({
      rule: rule,
      context: context,
      prompt: `Given user rule: "${rule.description}" and current context: ${context}, 
               should I execute a saving action now? If yes, how much?`
    });

    if (decision.shouldExecute) {
      // Check limits
      if (decision.amount <= rule.maxPerTransaction && 
          monthlyTotal <= rule.monthlyMax) {
        
        // Execute on Hedera
        await transferHTS(userId, decision.amount);
        
        // Log to HCS
        await logToHCS(userId, {
          action: 'SAVE',
          amount: decision.amount,
          rule: rule.id,
          reasoning: decision.reasoning
        });
        
        // Notify user
        await sendMessage(userId, 
          `Saved $${decision.amount} today. Reason: ${decision.reasoning}`);
      }
    }
  }
}
```

---

## 5. DATABASE SCHEMA

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  hedera_account_id VARCHAR(50),
  hcs_topic_id VARCHAR(50),
  created_at TIMESTAMP
);

-- Saving rules table
CREATE TABLE rules (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  description TEXT,           -- original plain english
  trigger_type VARCHAR(50),   -- 'spending_category', 'scheduled', 'manual'
  trigger_value VARCHAR(100), -- 'food', 'weekly', etc
  amount DECIMAL(10,2),
  max_per_transaction DECIMAL(10,2),
  monthly_max DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Transaction log (mirrors HCS)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  rule_id UUID REFERENCES rules(id),
  action VARCHAR(50),
  amount DECIMAL(10,2),
  hcs_sequence_number BIGINT,
  reasoning TEXT,
  created_at TIMESTAMP
);
```

---

## 6. FOLDER STRUCTURE

```
fafnir/
├── frontend/                    # Next.js app
│   ├── pages/
│   │   ├── index.js             # Landing page
│   │   ├── app.js               # Main chat interface
│   │   └── history.js           # Transaction audit log
│   ├── components/
│   │   ├── ChatInterface.jsx
│   │   ├── GoalCard.jsx
│   │   └── TransactionLog.jsx
│   └── styles/
│
├── backend/                     # Node.js server
│   ├── routes/
│   │   ├── auth.js
│   │   ├── goals.js
│   │   └── history.js
│   ├── services/
│   │   ├── hederaService.js     # HTS + HCS interactions
│   │   ├── agentService.js      # LangChain agent logic
│   │   ├── holService.js        # HOL Registry registration
│   │   └── schedulerService.js  # Cron job agent runner
│   ├── models/
│   │   ├── user.js
│   │   ├── rule.js
│   │   └── transaction.js
│   └── index.js
│
├── .env.example
├── README.md
└── package.json
```

---

## 7. ENVIRONMENT VARIABLES

```env
# Hedera
HEDERA_NETWORK=testnet
HEDERA_OPERATOR_ID=0.0.XXXXXX
HEDERA_OPERATOR_KEY=302e...

# OpenAI / LLM
OPENAI_API_KEY=sk-...

# Database
DATABASE_URL=postgresql://...

# HOL
HOL_REGISTRY_TOPIC_ID=0.0.XXXXXX

# Auth
JWT_SECRET=...
NEXTAUTH_SECRET=...
```

---

## 8. JUDGING CRITERIA ALIGNMENT

| Criteria | Weight | How Fafnir Scores |
|---|---|---|
| Success | 20% | Every user = new Hedera account. Daily financial actions = daily TPS. Targets billions of savers globally |
| Execution | 20% | Functional MVP: chat UI + agent + HTS + HCS + HOL. Achievable in 5 weeks |
| Validation | 15% | Personal finance is used daily. Built-in feedback via chat. Easy early adopter onboarding |
| Integration | 15% | HTS for tokens, HCS for logs, Account Abstraction, HOL Registry — all core, not decorative |
| Innovation | 10% | First natural-language saving agent on Hedera. Web2 UX hiding Web3 infra |
| Feasibility | 10% | All services exist on Hedera today. Clear business model via transaction fees |
| Pitch | 10% | Problem is universal. Market is everyone who has a bank account |

---

## 9. WHAT TO BUILD FOR DEMO (Minimum Viable Demo)

For the hackathon video demo, show this exact flow:

1. Open Fafnir web app
2. Sign up with email → account created silently
3. Type: "Save $5 whenever I spend on food, max $30 per month"
4. Show rule being parsed and confirmed
5. Simulate a "food transaction" triggering the rule
6. Agent executes → HTS transfer happens
7. HCS log shows immutable record
8. User asks: "What did you do today?" → agent replies in plain English
9. Show HOL Registry — Fafnir is discoverable as an agent

**Total demo time: under 3 minutes**

---

## 10. CONCEPTS TO LEARN

### Tier 1 — Must Know First (Week 1)
| Concept | Why | Resource |
|---|---|---|
| Hedera Basics | Understand HTS, HCS, accounts | docs.hedera.com |
| hedera-sdk-js | The SDK you'll use for all Hedera interactions | docs.hedera.com/hedera/sdks-and-apis |
| Hedera Testnet | Where you build and test | portal.hedera.com (get free testnet HBAR) |
| HTS (Token Service) | For micro-savings transfers | docs.hedera.com/hedera/sdks-and-apis/sdks/token-service |
| HCS (Consensus Service) | For immutable logs | docs.hedera.com/hedera/sdks-and-apis/sdks/consensus-service |

### Tier 2 — Agent Layer (Week 2)
| Concept | Why | Resource |
|---|---|---|
| LangChain (Node.js) | Agent framework for LLM + tools | js.langchain.com |
| Hedera Agent Kit | Pre-built tools for Hedera + LangChain | docs.hedera.com/hedera/open-source-solutions/ai-studio-on-hedera/hedera-ai-agent-kit |
| OpenAI API | LLM for intent parsing | platform.openai.com/docs |
| RAG basics | How agents retrieve context | LangChain docs |

### Tier 3 — Integration Layer (Week 3)
| Concept | Why | Resource |
|---|---|---|
| HOL Standards SDK | Register Fafnir as discoverable agent | hol.org/registry/docs |
| HCS-10 Protocol | Agent communication standard | github.com/hashgraph-online/standards |
| Next.js basics | Frontend framework | nextjs.org/learn |
| Node.js + Express | Backend API | expressjs.com |

### Tier 4 — Polish (Week 4-5)
| Concept | Why | Resource |
|---|---|---|
| node-cron | Schedule agent to run every 15 min | npmjs.com/package/node-cron |
| PostgreSQL basics | Store user rules and history | postgresql.org/docs |
| Vercel deployment | Host frontend free | vercel.com/docs |
| Railway deployment | Host backend free | railway.app |

---

## 11. SUBMISSION TIMELINE

### Week 1: Feb 17–23 — Foundation
- [ ] Create Hedera Testnet account at portal.hedera.com
- [ ] Get free testnet HBAR
- [ ] Initialize GitHub repo (public)
- [ ] Set up Node.js backend project
- [ ] Set up Next.js frontend project
- [ ] Write first Hedera transaction using hedera-sdk-js (just send HBAR to yourself)
- [ ] Create HCS topic and submit first message
- [ ] Watch Workshop 2 recording: "Hedera 101"
- [ ] Watch Workshop 4 live: "HOL Registry Broker" (Feb 23)

### Week 2: Feb 24 – Mar 2 — Agent Core
- [ ] Install Hedera Agent Kit and LangChain
- [ ] Build intent parser: input = plain english goal, output = rule object
- [ ] Build basic rule engine (check if rule should trigger)
- [ ] Connect agent to HTS: execute a token transfer when rule fires
- [ ] Connect agent to HCS: log every action
- [ ] Attend AMA 1 or AMA 2 — ask mentors questions
- [ ] Watch Workshop 5 live: "Bonzo" (Mar 2) — good context

### Week 3: Mar 3–9 — Integration + Frontend
- [ ] Build chat interface in Next.js
- [ ] Connect frontend to backend agent
- [ ] Build transaction history page (reads from HCS)
- [ ] Register Fafnir in HOL Registry Broker using Standards SDK
- [ ] Test full user flow end-to-end on testnet
- [ ] Set up PostgreSQL database for user rules
- [ ] Attend Mentor Office Hours (Mar 9)

### Week 4: Mar 10–16 — Polish + Validation
- [ ] Add save limit controls (max per transaction, monthly cap)
- [ ] Add pause/resume rule feature via chat
- [ ] Handle edge cases (insufficient balance, failed transactions)
- [ ] Get 3–5 real people to try it (validation for judging)
- [ ] Record feedback and note improvements
- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Attend Mentor Office Hours (Mar 12)

### Week 5: Mar 17–23 — Submission
- [ ] Record demo video (under 3 min, upload to YouTube)
- [ ] Write README with setup instructions
- [ ] Write pitch deck (PDF) — use structure from submission requirements
- [ ] Prepare GitHub repo: clean code + README + deployment files
- [ ] Fill out submission form on StackUp (takes 20–30 min)
- [ ] **Submit before Mar 23, 10PM ET** (leave 2 hours buffer before 11:59PM deadline)

---

## 12. PITCH DECK STRUCTURE (for submission)

1. **Team Introduction** — who you are
2. **Problem** — 2 billion people save manually, no automated yield, crypto is scary
3. **Solution** — Fafnir: tell it your goal, it does the rest on Hedera
4. **Demo** — embed YouTube link here
5. **Tech Stack** — Hedera HTS + HCS + Agent Kit + HOL Registry
6. **How it grows Hedera** — every user = new account, every rule = daily TPS
7. **Validation** — who tested it, what they said
8. **Business Model** — small % of yield generated, or per-transaction fee
9. **Roadmap** — mobile app, real bank account integration, multi-agent coordination
10. **Why Hedera** — $0.0001 tx cost makes micro-savings economically viable. No other chain can do this.

---

## 13. THE ONE THING THAT WINS

Every other team will build a DeFi tool for crypto people.

Fafnir is the only project that brings someone who has never heard of Hedera onto the network — and makes them come back tomorrow.

That is what the Success criteria (20%) is actually asking for. That is what Hedera's 39-company council actually needs. That is why Fafnir wins.

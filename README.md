# 🐉 Fafnir — AI Financial Agent on Hedera

> **Tell Fafnir your financial goal. It does the rest.**

Fafnir is an AI-powered personal financial agent that acts as a user's first Hedera account — without the user needing to understand crypto. It accepts plain English instructions, executes financial micro-tasks autonomously on Hedera, and logs every action immutably on-chain.

**Hedera Apex Hackathon 2026 | AI & Agents Track + HOL Registry Bounty**

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Hedera Testnet account ([get one free](https://portal.hedera.com))

### 1. Clone & configure

```bash
git clone https://github.com/YOUR_USERNAME/fafnir.git
cd fafnir
cp .env.example .env
# Edit .env with your Hedera testnet credentials
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Test Hedera connection

```bash
cd backend
npm run test:hedera
```

### 4. Run the app

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001

---

## Architecture

**High Cohesion, Low Coupling** — each service owns exactly one responsibility:

```
Auth Service       → who the user is
Rule Engine        → what the user wants
Agent Core         → deciding when to act
Hedera Service     → executing on-chain
Notification       → telling the user what happened
```

No service imports another's dependencies. If Hedera changes their SDK tomorrow, only `hederaService.js` changes — nothing else breaks.

```
agentService.js  →  hederaService.js        (on-chain execution)
agentService.js  →  notificationService.js  (user messaging)
schedulerService →  agentService.js         (timed triggers)
```

The scheduler runs independently of the frontend. If the UI crashes during a demo, the agent keeps saving.

---

## Project Structure

```
fafnir/
├── frontend/                    # Next.js + TailwindCSS
│   ├── pages/
│   │   ├── index.js             # Landing page + signup
│   │   ├── app.js               # Main chat interface
│   │   └── history.js           # Transaction audit log
│   ├── components/
│   │   ├── ChatInterface.jsx    # Chat UI (primary interaction)
│   │   ├── GoalCard.jsx         # Rule display card
│   │   └── TransactionLog.jsx   # Immutable history table
│   └── styles/
│
├── backend/                     # Node.js + Express
│   ├── routes/
│   │   ├── auth.js              # Signup/login (email → Hedera account)
│   │   ├── goals.js             # CRUD saving rules
│   │   └── history.js           # Transaction history + manual trigger
│   ├── services/
│   │   ├── hederaService.js     # ALL Hedera SDK interactions
│   │   ├── agentService.js      # Intent parsing + rule evaluation
│   │   ├── notificationService.js  # User messaging
│   │   ├── schedulerService.js  # Cron job agent runner
│   │   └── holService.js        # HOL Registry (Week 3)
│   ├── models/
│   │   ├── user.js              # User data store
│   │   ├── rule.js              # Saving rules store
│   │   └── transaction.js       # Transaction log store
│   ├── scripts/
│   │   └── testHedera.js        # Hedera connection test
│   └── index.js                 # Server entry point
│
├── .env.example
├── .gitignore
└── README.md
```

---

## Hedera Services Used

| Service | Purpose |
|---|---|
| **HTS** (Token Service) | Micro-savings transfers |
| **HCS** (Consensus Service) | Immutable action logs |
| **Account Abstraction** | Silent account creation for users |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account (email → Hedera account) |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user |
| POST | `/api/goals` | Create saving rule (natural language) |
| POST | `/api/goals/parse` | Preview parsed rule without saving |
| GET | `/api/goals` | List user's rules |
| PATCH | `/api/goals/:id` | Update rule |
| DELETE | `/api/goals/:id` | Delete rule |
| GET | `/api/history` | Transaction history |
| GET | `/api/history/summary` | Savings summary |
| POST | `/api/history/trigger` | Manually trigger agent cycle |
| GET | `/api/health` | Health check |

---

## Week-by-Week Timeline

- **Week 1** ✅ Foundation — project setup, Hedera connection, first transactions
- **Week 2** → Agent Core — LangChain + intent parsing + rule engine
- **Week 3** → Integration — frontend ↔ backend, HOL Registry, PostgreSQL
- **Week 4** → Polish — limits, edge cases, user testing, deployment
- **Week 5** → Submission — demo video, pitch deck, README

---

## License

Built for the Hedera Apex Hackathon 2026.

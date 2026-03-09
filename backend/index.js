/**
 * FAFNIR BACKEND — Entry Point
 * 
 * Architecture: High Cohesion, Low Coupling
 * Each service owns exactly one responsibility.
 * Routes → Services → Hedera (never skip a layer)
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');

// Routes
const authRoutes = require('./routes/auth');
const goalsRoutes = require('./routes/goals');
const historyRoutes = require('./routes/history');
const chatRoutes = require('./routes/chat');

// Services (initialized at startup)
const hederaService = require('./services/hederaService');
const langchainAgent = require('./services/langchainAgent');
const schedulerService = require('./services/schedulerService');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);

// ── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'fafnir-backend',
    timestamp: new Date().toISOString(),
    hedera: {
      network: process.env.HEDERA_NETWORK || 'testnet',
      operatorId: process.env.HEDERA_OPERATOR_ID || 'not configured',
    },
  });
});

// ── Startup ────────────────────────────────────────────
async function start() {
  try {
    // Initialize Hedera connection
    await hederaService.initialize();
    console.log('✓ Hedera service initialized');

    // Initialize LangChain + Hedera Agent Kit (Week 2)
    const llmReady = langchainAgent.initialize();
    console.log(llmReady ? '✓ LangChain agent initialized' : '⚠ LangChain agent skipped (no OPENAI_API_KEY)');

    // Start the autonomous agent scheduler
    // (Low coupling: scheduler calls agentService, which calls hederaService)
    schedulerService.start();
    console.log('✓ Agent scheduler started');

    app.listen(PORT, () => {
      console.log(`\n🐉 Fafnir backend running on http://localhost:${PORT}`);
      console.log(`   Network: ${process.env.HEDERA_NETWORK || 'testnet'}`);
      console.log(`   Operator: ${process.env.HEDERA_OPERATOR_ID || 'not configured'}\n`);
    });
  } catch (err) {
    console.error('Failed to start Fafnir backend:', err.message);
    process.exit(1);
  }
}

start();

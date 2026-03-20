/**
 * FAFNIR BACKEND — Entry Point
 * 
 * Architecture: High Cohesion, Low Coupling
 * Each service owns exactly one responsibility.
 * Routes → Services → Hedera (never skip a layer)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
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
const holService = require('./services/holService');

// Security middleware
const { authLimiter, agentTriggerLimiter, goalCreationLimiter, chatLimiter } = require('./middleware/rateLimiter');
const { validate, loginSchema, signupSchema, createGoalSchema, chatSchema } = require('./middleware/validation');
const auditService = require('./services/auditService');

const app = express();
const PORT = process.env.PORT || 3001;

// ── HTTPS ENFORCEMENT ───────────────────────────────────
// Redirect HTTP to HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      console.log(`🔒 Redirecting HTTP to HTTPS: ${req.get('host')}${req.originalUrl}`);
      return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}

// ── CORS WHITELIST ──────────────────────────────────────
// Only allow requests from trusted frontend domains
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',       // Dev
      'http://localhost:3001',       // Dev backend
      process.env.FRONTEND_URL,      // Production frontend
      'https://fafnir.vercel.app',   // Example production domain
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS rejected origin: ${origin}`);
      auditService.logSecurityEvent('CORS_REJECTION', origin, { reason: 'origin_not_whitelisted' });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// ── BODY PARSING ────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit payload size

// ── AUDIT LOGGING MIDDLEWARE ───────────────────────────
// Log all requests in audit trail
app.use((req, res, next) => {
  const ipAddress = req.get('x-forwarded-for') || req.socket.remoteAddress;
  
  // Store IP in request for audit services to use
  req.ipAddress = ipAddress;
  
  // Log the request at the end of processing
  const originalJson = res.json;
  res.json = function(data) {
    if (!req.path.startsWith('/api/health') && !req.path === '/') {
      const statusCode = res.statusCode;
      if (statusCode >= 400) {
        auditService.logSecurityEvent('HTTP_ERROR', ipAddress, {
          path: req.path,
          method: req.method,
          status: statusCode,
        });
      }
    }
    return originalJson.call(this, data);
  };
  
  next();
});

// ── RATE LIMITING (AUTH ENDPOINTS - CRITICAL) ──────────
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// ── Middleware ──────────────────────────────────────────

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);

// ── Root ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Fafnir API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      goals: '/api/goals',
      chat: '/api/chat',
      history: '/api/history',
    },
  });
});

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

// ── Debug: List Users (DEV ONLY) ──────────────────────
app.get('/api/debug/users', (req, res) => {
  const userModel = require('./models/user');
  const users = userModel.getAll().map(u => ({
    id: u.id,
    email: u.email,
    createdAt: u.createdAt,
  }));
  res.json({ count: users.length, users });
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
    schedulerService.start();

    // Register Fafnir in HOL Registry (non-blocking, never crashes server)
    holService.registerAgent().catch((err) => {
      console.error('  HOL registration error:', err.message);
    });

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

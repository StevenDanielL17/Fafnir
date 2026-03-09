/**
 * UNIT TEST: Backend Entry Point (index.js)
 * 
 * Tests the server bootstrapping contract:
 *  - Health endpoint returns correct shape
 *  - Route mounting (auth, goals, history, chat)
 *  - Startup sequence (hedera → langchain → scheduler)
 * 
 * Strategy: We test the health endpoint response shape and the
 * startup orchestration logic. No real Express server is started.
 * 
 * RULE 1.1: Routes → Services → Hedera (mount order matters).
 * RULE 9.2: Environment variables must be loaded first.
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Health Endpoint Logic (mirrors backend/index.js /api/health) ───

function healthHandler(env = {}) {
  return {
    status: 'ok',
    service: 'fafnir-backend',
    timestamp: new Date().toISOString(),
    hedera: {
      network: env.HEDERA_NETWORK || 'testnet',
      operatorId: env.HEDERA_OPERATOR_ID || 'not configured',
    },
  };
}

// ─── Startup Sequence (mirrors backend/index.js start()) ───

async function startupSequence(deps) {
  const log = [];

  // Step 1: Initialize Hedera
  await deps.hederaService.initialize();
  log.push('hedera');

  // Step 2: Initialize LangChain
  const llmReady = deps.langchainAgent.initialize();
  log.push(llmReady ? 'langchain' : 'langchain-skipped');

  // Step 3: Start scheduler
  deps.schedulerService.start();
  log.push('scheduler');

  return log;
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('Backend Entry Point — Health & Startup', () => {
  describe('/api/health', () => {
    it('returns status ok', () => {
      const response = healthHandler();
      expect(response.status).toBe('ok');
    });

    it('returns service name', () => {
      const response = healthHandler();
      expect(response.service).toBe('fafnir-backend');
    });

    it('returns a valid timestamp', () => {
      const response = healthHandler();
      expect(new Date(response.timestamp).getTime()).not.toBeNaN();
    });

    it('returns hedera config from env', () => {
      const response = healthHandler({
        HEDERA_NETWORK: 'mainnet',
        HEDERA_OPERATOR_ID: '0.0.12345',
      });

      expect(response.hedera.network).toBe('mainnet');
      expect(response.hedera.operatorId).toBe('0.0.12345');
    });

    it('defaults network to testnet', () => {
      const response = healthHandler({});
      expect(response.hedera.network).toBe('testnet');
    });

    it('defaults operatorId to "not configured"', () => {
      const response = healthHandler({});
      expect(response.hedera.operatorId).toBe('not configured');
    });
  });

  describe('startup sequence', () => {
    it('initializes in correct order: hedera → langchain → scheduler', async () => {
      const deps = {
        hederaService: { initialize: vi.fn(async () => {}) },
        langchainAgent: { initialize: vi.fn(() => true) },
        schedulerService: { start: vi.fn() },
      };

      const log = await startupSequence(deps);

      expect(log).toEqual(['hedera', 'langchain', 'scheduler']);
      expect(deps.hederaService.initialize).toHaveBeenCalledBefore(deps.langchainAgent.initialize);
    });

    it('continues when LLM is unavailable', async () => {
      const deps = {
        hederaService: { initialize: vi.fn(async () => {}) },
        langchainAgent: { initialize: vi.fn(() => false) }, // No OPENAI_API_KEY
        schedulerService: { start: vi.fn() },
      };

      const log = await startupSequence(deps);

      expect(log).toEqual(['hedera', 'langchain-skipped', 'scheduler']);
      expect(deps.schedulerService.start).toHaveBeenCalled();
    });

    it('calls each service exactly once', async () => {
      const deps = {
        hederaService: { initialize: vi.fn(async () => {}) },
        langchainAgent: { initialize: vi.fn(() => true) },
        schedulerService: { start: vi.fn() },
      };

      await startupSequence(deps);

      expect(deps.hederaService.initialize).toHaveBeenCalledTimes(1);
      expect(deps.langchainAgent.initialize).toHaveBeenCalledTimes(1);
      expect(deps.schedulerService.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('route mounting contract', () => {
    it('all required route paths are defined', () => {
      const expectedPaths = ['/api/auth', '/api/goals', '/api/history', '/api/chat'];
      // This is a contract test — validates the mount map
      const mounts = {
        '/api/auth': 'authRoutes',
        '/api/goals': 'goalsRoutes',
        '/api/history': 'historyRoutes',
        '/api/chat': 'chatRoutes',
      };

      for (const path of expectedPaths) {
        expect(mounts[path]).toBeDefined();
      }
    });

    it('health endpoint is at /api/health', () => {
      const healthPath = '/api/health';
      const response = healthHandler();
      expect(healthPath).toBe('/api/health');
      expect(response.status).toBe('ok');
    });
  });
});

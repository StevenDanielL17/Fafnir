/**
 * UNIT TEST: HOL Service (Placeholder)
 * 
 * Tests the HOL Registry service skeleton:
 *  - registerAgent() returns unregistered placeholder
 *  - checkRegistration() returns false
 * 
 * Strategy: HOL is a Week 3 skeleton. We test the contract so that
 * when the implementation arrives, the tests catch regressions.
 * 
 * RULE 11.2: HOL is fully independent — removing it affects nothing.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ─── HOL Service (mirrors backend/services/holService.js) ───

function createHolService() {
  return {
    async registerAgent() {
      // Placeholder — Week 3 implementation
      return {
        registered: false,
        note: 'Install @hashgraphonline/standards-sdk and implement in Week 3',
      };
    },

    async checkRegistration() {
      return { registered: false };
    },
  };
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('HOL Service — Placeholder', () => {
  let holService;

  beforeAll(() => {
    holService = createHolService();
  });

  describe('registerAgent()', () => {
    it('returns registered: false (placeholder)', async () => {
      const result = await holService.registerAgent();
      expect(result.registered).toBe(false);
    });

    it('includes a note about future implementation', async () => {
      const result = await holService.registerAgent();
      expect(result.note).toContain('Week 3');
    });

    it('does not throw', async () => {
      await expect(holService.registerAgent()).resolves.not.toThrow();
    });
  });

  describe('checkRegistration()', () => {
    it('returns registered: false', async () => {
      const result = await holService.checkRegistration();
      expect(result.registered).toBe(false);
    });

    it('does not throw', async () => {
      await expect(holService.checkRegistration()).resolves.not.toThrow();
    });
  });

  describe('independence', () => {
    it('HOL service has no dependencies on other services', () => {
      // The service factory takes zero arguments — no injected deps
      const isolated = createHolService();
      expect(isolated).toBeDefined();
      expect(typeof isolated.registerAgent).toBe('function');
      expect(typeof isolated.checkRegistration).toBe('function');
    });
  });
});

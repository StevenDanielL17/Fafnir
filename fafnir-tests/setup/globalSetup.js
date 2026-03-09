/**
 * GLOBAL TEST SETUP
 * 
 * Runs ONCE before all test suites.
 * - Loads test environment variables
 * - Installs Hedera mock layer
 * - Installs LLM mock layer
 * - Sets up global assertions
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { beforeAll, afterEach, vi } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test env BEFORE any backend code
config({ path: path.resolve(__dirname, '../.env.test') });

// ── Global Hooks ───────────────────────────────────────

beforeAll(() => {
  // Silence console in tests unless TEST_LOG_LEVEL is set
  if (process.env.TEST_LOG_LEVEL === 'silent') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Keep console.error visible for debugging failures
  }
});

afterEach(() => {
  // Reset all mocks between tests to prevent cross-contamination
  vi.restoreAllMocks();
});

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // ── Environment ────────────────────────────────────
    globals: true,
    environment: 'node',

    // ── Setup ──────────────────────────────────────────
    setupFiles: ['./setup/globalSetup.js'],

    // ── Test Include Patterns ──────────────────────────
    include: [
      'unit/**/*.test.js',
      'bridge/**/*.test.js',
      'financial/**/*.test.js',
      'security/**/*.test.js',
      'chaos/**/*.test.js',
      'stress/**/*.test.js',
    ],

    // ── Coverage ───────────────────────────────────────
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Cover the MAIN codebase, not the test files
      include: [
        '../backend/services/**/*.js',
        '../backend/models/**/*.js',
        '../backend/routes/**/*.js',
      ],
      exclude: [
        '../backend/scripts/**',
        '../backend/node_modules/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },

    // ── Performance ────────────────────────────────────
    pool: 'forks',          // Isolated processes for financial tests
    poolOptions: {
      forks: {
        maxForks: 4,
      },
    },

    // ── Timeouts ───────────────────────────────────────
    testTimeout: 10_000,     // 10s per test (generous for mock Hedera)
    hookTimeout: 15_000,

    // ── Aliases (so tests import from backend cleanly) ─
    alias: {
      '@backend': path.resolve(__dirname, '../backend'),
      '@services': path.resolve(__dirname, '../backend/services'),
      '@models': path.resolve(__dirname, '../backend/models'),
      '@routes': path.resolve(__dirname, '../backend/routes'),
      '@mocks': path.resolve(__dirname, './setup/mocks'),
      '@helpers': path.resolve(__dirname, './helpers'),
    },
  },
});

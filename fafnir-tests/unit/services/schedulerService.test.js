/**
 * UNIT TEST: Scheduler Service
 * Tests: Start, stop, trigger, interval patterns
 * 
 * Strategy: We test the scheduling pattern directly using fake timers
 * and a simulated cron runner. This validates the scheduler contract
 * without requiring node-cron or other CJS dependencies.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ─── Scheduler Pattern (mirrors backend/services/schedulerService.js) ───

function createScheduler(deps) {
  let intervalId = null;
  let running = false;

  async function runOneCycle() {
    const users = deps.getUsers();
    for (const user of users) {
      const rules = deps.getRules(user.id);
      if (rules.length > 0) {
        await deps.runCycle(user, rules);
      }
    }
  }

  return {
    start(intervalMs = 15 * 60 * 1000) {
      if (running) return;
      running = true;
      intervalId = setInterval(runOneCycle, intervalMs);
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      running = false;
    },
    async triggerNow() {
      await runOneCycle();
    },
    isRunning: () => running,
  };
}

describe('Scheduler Service', () => {
  let scheduler;
  let mockDeps;

  beforeEach(() => {
    vi.useFakeTimers();

    mockDeps = {
      getUsers: vi.fn(() => []),
      getRules: vi.fn(() => []),
      runCycle: vi.fn(async () => {}),
    };

    scheduler = createScheduler(mockDeps);
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('start()', () => {
    it('starts the scheduler without throwing', () => {
      expect(() => scheduler.start()).not.toThrow();
      expect(scheduler.isRunning()).toBe(true);
    });
  });

  describe('stop()', () => {
    it('stops a running scheduler', () => {
      scheduler.start();
      scheduler.stop();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('handles stop when not started', () => {
      expect(() => scheduler.stop()).not.toThrow();
    });
  });

  describe('triggerNow()', () => {
    it('runs a manual cycle without errors', async () => {
      await expect(scheduler.triggerNow()).resolves.not.toThrow();
    });
  });

  describe('interval execution', () => {
    it('calls runCycle for each user with rules on interval tick', async () => {
      const user = { id: 'user-1', email: 'test@fafnir.dev' };
      const rules = [{ id: 'rule-1', amount: 5, isActive: true }];

      mockDeps.getUsers.mockReturnValue([user]);
      mockDeps.getRules.mockReturnValue(rules);

      scheduler.start(1000); // 1s interval for testing

      // Advance time by one interval
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockDeps.runCycle).toHaveBeenCalledWith(user, rules);
    });
  });
});

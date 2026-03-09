/**
 * SCHEDULER SERVICE
 * 
 * Single Responsibility: Running the agent on a schedule.
 *   - Cron job every 15 minutes
 *   - Iterates all users with active rules
 *   - Calls agentService.runCycle() for each user
 * 
 * Low Coupling:
 *   Scheduler doesn't know WHAT the agent does.
 *   It just triggers it. If the frontend is down,
 *   the scheduler keeps running independently.
 * 
 *   scheduler → agentService → hederaService
 *                             → notificationService
 */

const cron = require('node-cron');

// Week 1: In-memory user store. Week 3: PostgreSQL.
const userStore = require('../models/user');
const ruleStore = require('../models/rule');
const agentService = require('./agentService');

let task = null;

/**
 * Start the agent scheduler.
 * Runs every 15 minutes by default.
 */
function start(cronExpression = '*/15 * * * *') {
  if (task) {
    console.log('  Scheduler already running');
    return;
  }

  task = cron.schedule(cronExpression, async () => {
    console.log(`\n⏰ Agent cycle starting at ${new Date().toISOString()}`);
    await runAllUsers();
  });

  console.log(`  Scheduler set: ${cronExpression}`);
}

/**
 * Stop the scheduler.
 */
function stop() {
  if (task) {
    task.stop();
    task = null;
    console.log('  Scheduler stopped');
  }
}

/**
 * Run one agent cycle for ALL users with active rules.
 * Exposed separately so it can be triggered manually for testing.
 */
async function runAllUsers() {
  try {
    const users = userStore.getAll();

    if (users.length === 0) {
      console.log('  No users registered yet. Skipping cycle.');
      return;
    }

    for (const user of users) {
      const rules = ruleStore.getByUserId(user.id).filter((r) => r.isActive);

      if (rules.length === 0) {
        continue;
      }

      console.log(`  Running agent for ${user.email} (${rules.length} active rules)`);

      try {
        await agentService.runCycle(user, rules);
      } catch (err) {
        console.error(`  Agent cycle failed for ${user.email}:`, err.message);
      }
    }

    console.log('  Agent cycle complete.\n');
  } catch (err) {
    console.error('  Scheduler error:', err.message);
  }
}

/**
 * Manually trigger one cycle (for testing / demo).
 */
async function triggerNow() {
  console.log('\n⚡ Manual agent trigger');
  await runAllUsers();
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  start,
  stop,
  triggerNow,
};

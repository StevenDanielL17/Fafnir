/**
 * SCHEDULER SERVICE
 * 
 * Single Responsibility: Running the agent on a schedule.
 *   - Cron job every 15 minutes
 *   - Iterates all users with active rules
 *   - Evaluates rules and executes savings transfers
 * 
 * Low Coupling:
 *   scheduler → agentService (shouldRuleExecute)
 *   scheduler → hederaService (executeSavingsTransfer, logToHCS)
 */

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const userStore = require('../models/user');
const ruleStore = require('../models/rule');
const transactionModel = require('../models/transaction');
const agentService = require('./agentService');
const hederaService = require('./hederaService');

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
  console.log('🐉 Fafnir agent scheduler started');
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
 * Uses spec-compliant functions: shouldRuleExecute, executeSavingsTransfer, logToHCS.
 */
async function runAllUsers() {
  try {
    const users = userStore.getAll();

    if (users.length === 0) {
      console.log('  No users registered yet. Skipping cycle.');
      return;
    }

    for (const user of users) {
      try {
        const rules = ruleStore.getByUserId(user.id).filter((r) => r.isActive);

        if (rules.length === 0) {
          continue;
        }

        console.log(`  Running agent for ${user.email} (${rules.length} active rules)`);

        for (const rule of rules) {
          try {
            // Calculate monthly total for this rule
            const allTx = transactionModel.getByUserId(user.id);
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthlyTotal = allTx
              .filter(
                (t) =>
                  t.ruleId === rule.id &&
                  t.action === 'SAVE' &&
                  new Date(t.createdAt) >= startOfMonth
              )
              .reduce((sum, t) => sum + t.amount, 0);

            // Check if rule should execute
            const decision = agentService.shouldRuleExecute(rule, {
              monthlyTotal,
              lastTrigger: rule.lastTriggeredAt || rule.last_triggered_at || null,
            });

            if (decision.execute) {
              // Execute savings transfer
              const vaultAccount = process.env.FAFNIR_VAULT_ACCOUNT_ID || process.env.HEDERA_OPERATOR_ID;

              const result = await hederaService.executeSavingsTransfer(
                user.hederaAccountId,
                user.hederaPrivateKey,
                vaultAccount,
                rule.amount
              );

              // Save transaction
              transactionModel.create({
                userId: user.id,
                ruleId: rule.id,
                action: 'SAVE',
                amount: rule.amount,
                reasoning: decision.reason,
                transactionId: result.transactionId,
              });

              // Update rule
              ruleStore.update(rule.id, {
                lastTriggeredAt: new Date().toISOString(),
                last_triggered_at: new Date().toISOString(),
                monthlyTotal: (rule.monthlyTotal || 0) + rule.amount,
              });

              // Log to HCS (fire-and-forget)
              if (user.hcsTopicId) {
                hederaService.logToHCS(user.hcsTopicId, {
                  event: 'SAVE_EXECUTED',
                  amount: rule.amount,
                  rule: rule.description,
                  txId: result.transactionId,
                  timestamp: new Date().toISOString(),
                }).catch(() => {});
              }

              console.log(`  ✓ Saved $${rule.amount} for user ${user.email} (tx: ${result.transactionId})`);
            } else {
              console.log(`  ⏭ Rule "${rule.description}" skipped: ${decision.reason}`);
            }
          } catch (ruleErr) {
            console.error(`  Rule execution error for "${rule.description}":`, ruleErr.message);

            // Log failure
            transactionModel.create({
              userId: user.id,
              ruleId: rule.id,
              action: 'SAVE_FAILED',
              amount: rule.amount,
              reasoning: ruleErr.message,
            });
          }
        }
      } catch (userErr) {
        console.error(`  Agent cycle failed for ${user.email}:`, userErr.message);
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

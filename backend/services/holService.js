/**
 * HOL SERVICE
 * 
 * Single Responsibility: HOL Registry interactions.
 *   - Register Fafnir as a discoverable agent
 *   - Handle HCS-10 protocol communication
 * 
 * Low Coupling:
 *   This service is completely independent.
 *   Removing HOL integration doesn't affect any other service.
 * 
 * Week 1: Skeleton. Week 3: Full implementation with @hashgraphonline/standards-sdk
 */

/**
 * Register Fafnir as an agent in the HOL Registry Broker.
 * 
 * Requires: @hashgraphonline/standards-sdk (install in Week 3)
 */
async function registerAgent() {
  // TODO Week 3: Implement with HCS10Client
  //
  // const { HCS10Client } = require('@hashgraphonline/standards-sdk');
  //
  // const client = new HCS10Client({
  //   network: 'testnet',
  //   operatorId: process.env.HEDERA_OPERATOR_ID,
  //   operatorKey: process.env.HEDERA_OPERATOR_KEY,
  // });
  //
  // await client.registerAgent({
  //   name: 'Fafnir',
  //   description: 'AI personal finance agent. Tell me your savings goal.',
  //   capabilities: ['save', 'yield', 'audit', 'chat'],
  //   communicationProtocol: 'HCS-10',
  // });

  console.log('  HOL registration: placeholder (implement in Week 3)');
  return {
    registered: false,
    note: 'Install @hashgraphonline/standards-sdk and implement in Week 3',
  };
}

/**
 * Check if Fafnir is registered in the HOL Registry.
 */
async function checkRegistration() {
  // TODO Week 3
  return { registered: false };
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  registerAgent,
  checkRegistration,
};

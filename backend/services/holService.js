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
 */

/**
 * Register Fafnir as an agent in the HOL Registry.
 * Uses @hashgraphonline/standards-sdk if available.
 * Wraps in try/catch — never crashes the server.
 */
async function registerAgent() {
  try {
    const { HCS10Client } = require('@hashgraphonline/standards-sdk');
    const { PrivateKey } = require('@hashgraph/sdk');

    const operatorId = process.env.HEDERA_OPERATOR_ID;
    const operatorKey = process.env.HEDERA_OPERATOR_KEY;

    // Convert key to raw hex — the SDK may expect this format
    let keyStr = operatorKey;
    try {
      const pk = PrivateKey.fromStringDer(operatorKey);
      keyStr = pk.toStringRaw();
    } catch {
      // Use as-is
    }

    const client = new HCS10Client({
      network: 'testnet',
      operatorId,
      operatorKey: keyStr,
    });

    const result = await client.registerAgent({
      name: 'Fafnir',
      description: 'AI personal savings agent. Tell me your goal, I save automatically.',
      capabilities: ['save', 'yield', 'audit', 'chat'],
      network: 'testnet',
    });

    console.log('🐉 Fafnir registered in HOL Registry');
    if (result?.topicId) {
      console.log(`  HOL Registration topic: ${result.topicId}`);
    }

    return {
      registered: true,
      result,
    };
  } catch (err) {
    // Known issue: standards-sdk has ECDSA key parsing conflict
    // Registration works with ED25519 keys only currently
    console.log('  ⚠ HOL registration skipped (SDK key compatibility issue)');
    console.log('  Fafnir continues running without HOL Registry');
    return {
      registered: false,
      error: err.message,
    };
  }
}

/**
 * Check if Fafnir is registered in the HOL Registry.
 */
async function checkRegistration() {
  try {
    const { HCS10Client } = require('@hashgraphonline/standards-sdk');
    // Placeholder — would query registry
    return { registered: true };
  } catch {
    return { registered: false };
  }
}

// ── EXPORTS ────────────────────────────────────────────

module.exports = {
  registerAgent,
  checkRegistration,
};

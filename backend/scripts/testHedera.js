/**
 * TEST HEDERA CONNECTION
 * 
 * Week 1 validation script:
 *   1. Connect to Hedera Testnet
 *   2. Check operator balance
 *   3. Create a test HCS topic
 *   4. Submit a test message
 *   5. Send HBAR to yourself
 * 
 * Run: npm run test:hedera
 */

require('dotenv').config({ path: '../../.env' });
const hederaService = require('../services/hederaService');

async function testHedera() {
  console.log('═══════════════════════════════════════════');
  console.log('  🐉 FAFNIR — Hedera Connection Test');
  console.log('═══════════════════════════════════════════\n');

  // 1. Initialize
  console.log('1️⃣  Initializing Hedera client...');
  hederaService.initialize();
  console.log('   ✓ Connected\n');

  // 2. Check balance
  console.log('2️⃣  Checking operator balance...');
  const balance = await hederaService.getBalance(process.env.HEDERA_OPERATOR_ID);
  console.log(`   ✓ Balance: ${balance} HBAR\n`);

  // 3. Create HCS topic
  console.log('3️⃣  Creating HCS topic...');
  const topicId = await hederaService.createTopic('Fafnir Test Topic');
  console.log(`   ✓ Topic created: ${topicId}\n`);

  // 4. Submit message to topic
  console.log('4️⃣  Submitting test message to HCS...');
  const logResult = await hederaService.submitLog(topicId, {
    action: 'TEST',
    message: 'Hello from Fafnir! First HCS message.',
    timestamp: new Date().toISOString(),
  });
  console.log(`   ✓ Message submitted — Status: ${logResult.status}, Seq: ${logResult.sequenceNumber}\n`);

  // 5. Send HBAR to yourself
  console.log('5️⃣  Sending 1 HBAR to self (test transfer)...');
  const txResult = await hederaService.transferHbar(
    process.env.HEDERA_OPERATOR_ID,
    process.env.HEDERA_OPERATOR_ID,
    0 // Zero transfer to self just to test the pipeline
  );
  console.log(`   ✓ Transfer — Status: ${txResult.status}\n`);

  // 6. Check balance again
  console.log('6️⃣  Final balance check...');
  const finalBalance = await hederaService.getBalance(process.env.HEDERA_OPERATOR_ID);
  console.log(`   ✓ Balance: ${finalBalance} HBAR\n`);

  console.log('═══════════════════════════════════════════');
  console.log('  ✅ All Hedera tests passed!');
  console.log('═══════════════════════════════════════════\n');

  console.log('Week 1 Checklist:');
  console.log(`  [✓] Hedera Testnet connection`);
  console.log(`  [✓] Account balance query`);
  console.log(`  [✓] HCS topic created: ${topicId}`);
  console.log(`  [✓] HCS message submitted`);
  console.log(`  [✓] HBAR transfer executed`);
  console.log('');

  process.exit(0);
}

testHedera().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  console.error('\nTroubleshooting:');
  console.error('  1. Do you have a .env file with HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY?');
  console.error('  2. Get a free testnet account at https://portal.hedera.com');
  console.error('  3. Make sure you have testnet HBAR (free from the portal)');
  process.exit(1);
});

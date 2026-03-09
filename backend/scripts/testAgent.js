/**
 * TEST AGENT — Week 2 Validation Script
 * 
 * Tests the LLM-powered agent features:
 *   1. Goal parsing (LLM with keyword fallback)
 *   2. Rule evaluation (LLM with simple fallback)
 *   3. Chat conversation
 * 
 * Run: npm run test:agent
 * 
 * Requires OPENAI_API_KEY in .env for LLM tests.
 * Without it, tests run with keyword fallback only.
 */

require('dotenv').config({ path: '../../.env' });

const agentService = require('../services/agentService');
const langchainAgent = require('../services/langchainAgent');

async function testAgent() {
  console.log('═══════════════════════════════════════════');
  console.log('  🐉 FAFNIR — Agent Test (Week 2)');
  console.log('═══════════════════════════════════════════\n');

  // 1. Initialize LLM
  console.log('1️⃣  Initializing LangChain agent...');
  const llmReady = langchainAgent.initialize();
  console.log(
    llmReady
      ? '   ✓ LLM available (OpenAI)\n'
      : '   ⚠ LLM not available — testing with keyword fallback\n'
  );

  // 2. Test goal parsing
  console.log('2️⃣  Testing goal parsing...');
  const testGoals = [
    'Save $5 whenever I spend on food, max $30 per month',
    'Save $10 every week',
    'Put aside $3 daily, never more than $2 at once',
    'Move leftover money into savings every month, max $100',
    'Save $1 every time I buy coffee',
  ];

  for (const goal of testGoals) {
    console.log(`\n   Input: "${goal}"`);
    const parsed = await agentService.parseGoal(goal);
    console.log(`   Output: ${JSON.stringify(parsed, null, 2).split('\n').join('\n   ')}`);
  }

  // 3. Test rule evaluation
  console.log('\n\n3️⃣  Testing rule evaluation...');
  const testRule = {
    id: 'test-rule-1',
    description: 'Save $5 on food spending',
    triggerType: 'spending_category',
    triggerValue: 'food',
    amount: 5,
    maxPerTransaction: 5,
    monthlyMax: 30,
    isActive: true,
  };

  const testContexts = [
    { balance: 100, monthlySpent: 10, label: 'Normal (should execute)' },
    { balance: 100, monthlySpent: 28, label: 'Near monthly cap (should NOT execute)' },
    { balance: 2, monthlySpent: 0, label: 'Low balance (should NOT execute)' },
  ];

  for (const ctx of testContexts) {
    console.log(`\n   Context: ${ctx.label}`);
    const decision = await agentService.evaluateRule(testRule, ctx);
    console.log(`   Decision: ${JSON.stringify(decision)}`);
  }

  // 4. Test chat (LLM only)
  if (llmReady) {
    console.log('\n\n4️⃣  Testing chat conversation...');
    const testMessages = [
      'How much have I saved?',
      'Save $5 whenever I spend on food',
      'Pause my savings rule',
      'What did you do today?',
    ];

    const mockContext = {
      totalSaved: 23.0,
      monthlyTotal: 15.0,
      balance: 95,
      activeRules: [
        {
          description: 'Save $5 on food',
          amount: 5,
          monthlyMax: 30,
          isActive: true,
        },
      ],
      recentTransactions: [
        {
          action: 'SAVE',
          amount: 5,
          reasoning: 'Food spending triggered',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    for (const msg of testMessages) {
      console.log(`\n   You: "${msg}"`);
      const { reply, action } = await langchainAgent.chat(msg, mockContext);
      console.log(`   Fafnir: "${reply}"`);
      if (action) console.log(`   Action: ${JSON.stringify(action)}`);
    }
  } else {
    console.log('\n\n4️⃣  Chat test skipped (no OPENAI_API_KEY)');
  }

  console.log('\n\n═══════════════════════════════════════════');
  console.log('  ✅ Agent test complete!');
  console.log('═══════════════════════════════════════════\n');
}

testAgent().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

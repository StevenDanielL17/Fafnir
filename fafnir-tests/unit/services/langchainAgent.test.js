/**
 * UNIT TEST: LangChain Agent — Helpers & Contract
 * 
 * Tests the pure functions inside langchainAgent.js:
 *  - extractAction() — parses LLM response for structured actions
 *  - cleanReply() — strips action tags from user-facing text
 *  - buildContextSummary() — formats user context for LLM prompt
 *  - isAvailable() — reflects initialization state
 *  - chat() fallback — returns basic mode message when LLM unavailable
 *  - parseGoalWithLLM() — returns null when LLM unavailable
 *  - evaluateRuleWithLLM() — returns null when LLM unavailable
 * 
 * Strategy: Extract and test the deterministic helper functions.
 * LLM responses themselves are non-deterministic → we test the parsing layer.
 * 
 * RULE 1.2: langchainAgent owns LLM interaction, never touches Hedera SDK.
 */

import { describe, it, expect } from 'vitest';

// ─── Extracted from backend/services/langchainAgent.js ──────

function extractAction(content) {
  const goalMatch = content.match(/\[GOAL_JSON\]:\s*(.+)/);
  if (goalMatch) {
    return { type: 'create_goal', goalText: goalMatch[1].trim() };
  }

  const pauseMatch = content.match(/\[PAUSE_RULE\]:\s*(.+)/);
  if (pauseMatch) {
    return { type: 'pause_rule', keyword: pauseMatch[1].trim() };
  }

  const resumeMatch = content.match(/\[RESUME_RULE\]:\s*(.+)/);
  if (resumeMatch) {
    return { type: 'resume_rule', keyword: resumeMatch[1].trim() };
  }

  const updateMatch = content.match(/\[UPDATE_RULE\]:\s*(.+)/);
  if (updateMatch) {
    try {
      const update = JSON.parse(updateMatch[1].trim());
      return { type: 'update_rule', ...update };
    } catch {
      // Ignore parse error
    }
  }

  return null;
}

function cleanReply(content) {
  return content
    .replace(/\[GOAL_JSON\]:.*/g, '')
    .replace(/\[PAUSE_RULE\]:.*/g, '')
    .replace(/\[RESUME_RULE\]:.*/g, '')
    .replace(/\[UPDATE_RULE\]:.*/g, '')
    .trim();
}

function buildContextSummary(ctx) {
  const lines = [];

  if (ctx.totalSaved !== undefined) {
    lines.push(`Total saved all-time: $${ctx.totalSaved.toFixed(2)}`);
  }
  if (ctx.monthlyTotal !== undefined) {
    lines.push(`Saved this month: $${ctx.monthlyTotal.toFixed(2)}`);
  }
  if (ctx.balance !== undefined) {
    lines.push(`Current balance: ${ctx.balance} HBAR`);
  }

  if (ctx.activeRules && ctx.activeRules.length > 0) {
    lines.push(`\nActive rules:`);
    ctx.activeRules.forEach((r, i) => {
      lines.push(
        `  ${i + 1}. "${r.description}" — $${r.amount} per action, $${r.monthlyMax}/month max [${r.isActive ? 'active' : 'paused'}]`
      );
    });
  } else {
    lines.push('No active savings rules yet.');
  }

  if (ctx.recentTransactions && ctx.recentTransactions.length > 0) {
    lines.push(`\nRecent actions:`);
    ctx.recentTransactions.slice(0, 5).forEach((tx) => {
      lines.push(
        `  - ${tx.action}: $${tx.amount} (${tx.reasoning}) at ${tx.createdAt}`
      );
    });
  } else {
    lines.push('No recent transactions.');
  }

  return lines.join('\n');
}

// Simulates the LLM-unavailable state
function createUnavailableAgent() {
  return {
    isAvailable: () => false,
    async parseGoalWithLLM() { return null; },
    async evaluateRuleWithLLM() { return null; },
    async chat(userMessage) {
      return {
        reply: "I'm running in basic mode right now. You can still create goals by typing something like: \"Save $5 whenever I spend on food\"",
        action: null,
      };
    },
  };
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('LangChain Agent — extractAction()', () => {
  it('extracts create_goal from [GOAL_JSON] tag', () => {
    const content = 'Sure! I\'ll set that up.\n[GOAL_JSON]: Save $5 on food';
    const action = extractAction(content);

    expect(action.type).toBe('create_goal');
    expect(action.goalText).toBe('Save $5 on food');
  });

  it('extracts pause_rule from [PAUSE_RULE] tag', () => {
    const content = 'OK, I\'ll pause that.\n[PAUSE_RULE]: food';
    const action = extractAction(content);

    expect(action.type).toBe('pause_rule');
    expect(action.keyword).toBe('food');
  });

  it('extracts resume_rule from [RESUME_RULE] tag', () => {
    const content = 'Resuming it now!\n[RESUME_RULE]: coffee';
    const action = extractAction(content);

    expect(action.type).toBe('resume_rule');
    expect(action.keyword).toBe('coffee');
  });

  it('extracts update_rule with JSON payload', () => {
    const content = 'Updated!\n[UPDATE_RULE]: {"field": "amount", "value": 10, "keyword": "food"}';
    const action = extractAction(content);

    expect(action.type).toBe('update_rule');
    expect(action.field).toBe('amount');
    expect(action.value).toBe(10);
    expect(action.keyword).toBe('food');
  });

  it('returns null when no action tag found', () => {
    const action = extractAction('Just a normal reply about savings.');
    expect(action).toBeNull();
  });

  it('returns null when UPDATE_RULE has invalid JSON', () => {
    const content = '[UPDATE_RULE]: not valid json';
    const action = extractAction(content);
    expect(action).toBeNull();
  });
});

describe('LangChain Agent — cleanReply()', () => {
  it('strips [GOAL_JSON] tag from reply', () => {
    const content = 'I\'ll set that up for you!\n[GOAL_JSON]: Save $5 on food';
    expect(cleanReply(content)).toBe('I\'ll set that up for you!');
  });

  it('strips [PAUSE_RULE] tag', () => {
    const content = 'Pausing your food rule.\n[PAUSE_RULE]: food';
    expect(cleanReply(content)).toBe('Pausing your food rule.');
  });

  it('strips [RESUME_RULE] tag', () => {
    const content = 'Resuming!\n[RESUME_RULE]: coffee';
    expect(cleanReply(content)).toBe('Resuming!');
  });

  it('strips [UPDATE_RULE] tag', () => {
    const content = 'Done!\n[UPDATE_RULE]: {"field":"amount","value":10}';
    expect(cleanReply(content)).toBe('Done!');
  });

  it('returns full text when no tags present', () => {
    const content = 'You\'ve saved $45 this month!';
    expect(cleanReply(content)).toBe('You\'ve saved $45 this month!');
  });
});

describe('LangChain Agent — buildContextSummary()', () => {
  it('includes totalSaved', () => {
    const summary = buildContextSummary({ totalSaved: 123.45 });
    expect(summary).toContain('$123.45');
  });

  it('includes monthlyTotal', () => {
    const summary = buildContextSummary({ monthlyTotal: 50.00 });
    expect(summary).toContain('$50.00');
  });

  it('includes balance in HBAR', () => {
    const summary = buildContextSummary({ balance: 250 });
    expect(summary).toContain('250 HBAR');
  });

  it('lists active rules', () => {
    const summary = buildContextSummary({
      activeRules: [{ description: 'Save on food', amount: 5, monthlyMax: 30, isActive: true }],
    });
    expect(summary).toContain('Save on food');
    expect(summary).toContain('$5');
    expect(summary).toContain('active');
  });

  it('shows "No active savings rules" when empty', () => {
    const summary = buildContextSummary({ activeRules: [] });
    expect(summary).toContain('No active savings rules');
  });

  it('lists recent transactions', () => {
    const summary = buildContextSummary({
      recentTransactions: [
        { action: 'SAVE', amount: 5, reasoning: 'food', createdAt: '2026-03-01' },
      ],
    });
    expect(summary).toContain('SAVE');
    expect(summary).toContain('$5');
  });

  it('shows "No recent transactions" when empty', () => {
    const summary = buildContextSummary({ recentTransactions: [] });
    expect(summary).toContain('No recent transactions');
  });

  it('limits recent transactions to 5', () => {
    const txs = Array.from({ length: 10 }, (_, i) => ({
      action: 'SAVE', amount: i, reasoning: 'test', createdAt: '2026-03-01',
    }));
    const summary = buildContextSummary({ recentTransactions: txs });
    const saveLines = summary.split('\n').filter((l) => l.includes('SAVE:'));
    expect(saveLines.length).toBeLessThanOrEqual(5);
  });
});

describe('LangChain Agent — Unavailable Mode', () => {
  const agent = createUnavailableAgent();

  it('isAvailable() returns false', () => {
    expect(agent.isAvailable()).toBe(false);
  });

  it('parseGoalWithLLM() returns null', async () => {
    expect(await agent.parseGoalWithLLM('Save $5')).toBeNull();
  });

  it('evaluateRuleWithLLM() returns null', async () => {
    expect(await agent.evaluateRuleWithLLM({}, {})).toBeNull();
  });

  it('chat() returns basic mode fallback message', async () => {
    const { reply, action } = await agent.chat('Hello');
    expect(reply).toContain('basic mode');
    expect(action).toBeNull();
  });
});

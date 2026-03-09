/**
 * UNIT TEST: Agent Service — Goal Parsing & Rule Evaluation
 * Tests: Keyword parser (fallback), rule evaluation conditions
 * 
 * RULE: Agent must parse any plain English goal into a valid rule object.
 * RULE: If LLM fails, keyword parser must produce reasonable defaults.
 * 
 * Strategy: We extract and test the pure keyword parsing + rule evaluation
 * algorithms directly. These are the safety-critical fallback paths that
 * MUST work even when the LLM is unavailable.
 */

import { describe, it, expect } from 'vitest';

// ─── Keyword Parser (mirrors backend/services/agentService.js) ──────────

const CATEGORIES = ['food', 'coffee', 'transport', 'shopping', 'entertainment', 'dining'];

function parseGoalKeyword(goalText) {
  const text = goalText.toLowerCase();

  const amountMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 5.0;

  const maxMatch = text.match(/max(?:imum)?\s*\$(\d+(?:\.\d{2})?)/);
  const monthlyMax = maxMatch ? parseFloat(maxMatch[1]) : null;

  const perTxMatch = text.match(/never more than \$(\d+(?:\.\d{2})?)/);
  const maxPerTransaction = perTxMatch ? parseFloat(perTxMatch[1]) : amount;

  let triggerType = 'manual';
  let triggerValue = null;

  for (const cat of CATEGORIES) {
    if (text.includes(cat)) {
      triggerType = 'spending_category';
      triggerValue = cat;
      break;
    }
  }

  if (text.includes('every week') || text.includes('weekly') || text.includes('end of week')) {
    triggerType = 'scheduled';
    triggerValue = 'weekly';
  } else if (text.includes('every day') || text.includes('daily')) {
    triggerType = 'scheduled';
    triggerValue = 'daily';
  } else if (text.includes('every month') || text.includes('monthly')) {
    triggerType = 'scheduled';
    triggerValue = 'monthly';
  } else if (text.match(/every\s+(\d+)\s*hours?/)) {
    triggerType = 'scheduled';
    triggerValue = `every_${text.match(/every\s+(\d+)\s*hours?/)[1]}h`;
  }

  return {
    description: goalText,
    triggerType,
    triggerValue,
    amount,
    maxPerTransaction: maxPerTransaction || amount,
    monthlyMax: monthlyMax || amount * 30,
    isActive: true,
  };
}

// ─── Rule Evaluator (mirrors backend/services/agentService.js) ──────────

function evaluateRuleFallback(rule, context) {
  if (!rule.isActive) {
    return { shouldExecute: false, amount: 0, reasoning: 'Rule is paused' };
  }

  const monthlySpent = context.monthlySpent || 0;
  if (rule.monthlyMax && monthlySpent + rule.amount > rule.monthlyMax) {
    return {
      shouldExecute: false,
      amount: 0,
      reasoning: `Monthly cap reached ($${monthlySpent}/$${rule.monthlyMax})`,
    };
  }

  const balance = context.balance || 0;
  if (balance < rule.amount) {
    return {
      shouldExecute: false,
      amount: 0,
      reasoning: `Insufficient balance ($${balance})`,
    };
  }

  const amount = Math.min(rule.amount, rule.maxPerTransaction);
  return {
    shouldExecute: true,
    amount,
    reasoning: `Rule "${rule.description}" triggered. Saving $${amount}.`,
  };
}

// ═══════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════

describe('Agent Service — Goal Parsing (Keyword Fallback)', () => {
  describe('parseGoal() — spending category triggers', () => {
    it('parses "Save $5 whenever I spend on food"', () => {
      const rule = parseGoalKeyword('Save $5 whenever I spend on food');
      expect(rule.amount).toBe(5);
      expect(rule.triggerType).toBe('spending_category');
      expect(rule.triggerValue).toBe('food');
      expect(rule.isActive).toBe(true);
    });

    it('parses coffee spending trigger', () => {
      const rule = parseGoalKeyword('Save $2 every time I buy coffee');
      expect(rule.triggerValue).toBe('coffee');
      expect(rule.amount).toBe(2);
    });

    it('extracts monthly max', () => {
      const rule = parseGoalKeyword('Save $5 on food, max $30 per month');
      expect(rule.amount).toBe(5);
      expect(rule.monthlyMax).toBe(30);
    });

    it('extracts per-transaction limit', () => {
      const rule = parseGoalKeyword('Save $10 on food, never more than $3');
      expect(rule.maxPerTransaction).toBe(3);
    });
  });

  describe('parseGoal() — scheduled triggers', () => {
    it('parses weekly schedule', () => {
      const rule = parseGoalKeyword('Save $10 every week');
      expect(rule.triggerType).toBe('scheduled');
      expect(rule.triggerValue).toBe('weekly');
      expect(rule.amount).toBe(10);
    });

    it('parses daily schedule', () => {
      const rule = parseGoalKeyword('Save $3 every day');
      expect(rule.triggerType).toBe('scheduled');
      expect(rule.triggerValue).toBe('daily');
    });

    it('parses monthly schedule', () => {
      const rule = parseGoalKeyword('Save $50 monthly');
      expect(rule.triggerType).toBe('scheduled');
      expect(rule.triggerValue).toBe('monthly');
    });

    it('parses hourly schedule', () => {
      const rule = parseGoalKeyword('Save $1 every 2 hours');
      expect(rule.triggerType).toBe('scheduled');
      expect(rule.triggerValue).toBe('every_2h');
    });
  });

  describe('parseGoal() — defaults', () => {
    it('defaults to $5 when no amount specified', () => {
      const rule = parseGoalKeyword('Save money on food');
      expect(rule.amount).toBe(5);
    });

    it('defaults maxPerTransaction to amount', () => {
      const rule = parseGoalKeyword('Save $7 on food');
      expect(rule.maxPerTransaction).toBe(7);
    });

    it('defaults monthlyMax to amount * 30', () => {
      const rule = parseGoalKeyword('Save $5 on food');
      expect(rule.monthlyMax).toBe(150); // 5 * 30
    });

    it('always sets isActive to true', () => {
      const rule = parseGoalKeyword('anything');
      expect(rule.isActive).toBe(true);
    });
  });
});

describe('Agent Service — Rule Evaluation (Fallback)', () => {
  const baseRule = {
    id: 'rule-1',
    description: 'Save $5 on food',
    amount: 5,
    maxPerTransaction: 5,
    monthlyMax: 30,
    isActive: true,
  };
  const baseContext = { balance: 100, monthlySpent: 10 };

  it('executes when all conditions are met', () => {
    const result = evaluateRuleFallback(baseRule, baseContext);
    expect(result.shouldExecute).toBe(true);
    expect(result.amount).toBe(5);
  });

  it('rejects when monthly cap is reached', () => {
    const result = evaluateRuleFallback(baseRule, { ...baseContext, monthlySpent: 28 });
    expect(result.shouldExecute).toBe(false);
    expect(result.reasoning).toContain('cap');
  });

  it('rejects when balance is too low', () => {
    const result = evaluateRuleFallback(baseRule, { ...baseContext, balance: 2 });
    expect(result.shouldExecute).toBe(false);
    expect(result.reasoning).toContain('Insufficient');
  });

  it('rejects when rule is paused', () => {
    const result = evaluateRuleFallback({ ...baseRule, isActive: false }, baseContext);
    expect(result.shouldExecute).toBe(false);
    expect(result.reasoning).toContain('paused');
  });

  it('respects maxPerTransaction limit', () => {
    const rule = { ...baseRule, amount: 10, maxPerTransaction: 3 };
    const result = evaluateRuleFallback(rule, baseContext);
    expect(result.shouldExecute).toBe(true);
    expect(result.amount).toBe(3);
  });
});

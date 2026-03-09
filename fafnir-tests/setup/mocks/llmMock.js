/**
 * LLM MOCK
 * 
 * Deterministic replacement for LangChain/OpenAI calls.
 * Returns pre-defined responses for known inputs.
 * Falls through to keyword parser for unknown inputs.
 */

import { vi } from 'vitest';

// ── Fixture Responses ──────────────────────────────────

const GOAL_PARSE_FIXTURES = {
  'Save $5 whenever I spend on food, max $30 per month': {
    description: 'Save $5 whenever I spend on food, max $30 per month',
    triggerType: 'spending_category',
    triggerValue: 'food',
    amount: 5,
    maxPerTransaction: 5,
    monthlyMax: 30,
    isActive: true,
  },
  'Save $10 every week': {
    description: 'Save $10 every week',
    triggerType: 'scheduled',
    triggerValue: 'weekly',
    amount: 10,
    maxPerTransaction: 10,
    monthlyMax: 300,
    isActive: true,
  },
  'Put aside $3 daily, never more than $2 at once': {
    description: 'Put aside $3 daily, never more than $2 at once',
    triggerType: 'scheduled',
    triggerValue: 'daily',
    amount: 3,
    maxPerTransaction: 2,
    monthlyMax: 90,
    isActive: true,
  },
};

const EVALUATE_FIXTURES = {
  default_execute: {
    shouldExecute: true,
    amount: 5,
    reasoning: 'Rule conditions met. Saving $5.',
  },
  near_cap: {
    shouldExecute: false,
    amount: 0,
    reasoning: 'Monthly cap would be exceeded.',
  },
  low_balance: {
    shouldExecute: false,
    amount: 0,
    reasoning: 'Insufficient balance for this save.',
  },
};

const CHAT_FIXTURES = {
  'How much have I saved?': {
    reply: "You've saved $23.00 total, with $15.00 this month. Great progress!",
    action: null,
  },
  'Pause my savings rule': {
    reply: "I've paused your food savings rule. You can resume it anytime by telling me.",
    action: { type: 'pause_rule', keyword: 'food' },
  },
  'What did you do today?': {
    reply: 'Today I saved $5 when I detected food spending. Your total is now $23.',
    action: null,
  },
};

// ── Mock LangChain Agent ───────────────────────────────

export const mockLangchainAgent = {
  initialize: vi.fn(() => true),
  isAvailable: vi.fn(() => true),
  getHederaTools: vi.fn(() => []),

  parseGoalWithLLM: vi.fn(async (goalText) => {
    return GOAL_PARSE_FIXTURES[goalText] || null;
  }),

  evaluateRuleWithLLM: vi.fn(async (rule, context) => {
    if (context.monthlySpent + rule.amount > rule.monthlyMax) {
      return EVALUATE_FIXTURES.near_cap;
    }
    if (context.balance < rule.amount) {
      return EVALUATE_FIXTURES.low_balance;
    }
    return {
      ...EVALUATE_FIXTURES.default_execute,
      amount: Math.min(rule.amount, rule.maxPerTransaction),
    };
  }),

  chat: vi.fn(async (userMessage, userContext) => {
    return CHAT_FIXTURES[userMessage] || {
      reply: `I received your message: "${userMessage}". How can I help?`,
      action: null,
    };
  }),
};

/**
 * Install the LLM mock.
 */
export function installLLMMock() {
  vi.mock('../../backend/services/langchainAgent', () => mockLangchainAgent);
  return mockLangchainAgent;
}

/**
 * Force LLM to be "unavailable" (tests keyword fallback).
 */
export function disableLLM() {
  mockLangchainAgent.isAvailable.mockReturnValue(false);
  mockLangchainAgent.parseGoalWithLLM.mockResolvedValue(null);
  mockLangchainAgent.evaluateRuleWithLLM.mockResolvedValue(null);
}

/**
 * Restore LLM availability.
 */
export function enableLLM() {
  mockLangchainAgent.isAvailable.mockReturnValue(true);
}

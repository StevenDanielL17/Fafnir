'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('fafnir_token');
    if (savedToken) {
      setToken(savedToken);
      fetchRules(savedToken);
    }
  }, []);

  async function fetchRules(authToken) {
    try {
      const res = await fetch(`${API_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      setRules(data.rules || []);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  }

  async function createRule() {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ goalText: input }),
      });

      if (res.ok) {
        setInput('');
        fetchRules(token);
      }
    } catch (err) {
      console.error('Failed to create rule:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRule(ruleId, currentStatus) {
    try {
      await fetch(`${API_URL}/api/goals/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      fetchRules(token);
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

  async function deleteRule(ruleId) {
    try {
      await fetch(`${API_URL}/api/goals/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRules(token);
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-4xl font-display text-fafnir-text mb-2">Savings Rules</h1>
        <p className="text-fafnir-muted">
          Create automated rules to save money based on your spending habits
        </p>
      </div>

      {/* Create new rule */}
      <div className="liquid-glass p-6">
        <h2 className="text-lg font-display text-fafnir-text mb-4">Create New Rule</h2>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createRule()}
            placeholder="Save $5 whenever I spend on food, max $30/month"
            className="flex-1 bg-fafnir-black/50 border border-white/[0.08] rounded-xl px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-green/40 transition-colors"
          />
          <button
            onClick={createRule}
            disabled={loading || !input.trim()}
            className="bg-fafnir-green text-fafnir-black font-medium px-6 py-3 rounded-xl hover:shadow-[0_0_20px_rgba(0,200,150,0.3)] transition-all disabled:opacity-40 disabled:hover:shadow-none whitespace-nowrap"
          >
            {loading ? 'Creating...' : 'Add Rule'}
          </button>
        </div>
        <p className="text-xs text-fafnir-muted mt-3">
          💡 Try: "Save $10 every week" or "Put aside $3 when I buy coffee"
        </p>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="liquid-glass p-12 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-fafnir-muted">No rules yet. Create your first savings rule above!</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="liquid-glass p-6 relative group hover:border-fafnir-green/20 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-fafnir-text font-medium mb-2">{rule.description}</p>
                  <div className="flex items-center gap-4 text-sm text-fafnir-muted">
                    <span>${rule.amount.toFixed(2)} per save</span>
                    <span>•</span>
                    <span>${rule.monthlyMax.toFixed(2)}/month max</span>
                    <span>•</span>
                    <span className="capitalize">{rule.triggerType.replace('_', ' ')}</span>
                    {rule.triggerValue && (
                      <>
                        <span>•</span>
                        <span className="text-fafnir-green">{rule.triggerValue}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      rule.isActive
                        ? 'bg-fafnir-green/20 text-fafnir-green'
                        : 'bg-fafnir-muted/20 text-fafnir-muted'
                    }`}
                  >
                    {rule.isActive ? 'Active' : 'Paused'}
                  </span>

                  <button
                    onClick={() => toggleRule(rule.id, rule.isActive)}
                    className="px-4 py-2 text-xs text-fafnir-text hover:text-fafnir-green transition-colors"
                  >
                    {rule.isActive ? 'Pause' : 'Resume'}
                  </button>

                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="px-4 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info card */}
      <div className="liquid-glass p-6 border border-white/[0.08]">
        <div className="flex items-start gap-4">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="text-sm font-medium text-fafnir-text mb-2">
              How Automated Savings Works
            </h3>
            <p className="text-xs text-fafnir-muted leading-relaxed">
              Fafnir's AI agent evaluates your rules every 15 minutes. When conditions are met, it
              automatically transfers HBAR to your savings vault and logs the action to Hedera HCS
              for immutable proof. You can pause/resume rules anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ActiveRule({ rules = [], token }) {
  const activeRule = rules.find((r) => r.isActive !== false);
  const [paused, setPaused] = useState(false);
  const [toggling, setToggling] = useState(false);

  if (!activeRule) {
    return (
      <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
        <div className="relative z-10">
          <div className="text-sm text-fafnir-muted mb-3">Active Rule</div>
          <div className="text-center py-4">
            <span className="text-2xl mb-2 block">📋</span>
            <p className="text-sm text-fafnir-muted">No active rules yet. Set a savings goal to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  const spent = activeRule.monthlyTotal || 0;
  const limit = activeRule.monthlyMax || 30;
  const pct = Math.min((spent / limit) * 100, 100);

  async function handleToggle() {
    setToggling(true);
    try {
      const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('fafnir_token') : '');
      await fetch(`${API_URL}/api/goals/${activeRule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ isActive: paused }), // toggle
      });
      setPaused(!paused);
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-3">Active Rule</div>

        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">
            {activeRule.triggerType === 'spending_category' ? '🍔' : '⏰'}
          </span>
          <div>
            <div className="font-medium text-fafnir-text">
              {activeRule.description || 'Savings Rule'}
            </div>
            <div className="text-sm text-fafnir-muted">
              Save ${activeRule.amount?.toFixed(2) || '5.00'} per action, ${limit.toFixed(2)}/month max
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-fafnir-muted mb-1">
            <span>${spent.toFixed(2)} saved</span>
            <span>${limit.toFixed(2)} limit</span>
          </div>
          <div className="h-2 bg-fafnir-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fafnir-green to-fafnir-green-light rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`mt-3 text-xs px-4 py-1.5 rounded-full transition-all ${
            paused
              ? 'bg-fafnir-green/20 text-fafnir-green hover:bg-fafnir-green/30'
              : 'bg-white/[0.06] text-fafnir-muted hover:bg-white/[0.10]'
          }`}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>
    </div>
  );
}

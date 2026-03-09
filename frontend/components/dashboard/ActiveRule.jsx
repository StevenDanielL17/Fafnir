'use client';

import { useState } from 'react';

export default function ActiveRule({ rules = [] }) {
  const [paused, setPaused] = useState(false);

  const rule = rules.find((r) => r.active !== false) || {
    goalText: 'Save $5 per meal, $30/month max',
    trigger: 'food',
    amountPerTrigger: 5,
    monthlyLimit: 30,
  };

  const spent = 23;
  const limit = rule.monthlyLimit || 30;
  const pct = Math.min((spent / limit) * 100, 100);

  return (
    <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-3">Active Rule</div>

        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">🍔</span>
          <div>
            <div className="font-medium text-fafnir-text">Food Rule</div>
            <div className="text-sm text-fafnir-muted">
              Save ${rule.amountPerTrigger || 5} per meal, ${limit}/month max
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-fafnir-muted mb-1">
            <span>${spent} saved</span>
            <span>${limit} limit</span>
          </div>
          <div className="h-2 bg-fafnir-black/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fafnir-green to-fafnir-green-light rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => setPaused(!paused)}
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

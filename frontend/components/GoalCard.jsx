import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * GoalCard — Displays a single savings rule in the sidebar.
 * 
 * Shows: description, amount, trigger, active/paused status.
 * Actions: pause/resume, delete.
 */
export default function GoalCard({ rule, token }) {
  const [isActive, setIsActive] = useState(rule.isActive);
  const [deleted, setDeleted] = useState(false);

  async function togglePause() {
    try {
      const res = await fetch(`${API_URL}/api/goals/${rule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (res.ok) {
        setIsActive(!isActive);
      }
    } catch (err) {
      console.error('Failed to toggle rule:', err);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`${API_URL}/api/goals/${rule.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDeleted(true);
      }
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  }

  if (deleted) return null;

  return (
    <div
      className={`bg-fafnir-card border rounded-lg p-3 ${
        isActive ? 'border-fafnir-green/30' : 'border-fafnir-border opacity-60'
      }`}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isActive
              ? 'bg-fafnir-green/20 text-fafnir-green'
              : 'bg-fafnir-border text-fafnir-muted'
          }`}
        >
          {isActive ? '● Active' : '⏸ Paused'}
        </span>
        <span className="text-fafnir-gold font-bold text-sm">${rule.amount}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-fafnir-text mb-2 leading-snug">{rule.description}</p>

      {/* Details */}
      <div className="text-xs text-fafnir-muted space-y-0.5 mb-3">
        <div>Trigger: {rule.triggerType} ({rule.triggerValue || 'manual'})</div>
        <div>Max/tx: ${rule.maxPerTransaction} | Monthly: ${rule.monthlyMax}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={togglePause}
          className="flex-1 text-xs py-1.5 rounded border border-fafnir-border text-fafnir-muted hover:text-fafnir-text hover:border-fafnir-gold transition-colors"
        >
          {isActive ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={handleDelete}
          className="text-xs py-1.5 px-3 rounded border border-fafnir-border text-red-400 hover:border-red-400 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

'use client';

const ACTIONS = [
  { icon: '📝', label: 'New Rule' },
  { icon: '⏸', label: 'Pause All' },
  { icon: '💸', label: 'Withdraw' },
  { icon: '📊', label: 'View History' },
];

export default function QuickActions() {
  return (
    <div className="liquid-glass p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-4">Quick Actions</div>

        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map((a, i) => (
            <button
              key={i}
              className="liquid-glass liquid-glass-hover p-4 flex flex-col items-center gap-2 rounded-xl hover:-translate-y-1 transition-all relative z-10"
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs text-fafnir-text">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

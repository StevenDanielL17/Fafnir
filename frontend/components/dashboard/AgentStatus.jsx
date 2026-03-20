'use client';

export default function AgentStatus({ transactions = [], rules = [] }) {
  const hasRules = rules.some((r) => r.isActive !== false);
  const lastTx = transactions.length > 0 ? transactions[0] : null;

  let lastActionText = 'No activity yet';
  if (lastTx) {
    const diff = Date.now() - new Date(lastTx.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) lastActionText = 'Just now';
    else if (mins < 60) lastActionText = `${mins} min ago`;
    else if (mins < 1440) lastActionText = `${Math.floor(mins / 60)} hours ago`;
    else lastActionText = `${Math.floor(mins / 1440)} days ago`;
  }

  return (
    <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-3">Agent Status</div>

        <div className="flex items-center gap-2 mb-5">
          {hasRules ? (
            <>
              <span className="w-3 h-3 bg-fafnir-green rounded-full agent-pulse" />
              <span className="font-medium text-fafnir-text">Agent running ✓</span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 bg-fafnir-muted rounded-full" />
              <span className="font-medium text-fafnir-muted">Watching for triggers...</span>
            </>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Last action</span>
            <span className="text-fafnir-text">{lastTx ? lastActionText : 'No activity yet'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Active rules</span>
            <span className="text-fafnir-text">{rules.filter(r => r.isActive !== false).length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Status</span>
            <span className="text-fafnir-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-fafnir-green rounded-full" />
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

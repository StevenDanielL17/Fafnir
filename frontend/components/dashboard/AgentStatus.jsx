'use client';

export default function AgentStatus() {
  return (
    <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-3">Agent Status</div>

        <div className="flex items-center gap-2 mb-5">
          <span className="w-3 h-3 bg-fafnir-green rounded-full agent-pulse" />
          <span className="font-medium text-fafnir-text">Agent running ✓</span>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Last action</span>
            <span className="text-fafnir-text">3 min ago</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Next check</span>
            <span className="text-fafnir-text">12 min</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fafnir-muted">Network</span>
            <span className="text-fafnir-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-fafnir-green rounded-full" />
              Hedera OK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

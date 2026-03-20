'use client';

const BADGE = {
  SAVE: 'bg-fafnir-green/20 text-fafnir-green',
  SAVE_FAILED: 'bg-red-500/20 text-red-400',
  HARVEST: 'bg-amber-500/20 text-amber-400',
  LOG: 'bg-white/[0.06] text-fafnir-muted',
};

export default function TransactionLog({ transactions = [] }) {
  if (transactions.length === 0) {
    return (
      <div className="liquid-glass p-6 h-full relative">
        <div className="relative z-10">
          <div className="text-sm text-fafnir-muted mb-4">Transaction Log</div>
          <div className="text-center py-8 text-fafnir-muted text-sm">
            No activity yet. Set a rule to get started.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="liquid-glass p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-4">Transaction Log</div>

        <div className="space-y-1 max-h-[320px] overflow-y-auto chat-scroll">
          {transactions.map((tx, i) => (
            <div
              key={tx.id || i}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-fafnir-green text-sm shrink-0">✓</span>

              <span className="text-xs text-fafnir-muted w-20 shrink-0">
                {tx.createdAt
                  ? new Date(tx.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </span>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  BADGE[tx.action] || BADGE.LOG
                }`}
              >
                {tx.action === 'SAVE' ? 'Saved' : tx.action}
              </span>

              <span className="text-sm text-fafnir-text flex-1 truncate">
                {tx.reasoning || tx.action}
              </span>

              {tx.amount > 0 && (
                <span className="text-sm font-medium text-fafnir-text shrink-0">
                  ${tx.amount.toFixed(2)}
                </span>
              )}

              <span className="text-[10px] text-fafnir-green/60 hidden md:block shrink-0">
                Verified ✓
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

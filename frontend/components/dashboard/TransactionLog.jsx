'use client';

const DEMO_TX = [
  { id: 1, type: 'SAVE', amount: 5.0, description: 'Food trigger', timestamp: '10:32 AM', hcsSeq: 1042 },
  { id: 2, type: 'SAVE', amount: 5.0, description: 'Food trigger', timestamp: 'Yesterday', hcsSeq: 1041 },
  { id: 3, type: 'HARVEST', amount: 0.43, description: 'Yield harvest', timestamp: 'Monday', hcsSeq: 1040 },
  { id: 4, type: 'SAVE', amount: 5.0, description: 'Food trigger', timestamp: 'Saturday', hcsSeq: 1039 },
  { id: 5, type: 'SAVE', amount: 5.0, description: 'Food trigger', timestamp: 'Last Tue', hcsSeq: 1038 },
  { id: 6, type: 'LOG', amount: 0, description: 'Rule created', timestamp: 'Last Mon', hcsSeq: 1037 },
];

const BADGE = {
  SAVE: 'bg-fafnir-green/20 text-fafnir-green',
  HARVEST: 'bg-amber-500/20 text-amber-400',
  LOG: 'bg-white/[0.06] text-fafnir-muted',
};

export default function TransactionLog({ transactions = [] }) {
  const list = transactions.length > 0 ? transactions : DEMO_TX;

  return (
    <div className="liquid-glass p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-4">Transaction Log</div>

        <div className="space-y-1 max-h-[320px] overflow-y-auto chat-scroll">
          {list.map((tx, i) => (
            <div
              key={tx.id || i}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-fafnir-green text-sm shrink-0">✓</span>

              <span className="text-xs text-fafnir-muted w-20 shrink-0">
                {tx.timestamp || new Date(tx.createdAt).toLocaleString()}
              </span>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  BADGE[tx.type] || BADGE.LOG
                }`}
              >
                {tx.type}
              </span>

              <span className="text-sm text-fafnir-text flex-1 truncate">
                {tx.description || tx.type}
              </span>

              {tx.amount > 0 && (
                <span className="text-sm font-medium text-fafnir-text shrink-0">
                  ${tx.amount.toFixed(2)}
                </span>
              )}

              <span className="text-[10px] text-fafnir-muted/40 hidden md:block shrink-0">
                HCS #{tx.hcsSeq || '–'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

export default function TotalSavings({ transactions = [] }) {
  const saveTx = transactions.filter((t) => t.action === 'SAVE' || t.type === 'SAVE');

  const totalSaved = saveTx.reduce((sum, t) => sum + (t.amount || 0), 0);

  const now = new Date();
  const thisMonth = saveTx
    .filter((t) => {
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const hasData = saveTx.length > 0;
  const total = totalSaved;
  const month = thisMonth;

  return (
    <div className="liquid-glass liquid-glass-green liquid-glass-active p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-1">Total Saved</div>
        <div className="text-4xl font-bold text-fafnir-text mb-1">${total.toFixed(2)}</div>
        <div className="text-sm text-fafnir-green mb-4">+${month.toFixed(2)} this month</div>

        {/* Sparkline — only show if we have 3+ transactions */}
        {saveTx.length >= 3 && (
          <svg viewBox="0 0 200 40" className="w-full h-10 mb-3">
            <defs>
              <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00C896" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00C896" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points="0,35 20,30 40,28 60,32 80,25 100,20 120,22 140,15 160,12 180,8 200,5"
              fill="none"
              stroke="#00C896"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <polyline
              points="0,35 20,30 40,28 60,32 80,25 100,20 120,22 140,15 160,12 180,8 200,5 200,40 0,40"
              fill="url(#savGrad)"
            />
          </svg>
        )}

        <div className="flex items-center gap-2 text-xs text-fafnir-muted">
          <span className="w-2 h-2 bg-fafnir-green rounded-full agent-pulse" />
          {hasData ? 'Fafnir is actively saving' : 'Set a rule to start saving'}
        </div>
      </div>
    </div>
  );
}

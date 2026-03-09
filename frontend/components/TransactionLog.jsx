/**
 * TransactionLog — Displays immutable action history.
 * 
 * Data comes from HCS (via backend).
 * Each row shows: timestamp, action, amount, reasoning.
 */
export default function TransactionLog({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-8 text-center">
        <p className="text-fafnir-muted">No transactions yet.</p>
        <p className="text-fafnir-muted text-sm mt-1">
          Set a savings goal and the agent will start working for you.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-fafnir-card border border-fafnir-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-fafnir-border text-fafnir-muted text-xs uppercase tracking-wider">
            <th className="text-left px-4 py-3">Time</th>
            <th className="text-left px-4 py-3">Action</th>
            <th className="text-right px-4 py-3">Amount</th>
            <th className="text-left px-4 py-3">Reasoning</th>
            <th className="text-left px-4 py-3">HCS Seq</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b border-fafnir-border/50 hover:bg-fafnir-border/20 transition-colors"
            >
              <td className="px-4 py-3 text-fafnir-muted text-xs whitespace-nowrap">
                {formatTime(tx.createdAt)}
              </td>
              <td className="px-4 py-3">
                <ActionBadge action={tx.action} />
              </td>
              <td className="px-4 py-3 text-right font-mono">
                {tx.action === 'SAVE' ? (
                  <span className="text-fafnir-green">+${tx.amount.toFixed(2)}</span>
                ) : (
                  <span className="text-fafnir-muted">${tx.amount?.toFixed(2) || '—'}</span>
                )}
              </td>
              <td className="px-4 py-3 text-fafnir-muted text-xs max-w-xs truncate">
                {tx.reasoning || '—'}
              </td>
              <td className="px-4 py-3 text-fafnir-muted text-xs font-mono">
                {tx.hcsSequenceNumber || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionBadge({ action }) {
  const styles = {
    SAVE: 'bg-fafnir-green/20 text-fafnir-green',
    SAVE_FAILED: 'bg-red-500/20 text-red-400',
    RULE_CREATED: 'bg-fafnir-blue/20 text-fafnir-blue',
    RULE_UPDATED: 'bg-fafnir-gold/20 text-fafnir-gold',
    RULE_DELETED: 'bg-fafnir-muted/20 text-fafnir-muted',
    ACCOUNT_CREATED: 'bg-purple-500/20 text-purple-400',
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        styles[action] || 'bg-fafnir-border text-fafnir-muted'
      }`}
    >
      {action}
    </span>
  );
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

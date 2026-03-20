'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HistoryPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('fafnir_token');
    if (!savedToken) {
      window.location.replace('/login');
      return;
    }
    setToken(savedToken);
    fetchHistory(savedToken);
  }, []);

  async function fetchHistory(authToken) {
    try {
      const [txRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/history?limit=100`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_URL}/api/history/summary`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (txRes.ok) {
        const data = await txRes.json();
        setTransactions(data.transactions || []);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fafnir-muted">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display text-fafnir-text mb-2">Transaction History</h1>
            <p className="text-fafnir-muted">All savings tracked on Hedera HCS</p>
          </div>
          <a
            href="/dashboard"
            className="liquid-glass px-6 py-3 rounded-xl text-sm text-fafnir-text hover:border-fafnir-green/40 transition-all inline-block"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="liquid-glass p-6">
              <div className="text-fafnir-muted text-sm mb-2">Total Saved</div>
              <div className="text-3xl font-display text-fafnir-green">
                ${summary.totalSaved.toFixed(2)}
              </div>
            </div>
            <div className="liquid-glass p-6">
              <div className="text-fafnir-muted text-sm mb-2">This Month</div>
              <div className="text-3xl font-display text-fafnir-text">
                ${summary.savedThisMonth.toFixed(2)}
              </div>
            </div>
            <div className="liquid-glass p-6">
              <div className="text-fafnir-muted text-sm mb-2">Total Transactions</div>
              <div className="text-3xl font-display text-fafnir-text">
                {transactions.length}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        <div className="liquid-glass p-6">
          <h2 className="text-xl font-display text-fafnir-text mb-6">All Transactions</h2>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-fafnir-muted">
              No savings activity yet. Set your first savings rule to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      Action
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      Reason
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      TX ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm text-fafnir-muted font-normal">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-4 text-sm text-fafnir-text">
                        {new Date(tx.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            tx.action === 'SAVE'
                              ? 'bg-fafnir-green/20 text-fafnir-green'
                              : tx.action === 'SAVE_FAILED'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-fafnir-gold/20 text-fafnir-gold'
                          }`}
                        >
                          {tx.action === 'SAVE' ? 'Saved' : tx.action}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-fafnir-text">
                        {tx.action === 'SAVE' ? '+' : ''}${tx.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm text-fafnir-muted max-w-xs truncate">
                        {tx.reasoning || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-fafnir-muted font-mono">
                        {tx.transactionId
                          ? tx.transactionId.substring(0, 16) + '...'
                          : tx.hcsSequenceNumber
                          ? `HCS #${tx.hcsSequenceNumber}`
                          : '-'}
                      </td>
                      <td className="py-4 px-4">
                        {tx.transactionId ? (
                          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-fafnir-green/20 text-fafnir-green">
                            Verified ✓
                          </span>
                        ) : (
                          <span className="text-xs text-fafnir-muted">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* HCS Info */}
        <div className="liquid-glass p-6 border border-white/[0.08]">
          <div className="flex items-start gap-4">
            <div className="text-2xl">🔒</div>
            <div>
              <h3 className="text-sm font-medium text-fafnir-text mb-2">
                Immutable Audit Trail via Hedera Consensus Service
              </h3>
              <p className="text-xs text-fafnir-muted leading-relaxed">
                Every transaction is logged to your personal HCS topic on Hedera. Sequence numbers
                provide cryptographic proof that logs cannot be altered or deleted. Your financial
                history is permanently auditable on a public ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

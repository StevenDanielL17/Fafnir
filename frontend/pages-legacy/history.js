import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TransactionLog from '../components/TransactionLog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function HistoryPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('fafnir_token');
    if (!savedToken) {
      router.push('/');
      return;
    }
    setToken(savedToken);
    fetchData(savedToken);
  }, []);

  async function fetchData(authToken) {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/history/summary`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_URL}/api/history`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData.summary);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setTransactions(historyData.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Fafnir — Transaction History</title>
      </Head>

      <div className="min-h-screen">
        {/* Header */}
        <header className="border-b border-fafnir-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-fafnir-gold">Fafnir</h1>
            <span className="text-fafnir-muted text-sm">Transaction History</span>
          </div>
          <button
            onClick={() => router.push('/app')}
            className="text-fafnir-blue text-sm hover:underline"
          >
            ← Back to Chat
          </button>
        </header>

        <main className="max-w-4xl mx-auto p-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-5">
                <div className="text-fafnir-muted text-sm">Total Saved</div>
                <div className="text-3xl font-bold text-fafnir-green mt-1">
                  ${summary.totalSaved.toFixed(2)}
                </div>
              </div>
              <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-5">
                <div className="text-fafnir-muted text-sm">Saved This Month</div>
                <div className="text-3xl font-bold text-fafnir-blue mt-1">
                  ${summary.savedThisMonth.toFixed(2)}
                </div>
              </div>
              <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-5">
                <div className="text-fafnir-muted text-sm">Recent Actions</div>
                <div className="text-3xl font-bold text-fafnir-gold mt-1">
                  {summary.recentActions.length}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Log */}
          <h2 className="text-lg font-semibold mb-4">All Actions (Immutable on HCS)</h2>
          {loading ? (
            <p className="text-fafnir-muted">Loading...</p>
          ) : (
            <TransactionLog transactions={transactions} />
          )}
        </main>
      </div>
    </>
  );
}

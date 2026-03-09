import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ChatInterface from '../components/ChatInterface';
import GoalCard from '../components/GoalCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rules, setRules] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('fafnir_token');
    const savedUser = localStorage.getItem('fafnir_user');

    if (!savedToken || !savedUser) {
      router.push('/');
      return;
    }

    setToken(savedToken);
    setUser(JSON.parse(savedUser));
    fetchRules(savedToken);
  }, []);

  async function fetchRules(authToken) {
    try {
      const res = await fetch(`${API_URL}/api/goals`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) setRules(data.rules);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  }

  function handleNewRule(rule) {
    setRules((prev) => [rule, ...prev]);
  }

  function handleLogout() {
    localStorage.removeItem('fafnir_token');
    localStorage.removeItem('fafnir_user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Fafnir — Dashboard</title>
      </Head>

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b border-fafnir-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-fafnir-gold">Fafnir</h1>
            <span className="text-fafnir-muted text-sm">AI Financial Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-fafnir-muted text-sm">{user.email}</span>
            <button
              onClick={() => router.push('/history')}
              className="text-fafnir-blue text-sm hover:underline"
            >
              History
            </button>
            <button
              onClick={handleLogout}
              className="text-fafnir-muted text-sm hover:text-fafnir-text"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex-1 flex">
          {/* Chat Panel (primary) */}
          <div className="flex-1 flex flex-col">
            <ChatInterface token={token} onNewRule={handleNewRule} />
          </div>

          {/* Sidebar: Active Rules */}
          <aside className="w-80 border-l border-fafnir-border p-4 hidden lg:block overflow-y-auto">
            <h2 className="text-sm font-semibold text-fafnir-muted uppercase tracking-wider mb-4">
              Active Rules
            </h2>
            {rules.length === 0 ? (
              <p className="text-fafnir-muted text-sm">
                No rules yet. Tell me your savings goal in the chat!
              </p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <GoalCard key={rule.id} rule={rule} token={token} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

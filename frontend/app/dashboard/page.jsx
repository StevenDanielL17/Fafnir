'use client';

import { useEffect, useState } from 'react';
import TotalSavings from '../../components/dashboard/TotalSavings';
import ActiveRule from '../../components/dashboard/ActiveRule';
import AgentStatus from '../../components/dashboard/AgentStatus';
import YieldCard from '../../components/dashboard/YieldCard';
import ChatInterface from '../../components/dashboard/ChatInterface';
import QuickActions from '../../components/dashboard/QuickActions';
import TransactionLog from '../../components/dashboard/TransactionLog';
import SavingsGoals from '../../components/dashboard/SavingsGoals';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const [rules, setRules] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('fafnir_token');
    if (savedToken) {
      setToken(savedToken);
      fetchData(savedToken);
    }
  }, []);

  async function fetchData(authToken) {
    try {
      const [rulesRes, histRes] = await Promise.all([
        fetch(`${API_URL}/api/goals`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_URL}/api/history?limit=20`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
      if (histRes.ok) {
        const data = await histRes.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }

  function handleNewRule(rule) {
    setRules((prev) => [rule, ...prev]);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* ── Row 1 ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4">
          <TotalSavings transactions={transactions} />
        </div>
        <div className="md:col-span-4">
          <ActiveRule rules={rules} token={token} />
        </div>
        <div className="md:col-span-4">
          <AgentStatus transactions={transactions} rules={rules} />
        </div>
      </div>

      {/* ── Row 2 ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <YieldCard />
        </div>
        <div className="md:col-span-5">
          <ChatInterface token={token} onNewRule={handleNewRule} />
        </div>
        <div className="md:col-span-4">
          <QuickActions />
        </div>
      </div>

      {/* ── Row 3 ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <TransactionLog transactions={transactions} />
        </div>
        <div className="md:col-span-4">
          <SavingsGoals />
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fafnir_token');
    const userData = localStorage.getItem('fafnir_user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-fafnir-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fafnir-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function handleLogout() {
    localStorage.removeItem('fafnir_token');
    localStorage.removeItem('fafnir_user');
    router.push('/');
  }

  const name = user?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-fafnir-black flex flex-col">
      {/* ── Top Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <a href="/" className="flex items-center gap-2">
          <span className="text-xl">🐉</span>
          <span className="text-lg font-bold text-fafnir-text tracking-[0.12em]">FAFNIR</span>
        </a>

        <div className="hidden md:block text-fafnir-text text-sm">
          Good {getGreeting()}, {name} 👋
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-fafnir-muted hover:text-fafnir-text transition-colors">
            <span className="text-lg">🔔</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fafnir-green rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-fafnir-green/20 flex items-center justify-center text-xs text-fafnir-green font-bold uppercase">
            {name[0]}
          </div>
          <button
            onClick={handleLogout}
            className="hidden md:block text-xs text-fafnir-muted hover:text-fafnir-text transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Ambient glow ── */}
      <div className="relative flex-1">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-fafnir-green/[0.04] rounded-full blur-[120px] pointer-events-none" />
        <main className="relative z-10 p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 liquid-glass border-t border-white/[0.06] flex justify-around py-3 z-50">
        <button className="flex flex-col items-center gap-0.5 text-fafnir-green text-[10px]">
          <span className="text-base">🏠</span>
          Home
        </button>
        <button className="flex flex-col items-center gap-0.5 text-fafnir-muted text-[10px]">
          <span className="text-base">📋</span>
          Rules
        </button>
        <button className="flex flex-col items-center gap-0.5 text-fafnir-muted text-[10px]">
          <span className="text-base">📊</span>
          History
        </button>
        <button className="flex flex-col items-center gap-0.5 text-fafnir-muted text-[10px]">
          <span className="text-base">⚙️</span>
          Settings
        </button>
      </nav>
    </div>
  );
}

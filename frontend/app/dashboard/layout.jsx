'use client';

import { useEffect, useState } from 'react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('fafnir_token');
    const userData = localStorage.getItem('fafnir_user');

    if (!token || !userData) {
      setLoading(false);
      window.location.replace('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      setLoading(false);
      window.location.replace('/login');
      return;
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-fafnir-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-fafnir-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-fafnir-black flex items-center justify-center px-6">
        <div className="liquid-glass p-6 max-w-md text-center">
          <p className="text-fafnir-text mb-2">Session not available.</p>
          <p className="text-fafnir-muted text-sm">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  function handleLogout() {
    localStorage.removeItem('fafnir_token');
    localStorage.removeItem('fafnir_user');
    window.location.replace('/');
  }

  const name = user?.email?.split('@')[0] || 'there';
  const avatarInitial = name && typeof name === 'string' ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-fafnir-black flex flex-col">
      {/* ── Top Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
        <a href="/" className="flex items-center gap-2">
          <img src="/fafnir-logo.png" alt="Fafnir" className="w-7 h-7 rounded-full" />
          <span className="text-lg font-bold text-fafnir-text tracking-[0.12em]">FAFNIR</span>
        </a>

        <div className="hidden md:flex items-center gap-6 text-sm">
          <a
            href="/dashboard"
            className={`transition-colors ${
              currentPath === '/dashboard'
                ? 'text-fafnir-green'
                : 'text-fafnir-muted hover:text-fafnir-text'
            }`}
          >
            Dashboard
          </a>
          <a
            href="/rules"
            className={`transition-colors ${
              currentPath === '/rules'
                ? 'text-fafnir-green'
                : 'text-fafnir-muted hover:text-fafnir-text'
            }`}
          >
            Rules
          </a>
          <a
            href="/history"
            className={`transition-colors ${
              currentPath === '/history'
                ? 'text-fafnir-green'
                : 'text-fafnir-muted hover:text-fafnir-text'
            }`}
          >
            History
          </a>
          <div className="text-fafnir-muted text-sm">
            Good {getGreeting()}, {name} 👋
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative text-fafnir-muted hover:text-fafnir-text transition-colors">
            <span className="text-lg">🔔</span>
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fafnir-green rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-fafnir-green/20 flex items-center justify-center text-xs text-fafnir-green font-bold uppercase">
            {avatarInitial}
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
        <a
          href="/dashboard"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${
            currentPath === '/dashboard' ? 'text-fafnir-green' : 'text-fafnir-muted'
          }`}
        >
          <span className="text-base">🏠</span>
          Home
        </a>
        <a
          href="/rules"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${
            currentPath === '/rules' ? 'text-fafnir-green' : 'text-fafnir-muted'
          }`}
        >
          <span className="text-base">📋</span>
          Rules
        </a>
        <a
          href="/history"
          className={`flex flex-col items-center gap-0.5 text-[10px] ${
            currentPath === '/history' ? 'text-fafnir-green' : 'text-fafnir-muted'
          }`}
        >
          <span className="text-base">📊</span>
          History
        </a>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 text-fafnir-muted text-[10px]"
        >
          <span className="text-base">⚙️</span>
          Logout
        </button>
      </nav>
    </div>
  );
}

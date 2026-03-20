'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Attempting login with:', email);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', res.status);
      
      const data = await res.json();
      console.log('📦 Response data:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token and user data
      localStorage.setItem('fafnir_token', data.token);
      localStorage.setItem('fafnir_user', JSON.stringify(data.user));

      console.log('✅ Login successful, redirecting to dashboard');

      // Force full page reload to dashboard (ensures middleware sees fresh localStorage)
      window.location.replace('/dashboard');
    } catch (err) {
      console.error('❌ Login error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-fafnir-black flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fafnir-green/[0.04] rounded-full blur-[140px] pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-2">
        <img src="/fafnir-logo.png" alt="Fafnir" className="w-8 h-8 rounded-full" />
        <span className="text-xl font-bold text-fafnir-text tracking-[0.15em]">FAFNIR</span>
      </Link>

      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md">
        <div className="liquid-glass p-8 md:p-10">
          <div className="relative z-10">
            <h1 className="font-display text-3xl font-semibold text-fafnir-text mb-2">
              Welcome back
            </h1>
            <p className="text-fafnir-muted mb-8">
              Continue saving with Fafnir
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm text-fafnir-text mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full bg-fafnir-black/50 border border-white/[0.08] rounded-xl px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-green/40 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm text-fafnir-text mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Your password"
                  className="w-full bg-fafnir-black/50 border border-white/[0.08] rounded-xl px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-green/40 transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-fafnir-green text-fafnir-black font-semibold py-3.5 rounded-xl hover:shadow-[0_0_24px_rgba(0,200,150,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Signup link */}
            <p className="text-center text-sm text-fafnir-muted mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-fafnir-green hover:text-fafnir-green-light transition-colors">
                Sign up
              </Link>
            </p>

            {/* Trust note */}
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <p className="text-xs text-fafnir-muted text-center leading-relaxed">
                <span className="text-fafnir-green">🔒</span> Secure login
                <span className="mx-2">·</span>
                Your keys are encrypted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

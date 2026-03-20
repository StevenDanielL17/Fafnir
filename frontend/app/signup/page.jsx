'use client';

import { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Save token and user data
      localStorage.setItem('fafnir_token', data.token);
      localStorage.setItem('fafnir_user', JSON.stringify(data.user));

      // Force full page reload to dashboard (ensures middleware sees fresh localStorage)
      window.location.replace('/dashboard');
    } catch (err) {
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
              Create your account
            </h1>
            <p className="text-fafnir-muted mb-8">
              Your Hedera account will be created automatically
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
                <p className="text-xs text-fafnir-muted mt-1.5">We&apos;ll create your Hedera account automatically</p>
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
                  placeholder="At least 8 characters"
                  className="w-full bg-fafnir-black/50 border border-white/[0.08] rounded-xl px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-green/40 transition-colors"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-fafnir-text mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Re-enter your password"
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
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-fafnir-muted mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-fafnir-green hover:text-fafnir-green-light transition-colors">
                Log in
              </Link>
            </p>

            {/* Trust note */}
            <div className="mt-8 pt-6 border-t border-white/[0.06]">
              <p className="text-xs text-fafnir-muted text-center leading-relaxed">
                <span className="text-fafnir-green">🔒</span> No credit card required
                <span className="mx-2">·</span>
                Your account is created on Hedera testnet
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

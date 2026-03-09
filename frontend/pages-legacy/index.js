import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        // If user exists, try login instead
        if (res.status === 409) {
          const loginRes = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            localStorage.setItem('fafnir_token', loginData.token);
            localStorage.setItem('fafnir_user', JSON.stringify(loginData.user));
            router.push('/app');
            return;
          }
        }
        throw new Error(data.error || 'Signup failed');
      }

      localStorage.setItem('fafnir_token', data.token);
      localStorage.setItem('fafnir_user', JSON.stringify(data.user));
      router.push('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Fafnir — AI Financial Agent on Hedera</title>
        <meta name="description" content="Tell Fafnir your financial goal. It does the rest." />
      </Head>

      <main className="min-h-screen flex flex-col items-center justify-center px-4">
        {/* Hero */}
        <div className="text-center max-w-2xl">
          <h1 className="text-6xl font-bold mb-2">
            <span className="text-fafnir-gold">Fafnir</span>
          </h1>
          <p className="text-fafnir-muted text-lg mb-2">
            AI Financial Agent on Hedera
          </p>
          <p className="text-2xl text-fafnir-text mb-8">
            Tell me your savings goal.<br />
            <span className="text-fafnir-gold">I do the rest.</span>
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-sm">
            <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-4">
              <div className="text-fafnir-gold text-xl mb-2">💬</div>
              <div className="font-medium">Plain English</div>
              <div className="text-fafnir-muted">No crypto knowledge needed</div>
            </div>
            <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-4">
              <div className="text-fafnir-gold text-xl mb-2">🤖</div>
              <div className="font-medium">Autonomous Agent</div>
              <div className="text-fafnir-muted">Saves for you 24/7</div>
            </div>
            <div className="bg-fafnir-card border border-fafnir-border rounded-lg p-4">
              <div className="text-fafnir-gold text-xl mb-2">🔒</div>
              <div className="font-medium">On-Chain Audit</div>
              <div className="text-fafnir-muted">Every action is immutable</div>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="max-w-md mx-auto">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-fafnir-card border border-fafnir-border rounded-lg px-4 py-3 text-fafnir-text placeholder-fafnir-muted focus:outline-none focus:border-fafnir-gold transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-fafnir-gold text-fafnir-darker font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Start Saving'}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
            <p className="text-fafnir-muted text-xs mt-3">
              No wallet needed. We create your Hedera account automatically.
            </p>
          </form>
        </div>

        {/* Footer */}
        <footer className="absolute bottom-6 text-fafnir-muted text-xs">
          Built on Hedera | Hedera Apex Hackathon 2026
        </footer>
      </main>
    </>
  );
}

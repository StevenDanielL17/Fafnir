'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ParticleNetwork from './ParticleNetwork';

const WORDS = ['saves itself', 'grows itself', 'protects itself', 'works for you'];

export default function Hero() {
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    const interval = setInterval(() => setIdx((p) => (p + 1) % WORDS.length), 2500);
    return () => clearInterval(interval);
  }, []);

  const fade = (delay) =>
    `transition-all duration-1000 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} delay-[${delay}ms]`;

  return (
    <section className="relative min-h-screen flex flex-col">
      {/* ── Background ── */}
      <div className="absolute inset-0 bg-fafnir-black">
        <ParticleNetwork />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-fafnir-black/80" />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <img src="/fafnir-logo.png" alt="Fafnir" className="w-8 h-8 rounded-full" />
          <span className="text-xl font-bold text-fafnir-text tracking-[0.15em]">FAFNIR</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-fafnir-muted">
          <a href="#how-it-works" className="hover:text-fafnir-text transition-colors">How it Works</a>
          <a href="#features" className="hover:text-fafnir-text transition-colors">Features</a>
          <a href="#security" className="hover:text-fafnir-text transition-colors">Security</a>
        </div>
        <a
          href="/signup"
          className="liquid-glass liquid-glass-green px-5 py-2 text-sm font-medium text-fafnir-green hover:text-fafnir-green-light transition-colors relative z-10"
        >
          Start Saving
        </a>
      </nav>

      {/* ── Hero Content ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Tag */}
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-fafnir-green text-sm font-medium tracking-[0.2em] uppercase mb-6"
        >
          AI-Powered Financial Agent
        </motion.span>

        {/* Static line */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-fafnir-text mb-2"
        >
          Your money,
        </motion.h1>

        {/* Cycling line */}
        <div className="h-[1.15em] overflow-hidden mb-8">
          <AnimatePresence mode="wait">
            <motion.span
              key={idx}
              initial={{ y: 40, opacity: 0, filter: 'blur(6px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -40, opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="block font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-gradient-green"
            >
              {WORDS[idx]}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="text-fafnir-muted text-lg md:text-xl max-w-xl mb-10"
        >
          Tell Fafnir your goal. It handles the rest.
          <br />
          No crypto knowledge required.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col items-center gap-4"
        >
          <a
            href="/signup"
            className="bg-fafnir-green text-fafnir-black font-semibold px-8 py-4 rounded-full text-lg hover:shadow-[0_0_30px_rgba(0,200,150,0.4)] hover:-translate-y-0.5 transition-all"
          >
            Start for Free
          </a>
          <a
            href="#how-it-works"
            className="text-fafnir-muted text-sm hover:text-fafnir-text transition-colors group"
          >
            Watch Demo{' '}
            <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="flex flex-wrap justify-center gap-6 mt-12 text-sm text-fafnir-muted"
        >
          <span>🔒 Non-custodial</span>
          <span className="hidden sm:inline">·</span>
          <span>⚡ $0.0001 per tx</span>
          <span className="hidden sm:inline">·</span>
          <span>🌏 Works globally</span>
        </motion.div>
      </div>

      {/* ── Marquee ── */}
      <div className="relative z-10 py-4 border-t border-b border-white/[0.06] overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="text-fafnir-muted/25 text-sm tracking-[0.3em] uppercase shrink-0 mx-6"
            >
              HEDERA &middot; AI AGENT &middot; ZERO FEES &middot; YOUR RULES &middot; INSTANT
              SETTLEMENT &middot; FULL AUDIT TRAIL &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

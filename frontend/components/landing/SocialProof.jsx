'use client';

import ScrollReveal from '../ui/ScrollReveal';

const STATS = [
  { value: '$0.0001', label: 'Transaction cost on Hedera' },
  { value: '10,000 TPS', label: 'Network capacity' },
  { value: '0', label: 'Private keys you ever touch' },
];

export default function SocialProof() {
  return (
    <section className="py-16 border-b border-white/[0.06]">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
        {STATS.map((s, i) => (
          <ScrollReveal key={i} delay={i * 0.15}>
            <div className="font-display text-4xl md:text-5xl font-semibold text-fafnir-text mb-2">
              {s.value}
            </div>
            <div className="text-sm text-fafnir-muted">{s.label}</div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

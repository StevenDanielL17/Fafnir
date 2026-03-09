'use client';

import ScrollReveal from '../ui/ScrollReveal';

const FEATURES = [
  {
    icon: '💬',
    title: 'Natural Language Rules',
    desc: 'Type any savings goal in plain English. No forms, no dropdowns, no crypto jargon.',
    span: 'md:col-span-2 md:row-span-2',
    large: true,
  },
  {
    icon: '🛡️',
    title: 'Save Limits',
    desc: 'Set max per transaction and monthly caps. Fafnir respects your boundaries.',
    span: 'md:col-span-1',
  },
  {
    icon: '🌱',
    title: 'Auto Yield Harvesting',
    desc: 'Agent harvests every 48h. Your idle savings compound automatically.',
    span: 'md:col-span-1',
  },
  {
    icon: '📋',
    title: 'Immutable Audit Log',
    desc: 'Every action recorded on Hedera Consensus Service. Permanent. Transparent.',
    span: 'md:col-span-2',
  },
  {
    icon: '✨',
    title: 'No Crypto Knowledge',
    desc: 'Account abstraction means you never see a wallet, seed phrase, or gas fee.',
    span: 'md:col-span-2',
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-fafnir-text text-center mb-16">
            Everything your bank can&apos;t do
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <ScrollReveal key={i} className={f.span} delay={i * 0.08}>
              <div
                className={`liquid-glass liquid-glass-hover h-full relative ${
                  f.large ? 'p-10' : 'p-6'
                }`}
              >
                <div className="relative z-10">
                  <span className={`block mb-4 ${f.large ? 'text-4xl' : 'text-2xl'}`}>
                    {f.icon}
                  </span>
                  <h3
                    className={`font-semibold text-fafnir-text mb-2 ${
                      f.large ? 'text-2xl' : 'text-lg'
                    }`}
                  >
                    {f.title}
                  </h3>
                  <p className={`text-fafnir-muted ${f.large ? 'text-base' : 'text-sm'}`}>
                    {f.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

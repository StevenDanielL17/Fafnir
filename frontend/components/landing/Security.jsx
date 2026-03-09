'use client';

import ScrollReveal from '../ui/ScrollReveal';

const POINTS = [
  {
    icon: '🔒',
    title: 'Non-custodial',
    desc: 'Fafnir never holds your money. Your account does.',
  },
  {
    icon: '📋',
    title: 'Immutable logs',
    desc: 'Every action is permanently recorded. Nothing can be erased.',
  },
  {
    icon: '🚫',
    title: 'No private keys',
    desc: 'You never touch a seed phrase. Ever.',
  },
  {
    icon: '⚡',
    title: '$0.0001 transactions',
    desc: 'Low enough that micro-saving is finally economical.',
  },
];

export default function Security() {
  return (
    <section id="security" className="py-24 relative">
      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-5xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-fafnir-text text-center mb-4">
            Built on infrastructure more secure than your bank.
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
          {POINTS.map((p, i) => (
            <ScrollReveal key={i} delay={i * 0.1}>
              <div className="flex gap-4">
                <span className="text-2xl shrink-0 mt-1">{p.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-fafnir-text mb-1">{p.title}</h3>
                  <p className="text-fafnir-muted">{p.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

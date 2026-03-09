'use client';

import ScrollReveal from '../ui/ScrollReveal';

const PERSONAS = [
  {
    icon: '📊',
    title: 'The Disciplined Saver',
    desc: "You already save but do it manually. Fafnir automates what you'd do anyway — and adds yield you never had access to.",
  },
  {
    icon: '💤',
    title: 'The Overwhelmed Earner',
    desc: 'You want to save but never remember. Tell Fafnir once. It remembers forever and works while you sleep.',
  },
  {
    icon: '🧪',
    title: 'The Curious Builder',
    desc: "You're interested in crypto but scared of wallets and keys. Fafnir is your first account — you'll never know it's there.",
  },
];

export default function WhoIsThisFor() {
  return (
    <section className="py-24">
      <div className="max-w-6xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-fafnir-text text-center mb-16">
            Built for you
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((p, i) => (
            <ScrollReveal key={i} delay={i * 0.12}>
              <div className="liquid-glass liquid-glass-hover p-8 h-full relative">
                <div className="relative z-10">
                  <span className="text-3xl mb-4 block">{p.icon}</span>
                  <h3 className="text-xl font-semibold text-fafnir-text mb-3">{p.title}</h3>
                  <p className="text-fafnir-muted leading-relaxed">{p.desc}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

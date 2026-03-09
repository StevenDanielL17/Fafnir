'use client';

import ScrollReveal from '../ui/ScrollReveal';

/* ═══ Step visuals ═══ */

function ChatMockup() {
  return (
    <div className="liquid-glass p-6 max-w-md w-full">
      <div className="relative z-10 space-y-4">
        <div className="flex justify-end">
          <div className="bg-fafnir-green/20 text-fafnir-text rounded-2xl rounded-br-md px-4 py-3 max-w-[80%] text-sm">
            Save $5 whenever I eat out, max $30/month
          </div>
        </div>
        <div className="flex justify-start">
          <div className="liquid-glass liquid-glass-green rounded-2xl rounded-bl-md px-4 py-3 max-w-[80%] text-sm relative z-10">
            Got it. I&apos;ll start watching your spending and save automatically. Your limits: $5
            per save, $30/month cap. ✓
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowDiagram() {
  const nodes = ['Rule Engine', 'Agent Core', 'Hedera Network', 'Confirmation'];
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {nodes.map((n, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="liquid-glass px-4 py-3 text-sm text-fafnir-text relative z-10 whitespace-nowrap">
            {n}
          </div>
          {i < nodes.length - 1 && <span className="text-fafnir-green text-xl">→</span>}
        </div>
      ))}
    </div>
  );
}

function SavingsCard() {
  return (
    <div className="liquid-glass liquid-glass-green p-6 max-w-xs animate-float relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-1">Total Saved</div>
        <div className="text-3xl font-bold text-fafnir-text mb-4">$127.50</div>
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="text-fafnir-muted">This month </span>
            <span className="text-fafnir-green">+$23.00</span>
          </div>
          <div>
            <span className="text-fafnir-muted">APY </span>
            <span className="text-fafnir-green">4.2%</span>
          </div>
        </div>
        <svg viewBox="0 0 200 40" className="w-full h-10">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00C896" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00C896" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points="0,35 20,30 40,28 60,32 80,25 100,20 120,22 140,15 160,12 180,8 200,5"
            fill="none"
            stroke="#00C896"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points="0,35 20,30 40,28 60,32 80,25 100,20 120,22 140,15 160,12 180,8 200,5 200,40 0,40"
            fill="url(#sparkGrad)"
          />
        </svg>
      </div>
    </div>
  );
}

function HCSLog() {
  const entries = [
    { time: '10:32 AM', action: 'Saved $5.00 — food trigger' },
    { time: 'Yesterday', action: 'Saved $5.00 — food trigger' },
    { time: 'Monday', action: 'Harvested yield — $0.43' },
  ];
  return (
    <div className="liquid-glass p-6 max-w-md w-full">
      <div className="relative z-10">
        <div className="text-xs text-fafnir-muted mb-3 uppercase tracking-wider">
          HCS Audit Log
        </div>
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="text-fafnir-green">✓</span>
              <span className="text-fafnir-muted w-20 shrink-0">[{e.time}]</span>
              <span className="text-fafnir-text">{e.action}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-fafnir-green/60">Verified on Hedera</div>
      </div>
    </div>
  );
}

/* ═══ Steps data ═══ */

const STEPS = [
  {
    num: '01',
    title: 'Tell Fafnir your goal',
    desc: 'Use plain English. Tell it how much to save, when to trigger, and your limits. Fafnir understands complex rules in a single sentence.',
    side: 'left',
    Visual: ChatMockup,
  },
  {
    num: '02',
    title: 'No buttons to click. No transactions to sign.',
    desc: "Fafnir's agent core monitors your rules 24/7. When conditions match, it executes automatically. You don't lift a finger.",
    side: 'right',
    Visual: FlowDiagram,
  },
  {
    num: '03',
    title: 'Watch it grow',
    desc: 'Track your savings in real-time. Fafnir auto-harvests yield every 48 hours and compounds it. Your idle money starts working.',
    side: 'left',
    Visual: SavingsCard,
  },
  {
    num: '04',
    title: 'Every decision logged forever. Nothing hidden.',
    desc: 'Every save, harvest, and rule change is permanently recorded on Hedera Consensus Service. Full transparency. Full auditability.',
    side: 'right',
    Visual: HCSLog,
  },
];

/* ═══ Main component ═══ */

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`min-h-[70vh] flex flex-col ${
              step.side === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'
            } items-center gap-12 md:gap-20 py-16`}
          >
            {/* Text */}
            <ScrollReveal className="flex-1">
              <span className="font-display text-[120px] md:text-[180px] font-bold text-fafnir-text/[0.04] leading-none select-none block">
                {step.num}
              </span>
              <h3 className="font-display text-3xl md:text-4xl font-semibold text-fafnir-text -mt-16 md:-mt-24 relative z-10">
                {step.title}
              </h3>
              <p className="text-fafnir-muted text-lg mt-4 max-w-md">{step.desc}</p>
            </ScrollReveal>

            {/* Visual */}
            <ScrollReveal className="flex-1 flex justify-center" delay={0.2}>
              <step.Visual />
            </ScrollReveal>
          </div>
        ))}
      </div>
    </section>
  );
}

'use client';

import ScrollReveal from '../ui/ScrollReveal';

export default function PhoneMockup() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center min-h-[600px]">
          {/* ── Left Phone: Onboarding ── */}
          <ScrollReveal>
            <div className="animate-float" style={{ perspective: '1000px' }}>
              <div
                className="liquid-glass p-4 rounded-[32px] mx-auto max-w-[280px]"
                style={{ transform: 'rotateY(8deg) rotateX(2deg)' }}
              >
                <div className="bg-fafnir-black rounded-[24px] p-5 min-h-[480px] flex flex-col justify-center relative z-10">
                  <div className="text-center">
                    <span className="text-4xl mb-4 block">🐉</span>
                    <h4 className="font-display text-xl text-fafnir-text mb-2">
                      What&apos;s your savings goal?
                    </h4>
                    <p className="text-fafnir-muted text-sm mb-6">
                      Tell Fafnir in your own words
                    </p>
                    <div className="liquid-glass rounded-xl p-3 text-left text-sm text-fafnir-muted relative z-10">
                      Save $5 every time I eat out...
                    </div>
                    <div className="mt-4 bg-fafnir-green text-fafnir-black text-sm font-semibold py-2.5 rounded-xl">
                      Create Rule
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* ── Centre Callouts ── */}
          <div className="hidden md:flex flex-col items-center gap-5">
            {[
              'AI Agent running 24/7',
              'Secured on Hedera',
              'Natural language interface',
            ].map((text, i) => (
              <ScrollReveal key={i} delay={0.3 + i * 0.12}>
                <div className="liquid-glass liquid-glass-green px-5 py-2.5 text-sm text-fafnir-text whitespace-nowrap relative z-10">
                  {text}
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* ── Right Phone: Dashboard ── */}
          <ScrollReveal delay={0.2}>
            <div className="animate-float-delayed" style={{ perspective: '1000px' }}>
              <div
                className="liquid-glass p-4 rounded-[32px] mx-auto max-w-[280px]"
                style={{ transform: 'rotateY(-8deg) rotateX(2deg)' }}
              >
                <div className="bg-fafnir-black rounded-[24px] p-5 min-h-[480px] relative z-10">
                  <div className="text-xs text-fafnir-muted mb-4 tracking-wider uppercase">
                    Fafnir Dashboard
                  </div>

                  {/* Mini savings card */}
                  <div className="liquid-glass rounded-xl p-3 mb-3 relative z-10">
                    <div className="text-[10px] text-fafnir-muted">Total Saved</div>
                    <div className="text-xl font-bold text-fafnir-text">$127.50</div>
                    <div className="text-xs text-fafnir-green">+$23.00 this month</div>
                  </div>

                  {/* Mini active rule */}
                  <div className="liquid-glass liquid-glass-green rounded-xl p-3 mb-3 relative z-10">
                    <div className="text-[10px] text-fafnir-muted">Active Rule</div>
                    <div className="text-sm text-fafnir-text">🍔 Food Rule</div>
                    <div className="text-xs text-fafnir-green">$23/$30 this month</div>
                    {/* Progress */}
                    <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fafnir-green rounded-full"
                        style={{ width: '77%' }}
                      />
                    </div>
                  </div>

                  {/* Mini agent status */}
                  <div className="liquid-glass rounded-xl p-3 mb-3 relative z-10">
                    <div className="text-[10px] text-fafnir-muted">Agent Status</div>
                    <div className="flex items-center gap-2 text-sm text-fafnir-text mt-1">
                      <span className="w-2 h-2 bg-fafnir-green rounded-full agent-pulse" />
                      Running
                    </div>
                  </div>

                  {/* Mini yield */}
                  <div className="liquid-glass liquid-glass-gold rounded-xl p-3 relative z-10">
                    <div className="text-[10px] text-fafnir-muted">Yield</div>
                    <div className="text-sm text-fafnir-text">APY 4.2%</div>
                    <div className="text-xs text-fafnir-gold">Earned $4.30</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

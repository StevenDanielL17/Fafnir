'use client';

import ScrollReveal from '../ui/ScrollReveal';

export default function CTAFooter() {
  return (
    <section id="cta" className="py-32 text-center">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <h2 className="font-display text-5xl md:text-7xl lg:text-[5.5rem] font-semibold text-fafnir-text mb-6 leading-tight">
            Your money has been waiting.
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-xl text-fafnir-muted mb-10">
            Set your first savings rule in 60 seconds.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <a
            href="/signup"
            className="inline-block bg-fafnir-green text-fafnir-black font-bold px-10 py-5 rounded-full text-lg hover:shadow-[0_0_40px_rgba(0,200,150,0.5)] hover:-translate-y-1 transition-all"
          >
            Start Saving Free
          </a>
          <p className="text-sm text-fafnir-muted mt-6">
            No credit card. No crypto wallet. No complexity.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}

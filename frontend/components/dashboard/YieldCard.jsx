'use client';

export default function YieldCard() {
  return (
    <div className="liquid-glass liquid-glass-hover p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-4">Yield</div>

        <div className="space-y-5">
          <div>
            <div className="text-xs text-fafnir-muted mb-0.5">Current APY</div>
            <div className="text-3xl font-bold text-fafnir-green">4.2%</div>
          </div>

          <div>
            <div className="text-xs text-fafnir-muted mb-0.5">Next harvest</div>
            <div className="text-lg text-fafnir-text">18h</div>
          </div>

          <div>
            <div className="text-xs text-fafnir-muted mb-0.5">Total earned</div>
            <div className="text-lg text-fafnir-text">$4.30</div>
          </div>

          <button className="w-full liquid-glass liquid-glass-green text-sm text-fafnir-green font-medium py-2.5 rounded-xl hover:bg-fafnir-green/10 transition-colors relative z-10">
            Harvest Now
          </button>
        </div>
      </div>
    </div>
  );
}

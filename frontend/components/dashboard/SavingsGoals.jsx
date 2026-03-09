'use client';

function ProgressRing({ percentage, label, size = 90, strokeWidth = 6 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#00C896"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Centered label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-fafnir-text">{percentage}%</span>
        </div>
      </div>
      <div className="text-xs text-fafnir-muted text-center">{label}</div>
    </div>
  );
}

export default function SavingsGoals() {
  return (
    <div className="liquid-glass p-6 h-full relative">
      <div className="relative z-10">
        <div className="text-sm text-fafnir-muted mb-6">Savings Goals</div>

        <div className="flex justify-around items-start">
          <ProgressRing percentage={23} label="Emergency Fund" />
          <ProgressRing percentage={77} label="Monthly Cap" />
        </div>
      </div>
    </div>
  );
}

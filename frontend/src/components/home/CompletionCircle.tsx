"use client";

interface CompletionCircleProps {
  percentage: number;
  size?: number;
}

export default function CompletionCircle({
  percentage,
  size = 160,
}: CompletionCircleProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#A7C6B0"
          strokeWidth={strokeWidth}
          opacity={0.25}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={clamped === 100 ? "#F2C94C" : "#7FAF8F"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-neutral-dark">
          {Math.round(clamped)}%
        </span>
        <span className="text-xs text-neutral-dark/50">completed</span>
      </div>
    </div>
  );
}

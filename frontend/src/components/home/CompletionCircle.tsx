"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "@/components/ui/CountUp";

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
  const targetOffset = circumference - (clamped / 100) * circumference;

  const circleRef = useRef<SVGCircleElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.strokeDashoffset = String(circumference);

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "stroke-dashoffset 1.2s cubic-bezier(0.25, 0.1, 0.25, 1)";
        el.style.strokeDashoffset = String(targetOffset);
        setReady(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [circumference, targetOffset]);

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
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={clamped === 100 ? "#F2C94C" : "#7FAF8F"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-neutral-dark">
          <CountUp
            from={0}
            to={clamped}
            duration={1.2}
            delay={0.1}
            startWhen={ready}
            suffix="%"
          />
        </span>
        <span className="text-xs text-neutral-dark/50">completed</span>
      </div>
    </div>
  );
}

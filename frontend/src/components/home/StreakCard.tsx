"use client";

import { Flame } from "lucide-react";

interface StreakCardProps {
  streak: number;
  threshold: number;
}

export default function StreakCard({ streak, threshold }: StreakCardProps) {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm border border-primary-light/30">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          streak > 0 ? "bg-accent/20" : "bg-neutral-light"
        }`}
      >
        <Flame
          size={24}
          className={streak > 0 ? "text-accent" : "text-neutral-dark/30"}
        />
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-dark">
          {streak} <span className="text-sm font-normal text-neutral-dark/50">day{streak !== 1 ? "s" : ""}</span>
        </p>
        <p className="text-xs text-neutral-dark/50">
          Goal Streak ({threshold}%+ daily)
        </p>
      </div>
    </div>
  );
}

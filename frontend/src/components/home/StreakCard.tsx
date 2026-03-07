"use client";

import { Flame } from "lucide-react";
import Card from "@/components/ui/Card";
import CountUp from "@/components/ui/CountUp";

interface StreakCardProps {
  streak: number;
  threshold: number;
}

export default function StreakCard({ streak, threshold }: StreakCardProps) {
  return (
    <Card className="group flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
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
          <CountUp from={0} to={streak} duration={1} delay={0.3} />{" "}
          <span className="text-sm font-normal text-neutral-dark/50">
            day{streak !== 1 ? "s" : ""}
          </span>
        </p>
        <p className="text-xs text-neutral-dark/50">
          Goal Streak ({threshold}%+ daily)
        </p>
      </div>
    </Card>
  );
}

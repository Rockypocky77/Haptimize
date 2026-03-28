"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Bell, CheckSquare, BarChart3, ChevronRight } from "lucide-react";
import BlurText from "./BlurText";

interface FocusItem {
  id: string;
  label: string;
}

/** Matches CompletionCircle + home Card: ring, %, “completed”, “Today’s habits” */
function MiniTodayCard({ pct }: { pct: number }) {
  const size = 76;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 bg-surface rounded-xl shadow-sm border border-primary-light/30">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90 shrink-0">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#A7C6B0"
            strokeWidth={stroke}
            opacity={0.25}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#7FAF8F"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </svg>
        <div className="absolute flex flex-col items-center pointer-events-none">
          <span className="text-lg font-bold text-neutral-dark tabular-nums">{pct}%</span>
          <span className="text-[9px] text-neutral-dark/50">completed</span>
        </div>
      </div>
      <p className="text-[10px] text-neutral-dark/60 mt-2">Today&apos;s habits</p>
    </div>
  );
}

/** Collapsed AnalyticsWidget: Momentum + title + top / needs attention + chevron */
function MiniAnalytics() {
  const score = 78;
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-primary-light/30 p-2.5">
      <div className="space-y-1 mb-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-bold text-neutral-dark tabular-nums">{score}</span>
          <span className="text-[9px] text-neutral-dark/50">Momentum</span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-dark/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary-light to-accent"
            initial={{ width: "0%" }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>
      <h3 className="text-[11px] font-semibold text-neutral-dark/70 flex items-center gap-1.5">
        <BarChart3 size={13} />
        Analytics
      </h3>
      <p className="text-[9px] text-neutral-dark/60 truncate mt-0.5">Top: Exercise (92%)</p>
      <p className="text-[9px] text-neutral-dark/50 truncate">Needs attention: Read (45%)</p>
      <p className="text-[9px] text-primary font-semibold mt-1.5 flex items-center gap-0.5">
        View full analytics
        <ChevronRight size={11} />
      </p>
    </div>
  );
}

/** Unlocked DigestWidget row: gradient bar + ring + Recap copy */
function MiniRecap() {
  const pct = 68;
  const size = 44;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-neutral-dark/10 overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-[4px] bg-gradient-to-b from-primary via-primary-light to-accent shrink-0" />
        <div className="flex-1 p-2 flex items-center gap-2 min-w-0">
          <svg width={size} height={size} className="shrink-0 -rotate-90">
            <defs>
              <linearGradient id="onbDigestRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7FAF8F" />
                <stop offset="100%" stopColor="#F2C94C" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-neutral-dark/10" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#onbDigestRing)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={off}
            />
          </svg>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="text-[11px] font-bold text-neutral-dark/80 flex items-center gap-1.5 flex-wrap">
              Recap
              <span className="text-[8px] font-semibold uppercase tracking-wide text-primary/80 px-1 py-0.5 rounded-md bg-primary/10">
                Live daily
              </span>
            </h3>
            <p className="text-[9px] text-neutral-dark/45">Yesterday · snapshot</p>
            <p className="text-[10px] text-neutral-dark/80">
              <span className="font-bold text-primary tabular-nums">{pct}%</span>
              <span className="text-neutral-dark/55"> · 4/5 habits</span>
            </p>
            <p className="text-[9px] text-primary font-semibold flex items-center gap-0.5">
              Open full recap
              <ChevronRight size={11} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** StreakCard layout */
function MiniStreak() {
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-primary-light/30 flex items-center gap-2 p-2.5">
      <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
        <Flame size={18} className="text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold text-neutral-dark leading-tight">
          7 <span className="text-[10px] font-normal text-neutral-dark/50">days</span>
        </p>
        <p className="text-[9px] text-neutral-dark/50">Goal Streak (80%+ daily)</p>
      </div>
    </div>
  );
}

/** Home reminders Card — accent dots only (same as home list) */
function MiniReminders() {
  const items = ["Buy groceries", "Call dentist for appointment"];
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-primary-light/30 p-2.5">
      <h3 className="text-[11px] font-semibold text-neutral-dark/70 mb-2 flex items-center gap-2">
        <Bell size={12} className="text-neutral-dark/60" />
        Reminders
      </h3>
      <ul className="space-y-1.5 text-left">
        {items.map((t) => (
          <li key={t} className="text-[10px] text-neutral-dark/70 flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
            <span className="leading-snug">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Habits to Complete — pending rows + empty checkbox (home uses opacity-0 check) */
function MiniHabits() {
  const pending = ["Drink 8 cups of water", "Exercise for 30 minutes"];
  return (
    <div className="bg-surface rounded-xl shadow-sm border border-primary-light/30 p-2.5">
      <h3 className="text-[11px] font-semibold text-neutral-dark/70 mb-2 flex items-center gap-2">
        <CheckSquare size={12} className="text-neutral-dark/60" />
        Habits to Complete
      </h3>
      <ul className="space-y-1.5 text-left">
        {pending.map((t) => (
          <li
            key={t}
            className="flex items-center gap-2 text-[10px] text-neutral-dark/70 py-1 px-2 rounded-lg bg-neutral-light/60"
          >
            <span className="w-4 h-4 rounded border-2 border-primary-light/60 shrink-0" />
            <span className="leading-snug">{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPreview({ onComplete }: { onComplete: () => void }) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  const focusItems: FocusItem[] = [
    {
      id: "today",
      label: "The big ring is today’s habit completion — same “Today’s habits” card as Home.",
    },
    {
      id: "analytics",
      label: "Momentum plus top habits on the card; open it for trends and charts. Included on Pro/Max (Free shows an upgrade card instead).",
    },
    {
      id: "recap",
      label: "Recap summarizes yesterday and opens daily, weekly, monthly, and yearly breakdowns. Pro/Max feature (Free shows an upgrade card).",
    },
    {
      id: "streak",
      label: "Goal Streak counts consecutive days you hit your completion threshold.",
    },
    {
      id: "reminders",
      label: "Pending reminders from your list — open the card to jump to Reminders.",
    },
    {
      id: "habits",
      label: "Habits still due today — same checklist as the Checklist page; checking here updates your ring.",
    },
  ];

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t0 = setTimeout(() => setDashboardVisible(true), 500);
    const gap = 2600;
    const t1 = setTimeout(() => setFocusIndex(0), 1600);
    const t2 = setTimeout(() => setFocusIndex(1), 1600 + gap);
    const t3 = setTimeout(() => setFocusIndex(2), 1600 + gap * 2);
    const t4 = setTimeout(() => setFocusIndex(3), 1600 + gap * 3);
    const t5 = setTimeout(() => setFocusIndex(4), 1600 + gap * 4);
    const t6 = setTimeout(() => setFocusIndex(5), 1600 + gap * 5);
    const t7 = setTimeout(() => {
      setFocusIndex(-2);
      handleComplete();
    }, 1600 + gap * 5 + 2800);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
    };
  }, [handleComplete]);

  const isFocused = (id: string) => focusIndex >= 0 && focusItems[focusIndex]?.id === id;

  const blurStyle = (id: string): string => {
    if (focusIndex < 0) return "";
    return isFocused(id)
      ? "ring-2 ring-primary/40 scale-[1.02] z-[1] shadow-sm"
      : "opacity-[0.38] scale-[0.99]";
  };

  return (
    <div className="text-center space-y-3 w-full max-w-2xl md:max-w-3xl mx-auto min-h-0 max-h-full flex flex-col overflow-hidden">
      <BlurText
        text="This mirrors your Home layout."
        delay={100}
        animateBy="words"
        direction="top"
        className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-dark shrink-0"
      />

      <motion.div
        className="relative mx-auto w-full max-w-[min(100%,30rem)] min-h-0 max-h-[min(58vh,26rem)] sm:max-h-[min(62vh,28rem)] rounded-xl border border-primary-light/25 bg-neutral-light/40 p-2.5 sm:p-3 overflow-hidden"
        initial={false}
        animate={dashboardVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 h-full min-h-0">
          <div className="space-y-2 min-h-0">
            <motion.div
              className={`relative transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("today")}`}
            >
              <MiniTodayCard pct={72} />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("analytics")}`}
            >
              <MiniAnalytics />
            </motion.div>
          </div>
          <div className="space-y-2 min-h-0">
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("streak")}`}
            >
              <MiniStreak />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("recap")}`}
            >
              <MiniRecap />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("reminders")}`}
            >
              <MiniReminders />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("habits")}`}
            >
              <MiniHabits />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative min-h-[60px] sm:min-h-[68px] mt-0.5 shrink-0">
        <AnimatePresence mode="sync">
          {focusIndex >= 0 && focusIndex < focusItems.length && (
            <motion.p
              key={focusItems[focusIndex].id}
              className="text-xs sm:text-sm text-neutral-dark/80 font-medium max-w-xl mx-auto absolute left-0 right-0 top-0 px-2 leading-snug"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {focusItems[focusIndex].label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

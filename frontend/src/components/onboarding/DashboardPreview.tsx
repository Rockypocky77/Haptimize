"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Bell, CheckSquare, BarChart3, CalendarDays } from "lucide-react";
import BlurText from "./BlurText";

interface FocusItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

function MiniCircle({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="130" height="130" className="-rotate-90">
      <circle cx="65" cy="65" r={r} fill="none" stroke="#A7C6B0" strokeWidth="10" opacity={0.25} />
      <motion.circle
        cx="65" cy="65" r={r} fill="none" stroke="#7FAF8F" strokeWidth="10"
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
      />
      <text x="65" y="65" textAnchor="middle" dominantBaseline="central"
        className="text-2xl font-bold rotate-90 origin-center" fill="#2E3A3F"
        transform="rotate(90 65 65)"
      >{pct}%</text>
    </svg>
  );
}

function MiniStreak() {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
        <Flame size={20} className="text-accent" />
      </div>
      <div>
        <p className="text-xl font-bold text-neutral-dark">7 <span className="text-xs font-normal text-neutral-dark/60">days</span></p>
        <p className="text-[10px] text-neutral-dark/60">Goal Streak (80%+ daily)</p>
      </div>
    </div>
  );
}

function MiniReminders() {
  const items: { t: string; color?: string }[] = [
    { t: "Buy groceries" },
    { t: "Call dentist", color: "#7FAF8F" },
    { t: "Submit report", color: "#d4a83a" },
  ];
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <h4 className="text-xs font-semibold text-neutral-dark/80 mb-2 flex items-center gap-1.5"><Bell size={12} /> Reminders</h4>
      <p className="text-[9px] text-neutral-dark/45 mb-1.5">Casual list · dated · categories</p>
      <ul className="space-y-1.5">
        {items.map(({ t, color }) => (
          <li key={t} className="text-xs text-neutral-dark/70 flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color ?? "var(--color-accent)" }}
            />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniCalendar() {
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <h4 className="text-xs font-semibold text-neutral-dark/80 mb-2 flex items-center gap-1.5">
        <CalendarDays size={12} className="text-primary" /> Calendar
      </h4>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[8px] text-neutral-dark/40 font-medium mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className={`aspect-square rounded-sm text-[8px] flex items-center justify-center ${
              i === 3 ? "bg-primary text-white font-bold shadow-sm" : "bg-neutral-light/80 text-neutral-dark/50"
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <p className="text-[9px] text-neutral-dark/45 mt-1.5">Month view · tap a day for details</p>
    </div>
  );
}

function MiniHabits() {
  const items = [
    { t: "Drink water", done: true },
    { t: "Exercise", done: true },
    { t: "Read", done: false },
    { t: "Meditate", done: false },
  ];
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <h4 className="text-xs font-semibold text-neutral-dark/80 mb-2 flex items-center gap-1.5"><CheckSquare size={12} /> Habits</h4>
      <ul className="space-y-1.5">
        {items.map((h) => (
          <li key={h.t} className="text-xs text-neutral-dark/70 flex items-center gap-2">
            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${h.done ? "bg-primary border-primary" : "border-primary-light/60"}`}>
              {h.done && <span className="text-white text-[8px] font-bold">✓</span>}
            </div>
            <span className={h.done ? "line-through opacity-50" : ""}>{h.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniAnalytics() {
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <h4 className="text-xs font-semibold text-neutral-dark/80 mb-2 flex items-center gap-1.5">
        <BarChart3 size={12} /> Analytics
      </h4>
      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-neutral-dark/70">Momentum Score</span>
            <span className="text-[10px] font-bold text-primary">78</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-primary-light to-accent"
              initial={{ width: 0 }}
              animate={{ width: "78%" }}
              transition={{ duration: 1.05, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-dark/60">
          <span>Top: Exercise (92%)</span>
          <span>Needs work: Read (45%)</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPreview({ onComplete }: { onComplete: () => void }) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const [dashboardVisible, setDashboardVisible] = useState(false);

  const focusItems: FocusItem[] = [
    { id: "circle", label: "Your daily ring shows how much you have checked off today.", content: null },
    { id: "analytics", label: "Momentum Score blends habits and reminders so you see what is slipping.", content: null },
    { id: "streak", label: "Goal streak counts days you stay above your consistency threshold.", content: null },
    { id: "reminders", label: "Casual reminders for quick wins, dated ones for deadlines — with color categories.", content: null },
    { id: "calendar", label: "The calendar maps dated tasks across the month so nothing hides in a list.", content: null },
    { id: "habits", label: "Daily habits live on Checklist and feed straight into Home and analytics.", content: null },
  ];

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t0 = setTimeout(() => setDashboardVisible(true), 500);
    const t1 = setTimeout(() => setFocusIndex(0), 1800);
    const t2 = setTimeout(() => setFocusIndex(1), 4300);
    const t3 = setTimeout(() => setFocusIndex(2), 6800);
    const t4 = setTimeout(() => setFocusIndex(3), 9300);
    const t5 = setTimeout(() => setFocusIndex(4), 11800);
    const t6 = setTimeout(() => setFocusIndex(5), 14300);
    const t7 = setTimeout(() => {
      setFocusIndex(-2);
      handleComplete();
    }, 17200);
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
  /* Opacity + scale only — CSS blur on several nodes is expensive and reads choppy */
  const blurStyle = (id: string): string => {
    if (focusIndex < 0) return "";
    return isFocused(id)
      ? "ring-2 ring-primary/40 scale-[1.03] z-[1] shadow-sm"
      : "opacity-[0.38] scale-[0.99]";
  };

  return (
    <div className="text-center space-y-6 w-full">
      <BlurText
        text="Home is your command center."
        delay={100}
        animateBy="words"
        direction="top"
        className="text-2xl md:text-3xl font-bold text-neutral-dark"
      />

      <motion.div
        className="relative max-w-md mx-auto min-h-[360px] bg-white/60 border border-gray-200/40 rounded-2xl p-5"
        initial={false}
        animate={
          dashboardVisible
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 14 }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <motion.div
              className={`flex items-center justify-center bg-white rounded-xl p-4 shadow-sm border border-gray-200/60 transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("circle")}`}
            >
              <MiniCircle pct={72} />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("analytics")}`}
            >
              <MiniAnalytics />
            </motion.div>
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("calendar")}`}
            >
              <MiniCalendar />
            </motion.div>
          </div>
          <div className="space-y-3">
            <motion.div
              className={`transition-[opacity,transform,box-shadow] duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${blurStyle("streak")}`}
            >
              <MiniStreak />
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

      <div className="relative min-h-[64px] mt-1">
        <AnimatePresence mode="sync">
          {focusIndex >= 0 && focusIndex < focusItems.length && (
            <motion.p
              key={focusItems[focusIndex].id}
              className="text-sm md:text-base text-neutral-dark/80 font-medium max-w-sm mx-auto absolute left-0 right-0 top-0 px-2"
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

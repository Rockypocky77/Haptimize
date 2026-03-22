"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Bell, CheckSquare, BarChart3 } from "lucide-react";
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
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
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
  const items = ["Buy groceries", "Call dentist", "Submit report"];
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200/60">
      <h4 className="text-xs font-semibold text-neutral-dark/80 mb-2 flex items-center gap-1.5"><Bell size={12} /> Reminders</h4>
      <ul className="space-y-1.5">
        {items.map((t) => (
          <li key={t} className="text-xs text-neutral-dark/70 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />{t}
          </li>
        ))}
      </ul>
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
              transition={{ duration: 1, delay: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
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
    { id: "circle", label: "This is your daily progress. Try your best everyday!", content: null },
    { id: "analytics", label: "Your analytics track your momentum and show which habits need attention.", content: null },
    { id: "streak", label: "This logs how many days in a row you've been consistent.", content: null },
    { id: "reminders", label: "This is a quick overview of your reminders.", content: null },
    { id: "habits", label: "This is an overview of your habits.", content: null },
  ];

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const t0 = setTimeout(() => setDashboardVisible(true), 600);
    const t1 = setTimeout(() => setFocusIndex(0), 2000);
    const t2 = setTimeout(() => setFocusIndex(1), 5000);
    const t3 = setTimeout(() => setFocusIndex(2), 8000);
    const t4 = setTimeout(() => setFocusIndex(3), 11000);
    const t5 = setTimeout(() => setFocusIndex(4), 14000);
    const t6 = setTimeout(() => {
      setFocusIndex(-2);
      handleComplete();
    }, 17000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearTimeout(t6); };
  }, [handleComplete]);

  const isFocused = (id: string) => focusIndex >= 0 && focusItems[focusIndex]?.id === id;
  const blurStyle = (id: string): string => {
    if (focusIndex < 0) return "";
    return isFocused(id) ? "ring-2 ring-primary/40 scale-105" : "opacity-30 blur-[2px]";
  };

  return (
    <div className="text-center space-y-6 w-full">
      <BlurText
        text="This is your optimization dashboard."
        delay={100}
        animateBy="words"
        direction="top"
        className="text-2xl md:text-3xl font-bold text-neutral-dark"
      />

      {dashboardVisible && (
        <motion.div
          className="relative max-w-md mx-auto bg-white/60 border border-gray-200/40 rounded-2xl p-5"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <motion.div
                className={`flex items-center justify-center bg-white rounded-xl p-4 shadow-sm border border-gray-200/60 transition-all duration-500 ${blurStyle("circle")}`}
              >
                <MiniCircle pct={72} />
              </motion.div>
              <motion.div className={`transition-all duration-500 ${blurStyle("analytics")}`}>
                <MiniAnalytics />
              </motion.div>
            </div>
            <div className="space-y-3">
              <motion.div className={`transition-all duration-500 ${blurStyle("streak")}`}>
                <MiniStreak />
              </motion.div>
              <motion.div className={`transition-all duration-500 ${blurStyle("reminders")}`}>
                <MiniReminders />
              </motion.div>
              <motion.div className={`transition-all duration-500 ${blurStyle("habits")}`}>
                <MiniHabits />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="min-h-[50px]">
        <AnimatePresence mode="wait">
          {focusIndex >= 0 && focusIndex < focusItems.length && (
            <motion.p
              key={focusItems[focusIndex].id}
              className="text-sm md:text-base text-neutral-dark/80 font-medium max-w-sm mx-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {focusItems[focusIndex].label}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import ClickSpark from "@/components/ui/ClickSpark";
import CountUp from "@/components/ui/CountUp";
import {
  filterLogsForAnalytics,
  fillLogsWithMissingDays,
  LOG_WINDOW_DAYS,
  computeStrongestWeakestHabits,
  computeProductiveDays,
  computeImprovingDecliningHabits,
  computeMomentumScore,
  computeAllHabitRates,
  type HabitRef,
  type HabitLog,
  type HabitStrength,
  type ProductiveDay,
} from "@/lib/analytics";
import { getLocalDateString } from "@/lib/date";
import { BarChart3, TrendingUp, TrendingDown, ChevronRight, X } from "lucide-react";
import PlansModal from "@/components/plans/PlansModal";
import { createPortal } from "react-dom";
import { useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnalyticsWidgetProps {
  activeHabits: HabitRef[];
  habitLogs: HabitLog[];
  loaded: boolean;
  isDemo: boolean;
  /** Live completion % for today — makes momentum update as user completes habits */
  todayCompletionPct?: number;
  /** User plan — Free users see locked state */
  plan?: "free" | "pro" | "max";
}

function MomentumBar({ score, compact = false }: { score: number; compact?: boolean }) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className={`w-full ${compact ? "space-y-1" : "space-y-2"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-bold text-neutral-dark tabular-nums ${compact ? "text-2xl" : "text-4xl"}`}>
          <CountUp from={0} to={clamped} duration={0.8} delay={0.1} />
        </span>
        <span className="text-xs text-neutral-dark/50">Momentum</span>
      </div>
      <div
        className={`rounded-full bg-neutral-dark/10 overflow-hidden ${compact ? "h-2" : "h-3"}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary via-primary-light to-accent"
          initial={{ width: "0%" }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}

const TREND_DAYS = 14;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CompletionTrendChart({ logs }: { logs: HabitLog[] }) {
  const recentLogs = logs.slice(-TREND_DAYS);
  if (recentLogs.length < 2) return null;

  const W = 480;
  const H = 140;
  const PAD_LEFT = 32;
  const PAD_RIGHT = 12;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const values = recentLogs.map((l) => l.completionPct ?? 0);
  const maxVal = Math.max(100, ...values);

  const points = values.map((v, i) => ({
    x: PAD_LEFT + (i / (values.length - 1)) * chartW,
    y: PAD_TOP + chartH - (v / maxVal) * chartH,
    value: v,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_TOP + chartH} L ${points[0].x} ${PAD_TOP + chartH} Z`;

  const gridLines = [0, 25, 50, 75, 100].map((pct) => ({
    y: PAD_TOP + chartH - (pct / maxVal) * chartH,
    label: `${pct}`,
  }));

  return (
    <div>
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3">
        {TREND_DAYS}-Day Completion Trend
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {gridLines.map((g) => (
          <g key={g.label}>
            <line x1={PAD_LEFT} y1={g.y} x2={W - PAD_RIGHT} y2={g.y} stroke="currentColor" strokeOpacity={0.06} strokeDasharray="4 3" />
            <text x={PAD_LEFT - 6} y={g.y + 3} textAnchor="end" className="text-[9px]" style={{ fill: "var(--theme-foreground)", opacity: 0.5 }}>{g.label}</text>
          </g>
        ))}

        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FAF8F" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#7FAF8F" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <motion.path
          d={areaPath}
          fill="url(#trendGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#7FAF8F"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        />

        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#7FAF8F"
            stroke="var(--theme-surface, #fff)"
            strokeWidth={2}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.04, duration: 0.25, type: "spring", stiffness: 400 }}
          />
        ))}

        {recentLogs.map((l, i) => {
          if (recentLogs.length > 10 && i % 2 !== 0 && i !== recentLogs.length - 1) return null;
          const x = PAD_LEFT + (i / (recentLogs.length - 1)) * chartW;
          const label = l.date.slice(5).replace("-", "/");
          return (
            <text key={l.date} x={x} y={H - 4} textAnchor="middle" className="text-[8px]" style={{ fill: "var(--theme-foreground)", opacity: 0.5 }}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function WeekdayChart({ byWeekday }: { byWeekday: ProductiveDay[] }) {
  const maxAvg = Math.max(100, ...byWeekday.map((d) => d.avgPct));
  const W = 420;
  const H = 150;
  const PAD_LEFT = 10;
  const PAD_RIGHT = 10;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 24;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const chartH = H - PAD_TOP - PAD_BOTTOM;
  const slotW = chartW / 7;
  const barW = 24;

  const orderedDays = [1, 2, 3, 4, 5, 6, 0];
  const baseline = PAD_TOP + chartH;
  const bestDay = orderedDays.reduce((best, idx) => byWeekday[idx].avgPct > byWeekday[best].avgPct ? idx : best, orderedDays[0]);

  return (
    <div>
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3">
        Day-of-Week Performance
      </h4>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        <line x1={PAD_LEFT} y1={baseline} x2={W - PAD_RIGHT} y2={baseline} stroke="var(--theme-foreground)" strokeOpacity={0.08} />

        {orderedDays.map((dayIdx, i) => {
          const d = byWeekday[dayIdx];
          const cx = PAD_LEFT + slotW * i + slotW / 2;
          const barX = cx - barW / 2;
          const barH = d.count > 0 ? Math.max(3, (d.avgPct / maxAvg) * chartH) : 0;
          const barY = baseline - barH;
          const isBest = dayIdx === bestDay && d.avgPct > 0;
          const fill = isBest ? "#F2C94C" : "#7FAF8F";
          const opacity = isBest ? 0.9 : 0.55;

          return (
            <g key={dayIdx}>
              <motion.rect
                x={barX}
                width={barW}
                rx={6}
                ry={6}
                fill={fill}
                fillOpacity={opacity}
                initial={{ height: 0, y: baseline }}
                animate={{ height: barH, y: barY }}
                transition={{ duration: 0.6, delay: 0.12 + i * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              />
              {d.avgPct > 0 && (
                <motion.text
                  x={cx}
                  y={barY - 6}
                  textAnchor="middle"
                  className="text-[10px] font-semibold"
                  style={{ fill: "var(--theme-foreground)", opacity: 0.7 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                >
                  {Math.round(d.avgPct)}%
                </motion.text>
              )}
              <text x={cx} y={H - 4} textAnchor="middle" className="text-[11px] font-medium" style={{ fill: "var(--theme-foreground)", opacity: isBest ? 0.9 : 0.5 }}>
                {DAY_LABELS[dayIdx]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HabitRatesChart({ habits }: { habits: HabitStrength[] }) {
  if (habits.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3">
        Habit Completion Rates
      </h4>
      <div className="space-y-2.5">
        {habits.map((h, i) => {
          const rate = Math.round(h.rate);
          const color = rate >= 70 ? "#7FAF8F" : rate >= 40 ? "#F2C94C" : "#E07C5C";
          return (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-neutral-dark/70 truncate max-w-[60%]">{h.title}</span>
                <span className="text-xs font-medium tabular-nums" style={{ color }}>{rate}%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-dark/8 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${rate}%` }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsModal({
  open,
  onClose,
  activeHabits,
  habitLogs,
  todayCompletionPct,
}: {
  open: boolean;
  onClose: () => void;
  activeHabits: HabitRef[];
  habitLogs: HabitLog[];
  todayCompletionPct?: number;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const logs = filterLogsForAnalytics(habitLogs);
  const today = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const filledLogs = fillLogsWithMissingDays(logs, TREND_DAYS, getLocalDateString(yesterday));
  const momentumLogsFull = fillLogsWithMissingDays(logs, LOG_WINDOW_DAYS, today);
  const momentumLogs =
    todayCompletionPct !== undefined
      ? momentumLogsFull.map((l) =>
          l.date === today ? { ...l, completionPct: todayCompletionPct } : l
        )
      : momentumLogsFull;
  const { best, worst, byWeekday } = computeProductiveDays(logs);
  const { improving, declining } = computeImprovingDecliningHabits(activeHabits, logs);
  const momentumScore = computeMomentumScore(momentumLogs);
  const allRates = useMemo(() => computeAllHabitRates(activeHabits, logs), [activeHabits, logs]);

  const hasData = activeHabits.length > 0 && logs.length > 0;

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-neutral-dark/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 bg-surface rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden mx-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-dark/10 shrink-0">
              <h3 className="text-lg font-semibold text-neutral-dark flex items-center gap-2">
                <BarChart3 size={20} />
                Habit Analytics
              </h3>
              <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="h-auto min-h-0">
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-neutral-light text-neutral-dark/60 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </ClickSpark>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {!hasData ? (
                <motion.p
                  className="text-sm text-neutral-dark/50 text-center py-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  Track habits for a week to see analytics.
                </motion.p>
              ) : (
                <>
                  {/* Row 1: Momentum + Trend side by side */}
                  <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                    <motion.div
                      className="p-4 rounded-xl bg-neutral-light/30 border border-neutral-dark/5 flex flex-col justify-center"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.4 }}
                    >
                      <MomentumBar score={momentumScore} compact={false} />
                      <p className="text-xs text-neutral-dark/40 mt-2">Based on recent consistency and trend</p>
                    </motion.div>

                    {hasData && (
                      <motion.div
                        className="p-4 rounded-xl bg-neutral-light/30 border border-neutral-dark/5"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.4 }}
                      >
                        <CompletionTrendChart logs={filledLogs} />
                      </motion.div>
                    )}
                  </div>

                  {/* Row 2: Habit Rates full width */}
                  <motion.div
                    className="p-4 rounded-xl bg-neutral-light/30 border border-neutral-dark/5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.4 }}
                  >
                    <HabitRatesChart habits={allRates} />
                  </motion.div>

                  {/* Row 3: Day-of-Week (all 7 days shown; 0 for days with no data) */}
                  {hasData && (
                    <motion.div
                      className="p-4 rounded-xl bg-neutral-light/30 border border-neutral-dark/5"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <WeekdayChart byWeekday={byWeekday} />
                      {best && worst && (
                        <div className="flex gap-3 mt-3 text-xs">
                          <span className="flex items-center gap-1 text-primary">
                            <TrendingUp size={12} /> Best: {best.weekday}
                          </span>
                          <span className="flex items-center gap-1 text-neutral-dark/50">
                            <TrendingDown size={12} /> Tough: {worst.weekday}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}


                  {/* Row 4: Improving / Declining — full-width bottom section */}
                  <motion.div
                    className="p-6 rounded-xl bg-neutral-light/30 border border-neutral-dark/5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36, duration: 0.4 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
                          <TrendingUp size={18} /> Improving
                        </h4>
                        {improving.length === 0 ? (
                          <p className="text-sm text-neutral-dark/40">No habits improving yet</p>
                        ) : (
                          <ul className="space-y-3">
                            {improving.map((h, i) => (
                              <motion.li
                                key={h.id}
                                className="text-base flex justify-between items-center py-1.5"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                              >
                                <span className="text-neutral-dark/90 truncate mr-3">{h.title}</span>
                                <span className="text-primary font-semibold shrink-0">+{h.delta}%</span>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-neutral-dark/70 mb-4 flex items-center gap-2">
                          <TrendingDown size={18} /> Declining
                        </h4>
                        {declining.length === 0 ? (
                          <p className="text-sm text-neutral-dark/40">No habits declining</p>
                        ) : (
                          <ul className="space-y-3">
                            {declining.map((h, i) => (
                              <motion.li
                                key={h.id}
                                className="text-base flex justify-between items-center py-1.5"
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 + i * 0.05, duration: 0.3 }}
                              >
                                <span className="text-neutral-dark/90 truncate mr-3">{h.title}</span>
                                <span className="text-neutral-dark/60 font-medium shrink-0">{h.delta}%</span>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

function AnalyticsSkeleton() {
  return (
    <Card className="p-6 min-h-[160px]">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-baseline justify-between gap-2">
          <div className="h-7 w-12 bg-neutral-dark/10 rounded" />
          <div className="h-3 w-16 bg-neutral-dark/8 rounded" />
        </div>
        <div className="h-2 rounded-full bg-neutral-dark/10" />
        <div className="space-y-2 pt-1">
          <div className="h-4 w-20 bg-neutral-dark/10 rounded" />
          <div className="h-3 w-40 bg-neutral-dark/8 rounded" />
          <div className="h-3 w-36 bg-neutral-dark/8 rounded" />
        </div>
      </div>
    </Card>
  );
}

export default function AnalyticsWidget({
  activeHabits,
  habitLogs,
  loaded,
  isDemo,
  todayCompletionPct,
  plan = "free",
}: AnalyticsWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const isLocked = plan === "free" && !isDemo;

  const logs = filterLogsForAnalytics(habitLogs);
  const today = getLocalDateString();
  const momentumLogsFull = fillLogsWithMissingDays(logs, LOG_WINDOW_DAYS, today);
  const momentumLogs =
    todayCompletionPct !== undefined
      ? momentumLogsFull.map((l) =>
          l.date === today ? { ...l, completionPct: todayCompletionPct } : l
        )
      : momentumLogsFull;
  const { strongest, weakest } = computeStrongestWeakestHabits(activeHabits, logs);
  const momentumScore = computeMomentumScore(momentumLogs);

  const hasData = activeHabits.length > 0 && logs.length > 0;
  const topHabit = strongest[0];
  const weakHabit = weakest[0];

  return (
    <>
      <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AnalyticsSkeleton />
          </motion.div>
        ) : isLocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="p-6 min-h-[160px] border-primary-light/30">
              <div className="flex flex-col items-center justify-center text-center py-4">
                <BarChart3 size={32} className="text-neutral-dark/30 mb-3" />
                <h3 className="text-sm font-semibold text-neutral-dark/70 mb-1">Analytics</h3>
                <p className="text-xs text-neutral-dark/50 mb-4">Upgrade to Pro to access habit insights and analytics.</p>
                <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="inline-flex">
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Upgrade to access
                  </button>
                </ClickSpark>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setModalOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
                className="cursor-pointer"
              >
              <Card className="hover:border-primary/50 transition-colors p-6 min-h-[160px]">
                <div className="space-y-3">
                  <MomentumBar score={momentumScore} compact />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-neutral-dark/70 flex items-center gap-2">
                      <BarChart3 size={16} />
                      Analytics
                    </h3>
                    {hasData ? (
                      <div className="mt-1 space-y-0.5">
                        {topHabit && (
                          <p className="text-xs text-neutral-dark/60 truncate">
                            Top: {topHabit.title} ({Math.round(topHabit.rate)}%)
                          </p>
                        )}
                        {weakHabit && weakHabit.id !== topHabit?.id && (
                          <p className="text-xs text-neutral-dark/50 truncate">
                            Needs attention: {weakHabit.title} ({Math.round(weakHabit.rate)}%)
                          </p>
                        )}
                        {!topHabit && !weakHabit && (
                          <p className="text-xs text-neutral-dark/50">Track more days to see insights</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-dark/50 mt-1">Track habits for a week to see analytics</p>
                    )}
                    <p className="text-xs text-primary font-medium mt-2 flex items-center gap-0.5">
                      View full analytics
                      <ChevronRight size={14} />
                    </p>
                  </div>
                </div>
              </Card>
              </div>
            </ClickSpark>
          </motion.div>
        )}
      </AnimatePresence>

      <AnalyticsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        activeHabits={activeHabits}
        habitLogs={habitLogs}
        todayCompletionPct={todayCompletionPct}
      />

      {isLocked && (
        <PlansModal
          open={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          currentPlan={plan}
        />
      )}
    </>
  );
}

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import ClickSpark from "@/components/ui/ClickSpark";
import PlansModal from "@/components/plans/PlansModal";
import { api } from "@/lib/api/client";
import type { HabitRef, HabitLog } from "@/lib/analytics";
import {
  type DigestTabId,
  getDigestTabAvailability,
  buildDigestDailyModel,
  buildDigestWeeklyModel,
  buildDigestMonthlyModel,
  buildDigestYearlyModel,
  digestDailyAiContext,
  digestWeeklyAiContext,
  digestMonthlyAiContext,
  digestYearlyAiContext,
  getYesterdayYmd,
  type DigestDailyModel,
  type DigestWeeklyModel,
  type DigestMonthlyModel,
  type DigestYearlyModel,
} from "@/lib/digest";
import { Sparkles, X, ChevronRight, ScrollText } from "lucide-react";

type PlanTier = "free" | "pro" | "max";

interface DigestWidgetProps {
  activeHabits: HabitRef[];
  habitLogs: HabitLog[];
  loaded: boolean;
  isDemo: boolean;
  plan?: PlanTier;
  streakThreshold: number;
  reminderStatsByDate: Record<string, number>;
  signupAt: Date | null;
  userId?: string | null;
  aiEnabled: boolean;
}

function DigestSkeleton() {
  return (
    <Card className="p-5 min-h-[100px]">
      <div className="space-y-3 animate-pulse">
        <div className="h-4 w-28 bg-neutral-dark/10 rounded" />
        <div className="h-3 w-full bg-neutral-dark/8 rounded" />
        <div className="h-3 w-2/3 bg-neutral-dark/8 rounded" />
      </div>
    </Card>
  );
}

function SectionBlock({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="p-4 rounded-xl bg-neutral-light/30 border border-neutral-dark/5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-dark/45 mb-2">{title}</h4>
      <div className="text-sm text-neutral-dark/85 space-y-1.5">{children}</div>
    </motion.div>
  );
}

function dailyFallback(m: DigestDailyModel): string {
  if (m.habitsTotal === 0) return "Add a few habits—your digest will light up here.";
  if (m.completionPct >= 90) return "Outstanding—you nearly cleared the board.";
  if (m.completionPct >= 70) return "Strong day—keep riding this momentum.";
  if (m.completionPct >= 40) return "Solid progress—tomorrow is another shot at the full set.";
  if (m.completionPct > 0) return "You moved the needle—build from here.";
  return "Quiet day—reset and pick one small win for tomorrow.";
}

function weeklyFallback(m: DigestWeeklyModel): string {
  if (!m.hasData) return "Log a bit more this week and this summary will pop.";
  if (m.avgCompletionPct >= 75) return "Consistent week—you’re in a good groove.";
  if (m.avgCompletionPct >= 50) return "Balanced week—nudge your weakest habit a little.";
  return "Room to grow—protect one anchor habit next week.";
}

function monthlyFallback(m: DigestMonthlyModel): string {
  if (!m.hasData) return "Keep tracking—monthly patterns appear with more days logged.";
  if (m.improvementVsPrior != null && m.improvementVsPrior > 5) return "You stepped up versus last month—nice trajectory.";
  if (m.improvementVsPrior != null && m.improvementVsPrior < -5) return "A softer month—tighten one routine and watch it compound.";
  return "Steady month—double down on what already works.";
}

function yearlyFallback(m: DigestYearlyModel): string {
  if (!m.hasData) return "Your year-at-a-glance will fill in as you log more.";
  if (m.avgCompletionPct >= 70) return "Big-picture: you showed up consistently—carry that energy forward.";
  return "Every period teaches something—pick one habit to own next.";
}

const TAB_ORDER: DigestTabId[] = ["daily", "weekly", "monthly", "yearly"];

const TAB_LABEL: Record<DigestTabId, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

function DigestModal({
  open,
  onClose,
  activeHabits,
  habitLogs,
  streakThreshold,
  reminderStatsByDate,
  tabAvail,
  userId,
  aiEnabled,
  isDemo,
}: {
  open: boolean;
  onClose: () => void;
  activeHabits: HabitRef[];
  habitLogs: HabitLog[];
  streakThreshold: number;
  reminderStatsByDate: Record<string, number>;
  tabAvail: ReturnType<typeof getDigestTabAvailability>;
  userId: string | null | undefined;
  aiEnabled: boolean;
  isDemo: boolean;
}) {
  const [tab, setTab] = useState<DigestTabId>("daily");
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiCacheRef = useRef<Map<string, string>>(new Map());

  const dailyM = useMemo(
    () => buildDigestDailyModel(activeHabits, habitLogs, streakThreshold, reminderStatsByDate),
    [activeHabits, habitLogs, streakThreshold, reminderStatsByDate]
  );
  const weeklyM = useMemo(() => buildDigestWeeklyModel(activeHabits, habitLogs), [activeHabits, habitLogs]);
  const monthlyM = useMemo(
    () => buildDigestMonthlyModel(activeHabits, habitLogs, streakThreshold),
    [activeHabits, habitLogs, streakThreshold]
  );
  const yearlyM = useMemo(
    () => buildDigestYearlyModel(activeHabits, habitLogs, streakThreshold),
    [activeHabits, habitLogs, streakThreshold]
  );

  useEffect(() => {
    if (!open) {
      aiCacheRef.current = new Map();
      return;
    }
    if (!tabAvail[tab]) setTab("daily");
  }, [open, tabAvail, tab]);

  useEffect(() => {
    if (!open) return;
    if (!tabAvail[tab]) return;

    const fallback =
      tab === "daily"
        ? dailyFallback(dailyM)
        : tab === "weekly"
          ? weeklyFallback(weeklyM)
          : tab === "monthly"
            ? monthlyFallback(monthlyM)
            : yearlyFallback(yearlyM);

    const cacheKey =
      tab === "daily"
        ? `daily-${dailyM.dateYmd}`
        : tab === "weekly"
          ? `weekly-${weeklyM.start}-${weeklyM.end}`
          : tab === "monthly"
            ? `monthly-${monthlyM.start}`
            : `yearly-${yearlyM.start}-${yearlyM.end}`;

    const cached = aiCacheRef.current.get(cacheKey);
    if (cached) {
      setAiText(cached);
      setAiLoading(false);
      return;
    }

    if (isDemo || !aiEnabled || !userId) {
      aiCacheRef.current.set(cacheKey, fallback);
      setAiText(fallback);
      setAiLoading(false);
      return;
    }

    const ctx =
      tab === "daily"
        ? digestDailyAiContext(dailyM)
        : tab === "weekly"
          ? digestWeeklyAiContext(weeklyM)
          : tab === "monthly"
            ? digestMonthlyAiContext(monthlyM)
            : digestYearlyAiContext(yearlyM);

    const message = `[Digest assistant] In one or two short friendly sentences (no bullet points, no lists), react to this summary only. Do not give medical or legal advice.\n\n${ctx}`;

    let cancelled = false;
    setAiLoading(true);
    setAiText("");

    void (async () => {
      const res = await api.aiChat(message, userId, [], false);
      if (cancelled) return;
      const text = res.ok && typeof res.reply === "string" && res.reply.trim() ? res.reply.trim() : fallback;
      aiCacheRef.current.set(cacheKey, text);
      setAiText(text);
      setAiLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    tab,
    tabAvail,
    dailyM,
    weeklyM,
    monthlyM,
    yearlyM,
    aiEnabled,
    userId,
    isDemo,
  ]);

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
            className="relative z-10 bg-surface rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden mx-4"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center justify-between p-5 border-b border-neutral-dark/10 shrink-0">
              <h3 className="text-lg font-semibold text-neutral-dark flex items-center gap-2">
                <ScrollText size={20} />
                Digest
              </h3>
              <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="h-auto min-h-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-neutral-light text-neutral-dark/60 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </ClickSpark>
            </div>

            <div className="px-4 pt-3 border-b border-neutral-dark/5 shrink-0">
              <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
                {TAB_ORDER.map((id) => {
                  const enabled = tabAvail[id];
                  const reason =
                    id === "weekly"
                      ? tabAvail.weeklyReason
                      : id === "monthly"
                        ? tabAvail.monthlyReason
                        : id === "yearly"
                          ? tabAvail.yearlyReason
                          : "";
                  return (
                    <button
                      key={id}
                      type="button"
                      title={enabled ? TAB_LABEL[id] : reason}
                      disabled={!enabled}
                      onClick={() => enabled && setTab(id)}
                      className={`
                        relative px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors
                        ${enabled ? "text-neutral-dark/80 hover:bg-neutral-light/60 cursor-pointer" : "text-neutral-dark/30 cursor-not-allowed"}
                        ${tab === id && enabled ? "text-primary" : ""}
                      `}
                      aria-disabled={!enabled}
                    >
                      {TAB_LABEL[id]}
                      {tab === id && enabled && (
                        <motion.span
                          layoutId="digestTabLine"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-4"
                >
                  {tab === "daily" && (
                    <>
                      <p className="text-xs text-neutral-dark/45">Yesterday ({dailyM.periodLabel})</p>
                      <SectionBlock title="What you did" delay={0.05}>
                        <p>
                          <span className="font-semibold text-neutral-dark">{dailyM.habitsCompleted}</span>
                          <span className="text-neutral-dark/60">
                            {" "}
                            / {dailyM.habitsTotal} habits ({dailyM.completionPct}%)
                          </span>
                        </p>
                        <p className="text-neutral-dark/70">
                          Reminders done: <span className="font-medium">{dailyM.remindersCompleted}</span>
                          {dailyM.remindersCompleted === 0 && (
                            <span className="text-neutral-dark/40"> — counts from when you complete reminders in-app</span>
                          )}
                        </p>
                      </SectionBlock>
                      <SectionBlock title="What you’re good at" delay={0.1}>
                        <p>{dailyM.biggestWin}</p>
                        <p className="text-neutral-dark/70">
                          Streak (through yesterday):{" "}
                          <span className="font-semibold text-primary">{dailyM.streakAsOfYesterday}</span> days
                        </p>
                      </SectionBlock>
                      <SectionBlock title="What to tighten" delay={0.15}>
                        {dailyM.missedHabitTitles.length === 0 ? (
                          <p className="text-neutral-dark/60">Nothing missed—nice.</p>
                        ) : (
                          <ul className="list-disc list-inside text-neutral-dark/75">
                            {dailyM.missedHabitTitles.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Coach note" delay={0.2}>
                        {aiLoading ? (
                          <div className="flex items-center gap-2 text-neutral-dark/50">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p className="flex gap-2 items-start">
                            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                            <span>{aiText || dailyFallback(dailyM)}</span>
                          </p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "weekly" && (
                    <>
                      <p className="text-xs text-neutral-dark/45">Week {weeklyM.periodLabel}</p>
                      <SectionBlock title="What you did" delay={0.05}>
                        <p>Avg completion: {weeklyM.avgCompletionPct}%</p>
                        <p>Total habit checkoffs: {weeklyM.totalHabitCompletions}</p>
                        {weeklyM.bestDay && weeklyM.worstDay && (
                          <p className="text-neutral-dark/70 text-xs">
                            Best day {weeklyM.bestDay.date} ({weeklyM.bestDay.pct}%), toughest {weeklyM.worstDay.date}{" "}
                            ({weeklyM.worstDay.pct}%)
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Strengths & gaps" delay={0.1}>
                        {weeklyM.strongestHabit && (
                          <p>
                            Strongest:{" "}
                            <span className="font-medium">{weeklyM.strongestHabit.title}</span> (
                            {Math.round(weeklyM.strongestHabit.rate)}%)
                          </p>
                        )}
                        {weeklyM.weakestHabit && (
                          <p className="text-neutral-dark/75">
                            Needs love: {weeklyM.weakestHabit.title} ({Math.round(weeklyM.weakestHabit.rate)}%)
                          </p>
                        )}
                        {!weeklyM.hasData && <p className="text-neutral-dark/50 text-xs">Log habits this week to see patterns.</p>}
                      </SectionBlock>
                      <SectionBlock title="Insight" delay={0.15}>
                        <p>{weeklyM.insight}</p>
                      </SectionBlock>
                      <SectionBlock title="Try this" delay={0.18}>
                        <p>{weeklyM.suggestion}</p>
                      </SectionBlock>
                      <SectionBlock title="Coach note" delay={0.22}>
                        {aiLoading ? (
                          <div className="flex items-center gap-2 text-neutral-dark/50">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p className="flex gap-2 items-start">
                            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                            <span>{aiText || weeklyFallback(weeklyM)}</span>
                          </p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "monthly" && (
                    <>
                      <p className="text-xs text-neutral-dark/45">Month {monthlyM.periodLabel}</p>
                      <SectionBlock title="What you did" delay={0.05}>
                        <p>Avg completion: {monthlyM.monthlyCompletionPct}%</p>
                        <p>
                          Habit checkoffs: {monthlyM.totalHabitCompletions} · Active days: {monthlyM.activeDays}
                        </p>
                        {monthlyM.improvementVsPrior != null && (
                          <p className="text-neutral-dark/70">
                            vs prior month:{" "}
                            <span className={monthlyM.improvementVsPrior >= 0 ? "text-primary font-medium" : "text-neutral-dark/60"}>
                              {monthlyM.improvementVsPrior >= 0 ? "+" : ""}
                              {monthlyM.improvementVsPrior} pts
                            </span>
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Trends" delay={0.1}>
                        <p className="text-neutral-dark/80">
                          Longest streak in month:{" "}
                          <span className="font-semibold text-primary">{monthlyM.longestStreak}</span> days
                        </p>
                        {monthlyM.improving[0] && (
                          <p className="text-primary text-xs mt-1">Up: {monthlyM.improving.map((h) => h.title).join(", ")}</p>
                        )}
                        {monthlyM.declining[0] && (
                          <p className="text-neutral-dark/55 text-xs">Slipping: {monthlyM.declining.map((h) => h.title).join(", ")}</p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Coach note" delay={0.15}>
                        {aiLoading ? (
                          <div className="flex items-center gap-2 text-neutral-dark/50">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p className="flex gap-2 items-start">
                            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                            <span>{aiText || monthlyFallback(monthlyM)}</span>
                          </p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "yearly" && (
                    <>
                      <p className="text-xs text-neutral-dark/45">{yearlyM.periodLabel}</p>
                      <SectionBlock title="What you did" delay={0.05}>
                        <p>Total habit checkoffs: {yearlyM.totalHabitCompletions}</p>
                        <p>Avg completion: {yearlyM.avgCompletionPct}%</p>
                        <p>
                          Best streak: <span className="font-semibold text-primary">{yearlyM.bestStreak}</span> days
                        </p>
                      </SectionBlock>
                      <SectionBlock title="Highlights & friction" delay={0.1}>
                        {yearlyM.mostConsistent && (
                          <p>
                            Most consistent: <span className="font-medium">{yearlyM.mostConsistent.title}</span> (
                            {Math.round(yearlyM.mostConsistent.rate)}%)
                          </p>
                        )}
                        {yearlyM.leastConsistent && (
                          <p className="text-neutral-dark/70">
                            Least consistent: {yearlyM.leastConsistent.title} ({Math.round(yearlyM.leastConsistent.rate)}%)
                          </p>
                        )}
                        {yearlyM.bestWeekday && yearlyM.worstWeekday && (
                          <p className="text-xs text-neutral-dark/60 mt-1">
                            Best weekday: {yearlyM.bestWeekday} · Toughest: {yearlyM.worstWeekday}
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Big picture" delay={0.14}>
                        <p>{yearlyM.biggestImprovementBlurb}</p>
                      </SectionBlock>
                      <SectionBlock title="Reflection & next step" delay={0.18}>
                        {aiLoading ? (
                          <div className="flex items-center gap-2 text-neutral-dark/50">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p className="flex gap-2 items-start">
                            <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                            <span>{aiText || yearlyFallback(yearlyM)}</span>
                          </p>
                        )}
                      </SectionBlock>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

export default function DigestWidget({
  activeHabits,
  habitLogs,
  loaded,
  isDemo,
  plan = "free",
  streakThreshold,
  reminderStatsByDate,
  signupAt,
  userId,
  aiEnabled,
}: DigestWidgetProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const isLocked = plan === "free" && !isDemo;

  const tabAvail = useMemo(
    () => getDigestTabAvailability(isDemo ? new Date(0) : signupAt),
    [isDemo, signupAt]
  );

  const dailyPreview = useMemo(
    () => buildDigestDailyModel(activeHabits, habitLogs, streakThreshold, reminderStatsByDate),
    [activeHabits, habitLogs, streakThreshold, reminderStatsByDate]
  );

  const yesterdayYmd = getYesterdayYmd();

  return (
    <>
      <AnimatePresence mode="wait">
        {!loaded ? (
          <motion.div
            key="sk"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <DigestSkeleton />
          </motion.div>
        ) : isLocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Card className="p-5 min-h-[100px] border-primary-light/30">
              <div className="flex flex-col items-center justify-center text-center py-2">
                <ScrollText size={28} className="text-neutral-dark/30 mb-2" />
                <h3 className="text-sm font-semibold text-neutral-dark/70 mb-1">Digest</h3>
                <p className="text-xs text-neutral-dark/50 mb-3 max-w-xs">
                  Daily, weekly, and monthly summaries of your habits and reminders—Pro and Max only.
                </p>
                <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="inline-flex">
                  <button
                    type="button"
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
            key="open"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setModalOpen(true)}
                onKeyDown={(e) => e.key === "Enter" && setModalOpen(true)}
                className="cursor-pointer"
              >
                <Card className="hover:border-primary/50 transition-colors p-5 min-h-[100px]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-semibold text-neutral-dark/70 flex items-center gap-2">
                        <ScrollText size={16} />
                        Digest
                      </h3>
                      <p className="text-xs text-neutral-dark/55">Yesterday · {yesterdayYmd}</p>
                      {dailyPreview.habitsTotal > 0 ? (
                        <p className="text-sm text-neutral-dark/80">
                          <span className="font-semibold text-primary">{dailyPreview.completionPct}%</span>
                          <span className="text-neutral-dark/60">
                            {" "}
                            · {dailyPreview.habitsCompleted}/{dailyPreview.habitsTotal} habits
                          </span>
                          {dailyPreview.remindersCompleted > 0 && (
                            <span className="text-neutral-dark/50"> · {dailyPreview.remindersCompleted} reminders</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-neutral-dark/50">Add habits to see your daily snapshot here.</p>
                      )}
                      <p className="text-xs text-primary font-medium mt-2 flex items-center gap-0.5">
                        Open full digest
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

      {!isLocked && (
        <DigestModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          activeHabits={activeHabits}
          habitLogs={habitLogs}
          streakThreshold={streakThreshold}
          reminderStatsByDate={reminderStatsByDate}
          tabAvail={tabAvail}
          userId={userId}
          aiEnabled={aiEnabled}
          isDemo={isDemo}
        />
      )}

      {isLocked && (
        <PlansModal open={showPlansModal} onClose={() => setShowPlansModal(false)} currentPlan={plan} />
      )}
    </>
  );
}

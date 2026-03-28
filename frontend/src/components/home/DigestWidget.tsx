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
  getWeeklyDigestPeriodKey,
  getMonthlyDigestPeriodKey,
  getYearlyDigestPeriodKey,
  getWeeklyBarSeries,
  type DigestDailyModel,
  type DigestWeeklyModel,
  type DigestMonthlyModel,
  type DigestYearlyModel,
} from "@/lib/digest";
import {
  loadWeeklySnapshot,
  saveWeeklySnapshot,
  loadMonthlySnapshot,
  saveMonthlySnapshot,
  loadYearlySnapshot,
  saveYearlySnapshot,
  type WeeklyBarPoint,
} from "@/lib/digest-storage";
import {
  Sparkles,
  X,
  ChevronRight,
  ScrollText,
  Target,
  TrendingUp,
  Calendar,
  Flame,
  Lightbulb,
  Award,
} from "lucide-react";

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

const TAB_ORDER: DigestTabId[] = ["daily", "weekly", "monthly", "yearly"];

const TAB_LABEL: Record<DigestTabId, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const TAB_HINT: Record<DigestTabId, string> = {
  daily: "Fresh every day",
  weekly: "Refreshes each Sunday",
  monthly: "Refreshes on the 1st",
  yearly: "Refreshes each January 1",
};

const TAB_DOT: Record<DigestTabId, string> = {
  daily: "bg-emerald-500",
  weekly: "bg-amber-400",
  monthly: "bg-sky-500",
  yearly: "bg-violet-500",
};

function DigestSkeleton() {
  return (
    <Card className="p-5 min-h-[112px] overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="space-y-3 animate-pulse relative">
        <div className="h-4 w-28 bg-neutral-dark/10 rounded" />
        <div className="h-3 w-full bg-neutral-dark/8 rounded" />
        <div className="h-3 w-2/3 bg-neutral-dark/8 rounded" />
      </div>
    </Card>
  );
}

function DigestRing({ pct, size = 76 }: { pct: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const off = c * (1 - clamped / 100);
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <defs>
        <linearGradient id="digestRingGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7FAF8F" />
          <stop offset="100%" stopColor="#F2C94C" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-neutral-dark/10" />
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="url(#digestRingGrad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: off }}
        transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </svg>
  );
}

function WeeklyBars({ series }: { series: { date: string; dayShort: string; pct: number }[] }) {
  const barH = 64;
  const max = Math.max(100, ...series.map((s) => s.pct), 1);
  return (
    <div className="rounded-xl bg-neutral-dark/[0.03] border border-neutral-dark/6 px-2 py-3">
      <p className="text-[10px] font-medium text-neutral-dark/40 uppercase tracking-wide mb-2 px-1">Week at a glance</p>
      <div className="flex items-end justify-between gap-1 min-h-[76px]">
        {series.map((s, i) => (
          <div key={s.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
            <div className="w-full flex justify-center" style={{ height: barH }}>
              <motion.div
                className="w-[70%] max-w-[26px] rounded-t-md bg-gradient-to-t from-primary/40 via-primary to-primary-light self-end"
                initial={{ height: 0, opacity: 0.4 }}
                animate={{ height: `${Math.max(4, (s.pct / max) * barH)}px`, opacity: 1 }}
                transition={{ delay: 0.04 * i, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
            <span className="text-[9px] font-medium text-neutral-dark/45 tabular-nums">{s.dayShort}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthCompareVisual({
  current,
  prior,
}: {
  current: number;
  prior: number | null;
}) {
  const max = Math.max(100, current, prior ?? 0, 1);
  return (
    <div className="space-y-2 rounded-xl bg-neutral-dark/[0.03] border border-neutral-dark/6 p-3">
      <p className="text-[10px] font-medium text-neutral-dark/40 uppercase tracking-wide">vs prior month</p>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-neutral-dark/55">This month</span>
            <span className="font-semibold text-primary tabular-nums">{current}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-dark/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
              initial={{ width: 0 }}
              animate={{ width: `${(current / max) * 100}%` }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </div>
        </div>
        {prior != null && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-neutral-dark/45">Prior</span>
              <span className="font-medium text-neutral-dark/50 tabular-nums">{prior}%</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-dark/8 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-neutral-dark/20"
                initial={{ width: 0 }}
                animate={{ width: `${(prior / max) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatOrb({
  value,
  label,
  sub,
  delay = 0,
}: {
  value: string | number;
  label: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="relative rounded-2xl p-4 text-center overflow-hidden border border-neutral-dark/6 bg-gradient-to-br from-primary/8 via-surface to-accent/5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
      <p className="text-2xl font-bold text-neutral-dark tabular-nums relative">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-dark/45 mt-1 relative">{label}</p>
      {sub && <p className="text-[11px] text-neutral-dark/55 mt-0.5 relative">{sub}</p>}
    </motion.div>
  );
}

function SectionBlock({
  title,
  icon: Icon,
  children,
  delay = 0,
  accent = "from-primary/15 to-transparent",
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  delay?: number;
  accent?: string;
}) {
  return (
    <motion.div
      className={`relative rounded-2xl border border-neutral-dark/8 overflow-hidden bg-surface shadow-sm`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accent}`} />
      <div className="p-4 pl-5">
        <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-dark/50 mb-2 flex items-center gap-2">
          <Icon size={14} className="text-primary opacity-80" />
          {title}
        </h4>
        <div className="text-sm text-neutral-dark/88 space-y-1.5">{children}</div>
      </div>
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

function DigestModalHeaderDecor() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-t-2xl">
      <div className="absolute -top-12 -right-8 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full bg-accent/15 blur-3xl" />
      <svg className="absolute bottom-0 left-0 right-0 h-8 text-primary/10" preserveAspectRatio="none" viewBox="0 0 400 32">
        <path
          fill="currentColor"
          d="M0,24 Q100,8 200,18 T400,12 L400,32 L0,32 Z"
        />
      </svg>
    </div>
  );
}

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
  const [digestNow, setDigestNow] = useState(() => new Date());
  const digestHydratedKey = useRef("");

  const [frozenWeekly, setFrozenWeekly] = useState<DigestWeeklyModel | null>(null);
  const [frozenMonthly, setFrozenMonthly] = useState<DigestMonthlyModel | null>(null);
  const [frozenYearly, setFrozenYearly] = useState<DigestYearlyModel | null>(null);
  const [pinnedWeeklyBars, setPinnedWeeklyBars] = useState<WeeklyBarPoint[]>([]);

  const [aiDaily, setAiDaily] = useState("");
  const [aiWeekly, setAiWeekly] = useState("");
  const [aiMonthly, setAiMonthly] = useState("");
  const [aiYearly, setAiYearly] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const dailyM = useMemo(
    () => buildDigestDailyModel(activeHabits, habitLogs, streakThreshold, reminderStatsByDate, digestNow),
    [activeHabits, habitLogs, streakThreshold, reminderStatsByDate, digestNow]
  );

  const liveWeekly = useMemo(
    () => buildDigestWeeklyModel(activeHabits, habitLogs, digestNow),
    [activeHabits, habitLogs, digestNow]
  );
  const liveMonthly = useMemo(
    () => buildDigestMonthlyModel(activeHabits, habitLogs, streakThreshold, digestNow),
    [activeHabits, habitLogs, streakThreshold, digestNow]
  );
  const liveYearly = useMemo(
    () => buildDigestYearlyModel(activeHabits, habitLogs, streakThreshold, digestNow),
    [activeHabits, habitLogs, streakThreshold, digestNow]
  );

  const weeklyM = frozenWeekly ?? liveWeekly;
  const monthlyM = frozenMonthly ?? liveMonthly;
  const yearlyM = frozenYearly ?? liveYearly;

  useEffect(() => {
    if (open) setDigestNow(new Date());
  }, [open]);

  useEffect(() => {
    if (!open) {
      digestHydratedKey.current = "";
      setFrozenWeekly(null);
      setFrozenMonthly(null);
      setFrozenYearly(null);
      setPinnedWeeklyBars([]);
      setAiDaily("");
      setAiWeekly("");
      setAiMonthly("");
      setAiYearly("");
      return;
    }
    if (!tabAvail[tab]) setTab("daily");
  }, [open, tabAvail, tab]);

  useEffect(() => {
    if (!open) return;

    if (tab === "daily") {
      digestHydratedKey.current = `daily-${getYesterdayYmd(digestNow)}`;
      return;
    }

    const periodKey =
      tab === "weekly"
        ? getWeeklyDigestPeriodKey(digestNow)
        : tab === "monthly"
          ? getMonthlyDigestPeriodKey(digestNow)
          : getYearlyDigestPeriodKey(digestNow);

    const sessionKey = `${tab}-${periodKey}`;
    if (digestHydratedKey.current === sessionKey) return;
    digestHydratedKey.current = sessionKey;

    if (tab === "weekly" && tabAvail.weekly) {
      const s = loadWeeklySnapshot(userId, isDemo, periodKey);
      const bars = getWeeklyBarSeries(activeHabits, habitLogs, digestNow);
      if (s) {
        setFrozenWeekly(s.model);
        setAiWeekly(s.aiText);
        setPinnedWeeklyBars(s.barSeries ?? bars);
      } else {
        setFrozenWeekly(buildDigestWeeklyModel(activeHabits, habitLogs, digestNow));
        setAiWeekly("");
        setPinnedWeeklyBars(bars);
      }
    } else if (tab === "monthly" && tabAvail.monthly) {
      const s = loadMonthlySnapshot(userId, isDemo, periodKey);
      if (s) {
        setFrozenMonthly(s.model);
        setAiMonthly(s.aiText);
      } else {
        setFrozenMonthly(buildDigestMonthlyModel(activeHabits, habitLogs, streakThreshold, digestNow));
        setAiMonthly("");
      }
    } else if (tab === "yearly" && tabAvail.yearly) {
      const s = loadYearlySnapshot(userId, isDemo, periodKey);
      if (s) {
        setFrozenYearly(s.model);
        setAiYearly(s.aiText);
      } else {
        setFrozenYearly(buildDigestYearlyModel(activeHabits, habitLogs, streakThreshold, digestNow));
        setAiYearly("");
      }
    }
  }, [
    open,
    tab,
    digestNow,
    userId,
    isDemo,
    activeHabits,
    habitLogs,
    streakThreshold,
    tabAvail,
  ]);

  useEffect(() => {
    if (!open) return;
    if (!tabAvail[tab]) return;

    let cancelled = false;

    const runDaily = async () => {
      const fallback = dailyFallback(dailyM);
      if (isDemo || !aiEnabled || !userId) {
        setAiDaily(fallback);
        setAiLoading(false);
        return;
      }
      setAiLoading(true);
      setAiDaily("");
      const message = `[Digest assistant] In one or two short friendly sentences (no bullet points, no lists), react to this summary only. Do not give medical or legal advice.\n\n${digestDailyAiContext(dailyM)}`;
      const res = await api.aiChat(message, userId, [], false);
      if (cancelled) return;
      const reply = typeof res.reply === "string" ? res.reply.trim() : "";
      setAiDaily(res.ok && reply ? reply : fallback);
      setAiLoading(false);
    };

    const runWeekly = async () => {
      const m = frozenWeekly ?? liveWeekly;
      const pk = getWeeklyDigestPeriodKey(digestNow);
      if (loadWeeklySnapshot(userId, isDemo, pk)?.aiText) return;
      const existing = aiWeekly;
      if (existing) return;

      const fallback = weeklyFallback(m);
      if (isDemo || !aiEnabled || !userId) {
        setAiWeekly(fallback);
        if (userId && !isDemo) saveWeeklySnapshot(userId, pk, m, fallback, pinnedWeeklyBars);
        return;
      }
      setAiLoading(true);
      const message = `[Digest assistant] In one or two short friendly sentences (no bullet points, no lists), react to this summary only. Do not give medical or legal advice.\n\n${digestWeeklyAiContext(m)}`;
      const res = await api.aiChat(message, userId, [], false);
      if (cancelled) return;
      const reply = typeof res.reply === "string" ? res.reply.trim() : "";
      const text = res.ok && reply ? reply : fallback;
      setAiWeekly(text);
      if (userId) saveWeeklySnapshot(userId, pk, m, text, pinnedWeeklyBars);
      setAiLoading(false);
    };

    const runMonthly = async () => {
      const m = frozenMonthly ?? liveMonthly;
      const pk = getMonthlyDigestPeriodKey(digestNow);
      if (loadMonthlySnapshot(userId, isDemo, pk)?.aiText) return;
      if (aiMonthly) return;

      const fallback = monthlyFallback(m);
      if (isDemo || !aiEnabled || !userId) {
        setAiMonthly(fallback);
        if (userId && !isDemo) saveMonthlySnapshot(userId, pk, m, fallback);
        return;
      }
      setAiLoading(true);
      const message = `[Digest assistant] In one or two short friendly sentences (no bullet points, no lists), react to this summary only. Do not give medical or legal advice.\n\n${digestMonthlyAiContext(m)}`;
      const res = await api.aiChat(message, userId, [], false);
      if (cancelled) return;
      const reply = typeof res.reply === "string" ? res.reply.trim() : "";
      const text = res.ok && reply ? reply : fallback;
      setAiMonthly(text);
      if (userId) saveMonthlySnapshot(userId, pk, m, text);
      setAiLoading(false);
    };

    const runYearly = async () => {
      const m = frozenYearly ?? liveYearly;
      const pk = getYearlyDigestPeriodKey(digestNow);
      if (loadYearlySnapshot(userId, isDemo, pk)?.aiText) return;
      if (aiYearly) return;

      const fallback = yearlyFallback(m);
      if (isDemo || !aiEnabled || !userId) {
        setAiYearly(fallback);
        if (userId && !isDemo) saveYearlySnapshot(userId, pk, m, fallback);
        return;
      }
      setAiLoading(true);
      const message = `[Digest assistant] In two short friendly sentences (no bullet points): first reflect on the period, then one concrete next step. Do not give medical or legal advice.\n\n${digestYearlyAiContext(m)}`;
      const res = await api.aiChat(message, userId, [], false);
      if (cancelled) return;
      const reply = typeof res.reply === "string" ? res.reply.trim() : "";
      const text = res.ok && reply ? reply : fallback;
      setAiYearly(text);
      if (userId) saveYearlySnapshot(userId, pk, m, text);
      setAiLoading(false);
    };

    void (async () => {
      if (tab === "daily") await runDaily();
      else if (tab === "weekly") await runWeekly();
      else if (tab === "monthly") await runMonthly();
      else if (tab === "yearly") await runYearly();
    })();

    return () => {
      cancelled = true;
      setAiLoading(false);
    };
  }, [
    open,
    tab,
    tabAvail,
    dailyM,
    frozenWeekly,
    frozenMonthly,
    frozenYearly,
    liveWeekly,
    liveMonthly,
    liveYearly,
    digestNow,
    userId,
    aiEnabled,
    isDemo,
    aiWeekly,
    aiMonthly,
    aiYearly,
    pinnedWeeklyBars,
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

  const coachForTab =
    tab === "daily" ? aiDaily : tab === "weekly" ? aiWeekly : tab === "monthly" ? aiMonthly : aiYearly;
  const fallbackForTab =
    tab === "daily"
      ? dailyFallback(dailyM)
      : tab === "weekly"
        ? weeklyFallback(weeklyM)
        : tab === "monthly"
          ? monthlyFallback(monthlyM)
          : yearlyFallback(yearlyM);

  const content = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-neutral-dark/45 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 bg-surface rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden mx-4 border border-neutral-dark/8"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="relative shrink-0 border-b border-neutral-dark/8 overflow-hidden">
              <DigestModalHeaderDecor />
              <div className="relative flex items-center justify-between p-5 pb-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-dark flex items-center gap-2">
                    <ScrollText size={22} className="text-primary" />
                    Digest
                  </h3>
                  <p className="text-[11px] text-neutral-dark/45 mt-0.5">{TAB_HINT[tab]}</p>
                </div>
                <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="h-auto min-h-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-neutral-light/80 text-neutral-dark/55 cursor-pointer transition-colors"
                  >
                    <X size={20} />
                  </button>
                </ClickSpark>
              </div>
            </div>

            <div className="px-3 pt-2 pb-1 border-b border-neutral-dark/6 shrink-0 bg-neutral-light/20">
              <div className="flex gap-0.5 overflow-x-auto pb-1 scrollbar-thin">
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
                      title={enabled ? `${TAB_LABEL[id]} — ${TAB_HINT[id]}` : reason}
                      disabled={!enabled}
                      onClick={() => enabled && setTab(id)}
                      className={`
                        relative flex items-center gap-2 px-3 py-2.5 rounded-xl whitespace-nowrap transition-all text-sm font-semibold
                        ${enabled ? "text-neutral-dark/85 hover:bg-white/60 cursor-pointer" : "text-neutral-dark/28 cursor-not-allowed"}
                        ${tab === id && enabled ? "bg-white shadow-sm text-primary" : ""}
                      `}
                      aria-disabled={!enabled}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${TAB_DOT[id]} ${enabled ? "opacity-90" : "opacity-25"}`} />
                      {TAB_LABEL[id]}
                      {tab === id && enabled && (
                        <motion.span
                          layoutId="digestTabPill"
                          className="absolute inset-0 rounded-xl border-2 border-primary/25 pointer-events-none"
                          transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-gradient-to-b from-neutral-light/15 to-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  className="space-y-4"
                >
                  {tab === "daily" && (
                    <>
                      <div className="flex items-center gap-4 p-4 rounded-2xl border border-neutral-dark/8 bg-gradient-to-br from-primary/10 via-surface to-accent/5">
                        <DigestRing pct={dailyM.completionPct} size={80} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-dark/40">Yesterday</p>
                          <p className="text-lg font-bold text-neutral-dark truncate">{dailyM.periodLabel}</p>
                          <p className="text-sm text-neutral-dark/65 mt-1">
                            <span className="font-semibold text-primary">{dailyM.habitsCompleted}</span>
                            <span className="text-neutral-dark/50">
                              /{dailyM.habitsTotal} habits · {dailyM.completionPct}%
                            </span>
                          </p>
                        </div>
                      </div>
                      <SectionBlock title="What you did" icon={Target} delay={0.05}>
                        <p className="text-neutral-dark/75">
                          Reminders done:{" "}
                          <span className="font-semibold text-neutral-dark">{dailyM.remindersCompleted}</span>
                          {dailyM.remindersCompleted === 0 && (
                            <span className="text-neutral-dark/40 text-xs"> (tracked when you complete in-app)</span>
                          )}
                        </p>
                      </SectionBlock>
                      <SectionBlock title="What you’re good at" icon={Award} delay={0.08} accent="from-accent/25 to-transparent">
                        <p>{dailyM.biggestWin}</p>
                        <p className="text-neutral-dark/65 text-xs mt-1">
                          Streak through yesterday:{" "}
                          <span className="font-bold text-primary tabular-nums">{dailyM.streakAsOfYesterday}</span> days
                        </p>
                      </SectionBlock>
                      <SectionBlock title="What to tighten" icon={TrendingUp} delay={0.11} accent="from-amber-400/20 to-transparent">
                        {dailyM.missedHabitTitles.length === 0 ? (
                          <p className="text-neutral-dark/55">Nothing missed.</p>
                        ) : (
                          <ul className="space-y-1">
                            {dailyM.missedHabitTitles.map((t) => (
                              <li key={t} className="flex items-center gap-2 text-neutral-dark/75">
                                <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Coach note" icon={Sparkles} delay={0.14}>
                        {aiLoading && tab === "daily" ? (
                          <div className="flex items-center gap-2 text-neutral-dark/45">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p>{coachForTab || fallbackForTab}</p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "weekly" && (
                    <>
                      <p className="text-[11px] text-neutral-dark/45 px-1">
                        Saved snapshot · Week ending {weeklyM.end}
                      </p>
                      <WeeklyBars series={pinnedWeeklyBars.length ? pinnedWeeklyBars : getWeeklyBarSeries(activeHabits, habitLogs, digestNow)} />
                      <div className="grid grid-cols-2 gap-3">
                        <StatOrb value={`${weeklyM.avgCompletionPct}%`} label="Avg completion" delay={0.05} />
                        <StatOrb value={weeklyM.totalHabitCompletions} label="Checkoffs" delay={0.08} />
                      </div>
                      <SectionBlock title="What you did" icon={Target} delay={0.06}>
                        {weeklyM.bestDay && weeklyM.worstDay && (
                          <p className="text-xs text-neutral-dark/65">
                            Best {weeklyM.bestDay.date} ({weeklyM.bestDay.pct}%) · Toughest {weeklyM.worstDay.date} (
                            {weeklyM.worstDay.pct}%)
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Strengths & gaps" icon={Award} delay={0.09}>
                        {weeklyM.strongestHabit && (
                          <p>
                            <span className="text-primary font-medium">{weeklyM.strongestHabit.title}</span>{" "}
                            <span className="text-neutral-dark/50">
                              ({Math.round(weeklyM.strongestHabit.rate)}%)
                            </span>
                          </p>
                        )}
                        {weeklyM.weakestHabit && (
                          <p className="text-neutral-dark/65 text-xs mt-1">
                            Needs love: {weeklyM.weakestHabit.title} ({Math.round(weeklyM.weakestHabit.rate)}%)
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Insight" icon={Lightbulb} delay={0.12} accent="from-sky-400/15 to-transparent">
                        <p>{weeklyM.insight}</p>
                      </SectionBlock>
                      <SectionBlock title="Try this" icon={Calendar} delay={0.14}>
                        <p>{weeklyM.suggestion}</p>
                      </SectionBlock>
                      <SectionBlock title="Coach note" icon={Sparkles} delay={0.16}>
                        {aiLoading && tab === "weekly" && !coachForTab ? (
                          <div className="flex items-center gap-2 text-neutral-dark/45">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p>{coachForTab || fallbackForTab}</p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "monthly" && (
                    <>
                      <p className="text-[11px] text-neutral-dark/45 px-1">Saved snapshot · {monthlyM.periodLabel}</p>
                      <MonthCompareVisual current={monthlyM.monthlyCompletionPct} prior={monthlyM.priorMonthlyCompletionPct} />
                      <div className="grid grid-cols-2 gap-3">
                        <StatOrb value={monthlyM.activeDays} label="Active days" delay={0.05} />
                        <StatOrb value={monthlyM.longestStreak} label="Best streak" sub="in month" delay={0.08} />
                      </div>
                      <SectionBlock title="What you did" icon={Target} delay={0.06}>
                        <p className="tabular-nums">{monthlyM.totalHabitCompletions} habit checkoffs</p>
                        {monthlyM.improvementVsPrior != null && (
                          <p className="text-xs mt-1 text-neutral-dark/60">
                            vs prior month:{" "}
                            <span
                              className={
                                monthlyM.improvementVsPrior >= 0 ? "text-primary font-semibold" : "text-neutral-dark/55"
                              }
                            >
                              {monthlyM.improvementVsPrior >= 0 ? "+" : ""}
                              {monthlyM.improvementVsPrior} pts
                            </span>
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Trends" icon={TrendingUp} delay={0.09}>
                        {monthlyM.improving[0] && (
                          <p className="text-primary text-xs">Up: {monthlyM.improving.map((h) => h.title).join(", ")}</p>
                        )}
                        {monthlyM.declining[0] && (
                          <p className="text-neutral-dark/50 text-xs mt-1">
                            Slipping: {monthlyM.declining.map((h) => h.title).join(", ")}
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Coach note" icon={Sparkles} delay={0.12}>
                        {aiLoading && tab === "monthly" && !coachForTab ? (
                          <div className="flex items-center gap-2 text-neutral-dark/45">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p>{coachForTab || fallbackForTab}</p>
                        )}
                      </SectionBlock>
                    </>
                  )}

                  {tab === "yearly" && (
                    <>
                      <p className="text-[11px] text-neutral-dark/45 px-1">Saved snapshot · {yearlyM.periodLabel}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <StatOrb value={yearlyM.totalHabitCompletions} label="Total checkoffs" delay={0.05} />
                        <StatOrb value={`${yearlyM.avgCompletionPct}%`} label="Avg completion" delay={0.08} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StatOrb value={yearlyM.bestStreak} label="Best streak" sub="days" delay={0.1} />
                        <StatOrb
                          value={yearlyM.bestWeekday ?? "—"}
                          label="Top weekday"
                          sub={yearlyM.worstWeekday ? `Tough: ${yearlyM.worstWeekday}` : undefined}
                          delay={0.12}
                        />
                      </div>
                      <SectionBlock title="Consistency" icon={Flame} delay={0.08} accent="from-violet-400/15 to-transparent">
                        {yearlyM.mostConsistent && (
                          <p>
                            Most: <span className="font-medium text-primary">{yearlyM.mostConsistent.title}</span> (
                            {Math.round(yearlyM.mostConsistent.rate)}%)
                          </p>
                        )}
                        {yearlyM.leastConsistent && (
                          <p className="text-xs text-neutral-dark/55 mt-1">
                            Least: {yearlyM.leastConsistent.title} ({Math.round(yearlyM.leastConsistent.rate)}%)
                          </p>
                        )}
                      </SectionBlock>
                      <SectionBlock title="Big picture" icon={Lightbulb} delay={0.1}>
                        <p>{yearlyM.biggestImprovementBlurb}</p>
                      </SectionBlock>
                      <SectionBlock title="Reflection & next step" icon={Sparkles} delay={0.12}>
                        {aiLoading && tab === "yearly" && !coachForTab ? (
                          <div className="flex items-center gap-2 text-neutral-dark/45">
                            <motion.div
                              className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                            />
                            <span className="text-xs">Thinking…</span>
                          </div>
                        ) : (
                          <p>{coachForTab || fallbackForTab}</p>
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
            <Card className="p-5 min-h-[112px] border-primary-light/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-accent/10 pointer-events-none" />
              <div className="relative flex flex-col items-center justify-center text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
                  <ScrollText size={26} className="text-primary/70" />
                </div>
                <h3 className="text-sm font-bold text-neutral-dark/80 mb-1">Digest</h3>
                <p className="text-xs text-neutral-dark/50 mb-3 max-w-xs leading-relaxed">
                  Summaries that refresh on your schedule—daily, weekly, monthly, and yearly. Pro and Max only.
                </p>
                <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="inline-flex">
                  <button
                    type="button"
                    onClick={() => setShowPlansModal(true)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
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
                <Card className="hover:border-primary/40 transition-all p-0 min-h-[112px] overflow-hidden border-neutral-dark/10 shadow-sm hover:shadow-md">
                  <div className="relative flex items-stretch">
                    <div className="w-[5px] bg-gradient-to-b from-primary via-primary-light to-accent shrink-0" />
                    <div className="flex-1 p-4 flex items-center gap-4">
                      {dailyPreview.habitsTotal > 0 ? (
                        <DigestRing pct={dailyPreview.completionPct} size={72} />
                      ) : (
                        <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-neutral-dark/15 flex items-center justify-center shrink-0">
                          <ScrollText size={28} className="text-neutral-dark/25" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-sm font-bold text-neutral-dark/80 flex items-center gap-2">
                          Digest
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-primary/80 px-1.5 py-0.5 rounded-md bg-primary/10">
                            Live daily
                          </span>
                        </h3>
                        <p className="text-[11px] text-neutral-dark/45">Yesterday · {yesterdayYmd}</p>
                        {dailyPreview.habitsTotal > 0 ? (
                          <p className="text-sm text-neutral-dark/80">
                            <span className="font-bold text-primary tabular-nums">{dailyPreview.completionPct}%</span>
                            <span className="text-neutral-dark/55">
                              {" "}
                              · {dailyPreview.habitsCompleted}/{dailyPreview.habitsTotal} habits
                            </span>
                            {dailyPreview.remindersCompleted > 0 && (
                              <span className="text-neutral-dark/45"> · {dailyPreview.remindersCompleted} reminders</span>
                            )}
                          </p>
                        ) : (
                          <p className="text-xs text-neutral-dark/50">Add habits to see your snapshot.</p>
                        )}
                        <p className="text-xs text-primary font-semibold mt-1 flex items-center gap-0.5">
                          Open full digest
                          <ChevronRight size={14} />
                        </p>
                      </div>
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

/**
 * Digest / summary metrics for Pro home widget (habits only).
 */
import {
  computeStrongestWeakestHabits,
  computeProductiveDays,
  computeImprovingDecliningHabits,
  computeAllHabitRates,
  type HabitRef,
  type HabitLog,
} from "@/lib/analytics";

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdLocal(s: string): Date {
  const parts = s.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date();
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** Start of calendar month for date `d` (local). */
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Yesterday YYYY-MM-DD (local). */
export function getYesterdayYmd(now: Date = new Date()): string {
  return ymd(addDays(now, -1));
}

/**
 * Last completed Sun–Sat week, ending on the most recent Saturday strictly before "today"
 * (if today is Saturday, uses the previous Saturday as week end).
 */
export function getWeeklyWindowYmd(now: Date = new Date()): { start: string; end: string } {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay();
  const end = new Date(d);
  if (dow === 0) {
    end.setDate(end.getDate() - 1);
  } else if (dow === 6) {
    end.setDate(end.getDate() - 7);
  } else {
    end.setDate(end.getDate() - (dow + 1));
  }
  const start = addDays(end, -6);
  return { start: ymd(start), end: ymd(end) };
}

/** Previous calendar month [start, end] inclusive. */
export function getPreviousMonthWindowYmd(now: Date = new Date()): { start: string; end: string } {
  const firstThisMonth = startOfMonth(now);
  const lastPrev = addDays(firstThisMonth, -1);
  const firstPrev = startOfMonth(lastPrev);
  return { start: ymd(firstPrev), end: ymd(lastPrev) };
}

/** Calendar month before `getPreviousMonthWindowYmd(now)` (for month-over-month compare). */
export function getMonthBeforePreviousYmd(now: Date = new Date()): { start: string; end: string } {
  const { start } = getPreviousMonthWindowYmd(now);
  const [y, m] = start.split("-").map(Number);
  const monthIndex = m - 1;
  const priorStart = new Date(y, monthIndex - 1, 1);
  const priorEnd = new Date(y, monthIndex, 0);
  return { start: ymd(priorStart), end: ymd(priorEnd) };
}

/**
 * Yearly digest window: on Jan 1 show full prior calendar year; otherwise YTD through yesterday.
 */
export function getYearlyWindowYmd(now: Date = new Date()): { start: string; end: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const day = now.getDate();
  const yesterday = ymd(addDays(now, -1));

  if (m === 0 && day === 1) {
    const py = y - 1;
    return {
      start: `${py}-01-01`,
      end: `${py}-12-31`,
      label: String(py),
    };
  }

  return {
    start: `${y}-01-01`,
    end: yesterday,
    label: `${y} so far`,
  };
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 86400000;
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((ub - ua) / ms);
}

export function getDaysSinceSignup(signupAt: Date | null, now: Date = new Date()): number | null {
  if (!signupAt || Number.isNaN(signupAt.getTime())) return null;
  return Math.max(0, daysBetween(signupAt, now));
}

/** Start of the calendar month before the current month (local). */
export function getStartOfPreviousCalendarMonth(now: Date = new Date()): string {
  const firstThis = startOfMonth(now);
  const lastPrev = addDays(firstThis, -1);
  return ymd(startOfMonth(lastPrev));
}

export type DigestTabId = "daily" | "weekly" | "monthly" | "yearly";

export interface DigestTabAvailability {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  yearly: boolean;
  weeklyReason: string;
  monthlyReason: string;
  yearlyReason: string;
}

/** Yearly tab only after January 1 of the calendar year following signup. */
export function isYearlyDigestTabUnlocked(signupAt: Date | null, now: Date = new Date()): boolean {
  if (!signupAt || Number.isNaN(signupAt.getTime())) return false;
  const signupYear = signupAt.getFullYear();
  const unlock = new Date(signupYear + 1, 0, 1);
  return now >= unlock;
}

/** Stable localStorage key for the current weekly digest (refreshes each week, week ends Saturday `end`). */
export function getWeeklyDigestPeriodKey(now: Date = new Date()): string {
  const { end } = getWeeklyWindowYmd(now);
  return `w-${end}`;
}

/** Stable key for the monthly digest (previous calendar month; refreshes on the 1st). */
export function getMonthlyDigestPeriodKey(now: Date = new Date()): string {
  const { start } = getPreviousMonthWindowYmd(now);
  return `m-${start}`;
}

/**
 * Stable key for yearly digest: Jan 1 shows prior-year wrap (`y-wrap-2025`);
 * rest of year is one frozen YTD bucket per calendar year (`y-ytd-2026`).
 */
export function getYearlyDigestPeriodKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (m === 0 && d === 1) {
    return `y-wrap-${y - 1}`;
  }
  return `y-ytd-${y}`;
}

export function getDigestTabAvailability(
  signupAt: Date | null,
  now: Date = new Date()
): DigestTabAvailability {
  const days = getDaysSinceSignup(signupAt, now);
  const weeklyOk = days !== null && days >= 7;
  const yearlyOk = isYearlyDigestTabUnlocked(signupAt, now);

  const prevMonthStart = parseYmdLocal(getStartOfPreviousCalendarMonth(now));
  const monthlyOk = signupAt !== null && !Number.isNaN(signupAt.getTime()) && signupAt < prevMonthStart;

  return {
    daily: true,
    weekly: weeklyOk,
    monthly: monthlyOk,
    yearly: yearlyOk,
    weeklyReason: weeklyOk ? "" : "Available after 7 days. Summary refreshes each Sunday.",
    monthlyReason: monthlyOk ? "" : "Available after your first full month. Refreshes on the 1st of each month.",
    yearlyReason: yearlyOk ? "" : "Unlocks January 1 of the year after you joined.",
  };
}

function logMap(logs: HabitLog[]): Map<string, HabitLog> {
  return new Map(logs.map((l) => [l.date, l]));
}

export function filterLogsInRange(logs: HabitLog[], start: string, end: string): HabitLog[] {
  return logs.filter((l) => l.date >= start && l.date <= end).sort((a, b) => a.date.localeCompare(b.date));
}

export function effectiveCompletionPct(log: HabitLog | undefined, totalHabits: number): number {
  if (!log) return 0;
  if (totalHabits <= 0) return 0;
  if (log.completionPct != null) return log.completionPct;
  const n = log.completedHabitIds?.length ?? 0;
  return Math.round((n / totalHabits) * 100);
}

/**
 * Streak count: consecutive days ending at `endYmd` meeting threshold (inclusive).
 * Walks backward day by day; missing log = 0% that day.
 */
export function computeStreakEndingOn(
  logs: HabitLog[],
  endYmd: string,
  totalHabits: number,
  streakThreshold: number
): number {
  const byDate = logMap(logs);
  let count = 0;
  let d = parseYmdLocal(endYmd);
  for (let i = 0; i < 400; i++) {
    const key = ymd(d);
    const pct = effectiveCompletionPct(byDate.get(key), totalHabits);
    if (pct < streakThreshold) break;
    count++;
    d = addDays(d, -1);
  }
  return count;
}

export function computeLongestStreakInRange(
  logs: HabitLog[],
  start: string,
  end: string,
  totalHabits: number,
  streakThreshold: number
): number {
  const inRange = filterLogsInRange(logs, start, end);
  if (inRange.length === 0) return 0;
  const byDate = logMap(logs);
  let best = 0;
  let run = 0;
  let d = parseYmdLocal(start);
  const endD = parseYmdLocal(end);
  while (d <= endD) {
    const key = ymd(d);
    const pct = effectiveCompletionPct(byDate.get(key), totalHabits);
    if (pct >= streakThreshold) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
    d = addDays(d, 1);
  }
  return best;
}

export interface DigestDailyModel {
  periodLabel: string;
  dateYmd: string;
  habitsCompleted: number;
  habitsTotal: number;
  completionPct: number;
  streakAsOfYesterday: number;
  biggestWin: string;
  missedHabitTitles: string[];
  hasData: boolean;
}

export function buildDigestDailyModel(
  activeHabits: HabitRef[],
  logs: HabitLog[],
  streakThreshold: number,
  now: Date = new Date()
): DigestDailyModel {
  const dateYmd = getYesterdayYmd(now);
  const byDate = logMap(logs);
  const yLog = byDate.get(dateYmd);
  const total = activeHabits.length;
  const habitsCompleted = yLog
    ? (yLog.completedHabitIds ?? []).filter((id) => activeHabits.some((h) => h.id === id)).length
    : 0;
  const completionPct = total > 0 ? Math.round((habitsCompleted / total) * 100) : 0;
  const streakAsOfYesterday = computeStreakEndingOn(logs, dateYmd, total, streakThreshold);

  const completedSet = new Set(yLog?.completedHabitIds ?? []);
  const missedHabitTitles = activeHabits.filter((h) => !completedSet.has(h.id)).map((h) => h.title);

  let biggestWin = "";
  if (total === 0) biggestWin = "Add habits to start tracking.";
  else if (habitsCompleted === total) biggestWin = "You completed every habit.";
  else if (habitsCompleted > 0) {
    const top = activeHabits.find((h) => completedSet.has(h.id));
    biggestWin = top ? `Nice focus on "${top.title}".` : "Keep building the streak.";
  } else {
    biggestWin = "Reset today—you’ve got a fresh start.";
  }

  const periodLabel = dateYmd;

  return {
    periodLabel,
    dateYmd,
    habitsCompleted,
    habitsTotal: total,
    completionPct,
    streakAsOfYesterday,
    biggestWin,
    missedHabitTitles,
    hasData: total > 0 || !!yLog,
  };
}

export interface DigestWeeklyModel {
  periodLabel: string;
  start: string;
  end: string;
  avgCompletionPct: number;
  bestDay: { date: string; pct: number } | null;
  worstDay: { date: string; pct: number } | null;
  totalHabitCompletions: number;
  strongestHabit: { title: string; rate: number } | null;
  weakestHabit: { title: string; rate: number } | null;
  insight: string;
  suggestion: string;
  hasData: boolean;
}

export function buildDigestWeeklyModel(
  activeHabits: HabitRef[],
  logs: HabitLog[],
  now: Date = new Date()
): DigestWeeklyModel {
  const { start, end } = getWeeklyWindowYmd(now);
  const rangeLogs = filterLogsInRange(logs, start, end);
  const total = activeHabits.length;
  const filled = fillRangeWithZeros(rangeLogs, start, end);
  const pcts = filled.map((l) => ({ date: l.date, pct: effectiveCompletionPct(l, total) }));
  const avgCompletionPct =
    pcts.length > 0 ? Math.round(pcts.reduce((s, x) => s + x.pct, 0) / pcts.length) : 0;

  let bestDay: { date: string; pct: number } | null = null;
  let worstDay: { date: string; pct: number } | null = null;
  for (const x of pcts) {
    if (!bestDay || x.pct > bestDay.pct) bestDay = x;
    if (!worstDay || x.pct < worstDay.pct) worstDay = x;
  }

  let totalHabitCompletions = 0;
  for (const l of rangeLogs) {
    for (const id of l.completedHabitIds ?? []) {
      if (activeHabits.some((h) => h.id === id)) totalHabitCompletions++;
    }
  }

  const { strongest, weakest } = computeStrongestWeakestHabits(activeHabits, rangeLogs);
  const strongestHabit = strongest[0] ? { title: strongest[0].title, rate: strongest[0].rate } : null;
  const weakestHabit = weakest[0] ? { title: weakest[0].title, rate: weakest[0].rate } : null;

  const { byWeekday } = computeProductiveDays(rangeLogs);
  const weekendAvg =
    byWeekday[0].count + byWeekday[6].count > 0
      ? (byWeekday[0].avgPct * byWeekday[0].count + byWeekday[6].avgPct * byWeekday[6].count) /
        (byWeekday[0].count + byWeekday[6].count)
      : null;
  let weekdaySum = 0;
  let weekdayCount = 0;
  for (let i = 1; i <= 5; i++) {
    if (byWeekday[i].count > 0) {
      weekdaySum += byWeekday[i].avgPct * byWeekday[i].count;
      weekdayCount += byWeekday[i].count;
    }
  }
  const weekdayAvg = weekdayCount > 0 ? weekdaySum / weekdayCount : null;

  let insight = "Patterns will sharpen as you log more days.";
  if (weekendAvg != null && weekdayAvg != null && weekdayCount > 0 && (byWeekday[0].count + byWeekday[6].count) > 0) {
    if (weekendAvg < weekdayAvg - 10) {
      insight = "You tend to dip on weekends compared to weekdays.";
    } else if (weekdayAvg < weekendAvg - 10) {
      insight = "Weekends look stronger than mid-week—interesting rhythm.";
    } else {
      insight = "Your weekday and weekend completion stay fairly even.";
    }
  }

  let suggestion = "Pick one habit to protect on your lowest day.";
  if (weakestHabit && weakestHabit.rate < 50) {
    suggestion = `Give extra attention to “${weakestHabit.title}” next week.`;
  } else if (avgCompletionPct < 60) {
    suggestion = "Try stacking a tiny win early in the day to build momentum.";
  } else {
    suggestion = "Keep the rhythm—consistency beats perfection.";
  }

  return {
    periodLabel: `${start} → ${end}`,
    start,
    end,
    avgCompletionPct,
    bestDay,
    worstDay,
    totalHabitCompletions,
    strongestHabit,
    weakestHabit,
    insight,
    suggestion,
    hasData: rangeLogs.length > 0 && total > 0,
  };
}

function fillRangeWithZeros(logs: HabitLog[], start: string, end: string): HabitLog[] {
  const byDate = logMap(logs);
  const out: HabitLog[] = [];
  let d = parseYmdLocal(start);
  const endD = parseYmdLocal(end);
  while (d <= endD) {
    const key = ymd(d);
    out.push(
      byDate.get(key) ?? {
        date: key,
        completedHabitIds: [],
        completionPct: 0,
      }
    );
    d = addDays(d, 1);
  }
  return out;
}

/** 7-day completion series for the current weekly window (Sun→Sat labels). */
export function getWeeklyBarSeries(
  activeHabits: HabitRef[],
  logs: HabitLog[],
  now: Date = new Date()
): { date: string; pct: number; dayShort: string }[] {
  const { start, end } = getWeeklyWindowYmd(now);
  const rangeLogs = filterLogsInRange(logs, start, end);
  const total = activeHabits.length;
  const filled = fillRangeWithZeros(rangeLogs, start, end);
  const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return filled.map((l) => {
    const dow = parseYmdLocal(l.date).getDay();
    return {
      date: l.date,
      pct: effectiveCompletionPct(l, total),
      dayShort: SHORT[dow] ?? "",
    };
  });
}

export interface DigestMonthlyModel {
  periodLabel: string;
  start: string;
  end: string;
  monthlyCompletionPct: number;
  priorMonthlyCompletionPct: number | null;
  improvementVsPrior: number | null;
  totalHabitCompletions: number;
  activeDays: number;
  improving: { title: string; delta: number }[];
  declining: { title: string; delta: number }[];
  longestStreak: number;
  hasData: boolean;
}

export function buildDigestMonthlyModel(
  activeHabits: HabitRef[],
  logs: HabitLog[],
  streakThreshold: number,
  now: Date = new Date()
): DigestMonthlyModel {
  const { start, end } = getPreviousMonthWindowYmd(now);
  const rangeLogs = filterLogsInRange(logs, start, end);
  const total = activeHabits.length;
  const filled = fillRangeWithZeros(rangeLogs, start, end);
  const avg =
    filled.length > 0
      ? Math.round(
          filled.reduce((s, l) => s + effectiveCompletionPct(l, total), 0) / filled.length
        )
      : 0;

  const prior = getMonthBeforePreviousYmd(now);
  const priorLogs = filterLogsInRange(logs, prior.start, prior.end);
  const priorFilled = fillRangeWithZeros(priorLogs, prior.start, prior.end);
  const priorAvg =
    priorFilled.length > 0
      ? Math.round(
          priorFilled.reduce((s, l) => s + effectiveCompletionPct(l, total), 0) / priorFilled.length
        )
      : null;

  const improvementVsPrior = priorAvg != null ? avg - priorAvg : null;

  let totalHabitCompletions = 0;
  let activeDays = 0;
  for (const l of rangeLogs) {
    const pct = effectiveCompletionPct(l, total);
    if (pct > 0) activeDays++;
    for (const id of l.completedHabitIds ?? []) {
      if (activeHabits.some((h) => h.id === id)) totalHabitCompletions++;
    }
  }

  const { improving, declining } = computeImprovingDecliningHabits(activeHabits, rangeLogs);
  const longestStreak = computeLongestStreakInRange(logs, start, end, total, streakThreshold);

  return {
    periodLabel: start.slice(0, 7),
    start,
    end,
    monthlyCompletionPct: avg,
    priorMonthlyCompletionPct: priorAvg,
    improvementVsPrior,
    totalHabitCompletions,
    activeDays,
    improving: improving.slice(0, 3).map((h) => ({ title: h.title, delta: h.delta })),
    declining: declining.slice(0, 3).map((h) => ({ title: h.title, delta: h.delta })),
    longestStreak,
    hasData: rangeLogs.length > 0 && total > 0,
  };
}

export interface DigestYearlyModel {
  periodLabel: string;
  start: string;
  end: string;
  totalHabitCompletions: number;
  avgCompletionPct: number;
  bestStreak: number;
  mostConsistent: { title: string; rate: number } | null;
  leastConsistent: { title: string; rate: number } | null;
  bestWeekday: string | null;
  worstWeekday: string | null;
  biggestImprovementBlurb: string;
  hasData: boolean;
}

export function buildDigestYearlyModel(
  activeHabits: HabitRef[],
  logs: HabitLog[],
  streakThreshold: number,
  now: Date = new Date()
): DigestYearlyModel {
  const { start, end, label } = getYearlyWindowYmd(now);
  const rangeLogs = filterLogsInRange(logs, start, end);
  const total = activeHabits.length;
  const filled = fillRangeWithZeros(rangeLogs, start, end);
  const avgCompletionPct =
    filled.length > 0
      ? Math.round(
          filled.reduce((s, l) => s + effectiveCompletionPct(l, total), 0) / filled.length
        )
      : 0;

  let totalHabitCompletions = 0;
  for (const l of rangeLogs) {
    for (const id of l.completedHabitIds ?? []) {
      if (activeHabits.some((h) => h.id === id)) totalHabitCompletions++;
    }
  }

  const bestStreak = computeLongestStreakInRange(logs, start, end, total, streakThreshold);
  const rates = computeAllHabitRates(activeHabits, rangeLogs);
  const mostConsistent = rates[0] ? { title: rates[0].title, rate: rates[0].rate } : null;
  const leastConsistent = rates.length > 0 ? { title: rates[rates.length - 1].title, rate: rates[rates.length - 1].rate } : null;

  const { best, worst } = computeProductiveDays(rangeLogs);
  const bestWeekday = best?.weekday ?? null;
  const worstWeekday = worst?.weekday ?? null;

  const mid = Math.floor(rangeLogs.length / 2);
  const firstHalf = rangeLogs.slice(0, mid);
  const secondHalf = rangeLogs.slice(mid);
  const avgFirst =
    firstHalf.length > 0 && total > 0
      ? Math.round(
          firstHalf.reduce((s, l) => s + effectiveCompletionPct(l, total), 0) / firstHalf.length
        )
      : 0;
  const avgSecond =
    secondHalf.length > 0 && total > 0
      ? Math.round(
          secondHalf.reduce((s, l) => s + effectiveCompletionPct(l, total), 0) / secondHalf.length
        )
      : 0;
  const deltaHalf = avgSecond - avgFirst;
  let biggestImprovementBlurb = "Keep logging—trends get clearer over time.";
  if (rangeLogs.length >= 8) {
    if (deltaHalf >= 10) {
      biggestImprovementBlurb = `You finished the period stronger—about ${deltaHalf}% higher in the second half.`;
    } else if (deltaHalf <= -10) {
      biggestImprovementBlurb = `Completion eased later in the period (roughly ${Math.abs(deltaHalf)}% lower)—worth a gentle reset.`;
    } else {
      biggestImprovementBlurb = "Your completion stayed steady across the period.";
    }
  }

  return {
    periodLabel: label,
    start,
    end,
    totalHabitCompletions,
    avgCompletionPct,
    bestStreak,
    mostConsistent,
    leastConsistent,
    bestWeekday,
    worstWeekday,
    biggestImprovementBlurb,
    hasData: rangeLogs.length > 0 && total > 0,
  };
}

/** Plain-text lines for AI prompts (no PII beyond habit titles). */
export function digestDailyAiContext(m: DigestDailyModel): string {
  return [
    "Daily habit digest (yesterday only).",
    `Completion: ${m.completionPct}% (${m.habitsCompleted}/${m.habitsTotal} habits).`,
    `Streak (as of yesterday): ${m.streakAsOfYesterday} days.`,
    m.missedHabitTitles.length ? `Missed habits: ${m.missedHabitTitles.slice(0, 5).join(", ")}` : "No missed habits.",
  ].join(" ");
}

export function digestWeeklyAiContext(m: DigestWeeklyModel): string {
  return [
    "Weekly digest.",
    `Avg completion ${m.avgCompletionPct}%.`,
    m.strongestHabit ? `Strongest habit: ${m.strongestHabit.title} (${Math.round(m.strongestHabit.rate)}%).` : "",
    m.weakestHabit ? `Weakest: ${m.weakestHabit.title} (${Math.round(m.weakestHabit.rate)}%).` : "",
    m.insight,
  ]
    .filter(Boolean)
    .join(" ");
}

export function digestMonthlyAiContext(m: DigestMonthlyModel): string {
  return [
    "Monthly digest.",
    `Avg completion ${m.monthlyCompletionPct}%.`,
    m.improvementVsPrior != null ? `Vs prior month: ${m.improvementVsPrior >= 0 ? "+" : ""}${m.improvementVsPrior} pts.` : "",
    `Active days: ${m.activeDays}. Longest streak in month: ${m.longestStreak}.`,
    m.improving[0] ? `Improving: ${m.improving[0].title}.` : "",
    m.declining[0] ? `Declining: ${m.declining[0].title}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function digestYearlyAiContext(m: DigestYearlyModel): string {
  return [
    `Yearly digest (${m.periodLabel}).`,
    `Avg completion ${m.avgCompletionPct}%, total habit checkoffs ${m.totalHabitCompletions}.`,
    `Best streak: ${m.bestStreak} days.`,
    m.mostConsistent ? `Most consistent: ${m.mostConsistent.title}.` : "",
    m.leastConsistent ? `Least consistent: ${m.leastConsistent.title}.` : "",
    m.bestWeekday && m.worstWeekday ? `Best weekday ${m.bestWeekday}, toughest ${m.worstWeekday}.` : "",
    m.biggestImprovementBlurb,
  ]
    .filter(Boolean)
    .join(" ");
}

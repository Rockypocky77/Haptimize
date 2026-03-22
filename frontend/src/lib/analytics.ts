export interface HabitRef {
  id: string;
  title: string;
}

export interface HabitLog {
  date: string;
  completedHabitIds: string[];
  completionPct?: number;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DELTA_THRESHOLD = 15;
export const LOG_WINDOW_DAYS = 90;

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Fills in missing days in a date range with 0% completion.
 * Use when displaying charts/analytics so days the app wasn't opened show as 0, not omitted.
 * @param endDate - Last day in range (YYYY-MM-DD). Defaults to today.
 */
export function fillLogsWithMissingDays(
  logs: HabitLog[],
  daysBack: number,
  endDate?: string
): HabitLog[] {
  const end = endDate ?? toLocalDateString(new Date());
  const logByDate = new Map(logs.map((l) => [l.date, l]));
  const result: HabitLog[] = [];
  const d = new Date(end);
  for (let i = 0; i < daysBack; i++) {
    const dateStr = toLocalDateString(d);
    const existing = logByDate.get(dateStr);
    result.push(
      existing ?? {
        date: dateStr,
        completedHabitIds: [],
        completionPct: 0,
      }
    );
    d.setDate(d.getDate() - 1);
  }
  return result.reverse();
}

export function filterLogsToWindow(logs: HabitLog[]): HabitLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - LOG_WINDOW_DAYS);
  const cutoffStr = toLocalDateString(cutoff);
  return logs.filter((l) => l.date >= cutoffStr).sort((a, b) => a.date.localeCompare(b.date));
}

/** Excludes today's log from analytics — in-progress days are not counted until the day ends. */
export function excludeTodayFromLogs(logs: HabitLog[]): HabitLog[] {
  const today = toLocalDateString(new Date());
  return logs.filter((l) => l.date !== today);
}

/** Logs filtered for analytics: within window and excluding today (in-progress day). */
export function filterLogsForAnalytics(logs: HabitLog[]): HabitLog[] {
  return excludeTodayFromLogs(filterLogsToWindow(logs));
}

export interface HabitStrength {
  id: string;
  title: string;
  rate: number;
  daysCompleted: number;
  totalDays: number;
}

export function computeStrongestWeakestHabits(
  activeHabits: HabitRef[],
  logs: HabitLog[]
): { strongest: HabitStrength[]; weakest: HabitStrength[] } {
  const totalDays = logs.length;
  if (totalDays === 0 || activeHabits.length === 0) {
    return { strongest: [], weakest: [] };
  }

  const habitIds = new Set(activeHabits.map((h) => h.id));
  const titleById = new Map(activeHabits.map((h) => [h.id, h.title]));

  const completedByHabit = new Map<string, number>();
  for (const log of logs) {
    for (const id of log.completedHabitIds ?? []) {
      if (habitIds.has(id)) {
        completedByHabit.set(id, (completedByHabit.get(id) ?? 0) + 1);
      }
    }
  }

  const results: HabitStrength[] = [];
  for (const id of habitIds) {
    const daysCompleted = completedByHabit.get(id) ?? 0;
    const rate = totalDays > 0 ? (daysCompleted / totalDays) * 100 : 0;
    results.push({
      id,
      title: titleById.get(id) ?? "",
      rate,
      daysCompleted,
      totalDays,
    });
  }

  const sorted = [...results].sort((a, b) => b.rate - a.rate);
  const strongest = sorted.slice(0, 3);
  const weakest = sorted.slice(-3).reverse();

  return { strongest, weakest };
}

export interface ProductiveDay {
  weekday: string;
  weekdayIndex: number;
  avgPct: number;
  count: number;
}

export function computeProductiveDays(logs: HabitLog[]): {
  best: ProductiveDay | null;
  worst: ProductiveDay | null;
  byWeekday: ProductiveDay[];
} {
  const byWeekday: { sum: number; count: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }));

  for (const log of logs) {
    const [y, m, d] = log.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const w = date.getDay();
    const pct = log.completionPct ?? 0;
    byWeekday[w].sum += pct;
    byWeekday[w].count += 1;
  }

  const results: ProductiveDay[] = byWeekday.map((v, i) => ({
    weekday: WEEKDAYS[i],
    weekdayIndex: i,
    avgPct: v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0,
    count: v.count,
  }));

  const withData = results.filter((r) => r.count > 0).sort((a, b) => b.avgPct - a.avgPct);
  const best = withData[0] ?? null;
  const worst = withData[withData.length - 1] ?? null;

  return { best, worst, byWeekday: results };
}


export interface TrendHabit {
  id: string;
  title: string;
  earlyRate: number;
  recentRate: number;
  delta: number;
}

export function computeImprovingDecliningHabits(
  activeHabits: HabitRef[],
  logs: HabitLog[]
): { improving: TrendHabit[]; declining: TrendHabit[] } {
  if (logs.length < 4 || activeHabits.length === 0) {
    return { improving: [], declining: [] };
  }

  const habitIds = new Set(activeHabits.map((h) => h.id));
  const titleById = new Map(activeHabits.map((h) => [h.id, h.title]));

  const mid = Math.floor(logs.length / 2);
  const earlyLogs = logs.slice(0, mid);
  const recentLogs = logs.slice(mid);

  const earlyCompleted = new Map<string, number>();
  const recentCompleted = new Map<string, number>();

  for (const log of earlyLogs) {
    for (const id of log.completedHabitIds ?? []) {
      if (habitIds.has(id)) {
        earlyCompleted.set(id, (earlyCompleted.get(id) ?? 0) + 1);
      }
    }
  }
  for (const log of recentLogs) {
    for (const id of log.completedHabitIds ?? []) {
      if (habitIds.has(id)) {
        recentCompleted.set(id, (recentCompleted.get(id) ?? 0) + 1);
      }
    }
  }

  const improving: TrendHabit[] = [];
  const declining: TrendHabit[] = [];

  for (const id of habitIds) {
    const earlyRate = earlyLogs.length > 0 ? ((earlyCompleted.get(id) ?? 0) / earlyLogs.length) * 100 : 0;
    const recentRate = recentLogs.length > 0 ? ((recentCompleted.get(id) ?? 0) / recentLogs.length) * 100 : 0;
    const delta = Math.round((recentRate - earlyRate) * 10) / 10;

    if (delta >= DELTA_THRESHOLD) {
      improving.push({ id, title: titleById.get(id) ?? "", earlyRate, recentRate, delta });
    } else if (delta <= -DELTA_THRESHOLD) {
      declining.push({ id, title: titleById.get(id) ?? "", earlyRate, recentRate, delta });
    }
  }

  improving.sort((a, b) => b.delta - a.delta);
  declining.sort((a, b) => a.delta - b.delta);

  return { improving, declining };
}

export function computeAllHabitRates(
  activeHabits: HabitRef[],
  logs: HabitLog[]
): HabitStrength[] {
  const totalDays = logs.length;
  if (totalDays === 0 || activeHabits.length === 0) return [];

  const habitIds = new Set(activeHabits.map((h) => h.id));
  const titleById = new Map(activeHabits.map((h) => [h.id, h.title]));

  const completedByHabit = new Map<string, number>();
  for (const log of logs) {
    for (const id of log.completedHabitIds ?? []) {
      if (habitIds.has(id)) {
        completedByHabit.set(id, (completedByHabit.get(id) ?? 0) + 1);
      }
    }
  }

  return Array.from(habitIds)
    .map((id) => {
      const daysCompleted = completedByHabit.get(id) ?? 0;
      return {
        id,
        title: titleById.get(id) ?? "",
        rate: totalDays > 0 ? (daysCompleted / totalDays) * 100 : 0,
        daysCompleted,
        totalDays,
      };
    })
    .sort((a, b) => b.rate - a.rate);
}

const MOMENTUM_DECAY = 0.9;
const MOMENTUM_DECAY_BAD = 0.75;
const MOMENTUM_GAIN = 0.1;

/**
 * Carryover momentum: momentum_today = momentum_yesterday * decay + completion * gain
 * Starts from 0 at the first day of the 90-day period (oldest), iterates forward to today.
 * - 100 requires nearly every day in the period to be very high (e.g. 90%+)
 * - Consistent good days slowly increase momentum
 * - Several bad days (completion < 30%) rapidly decrease momentum (decay = 0.75)
 * - Alternating good/bad days hover around 40–60
 */
export function computeMomentumScore(logs: HabitLog[]): number {
  if (logs.length === 0) return 0;

  let momentum = 0;
  for (const log of logs) {
    const pct = log.completionPct ?? 0;
    const completion = pct / 100;
    const decay = completion < 0.3 ? MOMENTUM_DECAY_BAD : MOMENTUM_DECAY;
    momentum = momentum * decay + pct * MOMENTUM_GAIN;
  }
  return Math.round(Math.max(0, Math.min(100, momentum)));
}

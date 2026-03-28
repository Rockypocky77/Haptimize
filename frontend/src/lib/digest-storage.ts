/**
 * Persists digest coach notes in localStorage: one AI message per period (daily = yesterday’s date,
 * weekly / monthly / yearly = their respective period keys) until the period rolls.
 */
import type { DigestWeeklyModel, DigestMonthlyModel, DigestYearlyModel } from "@/lib/digest";

const PREFIX = "haptimize_digest_snap_v1";

function storageKey(uid: string, tab: string, periodKey: string): string {
  return `${PREFIX}:${uid}:${tab}:${periodKey}`;
}

function read<T>(uid: string | null | undefined, isDemo: boolean, tab: string, periodKey: string): T | null {
  if (!uid || isDemo || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(uid, tab, periodKey));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write(uid: string, tab: string, periodKey: string, payload: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(uid, tab, periodKey), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export interface DailyDigestStored {
  periodKey: string;
  aiText: string;
  savedAt: string;
}

export function loadDailyCoachSnapshot(
  uid: string | null | undefined,
  isDemo: boolean,
  periodKey: string
): DailyDigestStored | null {
  const o = read<DailyDigestStored>(uid, isDemo, "daily", periodKey);
  if (!o || o.periodKey !== periodKey) return null;
  return o;
}

export function saveDailyCoachSnapshot(uid: string, periodKey: string, aiText: string): void {
  write(uid, "daily", periodKey, {
    periodKey,
    aiText,
    savedAt: new Date().toISOString(),
  } satisfies DailyDigestStored);
}

export type WeeklyBarPoint = { date: string; pct: number; dayShort: string };

export interface WeeklyDigestStored {
  periodKey: string;
  model: DigestWeeklyModel;
  aiText: string;
  /** Frozen 7-day series when snapshot was saved (optional for older saves). */
  barSeries?: WeeklyBarPoint[];
  savedAt: string;
}

export interface MonthlyDigestStored {
  periodKey: string;
  model: DigestMonthlyModel;
  aiText: string;
  savedAt: string;
}

export interface YearlyDigestStored {
  periodKey: string;
  model: DigestYearlyModel;
  aiText: string;
  savedAt: string;
}

export function loadWeeklySnapshot(
  uid: string | null | undefined,
  isDemo: boolean,
  periodKey: string
): WeeklyDigestStored | null {
  const o = read<WeeklyDigestStored>(uid, isDemo, "weekly", periodKey);
  if (!o || o.periodKey !== periodKey) return null;
  return o;
}

export function saveWeeklySnapshot(
  uid: string,
  periodKey: string,
  model: DigestWeeklyModel,
  aiText: string,
  barSeries?: WeeklyBarPoint[]
): void {
  write(uid, "weekly", periodKey, {
    periodKey,
    model,
    aiText,
    barSeries,
    savedAt: new Date().toISOString(),
  } satisfies WeeklyDigestStored);
}

export function loadMonthlySnapshot(
  uid: string | null | undefined,
  isDemo: boolean,
  periodKey: string
): MonthlyDigestStored | null {
  const o = read<MonthlyDigestStored>(uid, isDemo, "monthly", periodKey);
  if (!o || o.periodKey !== periodKey) return null;
  return o;
}

export function saveMonthlySnapshot(
  uid: string,
  periodKey: string,
  model: DigestMonthlyModel,
  aiText: string
): void {
  write(uid, "monthly", periodKey, {
    periodKey,
    model,
    aiText,
    savedAt: new Date().toISOString(),
  } satisfies MonthlyDigestStored);
}

export function loadYearlySnapshot(
  uid: string | null | undefined,
  isDemo: boolean,
  periodKey: string
): YearlyDigestStored | null {
  const o = read<YearlyDigestStored>(uid, isDemo, "yearly", periodKey);
  if (!o || o.periodKey !== periodKey) return null;
  return o;
}

export function saveYearlySnapshot(
  uid: string,
  periodKey: string,
  model: DigestYearlyModel,
  aiText: string
): void {
  write(uid, "yearly", periodKey, {
    periodKey,
    model,
    aiText,
    savedAt: new Date().toISOString(),
  } satisfies YearlyDigestStored);
}

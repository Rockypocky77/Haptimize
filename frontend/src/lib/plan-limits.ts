import type { PlanTier } from "@/contexts/AuthContext";

export const PLAN_LIMITS: Record<
  PlanTier,
  { habits: number; reminders: number; categories: number; aiTokensPerDay: number }
> = {
  // Free must allow >0 categories or addCategory never runs and nothing persists to Firestore
  free: { habits: 10, reminders: 20, categories: 5, aiTokensPerDay: 5_000 },
  pro: { habits: Infinity, reminders: Infinity, categories: 8, aiTokensPerDay: 30_000 },
  max: { habits: Infinity, reminders: Infinity, categories: 16, aiTokensPerDay: 100_000 },
};

export function getPlanLimits(plan: PlanTier = "free") {
  return PLAN_LIMITS[plan];
}

export function canAddHabit(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].habits;
}

export function canAddReminder(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].reminders;
}

export function getHabitsLimit(plan: PlanTier): number {
  return PLAN_LIMITS[plan].habits;
}

export function getRemindersLimit(plan: PlanTier): number {
  return PLAN_LIMITS[plan].reminders;
}

export function canAddCategory(plan: PlanTier, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].categories;
}

export function getCategoriesLimit(plan: PlanTier): number {
  return PLAN_LIMITS[plan].categories;
}

export function getAiTokensLimit(plan: PlanTier): number {
  return PLAN_LIMITS[plan].aiTokensPerDay;
}

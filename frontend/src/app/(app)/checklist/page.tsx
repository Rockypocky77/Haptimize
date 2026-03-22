"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import HabitItem from "@/components/checklist/HabitItem";
import ConsistencyChart from "@/components/checklist/ConsistencyChart";
import FadeIn from "@/components/ui/FadeIn";
import ClickSpark from "@/components/ui/ClickSpark";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "@/lib/firebase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lightbulb } from "lucide-react";
import { useDemoGuard } from "@/components/ui/DemoGate";
import { useDateChange } from "@/hooks/useDateChange";
import { getLocalDateString } from "@/lib/date";
import { canAddHabit, getHabitsLimit } from "@/lib/plan-limits";
import PlansModal from "@/components/plans/PlansModal";

const RECOMMENDED_HABITS = [
  "Drink 8 cups of water",
  "Exercise for 30 minutes",
  "Study for 30 minutes",
  "Read for 20 minutes",
  "Meditate for 10 minutes",
  "Get 7+ hours of sleep",
  "Eat a healthy meal",
  "Journal for 10 minutes",
  "Take a walk outside",
  "Practice gratitude",
];

interface Habit {
  id: string;
  title: string;
  active: boolean;
}

interface DayData {
  date: string;
  pct: number;
}

const DEMO_HABITS: Habit[] = [
  { id: "demo_1", title: "Drink 8 cups of water", active: true },
  { id: "demo_2", title: "Exercise for 30 minutes", active: true },
  { id: "demo_3", title: "Read for 20 minutes", active: true },
  { id: "demo_4", title: "Meditate for 10 minutes", active: true },
  { id: "demo_5", title: "Journal for 10 minutes", active: true },
];

const DEMO_COMPLETED = ["demo_3", "demo_5"];

const DEMO_CHART: DayData[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return { date: getLocalDateString(d).slice(5), pct: Math.round(40 + Math.random() * 50) };
});

export default function ChecklistPage() {
  const { profile, user } = useAuth();
  const { isDemo, guardAction } = useDemoGuard();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
  const [totalHabitsCount, setTotalHabitsCount] = useState(0);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const today = getLocalDateString();

  const loadData = useCallback(async () => {
    if (!profile?.uid) return;

    const today = getLocalDateString();

    if (isDemo) {
      setHabits(DEMO_HABITS);
      setCompletedIds(DEMO_COMPLETED);
      setChartData(DEMO_CHART);
      return;
    }

    try {
      const habitsCol = collection(db, "habits", profile.uid, "items");
      const [activeSnap, allSnap] = await Promise.all([
        getDocs(query(habitsCol, where("active", "==", true))),
        getDocs(habitsCol),
      ]);
      setHabits(activeSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit)));
      setTotalHabitsCount(allSnap.docs.length);

      const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
      const logSnap = await getDoc(logRef);
      setCompletedIds(logSnap.exists() ? (logSnap.data().completedHabitIds ?? []) : []);

      // All-time chart: from day before first activity to today (shifts if they didn't start on day 1)
      const logsSnap = await getDocs(collection(db, "habitLogs", profile.uid, "daily"));
      const logByDate = new Map<string, number>();
      logsSnap.docs.forEach((d) => {
        const pct = d.data().completionPct ?? 0;
        logByDate.set(d.id, pct);
      });

      const firstActivityDate = [...logByDate.entries()]
        .filter(([, pct]) => pct > 0)
        .map(([date]) => date)
        .sort()[0];
      let chartStartStr: string;
      if (firstActivityDate) {
        const dayBefore = new Date(firstActivityDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        chartStartStr = getLocalDateString(dayBefore);
      } else if (user?.metadata?.creationTime) {
        const signupDate = new Date(user.metadata.creationTime);
        const dayBefore = new Date(signupDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        chartStartStr = getLocalDateString(dayBefore);
      } else {
        chartStartStr = today;
      }

      const days: DayData[] = [];
      const cur = new Date(chartStartStr);
      while (getLocalDateString(cur) <= today) {
        const dateStr = getLocalDateString(cur);
        const pct = logByDate.get(dateStr) ?? 0;
        days.push({ date: dateStr, pct });
        cur.setDate(cur.getDate() + 1);
      }
      setChartData(days);
    } catch {
      // Firebase may not be configured
    }
  }, [profile?.uid, isDemo, user?.metadata?.creationTime]);

  useEffect(() => {
    loadData();
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadData();
    });
    return () => window.removeEventListener("focus", onFocus);
  }, [loadData]);

  useDateChange(loadData);

  const addHabit = useCallback(
    async (title: string) => {
      if (!guardAction("creating habits")) return;
      if (!profile?.uid || !title.trim()) return;
      const plan = profile?.plan ?? "free";
      if (!canAddHabit(plan, totalHabitsCount)) {
        setShowPlansModal(true);
        return;
      }
      const id = `habit_${Date.now()}`;
      const habit: Habit = { id, title: title.trim(), active: true };
      setHabits((prev) => [...prev, habit]);
      setTotalHabitsCount((c) => c + 1);
      setNewHabit("");
      try {
        const ref = doc(db, "habits", profile.uid, "items", id);
        await setDoc(ref, { title: habit.title, active: true, createdAt: serverTimestamp() });
      } catch {
        setTotalHabitsCount((c) => c - 1);
        // offline fallback — state already updated
      }
    },
    [profile?.uid, profile?.plan, totalHabitsCount, guardAction]
  );

  const toggleHabit = useCallback(
    async (id: string) => {
      if (!guardAction("tracking habits")) return;
      if (!profile?.uid) return;
      const isCompleted = completedIds.includes(id);
      const next = isCompleted
        ? completedIds.filter((x) => x !== id)
        : [...completedIds, id];
      setCompletedIds(next);
      const pct = habits.length > 0 ? Math.round((next.length / habits.length) * 100) : 0;

      // Update chart in real time for today
      setChartData((prev) =>
        prev.map((d) => (d.date === today ? { ...d, pct } : d))
      );

      try {
        const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
        await setDoc(logRef, { completedHabitIds: next, completionPct: pct }, { merge: true });
        // Streak only updates when day ends (on next load), not on each habit toggle
      } catch {
        // offline — revert state if save failed
        setCompletedIds(completedIds);
        const oldPct = habits.length > 0 ? Math.round((completedIds.length / habits.length) * 100) : 0;
        setChartData((prev) =>
          prev.map((d) => (d.date === today ? { ...d, pct: oldPct } : d))
        );
      }
    },
    [profile?.uid, completedIds, habits.length, today, guardAction]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      if (!guardAction("deleting habits")) return;
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setCompletedIds((prev) => prev.filter((x) => x !== id));
      setTotalHabitsCount((c) => Math.max(0, c - 1));
      if (!profile?.uid) return;
      try {
        await deleteDoc(doc(db, "habits", profile.uid, "items", id));
      } catch {
        // offline
      }
    },
    [profile?.uid, guardAction]
  );

  const completionPct =
    habits.length > 0
      ? Math.round((completedIds.length / habits.length) * 100)
      : 0;

  const barRef = useRef<HTMLDivElement>(null);
  const barAnimated = useRef(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el || barAnimated.current) return;
    if (completionPct === 0 && habits.length === 0) return;
    barAnimated.current = true;
    el.style.width = "0%";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "width 1s cubic-bezier(0.25, 0.1, 0.25, 1)";
        el.style.width = `${completionPct}%`;
      });
    });
  }, [completionPct, habits.length]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <FadeIn delay={0}>
        <h1 className="text-2xl font-bold text-neutral-dark">Checklist</h1>
      </FadeIn>

      {/* Consistency chart */}
      <FadeIn delay={0.1}>
      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3">
          Daily Consistency
        </h3>
        <ConsistencyChart data={chartData} />
      </Card>
      </FadeIn>

      {/* Today's progress bar */}
      <FadeIn delay={0.15}>
      <Card padding="sm">
        <div className="flex items-center gap-4 px-2">
          <span className="text-sm font-medium text-neutral-dark/60 whitespace-nowrap">
            Today: {completedIds.length}/{habits.length}
          </span>
          <div className="flex-1 h-2.5 bg-primary-light/30 rounded-full overflow-hidden">
            <div
              ref={barRef}
              className="h-full rounded-full"
              style={{
                width: `${completionPct}%`,
                backgroundColor: completionPct === 100 ? "#F2C94C" : "#7FAF8F",
                transition: "width 500ms ease, background-color 300ms ease",
              }}
            />
          </div>
          <span className="text-sm font-bold text-primary">{completionPct}%</span>
        </div>
      </Card>
      </FadeIn>

      {/* Add habit */}
      <FadeIn delay={0.2}>
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addHabit(newHabit);
          }}
          className="flex gap-3"
        >
          <Input
            placeholder={
              !canAddHabit(profile?.plan ?? "free", totalHabitsCount)
                ? `Limit reached (${getHabitsLimit(profile?.plan ?? "free")} habits on Free)`
                : "Add a new habit..."
            }
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            className="flex-1"
            disabled={!canAddHabit(profile?.plan ?? "free", totalHabitsCount)}
          />
          <Button
            type={canAddHabit(profile?.plan ?? "free", totalHabitsCount) ? "submit" : "button"}
            disabled={!newHabit.trim() && canAddHabit(profile?.plan ?? "free", totalHabitsCount)}
            size="md"
            onClick={
              !canAddHabit(profile?.plan ?? "free", totalHabitsCount)
                ? () => setShowPlansModal(true)
                : undefined
            }
          >
            <Plus size={18} />
          </Button>
        </form>

        <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
        <button
          onClick={() => setShowRecommended(!showRecommended)}
          className="flex items-center gap-2 mt-3 text-sm text-primary hover:underline cursor-pointer"
        >
          <Lightbulb size={14} />
          {showRecommended ? "Hide" : "Show"} recommended habits
        </button>
        </ClickSpark>

        {showRecommended && (
          <div className="mt-3 flex flex-wrap gap-2">
            {RECOMMENDED_HABITS.filter(
              (r) => !habits.some((h) => h.title === r)
            ).map((r) => (
              <ClickSpark key={r} sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
              <button
                onClick={() => {
                  if (!canAddHabit(profile?.plan ?? "free", totalHabitsCount)) {
                    setShowPlansModal(true);
                  } else {
                    addHabit(r);
                  }
                }}
                className="px-3 py-1.5 text-xs bg-primary-light/20 text-neutral-dark/70 rounded-lg hover:bg-primary-light/40 cursor-pointer"
                style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                + {r}
              </button>
              </ClickSpark>
            ))}
          </div>
        )}
      </Card>
      </FadeIn>

      {/* Habit list */}
      <FadeIn delay={0.3}>
      <Card>
        <div className="flex flex-col gap-1">
          {habits.length === 0 ? (
            <p className="text-sm text-neutral-dark/40 py-4 text-center">
              No habits yet. Add one above or try a recommended habit!
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {habits.map((h) => (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                >
                  <HabitItem
                    id={h.id}
                    title={h.title}
                    completed={completedIds.includes(h.id)}
                    onToggle={toggleHabit}
                    onDelete={deleteHabit}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </Card>
      </FadeIn>

      <PlansModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlan={profile?.plan ?? "free"}
      />
    </div>
  );
}

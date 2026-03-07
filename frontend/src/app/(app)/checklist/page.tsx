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
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "@/lib/firebase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lightbulb } from "lucide-react";
import { useDemoGuard } from "@/components/ui/DemoGate";
import { useDateChange } from "@/hooks/useDateChange";
import { getLocalDateString } from "@/lib/date";
import { updateStreak } from "@/lib/streak";

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
  const { profile } = useAuth();
  const { isDemo, guardAction } = useDemoGuard();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
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
      const snap = await getDocs(query(habitsCol, where("active", "==", true)));
      setHabits(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit)));

      const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
      const logSnap = await getDoc(logRef);
      setCompletedIds(logSnap.exists() ? (logSnap.data().completedHabitIds ?? []) : []);

      const allDays: { date: string; dateFull: string; pct: number; hasLog: boolean }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        const dayRef = doc(db, "habitLogs", profile.uid, "daily", dateStr);
        const daySnap = await getDoc(dayRef);
        const hasLog = daySnap.exists();
        const pct = hasLog ? (daySnap.data().completionPct ?? 0) : 0;
        allDays.push({ date: dateStr.slice(5), dateFull: dateStr, pct, hasLog });
      }
      const daysWithLogs = allDays.filter((d) => d.hasLog).length;
      const dataByDate = new Map(allDays.map((d) => [d.dateFull, d.pct]));

      let days: DayData[];

      if (daysWithLogs === 0) {
        days = [];
        for (let i = 9; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push({ date: getLocalDateString(d).slice(5), pct: 0 });
        }
      } else if (daysWithLogs < 10) {
        const firstLogEntry = allDays.find((d) => d.hasLog)!;
        const [y, m, day] = firstLogEntry.dateFull.split("-").map(Number);
        const firstLogDate = new Date(y, m - 1, day);
        const windowStart = new Date(firstLogDate);
        windowStart.setDate(windowStart.getDate() - 1);

        days = [];
        for (let i = 0; i < 10; i++) {
          const d = new Date(windowStart);
          d.setDate(d.getDate() + i);
          if (getLocalDateString(d) > today) break;
          const dateStr = getLocalDateString(d);
          const pct = dataByDate.get(dateStr) ?? 0;
          days.push({ date: dateStr.slice(5), pct });
        }
      } else {
        const viewDays = Math.min(14, daysWithLogs);
        days = allDays.slice(-viewDays).map(({ date, pct }) => ({ date, pct }));
      }
      setChartData(days);
    } catch {
      // Firebase may not be configured
    }
  }, [profile?.uid, isDemo]);

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
      const id = `habit_${Date.now()}`;
      const habit: Habit = { id, title: title.trim(), active: true };
      setHabits((prev) => [...prev, habit]);
      setNewHabit("");
      try {
        const ref = doc(db, "habits", profile.uid, "items", id);
        await setDoc(ref, { title: habit.title, active: true, createdAt: serverTimestamp() });
      } catch {
        // offline fallback — state already updated
      }
    },
    [profile?.uid]
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
      const todayShort = today.slice(5);
      setChartData((prev) =>
        prev.map((d) => (d.date === todayShort ? { ...d, pct } : d))
      );

      try {
        const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
        await setDoc(logRef, { completedHabitIds: next, completionPct: pct }, { merge: true });
        await updateStreak(profile.uid, profile?.streakThreshold ?? 80);
      } catch {
        // offline — revert state if save failed
        setCompletedIds(completedIds);
        const oldPct = habits.length > 0 ? Math.round((completedIds.length / habits.length) * 100) : 0;
        setChartData((prev) =>
          prev.map((d) => (d.date === todayShort ? { ...d, pct: oldPct } : d))
        );
      }
    },
    [profile?.uid, profile?.streakThreshold, completedIds, habits.length, today]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      if (!guardAction("deleting habits")) return;
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setCompletedIds((prev) => prev.filter((x) => x !== id));
      if (!profile?.uid) return;
      try {
        await deleteDoc(doc(db, "habits", profile.uid, "items", id));
      } catch {
        // offline
      }
    },
    [profile?.uid]
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
            placeholder="Add a new habit..."
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!newHabit.trim()} size="md">
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
                onClick={() => addHabit(r)}
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
    </div>
  );
}

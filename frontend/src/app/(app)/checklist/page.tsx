"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import HabitItem from "@/components/checklist/HabitItem";
import ConsistencyChart from "@/components/checklist/ConsistencyChart";
import AccountRequiredModal from "@/components/ui/AccountRequiredModal";
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
import { Plus, Lightbulb } from "lucide-react";

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
  { id: "d1", title: "Drink 8 cups of water", active: true },
  { id: "d2", title: "Exercise for 30 minutes", active: true },
  { id: "d3", title: "Read for 20 minutes", active: true },
  { id: "d4", title: "Meditate for 10 minutes", active: true },
  { id: "d5", title: "Journal for 10 minutes", active: true },
];

const DEMO_CHART: DayData[] = [
  { date: "02-20", pct: 100 },
  { date: "02-21", pct: 80 },
  { date: "02-22", pct: 60 },
  { date: "02-23", pct: 100 },
  { date: "02-24", pct: 40 },
  { date: "02-25", pct: 80 },
  { date: "02-26", pct: 40 },
];

export default function ChecklistPage() {
  const { profile, isDemoMode } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [newHabit, setNewHabit] = useState("");
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setHabits(DEMO_HABITS);
      setCompletedIds(["d1", "d2"]);
      setChartData(DEMO_CHART);
      return;
    }

    if (!profile?.uid) return;
    try {
      const habitsCol = collection(db, "habits", profile.uid, "items");
      const snap = await getDocs(query(habitsCol, where("active", "==", true)));
      setHabits(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Habit)));

      const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
        setCompletedIds(logSnap.data().completedHabitIds ?? []);
      }

      const days: DayData[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayRef = doc(db, "habitLogs", profile.uid, "daily", dateStr);
        const daySnap = await getDoc(dayRef);
        if (daySnap.exists()) {
          days.push({
            date: dateStr.slice(5),
            pct: daySnap.data().completionPct ?? 0,
          });
        }
      }
      setChartData(days);
    } catch {
      // Firebase may not be configured
    }
  }, [profile?.uid, today, isDemoMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function guardDemo(): boolean {
    if (isDemoMode) {
      setShowAccountModal(true);
      return true;
    }
    return false;
  }

  const addHabit = useCallback(
    async (title: string) => {
      if (isDemoMode) return;
      if (!profile?.uid || !title.trim()) return;
      const id = `habit_${Date.now()}`;
      const habit: Habit = { id, title: title.trim(), active: true };
      setHabits((prev) => [...prev, habit]);
      setNewHabit("");
      try {
        const ref = doc(db, "habits", profile.uid, "items", id);
        await setDoc(ref, { title: habit.title, active: true, createdAt: serverTimestamp() });
      } catch {
        // offline fallback
      }
    },
    [profile?.uid, isDemoMode]
  );

  const toggleHabit = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setShowAccountModal(true);
        return;
      }
      if (!profile?.uid) return;
      const isCompleted = completedIds.includes(id);
      const next = isCompleted
        ? completedIds.filter((x) => x !== id)
        : [...completedIds, id];
      setCompletedIds(next);
      const pct = habits.length > 0 ? Math.round((next.length / habits.length) * 100) : 0;

      try {
        const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
        await setDoc(logRef, { completedHabitIds: next, completionPct: pct }, { merge: true });
      } catch {
        // offline
      }
    },
    [profile?.uid, completedIds, habits.length, today, isDemoMode]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setShowAccountModal(true);
        return;
      }
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setCompletedIds((prev) => prev.filter((x) => x !== id));
      if (!profile?.uid) return;
      try {
        await deleteDoc(doc(db, "habits", profile.uid, "items", id));
      } catch {
        // offline
      }
    },
    [profile?.uid, isDemoMode]
  );

  const completionPct =
    habits.length > 0
      ? Math.round((completedIds.length / habits.length) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-dark">Checklist</h1>

      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3">
          Daily Consistency
        </h3>
        <ConsistencyChart data={chartData} />
      </Card>

      <Card padding="sm">
        <div className="flex items-center gap-4 px-2">
          <span className="text-sm font-medium text-neutral-dark/60 whitespace-nowrap">
            Today: {completedIds.length}/{habits.length}
          </span>
          <div className="flex-1 h-2.5 bg-primary-light/30 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionPct}%`,
                backgroundColor: completionPct === 100 ? "#F2C94C" : "#7FAF8F",
              }}
            />
          </div>
          <span className="text-sm font-bold text-primary">{completionPct}%</span>
        </div>
      </Card>

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (guardDemo()) return;
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

        <button
          onClick={() => setShowRecommended(!showRecommended)}
          className="flex items-center gap-2 mt-3 text-sm text-primary hover:underline cursor-pointer"
        >
          <Lightbulb size={14} />
          {showRecommended ? "Hide" : "Show"} recommended habits
        </button>

        {showRecommended && (
          <div className="mt-3 flex flex-wrap gap-2">
            {RECOMMENDED_HABITS.filter(
              (r) => !habits.some((h) => h.title === r)
            ).map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (guardDemo()) return;
                  addHabit(r);
                }}
                className="px-3 py-1.5 text-xs bg-primary-light/20 text-neutral-dark/70 rounded-lg hover:bg-primary-light/40 cursor-pointer"
              >
                + {r}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="space-y-1">
          {habits.length === 0 ? (
            <p className="text-sm text-neutral-dark/40 py-4 text-center">
              No habits yet. Add one above or try a recommended habit!
            </p>
          ) : (
            habits.map((h) => (
              <HabitItem
                key={h.id}
                id={h.id}
                title={h.title}
                completed={completedIds.includes(h.id)}
                onToggle={toggleHabit}
                onDelete={deleteHabit}
              />
            ))
          )}
        </div>
      </Card>

      <AccountRequiredModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  );
}

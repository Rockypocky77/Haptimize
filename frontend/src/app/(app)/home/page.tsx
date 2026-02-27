"use client";

import { useState, useEffect, useCallback } from "react";
import Card from "@/components/ui/Card";
import CompletionCircle from "@/components/home/CompletionCircle";
import StreakCard from "@/components/home/StreakCard";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, query, where, getDocs, doc, getDoc } from "@/lib/firebase/client";
import { CheckSquare, Bell } from "lucide-react";

interface HabitItem {
  id: string;
  title: string;
  completed: boolean;
}

interface ReminderItem {
  id: string;
  text: string;
  completed: boolean;
  reminderType: string;
}

const DEMO_HABITS: HabitItem[] = [
  { id: "d1", title: "Drink 8 cups of water", completed: true },
  { id: "d2", title: "Exercise for 30 minutes", completed: true },
  { id: "d3", title: "Read for 20 minutes", completed: false },
  { id: "d4", title: "Meditate for 10 minutes", completed: false },
  { id: "d5", title: "Journal for 10 minutes", completed: false },
];

const DEMO_REMINDERS: ReminderItem[] = [
  { id: "r1", text: "Buy groceries", completed: false, reminderType: "casual" },
  { id: "r2", text: "Call the dentist", completed: false, reminderType: "casual" },
  { id: "r3", text: "Submit project proposal", completed: false, reminderType: "casual" },
];

export default function HomePage() {
  const { profile, isDemoMode } = useAuth();
  const [completionPct, setCompletionPct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pendingHabits, setPendingHabits] = useState<HabitItem[]>([]);
  const [oldestReminders, setOldestReminders] = useState<ReminderItem[]>([]);

  const loadDashboard = useCallback(async () => {
    if (isDemoMode) {
      setCompletionPct(40);
      setStreak(5);
      setPendingHabits(DEMO_HABITS.filter((h) => !h.completed));
      setOldestReminders(DEMO_REMINDERS);
      return;
    }

    if (!profile?.uid) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
        const data = logSnap.data();
        setCompletionPct(data.completionPct ?? 0);
      }

      const statsRef = doc(db, "dailyStats", profile.uid);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        setStreak(statsSnap.data().currentStreak ?? 0);
      }

      const habitsCol = collection(db, "habits", profile.uid, "items");
      const habitsSnap = await getDocs(query(habitsCol, where("active", "==", true)));
      const todayLog = logSnap.exists() ? (logSnap.data().completedHabitIds ?? []) : [];
      const habits: HabitItem[] = habitsSnap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        completed: todayLog.includes(d.id),
      }));
      setPendingHabits(habits.filter((h) => !h.completed).slice(0, 5));

      const remCol = collection(db, "reminders", profile.uid, "casual");
      const remSnap = await getDocs(query(remCol, where("completed", "==", false)));
      const rems: ReminderItem[] = remSnap.docs.map((d) => ({
        id: d.id,
        text: d.data().text,
        completed: false,
        reminderType: "casual",
      }));
      setOldestReminders(rems.slice(0, 4));
    } catch {
      // Firebase may not be configured yet
    }
  }, [profile?.uid, isDemoMode]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const displayName = isDemoMode ? "Explorer" : (profile?.displayName ?? "there");

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-dark">
          Welcome back, {displayName}!
        </h1>
        <p className="text-sm text-neutral-dark/50 mt-1">
          Here&apos;s how your day is going.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center py-8">
          <CompletionCircle percentage={completionPct} />
          <p className="text-sm text-neutral-dark/60 mt-4">
            Today&apos;s habits
          </p>
        </Card>
        <div className="space-y-4">
          <StreakCard
            streak={streak}
            threshold={profile?.streakThreshold ?? 80}
          />
          <Card>
            <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
              <Bell size={16} />
              Oldest Reminders
            </h3>
            {oldestReminders.length === 0 ? (
              <p className="text-sm text-neutral-dark/40">
                No pending reminders
              </p>
            ) : (
              <ul className="space-y-2">
                {oldestReminders.map((r) => (
                  <li
                    key={r.id}
                    className="text-sm text-neutral-dark/70 flex items-start gap-2"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
          <CheckSquare size={16} />
          Habits to Complete
        </h3>
        {pendingHabits.length === 0 ? (
          <p className="text-sm text-neutral-dark/40 py-4 text-center">
            All done for today — or add habits in the Checklist page!
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingHabits.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 text-sm text-neutral-dark/70 py-1.5 px-3 rounded-lg bg-neutral-light/60"
              >
                <div className="w-5 h-5 rounded border-2 border-primary-light/50 flex-shrink-0" />
                {h.title}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

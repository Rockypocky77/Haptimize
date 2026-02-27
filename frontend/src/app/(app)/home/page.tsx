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

export default function HomePage() {
  const { profile } = useAuth();
  const [completionPct, setCompletionPct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pendingHabits, setPendingHabits] = useState<HabitItem[]>([]);
  const [oldestReminders, setOldestReminders] = useState<ReminderItem[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!profile?.uid) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Load today's habit log
      const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
      const logSnap = await getDoc(logRef);
      if (logSnap.exists()) {
        const data = logSnap.data();
        setCompletionPct(data.completionPct ?? 0);
      }

      // Load streak from dailyStats
      const statsRef = doc(db, "dailyStats", profile.uid);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        setStreak(statsSnap.data().currentStreak ?? 0);
      }

      // Load habits for today
      const habitsCol = collection(db, "habits", profile.uid, "items");
      const habitsSnap = await getDocs(query(habitsCol, where("active", "==", true)));
      const todayLog = logSnap.exists() ? (logSnap.data().completedHabitIds ?? []) : [];
      const habits: HabitItem[] = habitsSnap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        completed: todayLog.includes(d.id),
      }));
      setPendingHabits(habits.filter((h) => !h.completed).slice(0, 5));

      // Load oldest casual reminders
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
      // Firebase may not be configured yet — show empty state
    }
  }, [profile?.uid]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-dark">
          Welcome back, {profile?.displayName ?? "there"}!
        </h1>
        <p className="text-sm text-neutral-dark/50 mt-1">
          Here&apos;s how your day is going.
        </p>
      </div>

      {/* Top row: completion circle + streak */}
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

      {/* Pending habits */}
      <Card>
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
          <CheckSquare size={16} />
          Habits to Complete
        </h3>
        {pendingHabits.length === 0 ? (
          <p className="text-sm text-neutral-dark/40">
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

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import CompletionCircle from "@/components/home/CompletionCircle";
import StreakCard from "@/components/home/StreakCard";
import FadeIn from "@/components/ui/FadeIn";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/client";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { CheckSquare, Bell, ChevronRight, Check } from "lucide-react";
import { useDemoGuard } from "@/components/ui/DemoGate";
import ClickSpark from "@/components/ui/ClickSpark";
import { useDateChange } from "@/hooks/useDateChange";
import { getLocalDateString } from "@/lib/date";
import { updateStreak } from "@/lib/streak";


interface HabitItem {
  id: string;
  title: string;
  completed: boolean;
}

interface ReminderItem {
  id: string;
  text: string;
  reminderType: string;
  date?: string;
}

const ITEMS_VISIBLE = 5;
const ITEM_HEIGHT = 40;

const DEMO_HABITS: HabitItem[] = [
  { id: "demo_1", title: "Drink 8 cups of water", completed: false },
  { id: "demo_2", title: "Exercise for 30 minutes", completed: false },
  { id: "demo_3", title: "Read for 20 minutes", completed: true },
  { id: "demo_4", title: "Meditate for 10 minutes", completed: false },
  { id: "demo_5", title: "Journal for 10 minutes", completed: true },
];

const DEMO_REMINDERS: ReminderItem[] = [
  { id: "demo_r1", text: "Buy groceries", reminderType: "casual" },
  { id: "demo_r2", text: "Call dentist for appointment", reminderType: "casual" },
  { id: "demo_r3", text: "Submit project report", reminderType: "dated", date: "2026-03-01" },
  { id: "demo_r4", text: "Pick up dry cleaning", reminderType: "casual" },
];

export default function HomePage() {
  const { user, profile } = useAuth();
  const { isDemo, guardAction } = useDemoGuard();
  const [completionPct, setCompletionPct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pendingHabits, setPendingHabits] = useState<HabitItem[]>([]);
  const [allHabits, setAllHabits] = useState<HabitItem[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [totalHabitsCount, setTotalHabitsCount] = useState(0);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dateRefresh, setDateRefresh] = useState(0);

  useEffect(() => {
    if (!profile?.uid) return;

    if (isDemo) {
      const demoCompleted = DEMO_HABITS.filter((h) => h.completed).map((h) => h.id);
      setAllHabits(DEMO_HABITS);
      setCompletedIds(demoCompleted);
      setTotalHabitsCount(DEMO_HABITS.length);
      setPendingHabits(DEMO_HABITS.filter((h) => !h.completed));
      setCompletionPct(Math.round((demoCompleted.length / DEMO_HABITS.length) * 100));
      setReminders(DEMO_REMINDERS);
      setStreak(7);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    async function load() {
      const uid = profile!.uid;
      const today = getLocalDateString();

      try {
        const habitsSnap = await getDocs(collection(db, "habits", uid, "items"));
        let logCompletedIds: string[] = [];
        try {
          const logSnap = await getDoc(doc(db, "habitLogs", uid, "daily", today));
          if (logSnap.exists()) {
            logCompletedIds = logSnap.data().completedHabitIds ?? [];
            if (!cancelled) setCompletionPct(logSnap.data().completionPct ?? 0);
          } else if (!cancelled) {
            setCompletionPct(0);
          }
        } catch { /* no log yet */ }

        const allH: HabitItem[] = [];
        habitsSnap.forEach((d) => {
          const data = d.data();
          if (data.active !== false) {
            allH.push({ id: d.id, title: data.title ?? "Untitled", completed: logCompletedIds.includes(d.id) });
          }
        });
        if (!cancelled) {
          setTotalHabitsCount(allH.length);
          setAllHabits(allH);
          setCompletedIds(logCompletedIds);
          setPendingHabits(allH.filter((h) => !h.completed));
        }
      } catch (err) { console.error("Home: habits load failed:", err); }

      try {
        const allR: ReminderItem[] = [];
        const casualSnap = await getDocs(collection(db, "reminders", uid, "casual"));
        casualSnap.forEach((d) => { const data = d.data(); if (data.completed !== true) allR.push({ id: d.id, text: data.text ?? "", reminderType: "casual" }); });
        const datedSnap = await getDocs(collection(db, "reminders", uid, "dated"));
        datedSnap.forEach((d) => { const data = d.data(); if (data.completed !== true) allR.push({ id: d.id, text: data.text ?? "", reminderType: "dated", date: data.date }); });
        allR.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        if (!cancelled) setReminders(allR);
      } catch (err) { console.error("Home: reminders load failed:", err); }

      try {
        const newStreak = await updateStreak(uid, profile?.streakThreshold ?? 80);
        if (!cancelled) setStreak(newStreak);
      } catch { /* no stats yet */ }

      if (!cancelled) setLoaded(true);
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [profile?.uid, isDemo, dateRefresh]);

  const handleDateChange = useCallback(() => setDateRefresh((r) => r + 1), []);
  useDateChange(handleDateChange);

  const today = getLocalDateString();

  const toggleHabit = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!guardAction("tracking habits")) return;
      if (!profile?.uid) return;
      const isCompleted = completedIds.includes(id);
      const next = isCompleted
        ? completedIds.filter((x) => x !== id)
        : [...completedIds, id];
      setCompletedIds(next);
      setPendingHabits((prev) =>
        isCompleted ? [...prev, { id, title: allHabits.find((h) => h.id === id)?.title ?? "", completed: false }] : prev.filter((h) => h.id !== id)
      );
      const pct = totalHabitsCount > 0 ? Math.round((next.length / totalHabitsCount) * 100) : 0;
      setCompletionPct(pct);
      try {
        const logRef = doc(db, "habitLogs", profile.uid, "daily", today);
        await setDoc(logRef, { completedHabitIds: next, completionPct: pct }, { merge: true });
        const newStreak = await updateStreak(profile.uid, profile?.streakThreshold ?? 80);
        setStreak(newStreak);
      } catch {
        // offline
      }
    },
    [profile?.uid, profile?.streakThreshold, completedIds, allHabits, totalHabitsCount, today]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome */}
      <FadeIn delay={0}>
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">
            Welcome back, {profile?.displayName ?? "there"}!
          </h1>
          <p className="text-sm text-neutral-dark/50 mt-1">
            Here&apos;s how your day is going.
          </p>
        </div>
      </FadeIn>

      {/* Top row: completion circle + streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FadeIn delay={0.1}>
        <Card className="flex flex-col items-center justify-center py-8">
          <CompletionCircle percentage={completionPct} />
          <p className="text-sm text-neutral-dark/60 mt-4">
            Today&apos;s habits
          </p>
        </Card>
        </FadeIn>
        <div className="space-y-4">
          <FadeIn delay={0.2}>
          <StreakCard
            streak={streak}
            threshold={profile?.streakThreshold ?? 80}
          />
          </FadeIn>
          <FadeIn delay={0.3}>
          <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
          <Link href="/reminders" className="block">
          <Card className="cursor-pointer">
            <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
              <Bell size={16} />
              Reminders
            </h3>
            {reminders.length === 0 ? (
              <p className="text-sm text-neutral-dark/40">
                {loaded ? "No pending reminders" : "Loading..."}
              </p>
            ) : (
              <div className="relative">
                <div
                  className="relative overflow-hidden"
                  style={{ maxHeight: ITEMS_VISIBLE * ITEM_HEIGHT + 24 }}
                >
                  <ul className="space-y-2">
                    {reminders.slice(0, 6).map((r) => (
                      <li
                        key={r.id}
                        className="text-sm text-neutral-dark/70 flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg transition-colors duration-200 hover:bg-neutral-light/50"
                      >
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        {r.text}
                      </li>
                    ))}
                  </ul>
                  {reminders.length > ITEMS_VISIBLE && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                      style={{
                        background: "linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(255,255,255,0.5) 75%, white 100%)",
                        backdropFilter: "blur(1px)",
                        WebkitBackdropFilter: "blur(1px)",
                      }}
                    />
                  )}
                </div>
                {reminders.length > ITEMS_VISIBLE && (
                  <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
                  <Link
                    href="/reminders"
                    className="mt-2 flex items-center gap-1 text-sm text-primary font-medium hover:underline transition-all duration-200 hover:gap-2"
                  >
                    View more ({reminders.length})
                    <ChevronRight size={14} />
                  </Link>
                  </ClickSpark>
                )}
              </div>
            )}
          </Card>
          </Link>
          </ClickSpark>
          </FadeIn>
        </div>
      </div>

      {/* Habits to complete */}
      <FadeIn delay={0.4}>
      <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
      <Link href="/checklist" className="block">
      <Card className="cursor-pointer">
        <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
          <CheckSquare size={16} />
          Habits to Complete
        </h3>
        {pendingHabits.length === 0 ? (
          <p className="text-sm text-neutral-dark/40">
            {!loaded
              ? "Loading..."
              : totalHabitsCount > 0
                ? "Completed all tasks today — good job!"
                : "Add habits in the Checklist page to get started."}
          </p>
        ) : (
          <div className="relative">
            <div
              className="relative overflow-hidden"
              style={{ maxHeight: ITEMS_VISIBLE * ITEM_HEIGHT + 24 }}
            >
              <ul className="space-y-2">
                {pendingHabits.slice(0, 6).map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-3 text-sm text-neutral-dark/70 py-1.5 px-3 rounded-lg bg-neutral-light/60 transition-all duration-200 hover:bg-neutral-light"
                  >
                    <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
                    <button
                      type="button"
                      onClick={(e) => toggleHabit(h.id, e)}
                      className="w-5 h-5 rounded border-2 border-primary-light/60 hover:border-primary hover:scale-110 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200"
                    >
                      <Check size={12} strokeWidth={3} className="opacity-0" />
                    </button>
                    </ClickSpark>
                    {h.title}
                  </li>
                ))}
              </ul>
              {pendingHabits.length > ITEMS_VISIBLE && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                  style={{
                    background: "linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(255,255,255,0.5) 75%, white 100%)",
                    backdropFilter: "blur(1px)",
                    WebkitBackdropFilter: "blur(1px)",
                  }}
                />
              )}
            </div>
            {pendingHabits.length > ITEMS_VISIBLE && (
              <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
              <Link
                href="/checklist"
                className="mt-2 flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                View more ({pendingHabits.length})
                <ChevronRight size={14} />
              </Link>
              </ClickSpark>
            )}
          </div>
        )}
      </Card>
      </Link>
      </ClickSpark>
      </FadeIn>
    </div>
  );
}

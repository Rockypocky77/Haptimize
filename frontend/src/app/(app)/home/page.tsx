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
import { motion, AnimatePresence } from "framer-motion";
import AnalyticsWidget from "@/components/home/AnalyticsWidget";
import DigestWidget from "@/components/home/DigestWidget";
import { type HabitLog } from "@/lib/analytics";
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

function generateDemoHabitLogs(): HabitLog[] {
  const ids = DEMO_HABITS.map((h) => h.id);
  const logs: HabitLog[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayIndex = 29 - i;
    const isEarly = dayIndex < 15;

    const completed: string[] = [];
    ids.forEach((id, idx) => {
      let p: number;
      if (idx === 0) {
        p = isEarly ? 0.3 : 0.75;
      } else if (idx === 1) {
        p = isEarly ? 0.85 : 0.4;
      } else {
        p = 0.4 + Math.random() * 0.4;
      }
      if (Math.random() < p) completed.push(id);
    });

    const pct = Math.round((completed.length / ids.length) * 100);
    logs.push({ date: dateStr, completedHabitIds: completed, completionPct: pct });
  }
  return logs;
}

export default function HomePage() {
  const { profile, user } = useAuth();
  const { isDemo, guardAction } = useDemoGuard();
  const [completionPct, setCompletionPct] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pendingHabits, setPendingHabits] = useState<HabitItem[]>([]);
  const [allHabits, setAllHabits] = useState<HabitItem[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [totalHabitsCount, setTotalHabitsCount] = useState(0);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
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
      const demoLogs = generateDemoHabitLogs();
      setHabitLogs(demoLogs);
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
      } catch (err) {
        // #region agent log
        if (typeof fetch === "function") {
          fetch("http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
            body: JSON.stringify({
              sessionId: "24f9f6",
              location: "HomePage:habits:catch",
              message: "Habits load failed",
              data: { error: String(err) },
              hypothesisId: "H4",
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
        console.error("Home: habits load failed:", err);
      }

      try {
        const allR: ReminderItem[] = [];
        const casualSnap = await getDocs(collection(db, "reminders", uid, "casual"));
        casualSnap.forEach((d) => { const data = d.data(); if (data.completed !== true) allR.push({ id: d.id, text: data.text ?? "", reminderType: "casual" }); });
        const datedSnap = await getDocs(collection(db, "reminders", uid, "dated"));
        datedSnap.forEach((d) => { const data = d.data(); if (data.completed !== true) allR.push({ id: d.id, text: data.text ?? "", reminderType: "dated", date: data.date }); });
        allR.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        if (!cancelled) setReminders(allR);
      } catch (err) {
        // #region agent log
        if (typeof fetch === "function") {
          fetch("http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
            body: JSON.stringify({
              sessionId: "24f9f6",
              location: "HomePage:reminders:catch",
              message: "Reminders load failed",
              data: { error: String(err) },
              hypothesisId: "H4",
              timestamp: Date.now(),
            }),
          }).catch(() => {});
        }
        // #endregion
        console.error("Home: reminders load failed:", err);
      }

      try {
        const newStreak = await updateStreak(uid, profile?.streakThreshold ?? 80);
        if (!cancelled) setStreak(newStreak);
      } catch { /* no stats yet */ }

      try {
        const logsSnap = await getDocs(collection(db, "habitLogs", uid, "daily"));
        const logs: HabitLog[] = logsSnap.docs.map((d) => {
          const data = d.data();
          return {
            date: d.id,
            completedHabitIds: data.completedHabitIds ?? [],
            completionPct: data.completionPct ?? 0,
          };
        });
        if (!cancelled) setHabitLogs(logs);
      } catch { /* no logs yet */ }

      if (!cancelled) setLoaded(true);
    }

    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [profile, isDemo, dateRefresh]);

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
        // Streak only updates when day ends (on next load), not on each habit toggle
      } catch {
        // offline
      }
    },
    [profile?.uid, completedIds, allHabits, totalHabitsCount, today, guardAction]
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

      {/* Top row: completion circle + streak/reminders/habits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <FadeIn delay={0.1}>
            <AnimatePresence mode="wait">
              {!loaded ? (
                <motion.div key="circle-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card className="flex flex-col items-center justify-center py-8">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="w-[200px] h-[200px] rounded-full border-[12px] border-neutral-dark/8" />
                      <div className="h-4 w-24 bg-neutral-dark/8 rounded mt-4" />
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="circle-content"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <Card className="flex flex-col items-center justify-center py-8">
                    <CompletionCircle percentage={completionPct} size={200} />
                    <p className="text-sm text-neutral-dark/60 mt-4">
                      Today&apos;s habits
                    </p>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </FadeIn>
          <FadeIn delay={0.5}>
            <AnalyticsWidget
              activeHabits={allHabits.map((h) => ({ id: h.id, title: h.title }))}
              habitLogs={habitLogs}
              loaded={loaded}
              isDemo={isDemo}
              todayCompletionPct={completionPct}
              plan={profile?.plan ?? "free"}
            />
          </FadeIn>
        </div>
        <div className="space-y-4">
          <FadeIn delay={0.2}>
            <AnimatePresence mode="wait">
              {!loaded ? (
                <motion.div key="streak-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card className="flex items-center gap-4">
                    <div className="animate-pulse flex items-center gap-4 w-full">
                      <div className="w-12 h-12 rounded-xl bg-neutral-dark/8" />
                      <div className="space-y-2 flex-1">
                        <div className="h-6 w-16 bg-neutral-dark/10 rounded" />
                        <div className="h-3 w-32 bg-neutral-dark/8 rounded" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="streak-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <StreakCard
                    streak={streak}
                    threshold={profile?.streakThreshold ?? 80}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </FadeIn>
          <FadeIn delay={0.25}>
            <DigestWidget
              activeHabits={allHabits.map((h) => ({ id: h.id, title: h.title }))}
              habitLogs={habitLogs}
              loaded={loaded}
              isDemo={isDemo}
              plan={profile?.plan ?? "free"}
              streakThreshold={profile?.streakThreshold ?? 80}
              signupAt={
                user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime)
                  : null
              }
              userId={profile?.uid}
              aiEnabled={profile?.aiEnabled !== false}
            />
          </FadeIn>
          <FadeIn delay={0.3}>
            <AnimatePresence mode="wait">
              {!loaded ? (
                <motion.div key="reminders-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card>
                    <div className="animate-pulse">
                      <div className="h-4 w-24 bg-neutral-dark/10 rounded mb-3" />
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-neutral-dark/10" /><div className="h-3.5 w-full bg-neutral-dark/8 rounded" /></div>
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-neutral-dark/10" /><div className="h-3.5 w-4/5 bg-neutral-dark/8 rounded" /></div>
                        <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-neutral-dark/10" /><div className="h-3.5 w-3/5 bg-neutral-dark/8 rounded" /></div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="reminders-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
                  <Link href="/reminders" className="block">
                  <Card className="cursor-pointer">
                    <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
                      <Bell size={16} />
                      Reminders
                    </h3>
                    {reminders.length === 0 ? (
                      <p className="text-sm text-neutral-dark/40">No pending reminders</p>
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
                            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none fade-overlay-bottom" />
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
                </motion.div>
              )}
            </AnimatePresence>
          </FadeIn>
          <FadeIn delay={0.4}>
            <AnimatePresence mode="wait">
              {!loaded ? (
                <motion.div key="habits-skeleton" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card>
                    <div className="animate-pulse">
                      <div className="h-4 w-32 bg-neutral-dark/10 rounded mb-3" />
                      <div className="space-y-2">
                        <div className="h-9 w-full bg-neutral-dark/6 rounded-lg" />
                        <div className="h-9 w-full bg-neutral-dark/6 rounded-lg" />
                        <div className="h-9 w-full bg-neutral-dark/6 rounded-lg" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="habits-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="block">
                  <Link href="/checklist" className="block">
                  <Card className="cursor-pointer">
                    <h3 className="text-sm font-semibold text-neutral-dark/70 mb-3 flex items-center gap-2">
                      <CheckSquare size={16} />
                      Habits to Complete
                    </h3>
                    {pendingHabits.length === 0 ? (
                      <p className="text-sm text-neutral-dark/40">
                        {totalHabitsCount > 0
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
                            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none fade-overlay-bottom" />
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
                </motion.div>
              )}
            </AnimatePresence>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

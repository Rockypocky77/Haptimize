"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "@/lib/firebase/client";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Undo2,
  CalendarDays,
} from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Reminder {
  id: string;
  text: string;
  date: string;
  completed: boolean;
}

interface DayStats {
  completionPct: number;
}

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}

function getFirstDayOfWeek(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarGrid() {
  const { profile } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dayStats, setDayStats] = useState<Record<string, DayStats>>({});
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");

  const today = useMemo(() => {
    const n = new Date();
    return formatDate(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const loadData = useCallback(async () => {
    if (!profile?.uid) return;
    try {
      const datedCol = collection(db, "reminders", profile.uid, "dated");
      const snap = await getDocs(datedCol);
      setReminders(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Reminder))
      );

      const stats: Record<string, DayStats> = {};
      const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = formatDate(viewMonth.year, viewMonth.month, i);
        const logRef = doc(db, "habitLogs", profile.uid, "daily", dateStr);
        const logSnap = await getDoc(logRef);
        if (logSnap.exists()) {
          stats[dateStr] = { completionPct: logSnap.data().completionPct ?? 0 };
        }
      }
      setDayStats(stats);
    } catch {
      // Firebase not configured
    }
  }, [profile?.uid, viewMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleReminder = useCallback(
    async (id: string) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
      );
      if (!profile?.uid) return;
      const rem = reminders.find((r) => r.id === id);
      if (!rem) return;
      try {
        const ref = doc(db, "reminders", profile.uid, "dated", id);
        await updateDoc(ref, { completed: !rem.completed });
      } catch {
        // offline
      }
    },
    [profile?.uid, reminders]
  );

  const saveEdit = useCallback(
    async (id: string) => {
      if (!profile?.uid) return;
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, text: editText || r.text, date: editDate || r.date }
            : r
        )
      );
      setEditingId(null);
      try {
        const ref = doc(db, "reminders", profile.uid, "dated", id);
        const updates: Record<string, string> = {};
        if (editText) updates.text = editText;
        if (editDate) updates.date = editDate;
        if (Object.keys(updates).length > 0) await updateDoc(ref, updates);
      } catch {
        // offline
      }
    },
    [profile?.uid, editText, editDate]
  );

  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const firstDay = getFirstDayOfWeek(viewMonth.year, viewMonth.month);

  const remindersByDate = useMemo(() => {
    const grouped: Record<string, Reminder[]> = {};
    reminders.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    return grouped;
  }, [reminders]);

  function prevMonth() {
    setViewMonth((p) =>
      p.month === 0
        ? { year: p.year - 1, month: 11 }
        : { year: p.year, month: p.month - 1 }
    );
  }

  function nextMonth() {
    setViewMonth((p) =>
      p.month === 11
        ? { year: p.year + 1, month: 0 }
        : { year: p.year, month: p.month + 1 }
    );
  }

  // Compute per-date fill using reminders
  function getDateFill(dateStr: string) {
    const rems = remindersByDate[dateStr] ?? [];
    const stats = dayStats[dateStr];
    const habitPct = stats?.completionPct ?? 0;
    if (rems.length === 0) return habitPct;
    const remPct = (rems.filter((r) => r.completed).length / rems.length) * 100;
    return Math.round((habitPct + remPct) / 2);
  }

  const isPast = (dateStr: string) => dateStr < today;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-white text-neutral-dark/50 cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-lg font-semibold text-neutral-dark">
          {MONTHS[viewMonth.month]} {viewMonth.year}
        </span>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-white text-neutral-dark/50 cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-neutral-dark/40 py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = formatDate(viewMonth.year, viewMonth.month, day);
          const fillPct = getDateFill(dateStr);
          const isToday = dateStr === today;
          const rems = remindersByDate[dateStr] ?? [];
          const isHovered = hoveredDate === dateStr;

          return (
            <div
              key={dateStr}
              className="relative"
              onMouseEnter={() => setHoveredDate(dateStr)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <div
                className={`
                  relative flex rounded-xl p-2 min-h-[72px] cursor-pointer
                  border transition-colors
                  ${isToday ? "border-primary" : "border-transparent"}
                  ${isHovered ? "bg-white shadow-sm" : "bg-white/60"}
                `}
              >
                {/* Fill bar on left */}
                <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary-light/30 overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full rounded-full transition-all duration-500"
                    style={{
                      height: `${fillPct}%`,
                      backgroundColor:
                        fillPct === 100 ? "#F2C94C" : "#7FAF8F",
                    }}
                  />
                </div>

                <div className="ml-2.5 flex-1">
                  <span
                    className={`text-xs font-medium ${
                      isToday ? "text-primary" : "text-neutral-dark/60"
                    }`}
                  >
                    {day}
                  </span>
                  {rems.length > 0 && (
                    <div className="mt-1 flex gap-0.5">
                      {rems.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.completed ? "bg-primary" : "bg-accent"
                          }`}
                        />
                      ))}
                      {rems.length > 3 && (
                        <span className="text-[9px] text-neutral-dark/40 ml-0.5">
                          +{rems.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hover popup */}
              {isHovered && (
                <div className="absolute z-30 top-full mt-1 left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-xl border border-primary-light/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-neutral-dark">
                      {MONTHS[viewMonth.month]} {day}
                    </span>
                    {isPast(dateStr) && (
                      <span className="text-xs text-primary font-medium">
                        {fillPct}% done
                      </span>
                    )}
                  </div>

                  {rems.length === 0 ? (
                    <p className="text-xs text-neutral-dark/40">
                      {isPast(dateStr)
                        ? "No tasks recorded"
                        : "No reminders set"}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {rems.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center gap-2 text-xs group"
                        >
                          {editingId === r.id ? (
                            <div className="flex-1 space-y-1">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="text-xs py-1"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingId(r.id);
                                    setEditDate(r.date);
                                  }}
                                  className="text-neutral-dark/40 hover:text-primary cursor-pointer"
                                >
                                  <CalendarDays size={12} />
                                </button>
                                <Input
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="text-xs py-1 w-28"
                                />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveEdit(r.id)}
                                  className="text-xs py-0.5 px-2"
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingId(null)}
                                  className="text-xs py-0.5 px-2"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => toggleReminder(r.id)}
                                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                                  r.completed
                                    ? "bg-primary border-primary text-white"
                                    : "border-primary-light/60"
                                }`}
                              >
                                {r.completed && (
                                  <Check size={10} strokeWidth={3} />
                                )}
                              </button>
                              <span
                                onClick={() => {
                                  setEditingId(r.id);
                                  setEditText(r.text);
                                  setEditDate(r.date);
                                }}
                                className={`flex-1 cursor-pointer hover:text-primary ${
                                  r.completed
                                    ? "line-through text-neutral-dark/40"
                                    : "text-neutral-dark/70"
                                }`}
                              >
                                {r.text}
                              </span>
                              {r.completed && (
                                <button
                                  onClick={() => toggleReminder(r.id)}
                                  className="text-neutral-dark/30 hover:text-primary cursor-pointer"
                                >
                                  <Undo2 size={12} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

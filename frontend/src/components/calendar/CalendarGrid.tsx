"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "@/lib/firebase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import AccountRequiredModal from "@/components/ui/AccountRequiredModal";
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

const DEMO_REMINDERS: Reminder[] = [
  { id: "cr1", text: "Team standup", date: formatDate(new Date().getFullYear(), new Date().getMonth(), 10), completed: true },
  { id: "cr2", text: "Gym session", date: formatDate(new Date().getFullYear(), new Date().getMonth(), 10), completed: false },
  { id: "cr3", text: "Submit assignment", date: formatDate(new Date().getFullYear(), new Date().getMonth(), 18), completed: false },
  { id: "cr4", text: "Doctor appointment", date: formatDate(new Date().getFullYear(), new Date().getMonth(), 25), completed: false },
];

export default function CalendarGrid() {
  const { profile, isDemoMode } = useAuth();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dayStats, setDayStats] = useState<Record<string, DayStats>>({});
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [showAccountModal, setShowAccountModal] = useState(false);

  const today = useMemo(() => {
    const n = new Date();
    return formatDate(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setReminders(DEMO_REMINDERS);
      const demoStats: Record<string, DayStats> = {};
      for (let i = 1; i <= 28; i++) {
        const dateStr = formatDate(new Date().getFullYear(), new Date().getMonth(), i);
        if (dateStr <= today && Math.random() > 0.4) {
          demoStats[dateStr] = { completionPct: Math.round(Math.random() * 60 + 40) };
        }
      }
      setDayStats(demoStats);
      return;
    }

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
  }, [profile?.uid, viewMonth, isDemoMode, today]);

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

  const toggleReminder = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setShowAccountModal(true);
        return;
      }
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
    [profile?.uid, reminders, isDemoMode]
  );

  const saveEdit = useCallback(
    async (id: string) => {
      if (isDemoMode) {
        setShowAccountModal(true);
        return;
      }
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
    [profile?.uid, editText, editDate, isDemoMode]
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

  function getDateFill(dateStr: string) {
    const rems = remindersByDate[dateStr] ?? [];
    const stats = dayStats[dateStr];
    const habitPct = stats?.completionPct ?? 0;
    if (rems.length === 0) return habitPct;
    const remPct = (rems.filter((r) => r.completed).length / rems.length) * 100;
    return Math.round((habitPct + remPct) / 2);
  }

  const isPast = (dateStr: string) => dateStr < today;

  const showPopup = useCallback((dateStr: string) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoveredDate(dateStr);
  }, []);

  const hidePopup = useCallback((delay = 0) => {
    if (delay > 0) {
      hideTimeoutRef.current = setTimeout(() => {
        hideTimeoutRef.current = null;
        setHoveredDate(null);
      }, delay);
    } else {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setHoveredDate(null);
    }
  }, []);

  useEffect(() => () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  }, []);

  return (
    <div className="space-y-4">
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
              onMouseEnter={() => showPopup(dateStr)}
              onMouseLeave={() => hidePopup(120)}
            >
              <div
                className={`
                  relative flex rounded-xl p-2 min-h-[72px] cursor-pointer
                  border transition-colors
                  ${isToday ? "border-primary" : "border-transparent"}
                  ${isHovered ? "bg-white shadow-sm" : "bg-white/60"}
                `}
              >
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

              {isHovered && (
                <div
                  className="absolute z-30 top-full mt-1 left-1/2 -translate-x-1/2 w-64 bg-white rounded-2xl shadow-xl border border-primary-light/30 p-4"
                  onMouseEnter={() => showPopup(dateStr)}
                  onMouseLeave={() => hidePopup(0)}
                >
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
                                onClick={() => {
                                  if (guardDemo()) return;
                                  toggleReminder(r.id);
                                }}
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
                                  if (guardDemo()) return;
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
                                  onClick={() => {
                                    if (guardDemo()) return;
                                    toggleReminder(r.id);
                                  }}
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

      <AccountRequiredModal
        open={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  );
}

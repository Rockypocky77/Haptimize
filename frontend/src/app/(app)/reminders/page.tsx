"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ReminderCard from "@/components/reminders/ReminderCard";
import DraggableReminder from "@/components/reminders/DraggableReminder";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "@/lib/firebase/client";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface Reminder {
  id: string;
  text: string;
  reminderType: "casual" | "dated";
  date?: string;
  completed: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const dayName = DAYS_SHORT[d.getDay()];
  return `${dayName} ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function RemindersPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<"casual" | "dated">("casual");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadReminders = useCallback(async () => {
    if (!profile?.uid) return;
    try {
      const casualCol = collection(db, "reminders", profile.uid, "casual");
      const casualSnap = await getDocs(casualCol);
      const casual: Reminder[] = casualSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        reminderType: "casual",
      })) as Reminder[];

      const datedCol = collection(db, "reminders", profile.uid, "dated");
      const datedSnap = await getDocs(datedCol);
      const dated: Reminder[] = datedSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        reminderType: "dated",
      })) as Reminder[];

      setReminders([...casual, ...dated]);
    } catch {
      // Firebase not configured
    }
  }, [profile?.uid]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const addReminder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile?.uid || !newText.trim()) return;
      const id = `rem_${Date.now()}`;
      const reminder: Reminder = {
        id,
        text: newText.trim(),
        reminderType: tab,
        date: tab === "dated" ? newDate || undefined : undefined,
        completed: false,
      };
      setReminders((prev) => [...prev, reminder]);
      setNewText("");
      setNewDate("");
      try {
        const subCol = tab === "casual" ? "casual" : "dated";
        const ref = doc(db, "reminders", profile.uid, subCol, id);
        await setDoc(ref, {
          text: reminder.text,
          date: reminder.date ?? null,
          completed: false,
          createdAt: serverTimestamp(),
        });
      } catch {
        // offline
      }
    },
    [profile?.uid, tab, newText, newDate]
  );

  const toggleReminder = useCallback(
    async (id: string) => {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
      );
      if (!profile?.uid) return;
      const rem = reminders.find((r) => r.id === id);
      if (!rem) return;
      try {
        const subCol = rem.reminderType === "casual" ? "casual" : "dated";
        const ref = doc(db, "reminders", profile.uid, subCol, id);
        await updateDoc(ref, { completed: !rem.completed });
      } catch {
        // offline
      }
    },
    [profile?.uid, reminders]
  );

  const moveReminderToDate = useCallback(
    async (reminderId: string, newDateStr: string) => {
      setReminders((prev) =>
        prev.map((r) =>
          r.id === reminderId ? { ...r, date: newDateStr } : r
        )
      );
      if (!profile?.uid) return;
      try {
        const ref = doc(db, "reminders", profile.uid, "dated", reminderId);
        await updateDoc(ref, { date: newDateStr });
      } catch {
        // offline
      }
    },
    [profile?.uid]
  );

  const casualReminders = reminders.filter((r) => r.reminderType === "casual");
  const datedReminders = reminders.filter((r) => r.reminderType === "dated");

  // Group dated reminders by date for the current month
  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const datedByDate = useMemo(() => {
    const grouped: Record<string, Reminder[]> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(viewMonth.year, viewMonth.month, d);
      grouped[dateStr] = datedReminders.filter((r) => r.date === dateStr);
    }
    return grouped;
  }, [datedReminders, viewMonth, daysInMonth]);

  const nonEmptyDates = Object.entries(datedByDate).filter(
    ([, rems]) => rems.length > 0
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const remId = active.id as string;
    const overStr = over.id as string;

    // If dropped onto a date container, move to that date
    if (overStr.startsWith("date-")) {
      const targetDate = overStr.replace("date-", "");
      moveReminderToDate(remId, targetDate);
    }
  }

  function prevMonth() {
    setViewMonth((prev) => {
      const m = prev.month - 1;
      return m < 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: m };
    });
  }

  function nextMonth() {
    setViewMonth((prev) => {
      const m = prev.month + 1;
      return m > 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: m };
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-dark">Reminders</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("casual")}
          className={`px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
            tab === "casual"
              ? "bg-primary text-white"
              : "bg-white text-neutral-dark/60 hover:bg-primary-light/20"
          }`}
        >
          Casual
        </button>
        <button
          onClick={() => setTab("dated")}
          className={`px-5 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
            tab === "dated"
              ? "bg-primary text-white"
              : "bg-white text-neutral-dark/60 hover:bg-primary-light/20"
          }`}
        >
          Dated
        </button>
      </div>

      {/* Add reminder */}
      <Card>
        <form onSubmit={addReminder} className="flex gap-3">
          <Input
            placeholder="Add a reminder..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1"
          />
          {tab === "dated" && (
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-40"
            />
          )}
          <Button type="submit" disabled={!newText.trim()}>
            <Plus size={18} />
          </Button>
        </form>
      </Card>

      {/* Casual tab */}
      {tab === "casual" && (
        <Card>
          {casualReminders.length === 0 ? (
            <p className="text-sm text-neutral-dark/40 py-4 text-center">
              No casual reminders yet.
            </p>
          ) : (
            <div className="space-y-2">
              {casualReminders.map((r) => (
                <ReminderCard
                  key={r.id}
                  id={r.id}
                  text={r.text}
                  completed={r.completed}
                  onToggle={toggleReminder}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Dated tab with day-grouped drag-drop */}
      {tab === "dated" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white text-neutral-dark/50 cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-semibold text-neutral-dark">
              {MONTHS[viewMonth.month]} {viewMonth.year}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white text-neutral-dark/50 cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {nonEmptyDates.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-dark/40 py-4 text-center">
                No dated reminders this month.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {nonEmptyDates.map(([dateStr, rems]) => (
                <Card key={dateStr} className="relative">
                  <h3 className="text-sm font-semibold text-neutral-dark/60 mb-3">
                    {parseDateLabel(dateStr)}
                  </h3>
                  <SortableContext
                    items={rems.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {rems.map((r) => (
                        <DraggableReminder
                          key={r.id}
                          id={r.id}
                          text={r.text}
                          completed={r.completed}
                          onToggle={toggleReminder}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </Card>
              ))}
            </div>
          )}
        </DndContext>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoGuard } from "@/components/ui/DemoGate";
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
import Input from "@/components/ui/Input";
import DatePicker from "@/components/ui/DatePicker";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Undo2,
  Trash2,
} from "lucide-react";
import ClickSpark from "@/components/ui/ClickSpark";
import CategoryFilter from "@/components/reminders/CategoryFilter";
import CategorySelector from "@/components/reminders/CategorySelector";
import AddCategoryModal, { type Category } from "@/components/reminders/AddCategoryModal";
import { canAddReminder, canAddCategory, getRemindersLimit, getCategoriesLimit } from "@/lib/plan-limits";
import PlansModal from "@/components/plans/PlansModal";
import { Plus } from "lucide-react";

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
  categoryId?: string;
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

const UNDO_SECONDS = 5;

export default function CalendarGrid() {
  const { profile } = useAuth();
  const { isDemo, guardAction } = useDemoGuard();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coarsePointerRef = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  });
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [casualCount, setCasualCount] = useState(0);
  const undoTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const today = useMemo(() => {
    const n = new Date();
    return formatDate(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const loadData = useCallback(async () => {
    if (!profile?.uid) return;

    if (isDemo) {
      const today = formatDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      setReminders([
        { id: "demo_cd1", text: "Submit project report", date: today, completed: false, categoryId: "demo_cat1" },
        { id: "demo_cd2", text: "Team standup meeting", date: today, completed: false, categoryId: "demo_cat2" },
      ]);
      setCasualCount(3); // demo has 3 casual
      setCategories([
        { id: "demo_cat1", name: "Work", color: "#7FAF8F" },
        { id: "demo_cat2", name: "Personal", color: "#F2C94C" },
      ]);
      return;
    }

    try {
      const [datedSnap, casualSnap, categoriesSnap] = await Promise.all([
        getDocs(collection(db, "reminders", profile.uid, "dated")),
        getDocs(collection(db, "reminders", profile.uid, "casual")),
        getDocs(collection(db, "categories", profile.uid, "items")),
      ]);
      let datedList: Reminder[] = datedSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Reminder)
      );
      for (const r of datedList) {
        if (r.completed) {
          await deleteDoc(doc(db, "reminders", profile.uid, "dated", r.id)).catch(() => {});
        }
      }
      datedList = datedList.filter((r) => !r.completed);
      setReminders(datedList);

      let casualCompleted = 0;
      for (const d of casualSnap.docs) {
        const data = d.data();
        if (data.completed === true) {
          casualCompleted++;
          await deleteDoc(doc(db, "reminders", profile.uid, "casual", d.id)).catch(() => {});
        }
      }
      setCasualCount(Math.max(0, casualSnap.docs.length - casualCompleted));
      setCategories(
        categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
    } catch {
      // Firebase not configured
    }
  }, [profile?.uid, isDemo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timeouts = undoTimeoutsRef.current;
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadData();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, [loadData]);

  const removeReminder = useCallback(
    async (id: string) => {
      if (!guardAction("deleting reminders")) return;
      const removed = reminders.find((r) => r.id === id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      if (!profile?.uid) return;
      const ref = doc(db, "reminders", profile.uid, "dated", id);
      try {
        await deleteDoc(ref);
      } catch {
        if (removed) setReminders((prev) => [...prev, removed]);
        toast.error("Failed to delete reminder. Check your connection and try again.");
      }
    },
    [profile?.uid, reminders, guardAction]
  );

  const toggleReminder = useCallback(
    async (id: string) => {
      if (!guardAction("managing reminders")) return;
      const rem = reminders.find((r) => r.id === id);
      if (!rem) return;

      const wasCompleted = rem.completed;
      const nowCompleted = !wasCompleted;

      if (wasCompleted) {
        const t = undoTimeoutsRef.current.get(id);
        if (t) {
          clearTimeout(t);
          undoTimeoutsRef.current.delete(id);
        }
      }

      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, completed: nowCompleted } : r))
      );
      if (!profile?.uid) return;
      try {
        const ref = doc(db, "reminders", profile.uid, "dated", id);
        await updateDoc(ref, { completed: nowCompleted });
      } catch {
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? { ...r, completed: wasCompleted } : r))
        );
        toast.error("Failed to update reminder. Check your connection and try again.");
      }

      if (nowCompleted) {
        const t = setTimeout(() => {
          undoTimeoutsRef.current.delete(id);
          removeReminder(id);
        }, UNDO_SECONDS * 1000);
        undoTimeoutsRef.current.set(id, t);
      }
    },
    [profile?.uid, reminders, removeReminder, guardAction]
  );

  const totalRemindersCount = reminders.length + casualCount;

  const addCategory = useCallback(
    async (name: string, color: string) => {
      if (!guardAction("creating categories")) return;
      if (!profile?.uid) return;
      const plan = profile?.plan ?? "free";
      if (!canAddCategory(plan, categories.length)) {
        setShowPlansModal(true);
        return;
      }
      const id = `cat_${Date.now()}`;
      const category: Category = { id, name, color };
      setCategories((prev) => [...prev, category]);
      setNewCategoryId(id);
      if (isDemo) return;
      try {
        await setDoc(doc(db, "categories", profile.uid, "items", id), { name, color });
      } catch {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setNewCategoryId((prev) => (prev === id ? null : prev));
        toast.error("Failed to save category. Check your connection and try again.");
      }
    },
    [profile?.uid, profile?.plan, categories.length, isDemo, guardAction]
  );

  const addReminder = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!guardAction("creating reminders")) return;
      if (!profile?.uid || !newText.trim()) return;
      const plan = profile?.plan ?? "free";
      if (!canAddReminder(plan, totalRemindersCount)) {
        setShowPlansModal(true);
        return;
      }
      const id = `rem_${Date.now()}`;
      const reminder: Reminder = {
        id,
        text: newText.trim(),
        date: newDate || today,
        completed: false,
        categoryId: newCategoryId ?? undefined,
      };
      setReminders((prev) => [...prev, reminder]);
      setNewText("");
      setNewDate(today);
      if (isDemo) return;
      try {
        const ref = doc(db, "reminders", profile.uid, "dated", id);
        await setDoc(ref, {
          text: reminder.text,
          date: reminder.date,
          completed: false,
          categoryId: reminder.categoryId ?? null,
          createdAt: serverTimestamp(),
        });
      } catch {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        toast.error("Failed to save reminder. Check your connection and try again.");
      }
    },
    [profile?.uid, profile?.plan, newText, newDate, newCategoryId, totalRemindersCount, today, isDemo, guardAction]
  );

  const saveEdit = useCallback(
    async (id: string) => {
      if (!profile?.uid) return;
      const rem = reminders.find((r) => r.id === id);
      const prevText = rem?.text;
      const prevDate = rem?.date;
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
        setReminders((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, text: prevText ?? r.text, date: prevDate ?? r.date } : r
          )
        );
        toast.error("Failed to save changes. Check your connection and try again.");
      }
    },
    [profile?.uid, editText, editDate, reminders]
  );

  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const firstDay = getFirstDayOfWeek(viewMonth.year, viewMonth.month);

  const filteredReminders = useMemo(
    () =>
      categoryFilter
        ? reminders.filter((r) => r.categoryId === categoryFilter)
        : reminders,
    [reminders, categoryFilter]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const remindersByDate = useMemo(() => {
    const grouped: Record<string, Reminder[]> = {};
    filteredReminders.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });
    return grouped;
  }, [filteredReminders]);

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

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const sync = () => {
      coarsePointerRef.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="space-y-4">
      {/* Add reminder */}
      <form
        onSubmit={addReminder}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
      >
        <input
          placeholder={
            !canAddReminder(profile?.plan ?? "free", totalRemindersCount)
              ? `Limit reached (${getRemindersLimit(profile?.plan ?? "free")} reminders)`
              : "Add a reminder..."
          }
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          disabled={!canAddReminder(profile?.plan ?? "free", totalRemindersCount)}
          className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl border bg-surface text-neutral-dark placeholder:text-neutral-dark/40 border-primary-light/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
        />
        <DatePicker
          value={newDate}
          onChange={setNewDate}
          placeholder="Date"
          size="sm"
        />
        <CategorySelector
          categories={categories}
          value={newCategoryId}
          onChange={setNewCategoryId}
          onAddCategory={() => {
            if (canAddCategory(profile?.plan ?? "free", categories.length)) {
              setShowAddCategory(true);
            } else {
              setShowPlansModal(true);
            }
          }}
          canAddCategory={canAddCategory(profile?.plan ?? "free", categories.length)}
          categoriesLimit={getCategoriesLimit(profile?.plan ?? "free")}
        />
        <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            type={canAddReminder(profile?.plan ?? "free", totalRemindersCount) ? "submit" : "button"}
            disabled={!newText.trim() && canAddReminder(profile?.plan ?? "free", totalRemindersCount)}
            onClick={
              !canAddReminder(profile?.plan ?? "free", totalRemindersCount)
                ? () => setShowPlansModal(true)
                : undefined
            }
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            <Plus size={18} />
          </button>
        </ClickSpark>
      </form>

      <PlansModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlan={profile?.plan ?? "free"}
      />

      <AddCategoryModal
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        onAdd={addCategory}
      />

      {/* Month nav + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-1 sm:justify-start">
          <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-surface text-neutral-dark/50 cursor-pointer"
            style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <ChevronLeft size={20} />
          </button>
          </ClickSpark>
          <span className="text-lg font-semibold text-neutral-dark px-2">
            {MONTHS[viewMonth.month]} {viewMonth.year}
          </span>
          <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-surface text-neutral-dark/50 cursor-pointer"
            style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1)" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            <ChevronRight size={20} />
          </button>
          </ClickSpark>
        </div>
        {categories.length > 0 && (
          <div className="flex justify-center sm:justify-end">
            <CategoryFilter
              categories={categories}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-medium text-neutral-dark/40 sm:py-3 sm:text-sm"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {Array.from({ length: firstDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = formatDate(viewMonth.year, viewMonth.month, day);
          const isToday = dateStr === today;
          const rems = remindersByDate[dateStr] ?? [];
          const isHovered = hoveredDate === dateStr;

          return (
            <div
              key={dateStr}
              className="relative"
              onMouseEnter={() => showPopup(dateStr)}
              onMouseLeave={() => hidePopup(80)}
              onClick={() => {
                if (coarsePointerRef.current) {
                  setHoveredDate((h) => (h === dateStr ? null : dateStr));
                }
              }}
            >
              <div
                style={{
                  transform: isHovered ? "scale(1.04)" : "scale(1)",
                  boxShadow: isHovered ? "0 4px 12px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 500ms cubic-bezier(0.25, 0.1, 0.25, 1), border-color 500ms ease",
                }}
                className={`
                  relative flex min-h-[4.5rem] cursor-pointer rounded-lg border-2 p-2 origin-center transition-[transform,box-shadow,border-color] duration-500 sm:min-h-[5.625rem] sm:rounded-xl sm:p-3
                  ${isToday ? "border-primary bg-primary/5" : "border-primary-light/30 bg-surface"}
                  ${isHovered ? "border-primary/50 ring-2 ring-primary/35 ring-offset-1 ring-offset-neutral-light sm:ring-offset-2" : ""}
                `}
              >
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-xs font-medium sm:text-sm ${
                      isToday ? "text-primary" : "text-neutral-dark/60"
                    }`}
                  >
                    {day}
                  </span>
                  {rems.length > 0 && (
                    <div className="mt-1 flex gap-0.5">
                      {rems.slice(0, 3).map((r) => {
                        const catColor = r.categoryId ? categoryMap[r.categoryId]?.color : null;
                        return (
                          <div
                            key={r.id}
                            className={`w-1.5 h-1.5 rounded-full ${
                              r.completed ? "bg-primary" : "bg-accent"
                            }`}
                            style={catColor && !r.completed ? { backgroundColor: catColor } : undefined}
                          />
                        );
                      })}
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
              <AnimatePresence>
                {isHovered && (
                <motion.div
                  key={`popup-${dateStr}`}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
                  className="absolute z-30 top-full mt-1 left-1/2 w-[min(100vw-1rem,16rem)] max-w-[calc(100vw-1rem)] -translate-x-1/2 rounded-2xl border border-primary-light/30 bg-surface p-4 shadow-xl sm:w-64"
                  onMouseEnter={() => showPopup(dateStr)}
                  onMouseLeave={() => hidePopup(0)}
                >
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-neutral-dark">
                      {MONTHS[viewMonth.month]} {day}
                    </span>
                  </div>

                  {rems.length === 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-dark/40">
                        {isPast(dateStr)
                          ? "No tasks recorded"
                          : "No reminders set"}
                      </p>
                      {!isPast(dateStr) && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewDate(dateStr);
                            setHoveredDate(null);
                          }}
                          className="text-xs text-primary font-medium hover:underline"
                        >
                          + Add reminder
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto">
                      <div className="flex flex-col gap-2">
                        <AnimatePresence mode="popLayout">
                          {rems.map((r) => {
                            const catColor = r.categoryId ? categoryMap[r.categoryId]?.color : undefined;
                            return (
                            <motion.div
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: 12, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                              className="flex items-center gap-2 text-xs group pl-2 rounded-lg"
                              style={
                                catColor
                                  ? { borderLeft: `3px solid ${catColor}` }
                                  : undefined
                              }
                            >
                          {editingId === r.id ? (
                            <div className="flex-1 space-y-1">
                              <Input
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="text-xs py-1"
                              />
                              <div className="flex items-center gap-2">
                                <DatePicker
                                  value={editDate}
                                  onChange={setEditDate}
                                  placeholder="Date"
                                  size="sm"
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
                              <ClickSpark sparkColor="#7FAF8F" sparkSize={6} sparkRadius={10} className="inline-flex">
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
                              </ClickSpark>
                              <ClickSpark sparkColor="#7FAF8F" sparkSize={6} sparkRadius={10} className="flex-1 min-w-0">
                              <span
                                onClick={() => {
                                  setEditingId(r.id);
                                  setEditText(r.text);
                                  setEditDate(r.date);
                                }}
                                className={`ui-hover-text flex-1 cursor-pointer hover:text-primary ${
                                  r.completed
                                    ? "line-through text-neutral-dark/40"
                                    : "text-neutral-dark/70"
                                }`}
                              >
                                {r.text}
                              </span>
                              </ClickSpark>
                              {r.completed && (
                                <ClickSpark sparkColor="#7FAF8F" sparkSize={6} sparkRadius={10} className="inline-flex">
                                <button
                                  onClick={() => toggleReminder(r.id)}
                                  className="text-neutral-dark/30 hover:text-primary cursor-pointer"
                                >
                                  <Undo2 size={12} />
                                </button>
                                </ClickSpark>
                              )}
                              <ClickSpark sparkColor="#7FAF8F" sparkSize={6} sparkRadius={10} className="inline-flex">
                              <button
                                onClick={() => removeReminder(r.id)}
                                className="p-1 rounded text-neutral-dark/30 hover:text-error cursor-pointer transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                              </ClickSpark>
                            </>
                          )}
                          </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

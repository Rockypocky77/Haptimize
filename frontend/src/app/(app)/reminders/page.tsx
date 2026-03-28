"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ReminderCard from "@/components/reminders/ReminderCard";
import DraggableReminder from "@/components/reminders/DraggableReminder";
import DroppableDateBox from "@/components/reminders/DroppableDateBox";
import CategorySelector from "@/components/reminders/CategorySelector";
import AddCategoryModal, { type Category } from "@/components/reminders/AddCategoryModal";
import DatePicker from "@/components/ui/DatePicker";
import CategoryFilter from "@/components/reminders/CategoryFilter";
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
  increment,
} from "@/lib/firebase/client";
import { DIGEST_DAILY_SUBCOLLECTION } from "@/lib/digest";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useDemoGuard } from "@/components/ui/DemoGate";
import FadeIn from "@/components/ui/FadeIn";
import ClickSpark from "@/components/ui/ClickSpark";
import { canAddReminder, canAddCategory, getRemindersLimit, getCategoriesLimit } from "@/lib/plan-limits";
import PlansModal from "@/components/plans/PlansModal";
import { getLocalDateString } from "@/lib/date";

const UNDO_SECONDS = 5;

interface Reminder {
  id: string;
  text: string;
  reminderType: "casual" | "dated";
  date?: string;
  completed: boolean;
  categoryId?: string;
}

const DEMO_REMINDERS: Reminder[] = [
  { id: "demo_c1", text: "Buy groceries", reminderType: "casual", completed: false, categoryId: "demo_cat2" },
  { id: "demo_c2", text: "Call dentist for appointment", reminderType: "casual", completed: false, categoryId: "demo_cat2" },
  { id: "demo_c3", text: "Reply to Sarah's email", reminderType: "casual", completed: false, categoryId: "demo_cat1" },
  { id: "demo_d1", text: "Submit project report", reminderType: "dated", date: new Date().toISOString().split("T")[0], completed: false, categoryId: "demo_cat1" },
  { id: "demo_d2", text: "Team standup meeting", reminderType: "dated", date: new Date().toISOString().split("T")[0], completed: false, categoryId: "demo_cat1" },
];

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
  const { isDemo, guardAction } = useDemoGuard();
  const [tab, setTab] = useState<"casual" | "dated">("casual");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newText, setNewText] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const undoTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const loadReminders = useCallback(async () => {
    if (!profile?.uid) return;

    if (isDemo) {
      setReminders(DEMO_REMINDERS);
      setCategories([
        { id: "demo_cat1", name: "Work", color: "#7FAF8F" },
        { id: "demo_cat2", name: "Personal", color: "#F2C94C" },
      ]);
      return;
    }

    try {
      const today = getLocalDateString();
      const casualCol = collection(db, "reminders", profile.uid, "casual");
      const casualSnap = await getDocs(casualCol);
      let casual: Reminder[] = casualSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        reminderType: "casual",
      })) as Reminder[];

      const datedCol = collection(db, "reminders", profile.uid, "dated");
      const datedSnap = await getDocs(datedCol);
      let dated: Reminder[] = datedSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        reminderType: "dated",
      })) as Reminder[];

      // Completed reminders are meant to be removed after a 5s undo window. If the user
      // navigates away, the timer is cleared but Firestore still has completed: true —
      // purge those docs on load so they don't stick around forever.
      for (const r of casual) {
        if (r.completed) {
          await deleteDoc(doc(db, "reminders", profile.uid, "casual", r.id)).catch(() => {});
        }
      }
      for (const r of dated) {
        if (r.completed) {
          await deleteDoc(doc(db, "reminders", profile.uid, "dated", r.id)).catch(() => {});
        }
      }
      casual = casual.filter((r) => !r.completed);
      dated = dated.filter((r) => !r.completed);

      // Move past uncompleted dated reminders to casual
      const toMove = dated.filter((r) => r.date && r.date < today && !r.completed);
      for (const r of toMove) {
        try {
          const casualRef = doc(db, "reminders", profile.uid, "casual", r.id);
          await setDoc(casualRef, {
            text: r.text,
            completed: false,
            categoryId: r.categoryId ?? null,
            createdAt: serverTimestamp(),
          });
          await deleteDoc(doc(db, "reminders", profile.uid, "dated", r.id));
        } catch {
          // offline or error — skip
        }
      }
      const movedIds = new Set(toMove.map((r) => r.id));
      dated = dated.filter((r) => !movedIds.has(r.id));
      const movedAsCasual: Reminder[] = toMove.map((r) => ({
        ...r,
        reminderType: "casual" as const,
        date: undefined,
      }));

      setReminders([...casual, ...movedAsCasual, ...dated]);

      const categoriesCol = collection(db, "categories", profile.uid, "items");
      const categoriesSnap = await getDocs(categoriesCol);
      setCategories(
        categoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Category))
      );
    } catch {
      // Firebase not configured
    }
  }, [profile?.uid, isDemo]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    const timeouts = undoTimeoutsRef.current;
    const onFocus = () => loadReminders();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") loadReminders();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, [loadReminders]);

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
        const ref = doc(db, "categories", profile.uid, "items", id);
        await setDoc(ref, { name, color });
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
      if (!canAddReminder(plan, reminders.length)) {
        setShowPlansModal(true);
        return;
      }
      const id = `rem_${Date.now()}`;
      const reminder: Reminder = {
        id,
        text: newText.trim(),
        reminderType: tab,
        date: tab === "dated" ? newDate || undefined : undefined,
        completed: false,
        categoryId: newCategoryId ?? undefined,
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
          categoryId: reminder.categoryId ?? null,
          createdAt: serverTimestamp(),
        });
      } catch {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        toast.error("Failed to save reminder. Check your connection and try again.");
      }
    },
    [profile?.uid, profile?.plan, tab, newText, newDate, newCategoryId, reminders.length, guardAction]
  );

  const removeReminder = useCallback(
    async (id: string, reminderType: "casual" | "dated", fromTimer = false) => {
      if (!fromTimer && !guardAction("deleting reminders")) return;
      const removed = reminders.find((r) => r.id === id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      if (!profile?.uid) return;
      const subCol = reminderType;
      const ref = doc(db, "reminders", profile.uid, subCol, id);
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

      // If undoing (was completed, now uncompleting), clear the removal timer
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
        const subCol = rem.reminderType === "casual" ? "casual" : "dated";
        const ref = doc(db, "reminders", profile.uid, subCol, id);
        await updateDoc(ref, { completed: nowCompleted });
        if (!isDemo) {
          const dayKey = getLocalDateString();
          const digestRef = doc(db, "users", profile.uid, DIGEST_DAILY_SUBCOLLECTION, dayKey);
          if (nowCompleted) {
            await setDoc(
              digestRef,
              { remindersCompleted: increment(1) },
              { merge: true }
            );
          } else if (wasCompleted) {
            await setDoc(
              digestRef,
              { remindersCompleted: increment(-1) },
              { merge: true }
            );
          }
        }
      } catch {
        setReminders((prev) =>
          prev.map((r) => (r.id === id ? { ...r, completed: wasCompleted } : r))
        );
        toast.error("Failed to update reminder. Check your connection and try again.");
      }

      // If just completed, start 5s timer to remove (bypass guard — user already completed)
      if (nowCompleted) {
        const t = setTimeout(() => {
          undoTimeoutsRef.current.delete(id);
          removeReminder(id, rem.reminderType, true);
        }, UNDO_SECONDS * 1000);
        undoTimeoutsRef.current.set(id, t);
      }
    },
    [profile?.uid, reminders, removeReminder, guardAction, isDemo]
  );

  const moveReminderToDate = useCallback(
    async (reminderId: string, newDateStr: string) => {
      const rem = reminders.find((r) => r.id === reminderId);
      const prevDate = rem?.date;
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
        setReminders((prev) =>
          prev.map((r) =>
            r.id === reminderId ? { ...r, date: prevDate } : r
          )
        );
        toast.error("Failed to move reminder. Check your connection and try again.");
      }
    },
    [profile?.uid, reminders]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const filterByCategory = useCallback(
    (list: Reminder[]) =>
      categoryFilter
        ? list.filter((r) => r.categoryId === categoryFilter)
        : list,
    [categoryFilter]
  );

  const casualReminders = filterByCategory(
    reminders.filter((r) => r.reminderType === "casual")
  );
  const datedReminders = filterByCategory(
    reminders.filter((r) => r.reminderType === "dated")
  );

  // Group dated reminders by date for the current month
  const daysInMonth = getDaysInMonth(viewMonth.year, viewMonth.month);
  const todayDate = useMemo(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth(), day: n.getDate() };
  }, []);

  // When viewing current month, start from today; otherwise show all days
  const startDay = useMemo(() => {
    if (
      viewMonth.year === todayDate.year &&
      viewMonth.month === todayDate.month
    ) {
      return todayDate.day;
    }
    return 1;
  }, [viewMonth.year, viewMonth.month, todayDate]);

  const datedByDate = useMemo(() => {
    const grouped: Record<string, Reminder[]> = {};
    for (let d = startDay; d <= daysInMonth; d++) {
      const dateStr = formatDate(viewMonth.year, viewMonth.month, d);
      grouped[dateStr] = datedReminders.filter((r) => r.date === dateStr);
    }
    return grouped;
  }, [datedReminders, viewMonth, daysInMonth, startDay]);

  function getTargetDateFromOver(overId: string): string | null {
    const overStr = String(overId);
    if (overStr.startsWith("date-")) {
      return overStr.replace("date-", "");
    }
    // Dropped on another reminder — use that reminder's date
    const rem = datedReminders.find((r) => r.id === overStr);
    return rem?.date ?? null;
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const remId = active.id as string;
    const targetDate = getTargetDateFromOver(over.id as string);
    if (targetDate) {
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
      <FadeIn delay={0}>
        <h1 className="text-2xl font-bold text-neutral-dark">Reminders</h1>
      </FadeIn>

      {/* Tabs */}
      <FadeIn delay={0.1}>
      <div className="relative flex gap-2">
        <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="h-auto min-h-0">
        <button
          onClick={() => setTab("casual")}
          className={`relative px-5 py-2 rounded-xl text-sm font-medium cursor-pointer shadow-sm transition-colors duration-200 ${
            tab === "casual"
              ? "bg-primary text-white"
              : "bg-surface text-neutral-dark/60 hover:bg-primary-light/20"
          }`}
          style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 200ms ease, color 200ms ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Casual
        </button>
        <button
          onClick={() => setTab("dated")}
          className={`relative px-5 py-2 rounded-xl text-sm font-medium cursor-pointer shadow-sm transition-colors duration-200 ${
            tab === "dated"
              ? "bg-primary text-white"
              : "bg-surface text-neutral-dark/60 hover:bg-primary-light/20"
          }`}
          style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 200ms ease, color 200ms ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          Dated
        </button>
        </ClickSpark>
      </div>
      </FadeIn>

      {/* Add reminder */}
      <FadeIn delay={0.15}>
      <Card className="overflow-visible">
        <form onSubmit={addReminder} className="flex gap-3 items-center">
          <Input
            placeholder={
              !canAddReminder(profile?.plan ?? "free", reminders.length)
                ? `Limit reached (${getRemindersLimit(profile?.plan ?? "free")} reminders on Free)`
                : "Add a reminder..."
            }
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1"
            disabled={!canAddReminder(profile?.plan ?? "free", reminders.length)}
          />
          {tab === "dated" && (
            <DatePicker
              value={newDate}
              onChange={setNewDate}
              placeholder="Pick date"
              disabled={!canAddReminder(profile?.plan ?? "free", reminders.length)}
              className="w-40"
            />
          )}
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
          <Button
            type={canAddReminder(profile?.plan ?? "free", reminders.length) ? "submit" : "button"}
            disabled={!newText.trim() && canAddReminder(profile?.plan ?? "free", reminders.length)}
            onClick={
              !canAddReminder(profile?.plan ?? "free", reminders.length)
                ? () => setShowPlansModal(true)
                : undefined
            }
          >
            <Plus size={18} />
          </Button>
        </form>
      </Card>
      </FadeIn>

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

      {/* Casual tab */}
      {tab === "casual" && (
        <FadeIn delay={0.25}>
        <Card className="overflow-visible">
          {categories.length > 0 && (
            <div className="flex justify-end mb-3">
              <CategoryFilter
                categories={categories}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            </div>
          )}
          {casualReminders.length === 0 ? (
            <p className="text-sm text-neutral-dark/40 py-4 text-center">
              No casual reminders yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2 overflow-visible">
              <AnimatePresence mode="popLayout">
                {casualReminders.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, overflow: "hidden" }}
                    transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  >
                    <ReminderCard
                      id={r.id}
                      text={r.text}
                      completed={r.completed}
                      onToggle={toggleReminder}
                      onDelete={(id) => removeReminder(id, "casual")}
                      categoryColor={r.categoryId ? categoryMap[r.categoryId]?.color : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
        </FadeIn>
      )}

      {/* Dated tab with day-grouped drag-drop */}
      {tab === "dated" && (
        <FadeIn delay={0.25}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Month navigation + filter */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
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
              <span className="text-sm font-semibold text-neutral-dark px-2">
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
              <CategoryFilter
                categories={categories}
                value={categoryFilter}
                onChange={setCategoryFilter}
              />
            )}
          </div>

          <div className="space-y-4">
            {Array.from({ length: daysInMonth - startDay + 1 }, (_, i) => {
              const day = startDay + i;
              const dateStr = formatDate(viewMonth.year, viewMonth.month, day);
              const rems = datedByDate[dateStr] ?? [];
              return (
                <DroppableDateBox key={dateStr} dateStr={dateStr}>
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-neutral-dark/60 mb-3">
                      {parseDateLabel(dateStr)}
                    </h3>
                    <SortableContext
                      items={rems.map((r) => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        <AnimatePresence mode="popLayout">
                          {rems.map((r) => (
                            <motion.div
                              key={r.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                            >
                              <DraggableReminder
                                id={r.id}
                                text={r.text}
                                completed={r.completed}
                                onToggle={toggleReminder}
                                onDelete={(id) => removeReminder(id, "dated")}
                                categoryColor={r.categoryId ? categoryMap[r.categoryId]?.color : undefined}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {rems.length === 0 && (
                          <p className="text-xs text-neutral-dark/40 py-2">
                            Drop reminders here
                          </p>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </DroppableDateBox>
              );
            })}
          </div>
        </DndContext>
        </FadeIn>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X, Send, Undo2, ExternalLink } from "lucide-react";
import ClickSpark from "@/components/ui/ClickSpark";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoGuard } from "@/components/ui/DemoGate";
import { api } from "@/lib/api/client";
import PlansModal from "@/components/plans/PlansModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "@/lib/firebase/client";

interface AiAction {
  action: string;
  text?: string;
  title?: string;
  date?: string | null;
  new_date?: string;
  [key: string]: unknown;
}

interface UndoEntry {
  type: "created" | "deleted" | "updated";
  collection: string;
  docId: string;
  uid: string;
  previousData?: Record<string, unknown>;
}

interface ActionResult {
  label: string;
  navigateTo?: string;
  undoEntries: UndoEntry[];
}

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  actions?: AiAction[];
  actionResults?: ActionResult[];
  undoEntries?: UndoEntry[];
  undone?: boolean;
}

let lastUndoEntries: UndoEntry[] = [];

async function executeActions(
  actions: AiAction[],
  uid: string
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];

  for (const a of actions) {
    try {
      if (a.action === "create_reminder") {
        const reminderType = a.date ? "dated" : "casual";
        const colPath = `reminders/${uid}/${reminderType}`;
        const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ref = doc(db, colPath, id);
        await setDoc(ref, {
          text: a.text || "Untitled reminder",
          completed: false,
          ...(a.date ? { date: a.date } : {}),
          createdAt: serverTimestamp(),
        });
        results.push({
          label: `✓ Reminder created: "${a.text}"`,
          navigateTo: a.date ? "/calendar" : "/reminders",
          undoEntries: [{ type: "created", collection: colPath, docId: id, uid }],
        });
      } else if (a.action === "create_habit") {
        const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ref = doc(db, "habits", uid, "items", id);
        await setDoc(ref, {
          title: a.title || "Untitled habit",
          active: true,
          createdAt: serverTimestamp(),
        });
        results.push({
          label: `✓ Habit added: "${a.title}"`,
          navigateTo: "/checklist",
          undoEntries: [{ type: "created", collection: `habits/${uid}/items`, docId: id, uid }],
        });
      } else if (a.action === "create_event") {
        const id = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const ref = doc(db, "reminders", uid, "dated", id);
        await setDoc(ref, {
          text: a.text || "Untitled event",
          date: a.date || "",
          completed: false,
          createdAt: serverTimestamp(),
        });
        results.push({
          label: `✓ Event created: "${a.text}" on ${a.date}`,
          navigateTo: "/calendar",
          undoEntries: [{ type: "created", collection: `reminders/${uid}/dated`, docId: id, uid }],
        });
      } else if (a.action === "reschedule_event" && a.text) {
        const newDate = a.new_date || (typeof a.date === "string" ? a.date : null);
        if (!newDate) {
          results.push({ label: `✗ No target date for rescheduling "${a.text}"`, undoEntries: [] });
          continue;
        }
        const searchWords = a.text.toLowerCase().split(/\s+/).filter(Boolean);
        let found = false;
        for (const colName of ["dated", "casual"]) {
          const snap = await getDocs(collection(db, "reminders", uid, colName));
          for (const d of snap.docs) {
            const data = d.data();
            const itemText = (data.text || "").toLowerCase();
            const matches = searchWords.some((w) => itemText.includes(w)) || itemText.includes(a.text!.toLowerCase());
            if (matches && !data.completed) {
              const prevData = { ...data };
              if (colName === "casual") {
                await deleteDoc(d.ref);
                const newId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                await setDoc(doc(db, "reminders", uid, "dated", newId), {
                  text: data.text,
                  date: newDate,
                  completed: false,
                  createdAt: serverTimestamp(),
                });
                results.push({
                  label: `✓ Rescheduled: "${data.text}" → ${newDate}`,
                  navigateTo: "/calendar",
                  undoEntries: [
                    { type: "created", collection: `reminders/${uid}/dated`, docId: newId, uid },
                    { type: "deleted", collection: `reminders/${uid}/casual`, docId: d.id, uid, previousData: prevData },
                  ],
                });
              } else {
                await updateDoc(d.ref, { date: newDate });
                results.push({
                  label: `✓ Rescheduled: "${data.text}" → ${newDate}`,
                  navigateTo: "/calendar",
                  undoEntries: [
                    { type: "updated", collection: `reminders/${uid}/dated`, docId: d.id, uid, previousData: prevData },
                  ],
                });
              }
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          results.push({ label: `✗ Couldn't find "${a.text}" to reschedule`, undoEntries: [] });
        }
      } else if (a.action === "delete_event" && a.text) {
        const delWords = a.text.toLowerCase().split(/\s+/).filter(Boolean);
        let found = false;
        for (const colName of ["dated", "casual"]) {
          const snap = await getDocs(collection(db, "reminders", uid, colName));
          for (const d of snap.docs) {
            const data = d.data();
            const itemText = (data.text || "").toLowerCase();
            const matches = delWords.some((w) => itemText.includes(w)) || itemText.includes(a.text!.toLowerCase());
            if (matches && !data.completed) {
              const prevData = { ...data };
              await deleteDoc(d.ref);
              results.push({
                label: `✓ Deleted: "${data.text}"`,
                navigateTo: "/reminders",
                undoEntries: [
                  { type: "deleted", collection: `reminders/${uid}/${colName}`, docId: d.id, uid, previousData: prevData },
                ],
              });
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          results.push({ label: `✗ Couldn't find "${a.text}" to delete`, undoEntries: [] });
        }
      } else if (a.action === "undo_last") {
        const undone = await performUndo(lastUndoEntries);
        results.push({ label: undone ? "✓ Last action undone" : "✗ Nothing to undo", undoEntries: [] });
        lastUndoEntries = [];
      }
    } catch {
      results.push({ label: `✗ Failed: ${a.text || a.title}`, undoEntries: [] });
    }
  }

  const allUndos = results.flatMap((r) => r.undoEntries);
  if (allUndos.length > 0) lastUndoEntries = allUndos;

  return results;
}

async function performUndo(entries: UndoEntry[]): Promise<boolean> {
  if (entries.length === 0) return false;
  for (const entry of [...entries].reverse()) {
    try {
      const ref = doc(db, entry.collection, entry.docId);
      if (entry.type === "created") {
        await deleteDoc(ref);
      } else if (entry.type === "deleted" && entry.previousData) {
        await setDoc(ref, entry.previousData);
      } else if (entry.type === "updated" && entry.previousData) {
        await setDoc(ref, entry.previousData);
      }
    } catch {
      return false;
    }
  }
  return true;
}

const msgVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function HaptiAiDock() {
  const { profile } = useAuth();
  const { guardAction } = useDemoGuard();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: "Hey! I'm Hapti AI. I can help you set reminders, plan habits, or just chat. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [undoMsgId, setUndoMsgId] = useState<string | null>(null);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [tokenLimitReached, setTokenLimitReached] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, sending]);

  const handleUndo = useCallback(
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg?.undoEntries?.length) return;
      const ok = await performUndo(msg.undoEntries);
      if (ok) {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        setUndoMsgId(null);
        lastUndoEntries = [];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, undone: true, text: m.text.split("\n\n")[0] + "\n\n↩ Action undone" }
              : m
          )
        );
      }
    },
    [messages]
  );

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || sending) return;
      if (!guardAction("Hapti AI")) return;

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        setUndoMsgId(null);
      }

      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        text: input.trim(),
      };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput("");
      setSending(true);

      try {
        const history = updatedMessages
          .filter((m) => m.id !== "welcome")
          .slice(-10)
          .map((m) => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.text.split("\n\n")[0],
          }));

        let contextPrefix = "";
        if (profile?.uid) {
          try {
            const contextParts: string[] = [];

            const reminderItems: string[] = [];
            for (const col of ["dated", "casual"]) {
              const snap = await getDocs(collection(db, "reminders", profile.uid, col));
              snap.docs.forEach((d) => {
                const data = d.data();
                if (!data.completed) {
                  reminderItems.push(`- "${data.text}"${data.date ? ` (${data.date})` : " (no date)"}`);
                }
              });
            }
            if (reminderItems.length > 0) {
              contextParts.push(`[User's current reminders:\n${reminderItems.join("\n")}]`);
            }

            const habitsSnap = await getDocs(collection(db, "habits", profile.uid, "items"));
            const habitNames: { id: string; title: string }[] = [];
            habitsSnap.docs.forEach((d) => {
              const data = d.data();
              if (data.active !== false) {
                habitNames.push({ id: d.id, title: data.title ?? "Untitled" });
              }
            });

            const logsSnap = await getDocs(collection(db, "habitLogs", profile.uid, "daily"));
            const rawLogs = logsSnap.docs.map((d) => ({
              date: d.id,
              completedHabitIds: (d.data().completedHabitIds ?? []) as string[],
              completionPct: (d.data().completionPct ?? 0) as number,
            }));

            if (habitNames.length > 0 && rawLogs.length > 0) {
              const { filterLogsForAnalytics, computeAllHabitRates, computeProductiveDays, computeImprovingDecliningHabits, computeMomentumScore } = await import("@/lib/analytics");
              const logs = filterLogsForAnalytics(rawLogs);
              const allRates = computeAllHabitRates(habitNames, logs);
              const { best, worst } = computeProductiveDays(logs);
              const { improving, declining } = computeImprovingDecliningHabits(habitNames, logs);
              const momentum = computeMomentumScore(logs);

              const analyticsLines: string[] = [];
              analyticsLines.push(`Momentum Score: ${momentum}/100`);
              analyticsLines.push(`Tracking ${habitNames.length} habits over ${logs.length} days`);
              if (allRates.length > 0) {
                const top3 = allRates.slice(0, 3).map((h) => `"${h.title}" ${Math.round(h.rate)}%`).join(", ");
                const bottom3 = allRates.slice(-3).reverse().map((h) => `"${h.title}" ${Math.round(h.rate)}%`).join(", ");
                analyticsLines.push(`Strongest: ${top3}`);
                analyticsLines.push(`Weakest: ${bottom3}`);
              }
              if (best) analyticsLines.push(`Best day: ${best.weekday} (avg ${best.avgPct}%)`);
              if (worst) analyticsLines.push(`Toughest day: ${worst.weekday} (avg ${worst.avgPct}%)`);
              if (improving.length > 0) analyticsLines.push(`Improving: ${improving.map((h) => `"${h.title}" +${h.delta}%`).join(", ")}`);
              if (declining.length > 0) analyticsLines.push(`Declining: ${declining.map((h) => `"${h.title}" ${h.delta}%`).join(", ")}`);

              contextParts.push(`[User's habit analytics:\n${analyticsLines.join("\n")}]`);
            } else if (habitNames.length > 0) {
              contextParts.push(`[User's habits: ${habitNames.map((h) => `"${h.title}"`).join(", ")}]`);
            }

            if (contextParts.length > 0) {
              contextPrefix = contextParts.join("\n\n") + "\n\n";
            }
          } catch { /* ignore */ }
        }

        const messageWithContext = contextPrefix + userMsg.text;
        const res = await api.aiChat(messageWithContext, profile?.uid, history.slice(0, -1), profile?.humanize ?? false);
        const data = res as Record<string, unknown>;
        if (data.ok === false) {
          const errMsg = (data.error as string) ?? "Something went wrong.";
          const isLimitError = typeof errMsg === "string" && errMsg.includes("daily AI limit");
          if (isLimitError) {
            setTokenLimitReached(true);
            return;
          }
          setMessages((prev) => [
            ...prev,
            { id: `ai_err_${Date.now()}`, role: "ai", text: errMsg },
          ]);
          return;
        }
        const reply = (data.reply as string) ?? "I'm not sure how to respond to that.";
        const actions = (data.actions as AiAction[] | undefined) ?? undefined;

        const aiMsgId = `ai_${Date.now()}`;

        if (actions && actions.length > 0 && profile?.uid) {
          const actionResults = await executeActions(actions, profile.uid);
          const resultLabels = actionResults.map((r) => r.label).join("\n");
          const allUndos = actionResults.flatMap((r) => r.undoEntries);

          const aiMsg: Message = {
            id: aiMsgId,
            role: "ai",
            text: reply + "\n\n" + resultLabels,
            actionResults,
            undoEntries: allUndos,
            undone: false,
          };
          setMessages((prev) => [...prev, aiMsg]);

          if (allUndos.length > 0) {
            setUndoMsgId(aiMsgId);
            undoTimerRef.current = setTimeout(() => {
              setUndoMsgId(null);
            }, 5000);
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { id: aiMsgId, role: "ai", text: reply },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_err_${Date.now()}`,
            role: "ai",
            text: "Sorry, I couldn't process that. Try again in a moment.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [input, sending, profile?.uid, profile?.humanize, messages, guardAction]
  );

  const handleNavigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            className="fixed bottom-6 right-6 w-14 h-14 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "backOut" }}
          >
            <ClickSpark sparkColor="#fff" sparkSize={12} sparkRadius={20} sparkCount={8} duration={350} className="block w-full h-full">
              <button
                onClick={() => setOpen(true)}
                className="ui-hover-spotlight w-full h-full rounded-2xl bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center cursor-pointer"
              >
                <Sparkles size={24} />
              </button>
            </ClickSpark>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-6 right-6 w-96 h-[500px] bg-surface rounded-2xl shadow-2xl border border-primary-light/30 flex flex-col z-50 overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-primary-light/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-dark">Hapti AI</p>
                  <p className="text-[10px] text-neutral-dark/40">Your habits assistant</p>
                </div>
              </div>
              <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} sparkCount={6} duration={300} className="h-auto min-h-0">
                <button
                  onClick={() => setOpen(false)}
                  className="ui-hover-pop p-1.5 rounded-lg hover:bg-neutral-light text-neutral-dark/40 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </ClickSpark>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    variants={msgVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`
                        max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line
                        ${msg.role === "user"
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-neutral-light text-neutral-dark/80 rounded-bl-md"
                        }
                      `}
                    >
                      {msg.text}

                      {/* Clickable action results */}
                      {msg.actionResults && !msg.undone && (
                        <div className="mt-2 space-y-1">
                          {msg.actionResults
                            .filter((r) => r.navigateTo)
                            .map((r, i) => (
                              <button
                                key={i}
                                onClick={() => handleNavigate(r.navigateTo!)}
                                className="ui-hover-text flex items-center gap-1 text-xs text-primary/80 hover:text-primary underline underline-offset-2 cursor-pointer transition-colors"
                              >
                                <ExternalLink size={10} />
                                View changes
                              </button>
                            ))}
                        </div>
                      )}

                      {/* Undo button */}
                      {undoMsgId === msg.id && !msg.undone && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2"
                        >
                          <button
                            onClick={() => handleUndo(msg.id)}
                            className="ui-hover-pop flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface/80 text-neutral-dark/70 hover:bg-surface hover:text-red-500 border border-neutral-dark/10 cursor-pointer transition-all"
                          >
                            <Undo2 size={12} />
                            Undo (5s)
                          </button>
                        </motion.div>
                      )}

                      {msg.undone && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs opacity-60">
                          <Undo2 size={12} />
                          <span>Undone</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              <AnimatePresence>
                {sending && (
                  <motion.div
                    className="flex justify-start"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="bg-neutral-light rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary/40"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Token limit banner */}
            <AnimatePresence>
              {tokenLimitReached && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden border-t border-primary-light/20"
                >
                  <div className="px-4 py-3 flex items-center justify-between gap-3 bg-accent/10">
                    <p className="text-sm text-neutral-dark/80 flex-1">
                      You&apos;ve run out of daily AI tokens. Upgrade for more.
                    </p>
                    <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
                      <button
                        onClick={() => setShowPlansModal(true)}
                        className="ui-hover-spotlight px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        Upgrade
                      </button>
                    </ClickSpark>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form onSubmit={sendMessage} className="px-4 py-3 border-t border-primary-light/20">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={tokenLimitReached ? "Upgrade to continue chatting" : "Ask me anything..."}
                  disabled={tokenLimitReached}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-light text-sm text-neutral-dark placeholder:text-neutral-dark/30 border-none focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm transition-shadow hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <ClickSpark sparkColor="#fff" sparkSize={10} sparkRadius={18} className="inline-flex">
                  <motion.button
                    type="submit"
                    disabled={!input.trim() || sending || tokenLimitReached}
                    className="ui-hover-spotlight p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed"
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.1 }}
                  >
                    <Send size={16} />
                  </motion.button>
                </ClickSpark>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <PlansModal
        open={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlan={profile?.plan ?? "free"}
      />
    </>
  );
}

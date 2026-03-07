"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Bell, Calendar, CheckSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, doc, updateDoc } from "@/lib/firebase/client";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
}

type Phase =
  | "intro"
  | "sayhi"
  | "greeting"
  | "demo_reminders"
  | "demo_calendar"
  | "demo_habits"
  | "summary"
  | "nameinput"
  | "farewell"
  | "done";

/* ── visual demo components ────────────────────────── */

function ReminderDemo() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 700);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[260px] bg-white rounded-xl shadow-lg border border-gray-200/60 p-4"
    >
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3 flex items-center gap-2">
        <Bell size={14} className="text-accent" /> Reminders
      </h4>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-neutral-dark/50">
          <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          Buy groceries — Today
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-dark/50">
          <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
          Call dentist — Tomorrow
        </div>
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-center gap-2 text-sm font-medium text-primary"
            >
              <motion.span
                className="w-2 h-2 rounded-full bg-primary flex-shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
              />
              Submit report — Friday ✓
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CalendarDemo() {
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMoved(true), 800);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[260px] bg-white rounded-xl shadow-lg border border-gray-200/60 p-4"
    >
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3 flex items-center gap-2">
        <Calendar size={14} className="text-primary" /> Calendar
      </h4>
      <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base">🦷</span>
          <span className="text-sm font-semibold text-neutral-dark">
            Dentist
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={moved ? "mon" : "thu"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className={`text-xs ${moved ? "text-primary font-semibold" : "text-neutral-dark/60"}`}
          >
            {moved
              ? "Monday, Mar 9 · 2:00 PM"
              : "Thursday, Mar 5 · 2:00 PM"}
          </motion.div>
        </AnimatePresence>
        {moved && (
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
            className="inline-block text-xs text-primary font-semibold mt-1.5"
          >
            ✓ Moved
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

function HabitsDemo() {
  const [showNew, setShowNew] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setShowNew(true), 600);
    const t2 = setTimeout(() => setChecked(true), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);
  const existing = [
    { text: "Drink water", done: true },
    { text: "Exercise", done: true },
    { text: "Meditate", done: false },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-[260px] bg-white rounded-xl shadow-lg border border-gray-200/60 p-4"
    >
      <h4 className="text-sm font-semibold text-neutral-dark/80 mb-3 flex items-center gap-2">
        <CheckSquare size={14} className="text-primary" /> Habits
      </h4>
      <div className="space-y-2">
        {existing.map((h) => (
          <div key={h.text} className="flex items-center gap-2 text-sm">
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${h.done ? "bg-primary border-primary" : "border-gray-300"}`}
            >
              {h.done && (
                <span className="text-white text-[8px] font-bold">✓</span>
              )}
            </div>
            <span
              className={
                h.done
                  ? "text-neutral-dark/40 line-through"
                  : "text-neutral-dark/70"
              }
            >
              {h.text}
            </span>
          </div>
        ))}
        <AnimatePresence>
          {showNew && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-center gap-2 text-sm"
            >
              <motion.div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${checked ? "bg-primary border-primary" : "border-primary/50"}`}
              >
                {checked && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-white text-[8px] font-bold"
                  >
                    ✓
                  </motion.span>
                )}
              </motion.div>
              <span className="text-primary font-medium">Read 20 minutes</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── typing indicator ──────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-neutral-dark/40"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

/* ── narration helpers ─────────────────────────────── */

const NARRATIONS: Partial<Record<Phase, string>> = {
  sayhi: "Say Hi to Hapti AI!",
  demo_reminders: "Hapti AI can schedule your reminders",
  demo_calendar: "Hapti AI can rearrange your calendar",
  demo_habits: "Hapti AI can manage your habits",
  summary: "This is your wingman.",
  nameinput: "Type your name",
};

const PROMPT_PHASES: Phase[] = ["sayhi", "nameinput"];
const DEMO_PHASES: Phase[] = ["demo_reminders", "demo_calendar", "demo_habits"];

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ── main component ────────────────────────────────── */

export default function HaptiAiOnboardingStep({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    scroll();
  }, [messages, typing, scroll]);

  const addMsg = useCallback(
    (role: "user" | "ai", text: string): Promise<void> =>
      new Promise((resolve) => {
        if (role === "ai") {
          setTyping(true);
          scroll();
          setTimeout(() => {
            setTyping(false);
            setMessages((p) => [
              ...p,
              { id: `${role}_${Date.now()}_${Math.random()}`, role, text },
            ]);
            resolve();
          }, 800 + text.length * 6);
        } else {
          setMessages((p) => [
            ...p,
            { id: `${role}_${Date.now()}_${Math.random()}`, role, text },
          ]);
          setTimeout(resolve, 400);
        }
      }),
    [scroll],
  );

  useEffect(() => {
    const t = setTimeout(() => setChatOpen(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (chatOpen && phase === "intro") {
      const t = setTimeout(() => setPhase("sayhi"), 600);
      return () => clearTimeout(t);
    }
  }, [chatOpen, phase]);

  const handleSayHi = useCallback(async () => {
    if (!input.trim()) return;
    setInput("");
    await addMsg("user", input.trim());
    setPhase("greeting");
    await addMsg(
      "ai",
      "Hey there! I'm Hapti AI — your productivity wingman.",
    );
    await pause(800);

    setPhase("demo_reminders");
    await pause(600);
    await addMsg("user", "Remind me to submit my report on Friday");
    await addMsg("ai", "Done! Reminder set for Friday ✓");
    await pause(1000);

    setPhase("demo_calendar");
    await pause(600);
    await addMsg("user", "Move my dentist appointment to next Monday");
    await addMsg("ai", "Got it! Moved to Monday ✓");
    await pause(1000);

    setPhase("demo_habits");
    await pause(600);
    await addMsg("user", "Add a habit to read for 20 minutes every day");
    await addMsg("ai", "Added to your daily habits! ✓");
    await pause(1000);

    setPhase("summary");
    await pause(1800);

    await addMsg("ai", "Now, what do you want me to call you?");
    setPhase("nameinput");
  }, [input, addMsg]);

  const handleNameSubmit = useCallback(async () => {
    if (!nameValue.trim()) return;
    const name = nameValue.trim();
    setNameValue("");
    await addMsg("user", name);

    if (user) {
      try {
        await updateProfile(auth.currentUser!, { displayName: name });
        await updateDoc(doc(db, "users", user.uid), { displayName: name });
      } catch {
        /* best effort */
      }
    }

    await addMsg(
      "ai",
      `Great, ${name}! You can change this anytime in settings.`,
    );
    setPhase("done");
    onComplete();
  }, [nameValue, user, addMsg, onComplete]);

  const inputEnabled = phase === "sayhi" || phase === "nameinput";
  const currentInput = phase === "nameinput" ? nameValue : input;
  const setCurrentInput = phase === "nameinput" ? setNameValue : setInput;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phase === "sayhi") handleSayHi();
    else if (phase === "nameinput") handleNameSubmit();
  };

  const narration = NARRATIONS[phase] ?? null;
  const isPrompt = PROMPT_PHASES.includes(phase);
  const showDemo = DEMO_PHASES.includes(phase);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* intro icon */}
      <AnimatePresence mode="wait">
        {!chatOpen && (
          <motion.div
            key="intro-icon"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles size={28} className="text-white" />
            </motion.div>
            <p className="text-lg font-semibold text-neutral-dark">
              Meet Hapti AI
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {chatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          {/* narration text above everything */}
          <div className="text-center min-h-[36px]">
            <AnimatePresence mode="wait">
              {narration && (
                <motion.p
                  key={phase}
                  className={
                    isPrompt
                      ? "text-base font-medium text-primary"
                      : "text-lg md:text-xl font-semibold text-neutral-dark"
                  }
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  {narration}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* content: demo (left) + chat (right) */}
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center">
            {/* left — demo panel (desktop only, always occupies space) */}
            <div className="hidden md:flex flex-1 items-center justify-center min-h-[340px]">
              <AnimatePresence mode="wait">
                {phase === "demo_reminders" && <ReminderDemo key="rem" />}
                {phase === "demo_calendar" && <CalendarDemo key="cal" />}
                {phase === "demo_habits" && <HabitsDemo key="hab" />}
                {!showDemo && (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* right — chat panel */}
            <div className="flex-1 flex justify-center md:justify-start">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-primary-light/30 overflow-hidden">
                {/* header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-primary-light/20 bg-white">
                  <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-dark">
                      Hapti AI
                    </p>
                    <p className="text-[10px] text-neutral-dark/50">
                      Your habits assistant
                    </p>
                  </div>
                </div>

                {/* messages */}
                <div
                  ref={scrollRef}
                  className="h-72 overflow-y-auto px-3 py-3 space-y-2.5 bg-gray-50/50"
                >
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-white rounded-br-md"
                              : "bg-white text-neutral-dark border border-gray-200/60 rounded-bl-md shadow-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {typing && <TypingDots />}
                </div>

                {/* input */}
                <form
                  onSubmit={handleSubmit}
                  className="px-3 py-2.5 border-t border-gray-200/60 bg-white"
                >
                  <div className="flex gap-2">
                    <input
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={
                        phase === "sayhi"
                          ? "Say hi..."
                          : phase === "nameinput"
                            ? "Your name..."
                            : "..."
                      }
                      disabled={!inputEnabled}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-100 text-sm text-neutral-dark placeholder:text-neutral-dark/40 outline-none disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                    <button
                      type="submit"
                      disabled={!inputEnabled || !currentInput.trim()}
                      className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed transition-opacity"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

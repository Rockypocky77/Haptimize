"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
}

export default function HaptiAiDock() {
  const { profile } = useAuth();
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || sending) return;

      const userMsg: Message = {
        id: `user_${Date.now()}`,
        role: "user",
        text: input.trim(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setSending(true);

      try {
        const res = await api.aiChat(userMsg.text, profile?.uid);
        const reply = (res as Record<string, unknown>).reply as string;
        setMessages((prev) => [
          ...prev,
          {
            id: `ai_${Date.now()}`,
            role: "ai",
            text: reply ?? "I'm not sure how to respond to that.",
          },
        ]);
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
    [input, sending, profile?.uid]
  );

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-50 cursor-pointer"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-primary-light/30 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary-light/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                <Sparkles size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-dark">
                  Hapti AI
                </p>
                <p className="text-[10px] text-neutral-dark/40">
                  Your habits assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-neutral-light text-neutral-dark/40 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`
                    max-w-[80%] px-4 py-2.5 rounded-2xl text-sm
                    ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-md"
                        : "bg-neutral-light text-neutral-dark/80 rounded-bl-md"
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-neutral-light rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="px-4 py-3 border-t border-primary-light/20"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-light text-sm text-neutral-dark placeholder:text-neutral-dark/30 border-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ClickSpark from "@/components/ui/ClickSpark";
import Button from "@/components/ui/Button";
import type { PlanTier } from "@/contexts/AuthContext";

interface PlansModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan?: PlanTier;
  onUpgrade?: (tier: "pro" | "max") => void;
}

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    badge: "Starter",
    limits: [
      "Habits: up to 10",
      "Reminders: up to 20",
      "Categories: up to 5",
      "AI messages: 5k tokens per day",
    ],
    features: [
      "Habit tracking",
      "Reminders",
      "Calendar",
      "Basic stats (completion %, streaks, etc.)",
      "Limited Hapti AI",
    ],
    goal: "Let people experience the product, but encourage upgrading.",
    colorClass: "text-primary bg-primary/20",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$9.99",
    period: "/ month",
    badge: "Most Popular",
    limits: [
      "Habits: Unlimited",
      "Reminders: Unlimited",
      "Categories: 8",
      "AI messages: 30k per day",
    ],
    features: [
      "Everything in Free",
      "Advanced analytics / habit insights",
      "AI habit suggestions",
      "Better productivity insights",
    ],
    goal: "Main paid tier most users buy.",
    colorClass: "text-accent bg-accent/20",
  },
  {
    id: "max" as const,
    name: "Max",
    price: "$19.99",
    period: "/ month",
    badge: "Power Users",
    limits: [
      "Habits: Unlimited",
      "Reminders: Unlimited",
      "Categories: 16",
      "AI messages: 100k tokens per day",
    ],
    features: [
      "Everything in Pro",
      "Text Hapti assistant (natural texting-style commands)",
      "Priority AI responses",
      "Future premium AI features",
    ],
    goal: "Heavy users who want a personal AI productivity assistant.",
    colorClass: "text-primary-light bg-primary-light/20",
  },
];

export default function PlansModal({
  open,
  onClose,
  currentPlan = "free",
  onUpgrade,
}: PlansModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          <motion.div
            className="absolute inset-0 bg-neutral-dark/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex flex-col min-h-screen bg-surface"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-dark/10 shrink-0">
              <h2 className="text-xl font-semibold text-neutral-dark">
                Plans & Pricing
              </h2>
              <ClickSpark
                sparkColor="#7FAF8F"
                sparkSize={10}
                sparkRadius={18}
                sparkCount={6}
                duration={300}
                className="h-auto min-h-0"
              >
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-neutral-light text-neutral-dark/60 cursor-pointer transition-colors"
                >
                  <X size={24} />
                </button>
              </ClickSpark>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                {TIERS.map((tier, i) => {
                  const isCurrent = currentPlan === tier.id;
                  const isPaid = tier.id !== "free";
                  return (
                    <motion.div
                      key={tier.id}
                      className={`
                        rounded-2xl border p-6 flex flex-col
                        ${isCurrent ? "border-primary ring-2 ring-primary/20" : "border-primary-light/30"}
                      `}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        delay: 0.1 + i * 0.05,
                        duration: 0.35,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tier.colorClass}`}
                        >
                          {tier.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-xs font-medium text-primary">
                            Current Plan
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-neutral-dark mb-1">
                        {tier.name}
                      </h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-2xl font-bold text-neutral-dark">
                          {tier.price}
                        </span>
                        {tier.period && (
                          <span className="text-sm text-neutral-dark/50">
                            {tier.period}
                          </span>
                        )}
                      </div>
                      <ul className="space-y-2 mb-4 flex-1">
                        {tier.limits.map((limit, j) => (
                          <li
                            key={j}
                            className="text-sm text-neutral-dark/70 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-light/60 flex-shrink-0" />
                            {limit}
                          </li>
                        ))}
                      </ul>
                      <ul className="space-y-2 mb-4">
                        {tier.features.map((feature, j) => (
                          <li
                            key={j}
                            className="text-sm text-neutral-dark/80 flex items-center gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-neutral-dark/40 mb-4">
                        {tier.goal}
                      </p>
                      {isCurrent ? (
                        <Button disabled className="w-full" size="sm">
                          Current Plan
                        </Button>
                      ) : isPaid ? (
                        <Button
                          disabled
                          variant="secondary"
                          className="w-full cursor-not-allowed"
                          size="sm"
                          onClick={() => onUpgrade?.(tier.id)}
                        >
                          Upgrade
                        </Button>
                      ) : null}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

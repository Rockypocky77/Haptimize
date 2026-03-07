"use client";

import { Check, Trash2 } from "lucide-react";
import ClickSpark from "@/components/ui/ClickSpark";

interface HabitItemProps {
  id: string;
  title: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function HabitItem({
  id,
  title,
  completed,
  onToggle,
  onDelete,
}: HabitItemProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl group
        ${completed ? "bg-primary/5" : "bg-neutral-light/60 hover:bg-neutral-light"}
      `}
      style={{
        transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.015)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="!w-auto !h-auto flex-shrink-0">
      <button
        onClick={() => onToggle(id)}
        className={`
          w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 cursor-pointer
          transition-all duration-150
          ${
            completed
              ? "bg-primary border-primary text-white"
              : "border-primary-light/60 hover:border-primary"
          }
        `}
      >
        {completed && <Check size={14} strokeWidth={3} />}
      </button>
      </ClickSpark>
      <span
        className={`flex-1 min-w-0 text-sm ${
          completed
            ? "text-neutral-dark/40 line-through"
            : "text-neutral-dark/80"
        }`}
      >
        {title}
      </span>
      <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="!w-auto !h-auto flex-shrink-0">
      <button
        onClick={() => onDelete(id)}
        className="p-1 rounded text-neutral-dark/30 hover:text-error cursor-pointer transition-colors"
      >
        <Trash2 size={14} />
      </button>
      </ClickSpark>
    </div>
  );
}

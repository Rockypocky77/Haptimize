"use client";

import { Check, Undo2, GripVertical, Trash2 } from "lucide-react";
import ClickSpark from "@/components/ui/ClickSpark";

interface ReminderCardProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  onDelete?: (id: string) => void;
  draggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
  categoryColor?: string;
}

export default function ReminderCard({
  id,
  text,
  completed,
  onToggle,
  onDelete,
  draggable = false,
  dragHandleProps,
  categoryColor,
}: ReminderCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl bg-white
        border group
        ${completed ? "border-primary/20 bg-primary/5" : "border-primary-light/30"}
      `}
      style={{
        transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease, border-color 150ms ease",
        ...(categoryColor
          ? { borderLeftWidth: 4, borderLeftColor: categoryColor }
          : {}),
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.015)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {draggable && (
        <ClickSpark sparkColor="#7FAF8F" sparkSize={6} sparkRadius={10} className="!w-auto !h-auto flex-shrink-0">
        <span
          className="cursor-grab text-neutral-dark/25 hover:text-neutral-dark/50"
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </span>
        </ClickSpark>
      )}

      <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="!w-auto !h-auto flex-shrink-0">
      <button
        onClick={() => onToggle(id)}
        className={`
          w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 cursor-pointer
          ${
            completed
              ? "bg-primary border-primary text-white"
              : "border-primary-light/60 hover:border-primary"
          }
        `}
      >
        {completed && <Check size={12} strokeWidth={3} />}
      </button>
      </ClickSpark>

      <span
        className={`flex-1 min-w-0 text-sm ${
          completed
            ? "text-neutral-dark/40 line-through"
            : "text-neutral-dark/80"
        }`}
      >
        {text}
      </span>

      {completed && (
        <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="!w-auto !h-auto flex-shrink-0">
        <button
          onClick={() => onToggle(id)}
          className="p-1 rounded text-neutral-dark/30 hover:text-primary cursor-pointer"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
        </ClickSpark>
      )}
      {onDelete && (
        <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="!w-auto !h-auto flex-shrink-0">
        <button
          onClick={() => onDelete(id)}
          className="p-1 rounded text-neutral-dark/30 hover:text-error cursor-pointer transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
        </ClickSpark>
      )}
    </div>
  );
}

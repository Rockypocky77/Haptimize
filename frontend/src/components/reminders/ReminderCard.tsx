"use client";

import { Check, Undo2, GripVertical } from "lucide-react";

interface ReminderCardProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
  draggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export default function ReminderCard({
  id,
  text,
  completed,
  onToggle,
  draggable = false,
  dragHandleProps,
}: ReminderCardProps) {
  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl bg-white
        border transition-colors duration-150
        ${completed ? "border-primary/20 bg-primary/5" : "border-primary-light/30"}
      `}
    >
      {draggable && (
        <span
          className="cursor-grab text-neutral-dark/25 hover:text-neutral-dark/50"
          {...dragHandleProps}
        >
          <GripVertical size={16} />
        </span>
      )}

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

      <span
        className={`flex-1 text-sm ${
          completed
            ? "text-neutral-dark/40 line-through"
            : "text-neutral-dark/80"
        }`}
      >
        {text}
      </span>

      {completed && (
        <button
          onClick={() => onToggle(id)}
          className="p-1 rounded text-neutral-dark/30 hover:text-primary cursor-pointer"
          title="Undo"
        >
          <Undo2 size={14} />
        </button>
      )}
    </div>
  );
}

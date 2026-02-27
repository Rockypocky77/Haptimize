"use client";

import { Check, Trash2 } from "lucide-react";

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
        flex items-center gap-3 px-4 py-3 rounded-xl
        transition-colors duration-150 group
        ${completed ? "bg-primary/5" : "bg-neutral-light/60 hover:bg-neutral-light"}
      `}
    >
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
      <span
        className={`flex-1 text-sm ${
          completed
            ? "text-neutral-dark/40 line-through"
            : "text-neutral-dark/80"
        }`}
      >
        {title}
      </span>
      <button
        onClick={() => onDelete(id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-dark/30 hover:text-error cursor-pointer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

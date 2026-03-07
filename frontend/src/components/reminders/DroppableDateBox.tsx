"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableDateBoxProps {
  dateStr: string;
  children: ReactNode;
}

export default function DroppableDateBox({
  dateStr,
  children,
}: DroppableDateBoxProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${dateStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border-2 border-dashed min-h-[80px] bg-white shadow-sm ${
        isOver ? "border-primary bg-primary/5" : "border-primary-light/30"
      }`}
      style={{
        transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease, border-color 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.015)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      {children}
    </div>
  );
}

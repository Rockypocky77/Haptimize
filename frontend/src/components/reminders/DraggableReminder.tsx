"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ReminderCard from "./ReminderCard";

interface DraggableReminderProps {
  id: string;
  text: string;
  completed: boolean;
  onToggle: (id: string) => void;
}

export default function DraggableReminder({
  id,
  text,
  completed,
  onToggle,
}: DraggableReminderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ReminderCard
        id={id}
        text={text}
        completed={completed}
        onToggle={onToggle}
        draggable
        dragHandleProps={listeners}
      />
    </div>
  );
}

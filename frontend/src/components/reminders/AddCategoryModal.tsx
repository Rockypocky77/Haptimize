"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";

export interface Category {
  id: string;
  name: string;
  color: string;
}

export const CATEGORY_COLORS = [
  "#7FAF8F", // primary green
  "#F2C94C", // accent yellow
  "#E07C5C", // coral
  "#6B8E9E", // slate blue
  "#9B7EDE", // purple
  "#E57373", // red
  "#64B5F6", // blue
  "#81C784", // light green
];

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  /** Return true when the category was saved (or demo OK); false to keep the modal open. */
  onAdd: (name: string, color: string) => Promise<boolean>;
}

export default function AddCategoryModal({
  open,
  onClose,
  onAdd,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const ok = await onAdd(name.trim(), color);
      if (ok) {
        setName("");
        setColor(CATEGORY_COLORS[0]);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setColor(CATEGORY_COLORS[0]);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Add category">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div>
          <p className="text-sm font-medium text-neutral-dark mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <ClickSpark
                key={c}
                sparkColor={c}
                sparkSize={8}
                sparkRadius={14}
                className="!w-auto !h-auto"
              >
                <button
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === c
                      ? "border-neutral-dark scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              </ClickSpark>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || submitting}>
            {submitting ? "Saving…" : "Add category"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

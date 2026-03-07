"use client";

import { type ReactNode, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import ClickSpark from "@/components/ui/ClickSpark";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
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

  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-neutral-dark/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-dark">{title}</h3>
          )}
          <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} sparkCount={6} duration={300} className="ml-auto h-auto min-h-0">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-neutral-light text-neutral-dark/60 cursor-pointer"
            >
              <X size={20} />
            </button>
          </ClickSpark>
        </div>
        {children}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

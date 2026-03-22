"use client";

import { type ReactNode, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-neutral-dark/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 bg-surface rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/lib/legal-content";
import ClickSpark from "@/components/ui/ClickSpark";

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export default function LegalModal({ open, onClose, type }: LegalModalProps) {
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

  const legalDoc = type === "terms" ? TERMS_OF_SERVICE : PRIVACY_POLICY;

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
            className="relative z-10 bg-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col mx-4 overflow-hidden"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-dark/10 shrink-0">
              <h3 className="text-lg font-semibold text-neutral-dark">
                {legalDoc.title}
              </h3>
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
                  className="p-1 rounded-lg hover:bg-neutral-light text-neutral-dark/60 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </ClickSpark>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-neutral-dark/50 mb-6">
                Last Updated: {legalDoc.lastUpdated}
              </p>
              <div className="space-y-6 text-neutral-dark/80">
                {"sections" in legalDoc &&
                  legalDoc.sections.map((section, i) => (
                    <motion.section
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.04, duration: 0.35 }}
                    >
                      <h4 className="text-base font-semibold text-neutral-dark mb-2">
                        {section.title}
                      </h4>
                      {"subsections" in section && section.subsections ? (
                        <div className="space-y-4">
                          {section.subsections.map((sub, j) => (
                            <div key={j}>
                              <h5 className="text-sm font-medium text-neutral-dark/90 mb-1">
                                {sub.title}
                              </h5>
                              <p className="text-sm leading-relaxed">
                                {sub.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "content" in section && (
                          <p className="text-sm leading-relaxed">
                            {section.content}
                          </p>
                        )
                      )}
                    </motion.section>
                  ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}

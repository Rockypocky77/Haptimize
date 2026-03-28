"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/lib/legal-content";
import { Check } from "lucide-react";
import { ONBOARD_EASE_OUT } from "@/lib/onboarding-motion";

const SCROLL_THRESHOLD = 10;

function LegalDocument({
  title,
  lastUpdated,
  sections,
  compact = false,
}: {
  title: string;
  lastUpdated: string;
  compact?: boolean;
  sections: Array<
    | { title: string; content: string }
    | { title: string; subsections?: Array<{ title: string; content: string }> }
  >;
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <h3 className={compact ? "text-sm font-bold text-neutral-dark" : "text-lg font-bold text-neutral-dark"}>
        {title}
      </h3>
      <p className={compact ? "text-[10px] text-neutral-dark/50" : "text-xs text-neutral-dark/50"}>
        Last Updated: {lastUpdated}
      </p>
      <div className={compact ? "space-y-2" : "space-y-4"}>
        {sections.map((section, i) => (
          <div key={i}>
            <h4
              className={
                compact
                  ? "text-[11px] font-semibold text-neutral-dark/80 mb-0.5"
                  : "text-sm font-semibold text-neutral-dark/80 mb-1"
              }
            >
              {section.title}
            </h4>
            {"subsections" in section && section.subsections ? (
              <div className={`${compact ? "space-y-1 pl-1" : "space-y-2 pl-2"}`}>
                {section.subsections.map((sub, j) => (
                  <div key={j}>
                    <h5
                      className={
                        compact
                          ? "text-[10px] font-medium text-neutral-dark/70"
                          : "text-xs font-medium text-neutral-dark/70"
                      }
                    >
                      {sub.title}
                    </h5>
                    <p className={compact ? "text-[11px] text-neutral-dark/60 leading-snug" : "text-sm text-neutral-dark/60"}>
                      {sub.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={compact ? "text-[11px] text-neutral-dark/60 leading-snug" : "text-sm text-neutral-dark/60"}>
                {"content" in section ? section.content : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TermsAgreementFormProps {
  onAgree: () => void | Promise<void>;
  buttonLabel?: string;
  /** Fill parent height; legal text scrolls inside each panel only (no page scroll). */
  fitViewport?: boolean;
}

function isScrolledToBottom(el: HTMLElement) {
  if (el.scrollHeight <= el.clientHeight) return true;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
}

export default function TermsAgreementForm({
  onAgree,
  buttonLabel = "Agree and Continue →",
  fitViewport = false,
}: TermsAgreementFormProps) {
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const termsRef = useRef<HTMLDivElement>(null);
  const privacyRef = useRef<HTMLDivElement>(null);

  const canContinue = termsScrolled && privacyScrolled;

  const checkTermsScroll = useCallback(() => {
    if (termsRef.current && isScrolledToBottom(termsRef.current)) {
      setTermsScrolled(true);
    }
  }, []);

  const checkPrivacyScroll = useCallback(() => {
    if (privacyRef.current && isScrolledToBottom(privacyRef.current)) {
      setPrivacyScrolled(true);
    }
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      checkTermsScroll();
      checkPrivacyScroll();
    });
    return () => cancelAnimationFrame(raf);
  }, [checkTermsScroll, checkPrivacyScroll]);

  const handleAgree = async () => {
    if (!canContinue) return;
    await onAgree();
  };

  const scrollBoxClass = fitViewport
    ? "rounded-xl border border-neutral-dark/10 bg-white/50 p-2 sm:p-3 flex-1 min-h-0 overflow-y-auto overscroll-contain"
    : "rounded-xl border border-neutral-dark/10 bg-white/50 p-4 max-h-[320px] overflow-y-auto";

  return (
    <motion.div
      className={fitViewport ? "flex flex-col h-full min-h-0 gap-2 overflow-hidden" : "space-y-6"}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.52, ease: ONBOARD_EASE_OUT }}
    >
      <div
        className={
          fitViewport
            ? "grid flex-1 min-h-0 grid-cols-1 md:grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-1 gap-2 md:gap-3 overflow-hidden"
            : "grid gap-6 md:grid-cols-2"
        }
      >
        <motion.div
          className={fitViewport ? "flex flex-col min-h-0 gap-1 overflow-hidden" : "space-y-2"}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12, duration: 0.48, ease: ONBOARD_EASE_OUT }}
        >
          <div
            ref={termsRef}
            onScroll={checkTermsScroll}
            className={scrollBoxClass}
          >
            <LegalDocument
              title={TERMS_OF_SERVICE.title}
              lastUpdated={TERMS_OF_SERVICE.lastUpdated}
              sections={TERMS_OF_SERVICE.sections}
              compact={fitViewport}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AnimatePresence mode="wait">
              {termsScrolled ? (
                <motion.span
                  key="read"
                  className="text-primary flex items-center gap-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Check size={14} /> Read
                </motion.span>
              ) : (
                <motion.span
                  key="scroll"
                  className="text-neutral-dark/50"
                  exit={{ opacity: 0 }}
                >
                  Scroll to bottom
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        <motion.div
          className={fitViewport ? "flex flex-col min-h-0 gap-1 overflow-hidden" : "space-y-2"}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.48, ease: ONBOARD_EASE_OUT }}
        >
          <div
            ref={privacyRef}
            onScroll={checkPrivacyScroll}
            className={scrollBoxClass}
          >
            <LegalDocument
              title={PRIVACY_POLICY.title}
              lastUpdated={PRIVACY_POLICY.lastUpdated}
              sections={PRIVACY_POLICY.sections}
              compact={fitViewport}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AnimatePresence mode="wait">
              {privacyScrolled ? (
                <motion.span
                  key="read"
                  className="text-primary flex items-center gap-1"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Check size={14} /> Read
                </motion.span>
              ) : (
                <motion.span
                  key="scroll"
                  className="text-neutral-dark/50"
                  exit={{ opacity: 0 }}
                >
                  Scroll to bottom
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <div
        className={`flex flex-col items-center w-full shrink-0 ${fitViewport ? "gap-2 pt-1" : "gap-4 pt-2"}`}
      >
        <p className="text-[10px] sm:text-xs text-neutral-dark/50 text-center max-w-md leading-snug px-1">
          {fitViewport
            ? "Scroll each panel to the bottom to enable Agree."
            : "You must scroll through both documents to the bottom before you can agree."}
        </p>

        <ClickSpark
          sparkColor="#7FAF8F"
          sparkSize={8}
          sparkRadius={14}
          className="inline-flex justify-center"
        >
          <Button onClick={handleAgree} disabled={!canContinue} size={fitViewport ? "md" : "lg"}>
            {buttonLabel}
          </Button>
        </ClickSpark>
      </div>
    </motion.div>
  );
}

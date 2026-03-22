"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/lib/legal-content";
import { Check } from "lucide-react";

const SCROLL_THRESHOLD = 10;

function LegalDocument({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: Array<
    | { title: string; content: string }
    | { title: string; subsections?: Array<{ title: string; content: string }> }
  >;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-neutral-dark">{title}</h3>
      <p className="text-xs text-neutral-dark/50">Last Updated: {lastUpdated}</p>
      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            <h4 className="text-sm font-semibold text-neutral-dark/80 mb-1">
              {section.title}
            </h4>
            {"subsections" in section && section.subsections ? (
              <div className="space-y-2 pl-2">
                {section.subsections.map((sub, j) => (
                  <div key={j}>
                    <h5 className="text-xs font-medium text-neutral-dark/70">
                      {sub.title}
                    </h5>
                    <p className="text-sm text-neutral-dark/60">{sub.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-dark/60">
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
}

function isScrolledToBottom(el: HTMLElement) {
  if (el.scrollHeight <= el.clientHeight) return true;
  return el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
}

export default function TermsAgreementForm({
  onAgree,
  buttonLabel = "Agree and Continue →",
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

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div
            ref={termsRef}
            onScroll={checkTermsScroll}
            className="rounded-xl border border-neutral-dark/10 bg-white/50 p-4 max-h-[320px] overflow-y-auto"
          >
            <LegalDocument
              title={TERMS_OF_SERVICE.title}
              lastUpdated={TERMS_OF_SERVICE.lastUpdated}
              sections={TERMS_OF_SERVICE.sections}
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
          className="space-y-2"
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <div
            ref={privacyRef}
            onScroll={checkPrivacyScroll}
            className="rounded-xl border border-neutral-dark/10 bg-white/50 p-4 max-h-[320px] overflow-y-auto"
          >
            <LegalDocument
              title={PRIVACY_POLICY.title}
              lastUpdated={PRIVACY_POLICY.lastUpdated}
              sections={PRIVACY_POLICY.sections}
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

      <p className="text-xs text-neutral-dark/50">
        You must scroll through both documents to the bottom before you can agree.
      </p>

      <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
        <Button onClick={handleAgree} disabled={!canContinue} size="lg">
          {buttonLabel}
        </Button>
      </ClickSpark>
    </motion.div>
  );
}

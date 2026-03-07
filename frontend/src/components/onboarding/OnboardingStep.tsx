"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";

interface OnboardingStepProps {
  children: React.ReactNode;
  buttonLabel: string;
  onNext: () => void;
  buttonDisabled?: boolean;
  showButton?: boolean;
  secondaryButtonLabel?: string;
  onSecondaryClick?: () => void;
  wide?: boolean;
}

export default function OnboardingStep({
  children,
  buttonLabel,
  onNext,
  buttonDisabled = false,
  showButton = true,
  secondaryButtonLabel,
  onSecondaryClick,
  wide = false,
}: OnboardingStepProps) {
  return (
    <motion.div
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className={`flex-1 flex flex-col items-center justify-center w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        {children}
      </div>
      {(showButton || secondaryButtonLabel) && (
        <motion.div
          className="mt-12 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {showButton && (
            <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
              <Button onClick={onNext} disabled={buttonDisabled} size="lg">
                {buttonLabel}
              </Button>
            </ClickSpark>
          )}
          {secondaryButtonLabel && onSecondaryClick && (
            <button
              onClick={onSecondaryClick}
              className="text-sm text-neutral-dark/60 hover:text-neutral-dark transition-colors cursor-pointer"
            >
              {secondaryButtonLabel}
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

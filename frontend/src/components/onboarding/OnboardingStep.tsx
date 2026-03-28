"use client";

import { motion } from "framer-motion";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";
import { contentStagger } from "@/lib/onboarding-motion";

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
  /* Outer fade handled by onboarding page — avoid double opacity stacking */
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
      <div className={`flex-1 flex flex-col items-center justify-center w-full ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
        {children}
      </div>
      {(showButton || secondaryButtonLabel) && (
        <motion.div
          className="mt-12 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={contentStagger}
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
              className="ui-hover-text text-sm text-neutral-dark/60 hover:text-neutral-dark transition-colors cursor-pointer"
            >
              {secondaryButtonLabel}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

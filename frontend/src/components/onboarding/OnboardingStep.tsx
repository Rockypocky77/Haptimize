"use client";

import { AnimatePresence, motion } from "framer-motion";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";
import { ONBOARD_EASE_OUT, contentStagger } from "@/lib/onboarding-motion";

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
  const hasFooter = showButton || secondaryButtonLabel;

  return (
    <div className="h-full min-h-0 w-full flex flex-col items-stretch overflow-hidden px-3 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div
        className={`flex-1 min-h-0 flex flex-col items-center justify-center w-full mx-auto overflow-hidden ${wide ? "max-w-5xl" : "max-w-2xl"}`}
      >
        {children}
      </div>
      {hasFooter && (
        <div className="mt-2 pt-1 w-full flex flex-col items-center gap-2 min-h-[76px] justify-end shrink-0">
          <AnimatePresence mode="sync">
            {showButton && (
              <motion.div
                key="primary-cta"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{
                  opacity: { duration: 0.35, ease: ONBOARD_EASE_OUT },
                  y: { duration: 0.42, ease: ONBOARD_EASE_OUT },
                  scale: { duration: 0.42, ease: ONBOARD_EASE_OUT },
                }}
              >
                <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
                  <Button onClick={onNext} disabled={buttonDisabled} size="lg">
                    {buttonLabel}
                  </Button>
                </ClickSpark>
              </motion.div>
            )}
          </AnimatePresence>
          {secondaryButtonLabel && onSecondaryClick && (
            <motion.button
              type="button"
              onClick={onSecondaryClick}
              className="ui-hover-text text-sm text-neutral-dark/60 hover:text-neutral-dark transition-colors cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...contentStagger, delay: contentStagger.delay + 0.05 }}
            >
              {secondaryButtonLabel}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

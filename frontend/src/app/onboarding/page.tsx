"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import TermsAndPrivacyStep from "@/components/onboarding/TermsAndPrivacyStep";
import GraphAnimation from "@/components/onboarding/GraphAnimation";
import AnimatedBallSlope from "@/components/onboarding/AnimatedBallSlope";
import DashboardPreview from "@/components/onboarding/DashboardPreview";
import HaptiAiOnboardingStep from "@/components/onboarding/HaptiAiOnboardingStep";
import BlurText from "@/components/onboarding/BlurText";
import { TextShimmer } from "@/components/onboarding/TextShimmer";
import { ONBOARD_EASE_OUT, stepPresenceTransition } from "@/lib/onboarding-motion";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, completeOnboarding } = useAuth();
  const { endTransition, startTransition } = useTransition();
  const [step, setStep] = useState(0);

  const [ballDone, setBallDone] = useState(false);
  const [dashboardDone, setDashboardDone] = useState(false);
  const [aiDone, setAiDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => endTransition(), 150);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    if (!user) {
      startTransition("/");
      return;
    }
    if (user.isAnonymous) {
      completeOnboarding().then(() => startTransition("/home"));
      return;
    }
    if (profile?.onboardingComplete) {
      startTransition("/home");
    }
  }, [user, profile, loading, startTransition, completeOnboarding, router]);

  const handleFinish = useCallback(async () => {
    await completeOnboarding();
    startTransition("/home");
  }, [completeOnboarding, startTransition]);

  const next = useCallback(() => setStep((s) => s + 1), []);

  const replayOnboarding = useCallback(() => {
    setStep(1);
    setBallDone(false);
    setDashboardDone(false);
    setAiDone(false);
  }, []);

  const onBallComplete = useCallback(() => setBallDone(true), []);
  const onDashboardComplete = useCallback(() => setDashboardDone(true), []);
  const onAiComplete = useCallback(() => setAiDone(true), []);

  if (loading || !user) return null;

  return (
    <div className="min-h-[100dvh] bg-neutral-light overflow-x-hidden">
      {/* Progress bar — scaleX avoids layout thrash from width % */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-primary/15">
        <motion.div
          className="h-full bg-primary origin-left"
          style={{ width: "100%" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: (step + 1) / 6 }}
          transition={{ duration: 0.58, ease: ONBOARD_EASE_OUT }}
        />
      </div>

      {/* Overlapping steps + sync crossfade avoids wait-mode pop between screens */}
      <div className="relative min-h-[100dvh] w-full">
        <AnimatePresence mode="sync">
          {step === 0 && (
            <motion.div
              key="step0"
              className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <TermsAndPrivacyStep onAgree={next} />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              className="absolute inset-0 z-10 overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <OnboardingStep buttonLabel="Next →" onNext={next}>
                <GraphAnimation />
              </OnboardingStep>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              className="absolute inset-0 z-10 overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <OnboardingStep buttonLabel="Next →" onNext={next} showButton={ballDone}>
                <AnimatedBallSlope onComplete={onBallComplete} />
              </OnboardingStep>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <OnboardingStep buttonLabel="Next →" onNext={next} showButton={dashboardDone}>
                <DashboardPreview onComplete={onDashboardComplete} />
              </OnboardingStep>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <OnboardingStep buttonLabel="Next →" onNext={next} showButton={aiDone} wide>
                <HaptiAiOnboardingStep onComplete={onAiComplete} />
              </OnboardingStep>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              className="absolute inset-0 z-10 overflow-x-hidden bg-neutral-light"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={stepPresenceTransition}
            >
              <OnboardingStep
                buttonLabel="Create your system →"
                onNext={handleFinish}
                secondaryButtonLabel="Replay onboarding"
                onSecondaryClick={replayOnboarding}
              >
                <div className="text-center space-y-6 max-w-lg mx-auto px-2">
                  <BlurText
                    text="Small changes."
                    delay={150}
                    animateBy="words"
                    direction="top"
                    className="text-3xl md:text-5xl font-black text-neutral-dark"
                  />
                  <BlurText
                    text="Massive results."
                    delay={150}
                    animateBy="words"
                    direction="top"
                    className="text-3xl md:text-5xl font-black text-primary"
                  />
                  <ul className="text-left text-sm text-neutral-dark/70 space-y-2 max-w-sm mx-auto pt-2">
                    <li className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">·</span>
                      <span>
                        <strong className="text-neutral-dark">Home</strong> — today&apos;s habit ring, analytics, recap (Pro/Max), streak, reminder preview, and habits still due.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">·</span>
                      <span>
                        <strong className="text-neutral-dark">Checklist</strong> — build habits and check them off; progress feeds the ring on Home.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">·</span>
                      <span>
                        <strong className="text-neutral-dark">Reminders</strong> — casual list or dated reminders; optional color categories.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">·</span>
                      <span>
                        <strong className="text-neutral-dark">Calendar</strong> — month view of dated reminders (separate from Home).
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-primary font-bold shrink-0">·</span>
                      <span>
                        <strong className="text-neutral-dark">Hapti AI</strong> — chat to add reminders, adjust dated items, and create habits (when enabled).
                      </span>
                    </li>
                  </ul>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.85,
                      duration: 0.55,
                      ease: ONBOARD_EASE_OUT,
                    }}
                  >
                    <TextShimmer className="text-lg font-medium mt-2 [--base-color:#4a8a5e] [--base-gradient-color:#2E3A3F]" duration={3}>
                      Ready to start improving?
                    </TextShimmer>
                  </motion.div>
                </div>
              </OnboardingStep>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

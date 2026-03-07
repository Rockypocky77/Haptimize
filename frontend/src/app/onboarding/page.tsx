"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";
import OnboardingStep from "@/components/onboarding/OnboardingStep";
import GraphAnimation from "@/components/onboarding/GraphAnimation";
import AnimatedBallSlope from "@/components/onboarding/AnimatedBallSlope";
import DashboardPreview from "@/components/onboarding/DashboardPreview";
import HaptiAiOnboardingStep from "@/components/onboarding/HaptiAiOnboardingStep";
import BlurText from "@/components/onboarding/BlurText";
import { TextShimmer } from "@/components/onboarding/TextShimmer";

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
    setStep(0);
    setBallDone(false);
    setDashboardDone(false);
    setAiDone(false);
  }, []);

  const onBallComplete = useCallback(() => setBallDone(true), []);
  const onDashboardComplete = useCallback(() => setDashboardDone(true), []);
  const onAiComplete = useCallback(() => setAiDone(true), []);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-neutral-light overflow-hidden">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-1 bg-primary z-50"
        initial={{ width: "0%" }}
        animate={{ width: `${((step + 1) / 5) * 100}%` }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      />

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <OnboardingStep buttonLabel="Next →" onNext={next}>
              <GraphAnimation />
            </OnboardingStep>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <OnboardingStep buttonLabel="Next →" onNext={next} showButton={ballDone}>
              <AnimatedBallSlope onComplete={onBallComplete} />
            </OnboardingStep>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <OnboardingStep buttonLabel="Next →" onNext={next} showButton={dashboardDone}>
              <DashboardPreview onComplete={onDashboardComplete} />
            </OnboardingStep>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <OnboardingStep buttonLabel="Next →" onNext={next} showButton={aiDone} wide>
              <HaptiAiOnboardingStep onComplete={onAiComplete} />
            </OnboardingStep>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <OnboardingStep
              buttonLabel="Create your system →"
              onNext={handleFinish}
              secondaryButtonLabel="Replay onboarding"
              onSecondaryClick={replayOnboarding}
            >
              <div className="text-center space-y-6">
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                >
                  <TextShimmer className="text-lg font-medium mt-6 [--base-color:#4a8a5e] [--base-gradient-color:#2E3A3F]" duration={3}>
                    Ready to start improving?
                  </TextShimmer>
                </motion.div>
              </div>
            </OnboardingStep>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

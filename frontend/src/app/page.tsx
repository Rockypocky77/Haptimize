"use client";

import { useEffect } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";
import BlobBackground from "@/components/ui/BlobBackground";
import WindGust from "@/components/landing/WindGust";
import AnimatedTextCycle from "@/components/ui/animated-text-cycle";

export default function LandingPage() {
  const { user, loading, signInAnonymously } = useAuth();
  const { startTransition, endTransition } = useTransition();

  useEffect(() => {
    const t = setTimeout(() => endTransition(), 150);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && user) {
      startTransition("/home");
    }
  }, [loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[#F0F5F2]">
      <BlobBackground />
      <WindGust />

      {/* 50/50 center-balanced layout — desktop only */}
      <div className="hidden lg:grid flex-1 grid-cols-2 min-h-screen relative z-10">
        {/* Left 50% — logo stays centered; text close to logo */}
        <div className="hidden lg:flex items-center justify-end pr-8 lg:pr-16">
          <div className="max-w-2xl flex flex-col items-start text-left">
            <Image
              src="/HaptimizeTLogo.png"
              alt="Haptimize"
              width={440}
              height={110}
              className="w-[440px] h-auto -mt-[200px] -translate-x-[50px] translate-y-[100px]"
              priority
            />
            <div>
              <h1 className="text-5xl font-bold text-neutral-dark leading-tight">
                Win Today&hellip;
                <br />
                <span className="text-primary">Win Tomorrow&hellip;</span>
              </h1>
              <p className="text-xl text-neutral-dark/80 max-w-xl mt-3">
                Let consistency turn small wins into massive results.
              </p>
            </div>
          </div>
        </div>

        {/* Right 50% — frosted panel with Get Started + Demo (aligned toward center) */}
        <div className="flex items-center justify-start pl-8 lg:pl-16 p-8">
          <div
            className="w-full max-w-lg rounded-[40px] p-12 min-h-[420px] flex flex-col justify-between border border-white/70 bg-white/40 backdrop-blur-2xl overflow-hidden relative"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.8) inset, 0 30px 60px -15px rgba(127, 175, 143, 0.08), 0 10px 25px -10px rgba(46, 58, 63, 0.04)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[40px]"
              aria-hidden
            />
            <div className="flex-1 flex items-center pt-4 pl-[15px]">
              <div>
                <p className="text-sm text-neutral-dark/60 mb-1">With Haptimize,</p>
                <h2 className="text-3xl font-light text-left text-neutral-dark/80 whitespace-nowrap">
                Improve your{" "}
                <AnimatedTextCycle
                  words={[
                    "consistency",
                    "discipline",
                    "health",
                    "productivity",
                    "focus",
                    "routine",
                    "habits",
                    "strength",
                  ]}
                  interval={3000}
                  className="text-primary font-semibold"
                />
                {" "}daily.
                </h2>
              </div>
            </div>
            <div className="space-y-5 pb-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="py-4 text-lg"
                onClick={() => startTransition("/signup")}
              >
                Get Started →
              </Button>
              <Button
                variant="secondary"
                size="lg"
                fullWidth
                className="py-4 text-lg"
                onClick={async () => {
                  await signInAnonymously();
                  startTransition("/onboarding");
                }}
              >
                Try Demo →
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="lg:hidden flex flex-col items-center justify-center p-8 relative z-10 min-h-screen">
        <Image
          src="/HaptimizeTLogo.png"
          alt="Haptimize"
          width={360}
          height={90}
          className="w-[360px] h-auto mb-3"
          priority
        />
        <h1 className="text-4xl font-bold text-neutral-dark leading-tight text-center">
          Win Today&hellip;
          <br />
          <span className="text-primary">Win Tomorrow&hellip;</span>
        </h1>
        <p className="text-lg text-neutral-dark/90 text-center mt-3 max-w-md">
          Let consistency turn small wins into massive results.
        </p>
        <div className="w-full max-w-lg mt-8 p-6 rounded-2xl bg-white/40 backdrop-blur-xl border border-white/70">
          <p className="text-sm text-neutral-dark/60 mb-1 text-center">With Haptimize,</p>
          <h2 className="text-2xl font-light text-center text-neutral-dark/80 mb-8 ml-[15px] whitespace-nowrap">
            Improve your{" "}
            <AnimatedTextCycle
              words={[
                "consistency",
                "discipline",
                "health",
                "productivity",
                "focus",
                "routine",
                "habits",
                "strength",
              ]}
              interval={3000}
              className="text-primary font-semibold"
            />
            {" "}daily.
          </h2>
          <div className="space-y-5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="py-4 text-lg"
              onClick={() => startTransition("/signup")}
            >
              Get Started →
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              className="py-4 text-lg"
              onClick={async () => {
                await signInAnonymously();
                startTransition("/onboarding");
              }}
            >
              Try Demo →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

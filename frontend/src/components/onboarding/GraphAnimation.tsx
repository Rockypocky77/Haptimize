"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import BlurText from "./BlurText";
import { TextShimmer } from "./TextShimmer";
import CountUp from "@/components/ui/CountUp";

export default function GraphAnimation() {
  const [showSubtext, setShowSubtext] = useState(false);

  // True 1% daily compound growth over 365 days: (1.01)^t → 37.8x
  const points = Array.from({ length: 50 }, (_, i) => {
    const t = (i / 49) * 365;
    const value = Math.pow(1.01, t);
    const x = (i / 49) * 500;
    const y = 200 - ((value - 1) / 36.8) * 185;
    return `${x},${Math.max(Math.min(y, 200), 12)}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L 500,200 L 0,200 Z`;

  return (
    <div className="text-center space-y-4 sm:space-y-5 min-h-0 max-h-full overflow-hidden flex flex-col justify-center">
      <BlurText
        text="Did you know?"
        delay={150}
        animateBy="words"
        direction="top"
        className="text-base sm:text-lg text-neutral-dark/70 font-medium"
        onAnimationComplete={() => {}}
      />

      <div className="space-y-1">
        <BlurText
          text="Improving just 1% every day"
          delay={120}
          animateBy="words"
          direction="top"
          className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-dark"
        />
        <BlurText
          text="makes you"
          delay={120}
          animateBy="words"
          direction="top"
          className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-dark"
        />
        <div className="flex items-baseline justify-center gap-2 flex-wrap">
          <span className="text-4xl sm:text-5xl md:text-6xl font-black text-primary">
            <CountUp from={0} to={37.8} duration={2.5} delay={0.8} suffix="x" />
          </span>
          <BlurText
            text="better after one year."
            delay={120}
            animateBy="words"
            direction="top"
            className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-dark"
          />
        </div>
      </div>

      <motion.div
        className="relative mx-auto max-w-[min(100%,28rem)] w-full min-h-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative rounded-xl bg-white/80 border border-gray-200/50 p-2 sm:p-3 overflow-hidden shadow-sm">
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ delay: 2, duration: 2.6, ease: [0.45, 0, 0.55, 1] }}
            style={{
              background: "radial-gradient(ellipse 80% 50% at 70% 30%, rgba(127,175,143,0.25), transparent 70%)",
            }}
          />
          <svg viewBox="0 0 500 220" className="w-full h-auto max-h-[min(36vh,12rem)] sm:max-h-[min(40vh,14rem)] md:max-h-[min(42vh,16rem)]">
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a8a5e" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#5a9a6e" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#5a9a6e" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="curveStroke" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#3d7a52" />
                <stop offset="100%" stopColor="#5a9a6e" />
              </linearGradient>
            </defs>
            <motion.path
              d={areaD}
              fill="url(#curveGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#curveStroke)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.3, duration: 2.8, ease: [0.22, 0.61, 0.36, 1] }}
              onAnimationComplete={() => setShowSubtext(true)}
            />
            <line x1="0" y1="200" x2="500" y2="200" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-neutral-dark" />
          </svg>
        </div>
      </motion.div>

      <div className="min-h-[36px] sm:min-h-[40px] flex items-center justify-center shrink-0">
        <motion.div
          initial={false}
          animate={
            showSubtext
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: 6 }
          }
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none"
          aria-hidden={!showSubtext}
        >
          <TextShimmer className="text-sm sm:text-base font-semibold [--base-color:#4a8a5e] [--base-gradient-color:#2E3A3F]" duration={3}>
            Consistency is everything.
          </TextShimmer>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import BlurText from "./BlurText";
import { TextShimmer } from "./TextShimmer";
import CountUp from "@/components/ui/CountUp";

export default function GraphAnimation() {
  const [showSubtext, setShowSubtext] = useState(false);

  const points = Array.from({ length: 40 }, (_, i) => {
    const x = (i / 39) * 500;
    const y = 200 - Math.pow(1.01, i * 9.1) * 1.5;
    return `${x},${Math.max(y, 10)}`;
  });
  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L 500,200 L 0,200 Z`;

  return (
    <div className="text-center space-y-8">
      <BlurText
        text="Did you know?"
        delay={150}
        animateBy="words"
        direction="top"
        className="text-lg text-neutral-dark/70 font-medium"
        onAnimationComplete={() => {}}
      />

      <div className="space-y-2">
        <BlurText
          text="Improving just 1% every day"
          delay={120}
          animateBy="words"
          direction="top"
          className="text-2xl md:text-3xl font-bold text-neutral-dark"
        />
        <BlurText
          text="makes you"
          delay={120}
          animateBy="words"
          direction="top"
          className="text-2xl md:text-3xl font-bold text-neutral-dark"
        />
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-5xl md:text-6xl font-black text-primary">
            <CountUp from={0} to={37.8} duration={2.5} delay={0.8} suffix="x" />
          </span>
          <BlurText
            text="better after one year."
            delay={120}
            animateBy="words"
            direction="top"
            className="text-2xl md:text-3xl font-bold text-neutral-dark"
          />
        </div>
      </div>

      <motion.div
        className="relative mx-auto max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="relative rounded-2xl bg-white/60 border border-gray-200/40 p-4 overflow-hidden">
          <motion.div
            className="absolute inset-0 rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ delay: 2, duration: 2, ease: "easeInOut" }}
            style={{
              background: "radial-gradient(circle at 80% 20%, rgba(127,175,143,0.3), transparent 60%)",
            }}
          />
          <svg viewBox="0 0 500 220" className="w-full h-auto">
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5a9a6e" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#5a9a6e" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <motion.path
              d={areaD}
              fill="url(#curveGrad)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3, duration: 1 }}
            />
            <motion.path
              d={pathD}
              fill="none"
              stroke="#5a9a6e"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.3, duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
              onAnimationComplete={() => setShowSubtext(true)}
            />
            <line x1="0" y1="200" x2="500" y2="200" stroke="#2E3A3F" strokeOpacity="0.1" strokeWidth="1" />
          </svg>
        </div>
      </motion.div>

      {showSubtext && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <TextShimmer className="text-xl font-semibold [--base-color:#4a8a5e] [--base-gradient-color:#2E3A3F]" duration={3}>
            Consistency is everything.
          </TextShimmer>
        </motion.div>
      )}
    </div>
  );
}

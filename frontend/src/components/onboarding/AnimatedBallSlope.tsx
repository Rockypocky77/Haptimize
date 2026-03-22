"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlurText from "./BlurText";

type Phase = "effort" | "tilt" | "result";

const PX = 60;
const PY = 90;
const LEN = 450;
const BALL_R = 14;
const MAX_ANGLE = 14;
const GRAVITY = 2.5;
const STATIC_FRICTION = 0.08;
const TILT_DURATION = 2.5;
const TILT_DELAY = 0.5;

export default function AnimatedBallSlope({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("effort");
  const [angle, setAngle] = useState(0);
  const [ballS, setBallS] = useState(0.07);
  const [ballRot, setBallRot] = useState(0);
  const [ballGone, setBallGone] = useState(false);

  const angleRef = useRef(0);
  const sRef = useRef(0.07);
  const vRef = useRef(0);
  const rotRef = useRef(0);
  const frameRef = useRef(0);
  const t0Ref = useRef(0);
  const prevRef = useRef(0);
  const tickRef = useRef<(now: number) => void>(() => {});

  useEffect(() => {
    const id = setTimeout(() => setPhase("tilt"), 2500);
    return () => clearTimeout(id);
  }, []);

  const tick = useCallback(
    (now: number) => {
      if (!t0Ref.current) {
        t0Ref.current = now;
        prevRef.current = now;
      }

      const elapsed = Math.max((now - t0Ref.current) / 1000 - TILT_DELAY, 0);
      const dt = Math.min((now - prevRef.current) / 1000, 0.04);
      prevRef.current = now;

      const progress = Math.min(elapsed / TILT_DURATION, 1);
      const eased = progress * progress;
      angleRef.current = eased * MAX_ANGLE;
      setAngle(angleRef.current);

      const rad = (angleRef.current * Math.PI) / 180;
      const gForce = GRAVITY * Math.sin(rad);
      const moving = vRef.current > 0.001;
      const net = moving ? gForce : Math.max(gForce - STATIC_FRICTION, 0);

      vRef.current += net * dt;
      sRef.current += vRef.current * dt;
      setBallS(sRef.current);

      const pxPerSec = vRef.current * LEN;
      rotRef.current += ((pxPerSec * dt) / (2 * Math.PI * BALL_R)) * 360;
      setBallRot(rotRef.current);

      if (sRef.current > 1.15) {
        setBallGone(true);
        setPhase("result");
        onComplete();
        return;
      }

      frameRef.current = requestAnimationFrame((t) => tickRef.current(t));
    },
    [onComplete],
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (phase === "tilt") {
      t0Ref.current = 0;
      prevRef.current = 0;
      const frameId = requestAnimationFrame(tick);
      frameRef.current = frameId;
      return () => cancelAnimationFrame(frameId);
    }
  }, [phase, tick]);

  const rad = (angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const endX = PX + LEN * cosA;
  const endY = PY + LEN * sinA;

  const s = Math.min(ballS, 1.15);
  const ptX = PX + s * LEN * cosA;
  const ptY = PY + s * LEN * sinA;
  const ballCx = ptX + BALL_R * sinA;
  const ballCy = ptY - BALL_R * cosA;

  return (
    <div className="text-center space-y-8 w-full max-w-xl mx-auto">
      <div className="min-h-[80px]">
        <AnimatePresence mode="wait">
          {phase === "effort" && (
            <motion.div
              key="effort"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <BlurText
                text="Getting started takes effort."
                delay={120}
                animateBy="words"
                direction="top"
                className="text-2xl md:text-3xl font-bold text-neutral-dark"
              />
            </motion.div>
          )}
          {phase === "tilt" && (
            <motion.div
              key="tilt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <BlurText
                text="But once you start..."
                delay={120}
                animateBy="words"
                direction="top"
                className="text-2xl md:text-3xl font-bold text-neutral-dark"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative w-full" style={{ height: 200 }}>
        <svg
          viewBox="0 0 600 240"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <line
            x1={PX + 2}
            y1={PY + 3}
            x2={endX + 2}
            y2={endY + 3}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line
            x1={PX}
            y1={PY}
            x2={endX}
            y2={endY}
            stroke="#3d7a52"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {!ballGone && (
            <>
              <circle
                cx={ballCx + 1.5}
                cy={ballCy + 2.5}
                r={BALL_R}
                fill="rgba(0,0,0,0.07)"
              />
              <g
                transform={`translate(${ballCx}, ${ballCy}) rotate(${ballRot})`}
              >
                <circle r={BALL_R} fill="#2d6a42" />
                <circle cx={-3} cy={-3} r={3.5} fill="rgba(255,255,255,0.2)" />
                <line
                  x1={0}
                  y1={-BALL_R + 3}
                  x2={0}
                  y2={-BALL_R + 7}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </>
          )}
        </svg>
      </div>

      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-3"
        >
          <BlurText
            text="You can't stop."
            delay={120}
            animateBy="words"
            direction="bottom"
            className="text-2xl md:text-3xl font-bold text-neutral-dark"
          />
          <BlurText
            text="Use momentum to your advantage. Your Momentum Score tracks this over time."
            delay={100}
            animateBy="words"
            direction="bottom"
            className="text-lg text-neutral-dark/70 font-medium"
          />
        </motion.div>
      )}
    </div>
  );
}

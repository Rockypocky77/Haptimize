"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}

export default function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  y = 18,
  className,
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { GradFlow } from "gradflow";

/**
 * Animated gradient background using GradFlow.
 * Uses the user-specified colors (#85a182, #b8c2b7, #699366) for a soft green palette.
 */
export default function GrainientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <GradFlow
        config={{
          color1: "#85a182",
          color2: "#b8c2b7",
          color3: "#699366",
          speed: 1,
          scale: 0.8,
          type: "silk",
          noise: 0.08,
        }}
        className="w-full h-full"
      />
    </div>
  );
}

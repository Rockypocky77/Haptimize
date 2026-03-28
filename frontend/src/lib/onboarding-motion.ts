/**
 * Shared motion tokens for onboarding — GPU-friendly easing, consistent timing.
 * Prefer transform/opacity over width/filter where possible.
 */
export const ONBOARD_EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const ONBOARD_EASE_IN_OUT = [0.45, 0, 0.55, 1] as const;

export const stepEnterTransition = {
  duration: 0.48,
  ease: ONBOARD_EASE_OUT,
};

/** Slightly longer exit so crossfade with `mode="sync"` feels blended, not a hard cut */
export const stepExitTransition = {
  duration: 0.38,
  ease: ONBOARD_EASE_IN_OUT,
};

export const stepPresenceTransition = {
  opacity: { duration: 0.4, ease: ONBOARD_EASE_IN_OUT },
  y: { duration: 0.48, ease: ONBOARD_EASE_OUT },
};

export const contentStagger = {
  delay: 0.12,
  duration: 0.55,
  ease: ONBOARD_EASE_OUT,
};

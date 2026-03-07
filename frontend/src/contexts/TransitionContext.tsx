"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";

type TransitionContextType = {
  isTransitioning: boolean;
  startTransition: (path: string) => void;
  endTransition: () => void;
};

const TransitionContext = createContext<TransitionContextType | null>(null);

const FADE_IN_MS = 800;
const STAY_WHITE_MS = 120;
const FADE_OUT_MS = 800;
const EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<"idle" | "fading-in" | "white" | "fading-out">("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const subscribersRef = useRef(new Set<() => void>());
  const subscribe = useCallback((cb: () => void) => {
    subscribersRef.current.add(cb);
    return () => { subscribersRef.current.delete(cb); };
  }, []);
  const getSnapshot = useCallback(() => phaseRef.current !== "idle", []);

  const isTransitioning = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const notify = useCallback(() => {
    subscribersRef.current.forEach((cb) => cb());
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const setOverlay = useCallback((opacity: number, durationMs: number) => {
    const el = overlayRef.current;
    if (!el) return;
    el.style.transition = `opacity ${durationMs}ms ${EASING}`;
    el.style.opacity = String(opacity);
    el.style.pointerEvents = opacity > 0 ? "auto" : "none";
  }, []);

  const startTransition = useCallback(
    (path: string) => {
      if (phaseRef.current !== "idle") return;
      phaseRef.current = "fading-in";
      notify();
      clearTimers();

      // Ensure transition is applied before changing opacity: set transition + opacity 0,
      // then on next frame set opacity 1 so the browser animates from 0→1
      const el = overlayRef.current;
      if (el) {
        el.style.transition = `opacity ${FADE_IN_MS}ms ${EASING}`;
        el.style.opacity = "0";
        el.style.pointerEvents = "auto";
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (overlayRef.current) {
            overlayRef.current.style.opacity = "1";
          }
        });
      });

      const t = setTimeout(() => {
        phaseRef.current = "white";
        router.push(path);
      }, FADE_IN_MS);
      timersRef.current.push(t);
    },
    [router, notify, clearTimers, setOverlay]
  );

  const endTransition = useCallback(() => {
    if (phaseRef.current === "idle") return;

    clearTimers();
    phaseRef.current = "fading-out";

    const t1 = setTimeout(() => {
      setOverlay(0, FADE_OUT_MS);
      const t2 = setTimeout(() => {
        phaseRef.current = "idle";
        notify();
      }, FADE_OUT_MS);
      timersRef.current.push(t2);
    }, STAY_WHITE_MS);
    timersRef.current.push(t1);
  }, [notify, clearTimers, setOverlay]);

  return (
    <TransitionContext.Provider
      value={{ isTransitioning, startTransition, endTransition }}
    >
      {children}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[9999]"
        style={{
          backgroundColor: "white",
          opacity: 0,
          pointerEvents: "none",
        }}
        aria-hidden
      />
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    return {
      isTransitioning: false,
      startTransition: (_path: string) => {},
      endTransition: () => {},
    };
  }
  return ctx;
}

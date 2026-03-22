"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";
import { Lock } from "lucide-react";
import Button from "@/components/ui/Button";

interface DemoContextValue {
  isDemo: boolean;
  guardAction: (featureName?: string) => boolean;
}

const DemoContext = createContext<DemoContextValue>({ isDemo: false, guardAction: () => true });

export function useDemoGuard() {
  return useContext(DemoContext);
}

export default function DemoGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { startTransition } = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [featureLabel, setFeatureLabel] = useState("");
  const isDemo = user?.isAnonymous === true;

  const guardAction = useCallback(
    (featureName = "this feature") => {
      if (!isDemo) return true;
      setFeatureLabel(featureName);
      setShowModal(true);
      return false;
    },
    [isDemo]
  );

  return (
    <DemoContext.Provider value={{ isDemo, guardAction }}>
      {children}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <motion.div
              className="absolute inset-0 bg-neutral-dark/30 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={() => setShowModal(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface rounded-2xl shadow-xl p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Lock size={24} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-neutral-dark mb-2">
                Account required
              </h3>
              <p className="text-sm text-neutral-dark/60 mb-6">
                Create a free account to use {featureLabel}. Your data will be saved and synced across devices.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowModal(false)}
                >
                  Not now
                </Button>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    setShowModal(false);
                    startTransition("/signup");
                  }}
                >
                  Sign up
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DemoContext.Provider>
  );
}

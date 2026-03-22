"use client";

import { useAuth } from "@/contexts/AuthContext";
import { CURRENT_TERMS_VERSION } from "@/lib/legal-content";
import { motion, AnimatePresence } from "framer-motion";
import TermsAgreementForm from "./TermsAgreementForm";

export default function TermsReconsentModal() {
  const { user, profile, loading, agreeToTerms } = useAuth();

  const needsReconsent =
    !loading &&
    user &&
    profile &&
    profile.termsVersion !== CURRENT_TERMS_VERSION;

  return (
    <AnimatePresence>
      {needsReconsent && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-dark/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-reconsent-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-neutral-light rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <h2
              id="terms-reconsent-title"
              className="text-2xl font-bold text-neutral-dark text-center mb-2"
            >
              Updated Terms & Privacy
            </h2>
            <p className="text-sm text-neutral-dark/60 text-center mb-6">
              Our terms and privacy policy have been updated. Please read and agree
              to continue using Haptimize.
            </p>
            <TermsAgreementForm
              onAgree={agreeToTerms}
              buttonLabel="I Agree"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

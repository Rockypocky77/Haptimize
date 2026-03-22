"use client";

import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import TermsAgreementForm from "@/components/legal/TermsAgreementForm";

interface TermsAndPrivacyStepProps {
  onAgree: () => void;
}

export default function TermsAndPrivacyStep({ onAgree }: TermsAndPrivacyStepProps) {
  const { agreeToTerms } = useAuth();

  const handleAgree = async () => {
    await agreeToTerms();
    onAgree();
  };

  return (
    <motion.div
      className="min-h-screen w-full flex flex-col items-center px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 w-full max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-neutral-dark text-center">
          Terms & Privacy
        </h2>
        <p className="text-sm text-neutral-dark/60 text-center">
          Please read and agree to both documents to continue.
        </p>

        <TermsAgreementForm onAgree={handleAgree} />
      </div>
    </motion.div>
  );
}

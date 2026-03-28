"use client";

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

  /* Entrance/exit animated by onboarding page step wrapper — avoid double fade */
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12">
      <div className="flex-1 w-full max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-neutral-dark text-center">
          Terms & Privacy
        </h2>
        <p className="text-sm text-neutral-dark/60 text-center">
          Please read and agree to both documents to continue.
        </p>

        <TermsAgreementForm onAgree={handleAgree} />
      </div>
    </div>
  );
}

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
    <div className="h-full min-h-0 w-full flex flex-col overflow-hidden px-3 pt-[max(0.35rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="shrink-0 text-center space-y-0.5 mb-2">
        <h2 className="text-lg sm:text-xl font-bold text-neutral-dark">Terms & Privacy</h2>
        <p className="text-[11px] sm:text-xs text-neutral-dark/60">
          Read both panels below, then agree.
        </p>
      </div>
      <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto overflow-hidden flex flex-col">
        <TermsAgreementForm onAgree={handleAgree} fitViewport />
      </div>
    </div>
  );
}

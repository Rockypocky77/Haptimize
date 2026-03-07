"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import ClickSpark from "@/components/ui/ClickSpark";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { useTransition } from "@/contexts/TransitionContext";

function VerifyContent() {
  const router = useRouter();
  const { startTransition } = useTransition();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [resendCount, setResendCount] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editedEmail, setEditedEmail] = useState(email);
  const [blocked, setBlocked] = useState(false);
  const [blockSecondsLeft, setBlockSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (!blocked || blockSecondsLeft <= 0) return;
    const timer = setInterval(
      () =>
        setBlockSecondsLeft((s) => {
          if (s <= 1) {
            setBlocked(false);
            return 0;
          }
          return s - 1;
        }),
      1000
    );
    return () => clearInterval(timer);
  }, [blocked, blockSecondsLeft]);

  const handleVerify = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSubmitting(true);
      try {
        const res = await api.verifySignupCode(email, code);
        if (!res.ok) {
          setError(res.error ?? "Verification failed");
          return;
        }
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase/client");
        try {
          await signInWithEmailAndPassword(auth, email, "");
        } catch {
          // Expected — user will login on the landing page
        }
        startTransition("/onboarding");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setSubmitting(false);
      }
    },
    [email, code, startTransition]
  );

  const handleResend = useCallback(
    async (overrideEmail?: string) => {
      setError("");
      const targetEmail = overrideEmail ?? email;
      const nextCount = resendCount + 1;

      if (nextCount >= 2 && !showEmailModal) {
        setShowEmailModal(true);
        return;
      }

      try {
        const res = await api.requestSignupCode(targetEmail, "", undefined);
        if (!res.ok) {
          if (res.retryAfterSeconds) {
            setBlocked(true);
            setBlockSecondsLeft(res.retryAfterSeconds);
          }
          setError(res.error ?? "Failed to resend");
          return;
        }
        setResendCount(nextCount);
        setSecondsLeft(120);
        setShowEmailModal(false);

        if (
          (res as Record<string, unknown>).showEmailConfirmation &&
          !showEmailModal
        ) {
          setShowEmailModal(true);
        }
      } catch {
        setError("Failed to resend code");
      }
    },
    [email, resendCount, showEmailModal]
  );

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center">
          <p className="text-neutral-dark mb-4">No email provided.</p>
          <Button onClick={() => startTransition("/")}>Go back</Button>
        </div>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-light p-6">
      <div className="bg-white rounded-3xl shadow-lg border border-primary-light/30 p-8 max-w-sm w-full">
        <h2 className="text-xl font-semibold text-neutral-dark mb-2">
          Verify your email
        </h2>
        <p className="text-sm text-neutral-dark/60 mb-6">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-neutral-dark">{email}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            label="Verification code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            autoFocus
          />

          <div className="text-sm text-neutral-dark/50">
            {secondsLeft > 0 ? (
              <span>
                Code expires in{" "}
                <span className="font-medium text-primary">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </span>
            ) : (
              <span className="text-error">Code expired</span>
            )}
          </div>

          {error && (
            <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {blocked && (
            <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">
              Too many resends. Try again in {Math.ceil(blockSecondsLeft / 60)}{" "}
              minute(s).
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={code.length !== 6 || secondsLeft <= 0}
          >
            Verify &amp; Create Account
          </Button>
        </form>

        <div className="mt-4 text-center">
          <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex">
          <button
            className="text-sm text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            onClick={() => handleResend()}
            disabled={blocked || secondsLeft > 90}
          >
            Resend code
          </button>
          </ClickSpark>
        </div>
      </div>

      {/* Email confirmation modal (shows after 2nd resend) */}
      <Modal
        open={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Confirm your email"
      >
        <p className="text-sm text-neutral-dark/70 mb-4">
          Please make sure you have entered the correct email address:
        </p>
        <Input
          value={editedEmail}
          onChange={(e) => setEditedEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <div className="flex gap-3 mt-5">
          <Button
            variant="ghost"
            onClick={() => setShowEmailModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              if (editedEmail !== email) {
                const params = new URLSearchParams({ email: editedEmail });
                router.replace(`/verify?${params}`);
              }
              handleResend(editedEmail);
            }}
          >
            Resend Code
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-neutral-light">
          <div className="text-neutral-dark/50">Loading...</div>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

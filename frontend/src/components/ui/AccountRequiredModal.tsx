"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "./Modal";
import Button from "./Button";
import { Lock } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AccountRequiredModal({ open, onClose }: Props) {
  const router = useRouter();
  const { exitDemoMode } = useAuth();

  function handleSignUp() {
    exitDemoMode();
    router.push("/");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Account Required">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock size={24} className="text-primary" />
        </div>
        <p className="text-sm text-neutral-dark/60 mb-6 max-w-xs">
          You need an account to use this feature. Sign up to track habits,
          set reminders, and unlock the full Haptimize experience.
        </p>
        <div className="flex gap-3 w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Keep Exploring
          </Button>
          <Button onClick={handleSignUp} className="flex-1">
            Sign Up
          </Button>
        </div>
      </div>
    </Modal>
  );
}

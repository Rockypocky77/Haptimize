"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/nav/Sidebar";
import HaptiAiDock from "@/components/hapti-ai/HaptiAiDock";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isDemoMode } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user && !isDemoMode) {
      router.replace("/");
      return;
    }
    if (user && profile && !profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [user, profile, loading, isDemoMode, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isDemoMode) return null;

  return (
    <div className="min-h-screen bg-neutral-light">
      <Sidebar />
      <main className="ml-64 p-8 min-h-screen">{children}</main>
      {!isDemoMode && profile?.aiEnabled !== false && <HaptiAiDock />}
    </div>
  );
}

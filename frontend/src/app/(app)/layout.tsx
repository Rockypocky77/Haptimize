"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";
import Sidebar from "@/components/nav/Sidebar";
import HaptiAiDock from "@/components/hapti-ai/HaptiAiDock";
import DemoGate from "@/components/ui/DemoGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { startTransition, endTransition, isTransitioning } = useTransition();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const hadUserRef = useRef(false);

  useEffect(() => {
    if (user) hadUserRef.current = true;
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => endTransition(), 150);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (!hadUserRef.current) {
        startTransition("/");
      }
      return;
    }
    if (profile && !profile.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [user, profile, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-light">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user && !isTransitioning) return null;

  return (
    <DemoGate>
      <div className="min-h-screen bg-neutral-light">
        <Sidebar
          isExpanded={sidebarExpanded}
          onExpand={() => setSidebarExpanded(true)}
          onCollapse={() => setSidebarExpanded(false)}
        />
        <main className="p-8 min-h-screen ml-16">
          {children}
        </main>
        {profile?.aiEnabled !== false && <HaptiAiDock />}
      </div>
    </DemoGate>
  );
}

"use client";

import { useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import ClickSpark from "@/components/ui/ClickSpark";
import { usePathname } from "next/navigation";
import {
  Home,
  CheckSquare,
  Bell,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransition } from "@/contexts/TransitionContext";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

const COLLAPSE_DELAY_MS = 100;

export type SidebarProps = {
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
};

export default function Sidebar({
  isExpanded,
  onExpand,
  onCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { startTransition } = useTransition();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onExpand();
  }, [onExpand]);

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(onCollapse, COLLAPSE_DELAY_MS);
  }, [onCollapse]);

  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-white border-r border-primary-light/30 flex flex-col z-40 overflow-hidden"
      style={{
        width: isExpanded ? 220 : 64,
        transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex-shrink-0 flex items-center overflow-hidden pl-4 pr-3 pt-4 pb-4 gap-3">
        <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} className="flex items-center min-w-0">
        <Link
          href="/home"
          className="flex items-center gap-3 min-w-0"
          style={{ transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <Image
            src="/CircularHaptimizeLogo.png"
            alt="Haptimize"
            width={36}
            height={36}
            className="flex-shrink-0"
            priority
          />
          <span
            className="text-lg font-semibold text-neutral-dark whitespace-nowrap transition-all duration-300"
            style={{
              opacity: isExpanded ? 1 : 0,
              maxWidth: isExpanded ? 200 : 0,
              overflow: "hidden",
            }}
          >
            Haptimize
          </span>
        </Link>
        </ClickSpark>
      </div>

      <nav className="flex flex-col space-y-1 px-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <ClickSpark
              key={href}
              sparkColor="#7FAF8F"
              sparkSize={10}
              sparkRadius={18}
              sparkCount={6}
              duration={300}
              className="h-auto min-h-0"
            >
            <Link
              href={href}
              title={label}
              className="flex items-center w-full py-3 min-w-0 group"
              onMouseEnter={(e) => { const inner = e.currentTarget.firstElementChild as HTMLElement; if (inner) inner.style.transform = "scale(1.06)"; }}
              onMouseLeave={(e) => { const inner = e.currentTarget.firstElementChild as HTMLElement; if (inner) inner.style.transform = "scale(1)"; }}
            >
              <div
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                  ${isExpanded ? "min-w-0 flex-1" : "w-11 flex-none"}
                  ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-neutral-dark/70 group-hover:bg-primary-light/20 group-hover:text-neutral-dark"
                  }
                `}
                style={{
                  transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease, color 150ms ease",
                }}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span
                  className="whitespace-nowrap overflow-hidden transition-opacity duration-300"
                  style={{
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
            </ClickSpark>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="border-t border-primary-light/30 flex-shrink-0 pl-[18px] pr-3 py-4">
        <div className="flex items-center gap-3 mb-3 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {(profile?.displayName ?? profile?.email ?? "U")[0].toUpperCase()}
          </div>
          <div
            className="flex-1 min-w-0 transition-opacity duration-300"
            style={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              overflow: "hidden",
            }}
          >
            <p className="text-sm font-medium text-neutral-dark truncate">
              {profile?.displayName ?? "User"}
            </p>
            <p className="text-xs text-neutral-dark/50 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
        <ClickSpark sparkColor="#7FAF8F" sparkSize={10} sparkRadius={18} sparkCount={6} duration={300} className="h-auto min-h-0">
        <button
          onClick={() => { startTransition("/"); setTimeout(logout, 800); }}
          className="flex items-center gap-2 py-2 pl-[7px] pr-3 text-sm text-neutral-dark/60 hover:text-error rounded-lg cursor-pointer min-w-0"
          style={{
            transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span
            className="whitespace-nowrap overflow-hidden transition-opacity duration-300"
            style={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
          >
            Sign out
          </span>
        </button>
        </ClickSpark>
      </div>
    </aside>
  );
}

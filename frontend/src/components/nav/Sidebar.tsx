"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Bell,
  Calendar,
  Settings,
  LogOut,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/checklist", label: "Checklist", icon: CheckSquare },
  { href: "/reminders", label: "Reminders", icon: Bell },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout, isDemoMode, exitDemoMode } = useAuth();

  function handleExitDemo() {
    exitDemoMode();
    router.push("/");
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-primary-light/30 flex flex-col z-40">
      <div className="p-6 pb-4">
        <Link href="/home">
          <Image
            src="/HaptimizeTLogo.png"
            alt="Haptimize"
            width={150}
            height={38}
            priority
          />
        </Link>
      </div>

      {isDemoMode && (
        <div className="mx-3 mb-2 px-4 py-2 rounded-xl bg-accent/10 text-xs font-medium text-neutral-dark/60 text-center">
          Demo Mode
        </div>
      )}

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-dark/70 hover:bg-primary-light/20 hover:text-neutral-dark"
                }
              `}
            >
              <Icon size={20} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-light/30">
        {isDemoMode ? (
          <div className="space-y-2">
            <button
              onClick={handleExitDemo}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-xl w-full cursor-pointer hover:bg-primary/90 transition-colors"
            >
              <UserPlus size={16} />
              Create Account
            </button>
            <button
              onClick={handleExitDemo}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-dark/60 hover:text-neutral-dark rounded-lg w-full cursor-pointer"
            >
              <LogOut size={16} />
              Exit Demo
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 px-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {(profile?.displayName ?? profile?.email ?? "U")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-dark truncate">
                  {profile?.displayName ?? "User"}
                </p>
                <p className="text-xs text-neutral-dark/50 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-dark/60 hover:text-error rounded-lg w-full cursor-pointer"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

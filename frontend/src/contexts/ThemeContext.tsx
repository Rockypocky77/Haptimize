"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const STORAGE_PREFIX = "haptimize-theme";

const LIGHT_ONLY_PATHS = ["/", "/signup", "/onboarding"];

function getStorageKey(uid: string | null): string | null {
  return uid ? `${STORAGE_PREFIX}-${uid}` : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const storageKey = getStorageKey(uid);
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const isLightOnly = pathname ? LIGHT_ONLY_PATHS.includes(pathname) : false;

  useEffect(() => {
    if (!storageKey) {
      setThemeState("light");
      setMounted(true);
      return;
    }
    let stored = localStorage.getItem(storageKey) as Theme | null;
    if (!stored) {
      const legacy = localStorage.getItem(STORAGE_PREFIX) as Theme | null;
      if (legacy === "light" || legacy === "dark") {
        localStorage.setItem(storageKey, legacy);
        localStorage.removeItem(STORAGE_PREFIX);
        stored = legacy;
      }
    }
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    } else {
      setThemeState("light");
    }
    setMounted(true);
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    const effectiveTheme = isLightOnly ? "light" : theme;
    root.setAttribute("data-theme", effectiveTheme);
    root.classList.toggle("dark", effectiveTheme === "dark");
    if (!isLightOnly && storageKey) {
      localStorage.setItem(storageKey, theme);
    }
  }, [theme, mounted, isLightOnly, pathname, storageKey]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

"use client";

import { useEffect, useRef } from "react";
import { getLocalDateString } from "@/lib/date";

/**
 * Calls onDateChange when the local date changes (e.g. at midnight).
 * Uses the user's local timezone.
 */
export function useDateChange(onDateChange: () => void): void {
  const lastDateRef = useRef<string>(getLocalDateString());

  useEffect(() => {
    const check = () => {
      const now = getLocalDateString();
      if (now !== lastDateRef.current) {
        lastDateRef.current = now;
        onDateChange();
      }
    };

    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [onDateChange]);
}

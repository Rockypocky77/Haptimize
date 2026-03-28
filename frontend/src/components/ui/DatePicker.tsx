"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Pick date",
  disabled = false,
  className = "",
  size = "md",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0 });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const [y, m] = value.split("-").map(Number);
      return { year: y, month: (m ?? 1) - 1 };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const today = formatDateStr(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );

  const updatePosition = useCallback(() => {
    if (ref.current && open) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownRect({ top: rect.bottom + 4, left: rect.left });
    }
  }, [open]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayLabel = value
    ? (() => {
        const [y, m, d] = value.split("-").map(Number);
        return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
      })()
    : placeholder;

  const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();
  const firstDay = new Date(viewMonth.year, viewMonth.month, 1).getDay();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const grid = [...blanks, ...days];

  const prevMonth = () => {
    setViewMonth((p) => {
      const m = p.month - 1;
      return m < 0 ? { year: p.year - 1, month: 11 } : { year: p.year, month: m };
    });
  };

  const nextMonth = () => {
    setViewMonth((p) => {
      const m = p.month + 1;
      return m > 11 ? { year: p.year + 1, month: 0 } : { year: p.year, month: m };
    });
  };

  const selectDate = (d: number) => {
    const dateStr = formatDateStr(viewMonth.year, viewMonth.month, d);
    onChange(dateStr);
    setOpen(false);
  };

  const dropdownContent = open ? (
    <motion.div
      ref={dropdownRef}
      className="fixed z-[100] bg-surface rounded-2xl border border-primary-light/30 shadow-xl p-4 min-w-[260px]"
      style={{ top: dropdownRect.top, left: dropdownRect.left }}
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="ui-hover-pop p-1.5 rounded-lg hover:bg-primary-light/20 text-neutral-dark/70 hover:text-neutral-dark transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-neutral-dark">
          {MONTHS[viewMonth.month]} {viewMonth.year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="ui-hover-pop p-1.5 rounded-lg hover:bg-primary-light/20 text-neutral-dark/70 hover:text-neutral-dark transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-[10px] font-medium text-neutral-dark/50 text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((d, i) => {
          if (d === null) {
            return <div key={`blank-${i}`} />;
          }
          const dateStr = formatDateStr(viewMonth.year, viewMonth.month, d);
          const isToday = dateStr === today;
          const isSelected = dateStr === value;
          return (
            <button
              key={d}
              type="button"
              onClick={() => selectDate(d)}
              className={`
                w-8 h-8 rounded-lg text-sm font-medium transition-colors ui-hover-pop
                ${isSelected ? "bg-primary text-white" : ""}
                ${!isSelected && isToday ? "bg-primary/20 text-primary" : ""}
                ${!isSelected && !isToday ? "hover:bg-primary-light/20 text-neutral-dark" : ""}
              `}
            >
              {d}
            </button>
          );
        })}
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          ui-hover-lift flex items-center gap-2 rounded-xl border
          bg-surface text-neutral-dark
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          border-primary-light/50
          disabled:opacity-50 disabled:cursor-not-allowed
          ${size === "sm" ? "px-2.5 py-1.5 text-xs min-w-[100px]" : "px-4 py-2.5 min-w-[140px]"}
          ${!value ? "text-neutral-dark/40" : ""}
        `}
      >
        <Calendar size={size === "sm" ? 12 : 16} className="flex-shrink-0 text-primary" />
        <span className="flex-1 text-left truncate">{displayLabel}</span>
      </button>
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}

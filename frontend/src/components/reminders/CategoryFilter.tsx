"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Filter } from "lucide-react";
import type { Category } from "./AddCategoryModal";

interface CategoryFilterProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
}

export default function CategoryFilter({
  categories,
  value,
  onChange,
  disabled = false,
}: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = value ? categories.find((c) => c.id === value) : null;
  const label = selected ? selected.name : "All";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border
          bg-white text-neutral-dark text-sm
          focus:outline-none focus:ring-2 focus:ring-primary/40
          border-primary-light/50
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <Filter size={14} className="text-neutral-dark/60" />
        {selected ? (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selected.color }}
          />
        ) : null}
        <span className="truncate">{label}</span>
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[140px] bg-white rounded-xl border border-primary-light/30 shadow-lg py-1 z-50">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-neutral-dark hover:bg-primary-light/20"
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-neutral-dark hover:bg-primary-light/20 flex items-center gap-2"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

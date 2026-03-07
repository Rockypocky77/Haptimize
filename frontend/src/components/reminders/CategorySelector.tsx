"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { Category } from "./AddCategoryModal";

interface CategorySelectorProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onAddCategory: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CategorySelector({
  categories,
  value,
  onChange,
  onAddCategory,
  placeholder = "Category",
  disabled = false,
}: CategorySelectorProps) {
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

  const selected = categories.find((c) => c.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl border
          bg-white text-neutral-dark min-w-[140px]
          focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
          border-primary-light/50
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 text-left truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-neutral-dark/40 truncate">
            {placeholder}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white rounded-xl border border-primary-light/30 shadow-lg py-1 z-50 max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-neutral-dark/60 hover:bg-primary-light/20 flex items-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-transparent border border-neutral-dark/20" />
            None
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
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          <div className="border-t border-primary-light/20 mt-1 pt-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddCategory();
              }}
              className="w-full px-4 py-2 text-left text-sm text-primary font-medium hover:bg-primary-light/20 flex items-center gap-2"
            >
              <Plus size={14} />
              Add category
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

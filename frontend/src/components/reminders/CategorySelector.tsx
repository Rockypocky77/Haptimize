"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { motion } from "framer-motion";
import type { Category } from "./AddCategoryModal";

interface CategorySelectorProps {
  categories: Category[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
  onAddCategory: () => void;
  canAddCategory?: boolean;
  categoriesLimit?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function CategorySelector({
  categories,
  value,
  onChange,
  onAddCategory,
  canAddCategory = true,
  categoriesLimit,
  placeholder = "Category",
  disabled = false,
}: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (ref.current && open) {
      const rect = ref.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 180),
      });
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

  const selected = categories.find((c) => c.id === value);

  const dropdownContent = open ? (
    <motion.div
      ref={dropdownRef}
      className="fixed bg-surface rounded-xl border border-primary-light/30 shadow-lg py-1 max-h-56 overflow-y-auto overflow-x-hidden origin-top z-[100] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{
        top: dropdownRect.top,
        left: dropdownRect.left,
        width: dropdownRect.width,
        minWidth: 180,
      }}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
    >
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
          className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
            canAddCategory
              ? "text-primary font-medium hover:bg-primary-light/20"
              : "text-neutral-dark/50 hover:bg-primary-light/10"
          }`}
        >
          <Plus size={14} />
          {canAddCategory
            ? "Add category"
            : categoriesLimit === 0
              ? "Upgrade for categories"
              : `Limit reached (${categoriesLimit} categories)`}
        </button>
      </div>
    </motion.div>
  ) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          ui-hover-lift flex items-center gap-2 px-4 py-2.5 rounded-xl border
          bg-surface text-neutral-dark min-w-[140px]
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

      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}

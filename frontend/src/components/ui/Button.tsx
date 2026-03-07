"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";
import ClickSpark from "@/components/ui/ClickSpark";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary/90 shadow-sm",
  secondary: "bg-primary-light text-neutral-dark hover:bg-primary-light/80",
  accent: "bg-accent text-neutral-dark hover:bg-accent/90 shadow-sm",
  ghost: "bg-transparent text-neutral-dark hover:bg-primary-light/30",
  danger: "bg-error text-white hover:bg-error/90",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-base rounded-xl",
  lg: "px-7 py-3.5 text-lg rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const button = (
    <button
      className={`
        inline-flex items-center justify-center font-medium
        cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      style={{
        transition: "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), background-color 150ms ease, opacity 150ms ease",
      }}
      onMouseEnter={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "scale(1.05)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );

  return (
    <ClickSpark
      sparkColor={variant === "primary" || variant === "danger" ? "#fff" : "#7FAF8F"}
      sparkSize={12}
      sparkRadius={18}
      sparkCount={8}
      duration={350}
    >
      {button}
    </ClickSpark>
  );
}

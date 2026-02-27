import { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export default function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-primary-light/30
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

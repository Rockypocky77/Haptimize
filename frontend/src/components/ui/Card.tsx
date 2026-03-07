import { type ReactNode, type CSSProperties, type MouseEventHandler, useCallback, useRef } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  style?: CSSProperties;
  hover?: boolean;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
}

const paddingClasses = {
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

const HOVER_TRANSITION = "transform 500ms cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 500ms cubic-bezier(0.25, 0.1, 0.25, 1)";

export default function Card({
  children,
  className = "",
  padding = "md",
  style,
  hover = true,
  onMouseEnter,
  onMouseLeave,
}: CardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (hover && ref.current) {
      ref.current.style.transform = "scale(1.015)";
      ref.current.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    }
    onMouseEnter?.(e);
  }, [hover, onMouseEnter]);

  const handleLeave: MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    if (hover && ref.current) {
      ref.current.style.transform = "scale(1)";
      ref.current.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
    }
    onMouseLeave?.(e);
  }, [hover, onMouseLeave]);

  return (
    <div
      ref={ref}
      className={`
        bg-white rounded-2xl shadow-sm border border-primary-light/30
        ${paddingClasses[padding]}
        ${className}
      `}
      style={{
        transition: hover ? HOVER_TRANSITION : undefined,
        ...style,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

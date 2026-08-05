import React from "react";

const VARIANTS = {
  primary:
    "bg-ink text-white shadow-sm hover:brightness-110",
  accent:
    "bg-accent text-white shadow-md shadow-accent/25 hover:bg-accent-strong",
  secondary:
    "border border-accent text-accent bg-transparent hover:bg-accent/5",
  ghost:
    "text-muted hover:text-ink hover:bg-surface-2",
  danger:
    "bg-danger text-white shadow-sm hover:brightness-110",
  success:
    "bg-success text-white shadow-sm hover:brightness-110",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  xl: "w-full px-6 py-3.5 text-base",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  ...rest
}) {
  return (
    <button
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl font-semibold transition-all duration-150
        active:scale-[0.98] active:opacity-85
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}

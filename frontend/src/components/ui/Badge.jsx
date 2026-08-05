import React from "react";

const VARIANTS = {
  success: "bg-success/10 border-success/25 text-success",
  warning: "bg-warning/10 border-warning/25 text-warning",
  error: "bg-danger/10 border-danger/25 text-danger",
  info: "bg-info/10 border-info/25 text-info",
  gray: "bg-surface-2 border-border text-muted",
};

export default function Badge({ variant = "gray", dot = false, children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${VARIANTS[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}

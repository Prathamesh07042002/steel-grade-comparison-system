import React from "react";

export default function Card({
  children,
  padding = true,
  className = "",
  ...rest
}) {
  return (
    <div
      className={`bg-surface rounded-2xl shadow-sm border border-border ${
        padding ? "p-6" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

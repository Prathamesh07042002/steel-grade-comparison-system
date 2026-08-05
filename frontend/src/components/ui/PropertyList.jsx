import React from "react";

export default function PropertyList({ data = {}, emptyLabel = "No properties found" }) {
  const entries = Object.entries(data || {});

  if (entries.length === 0) {
    return <p className="text-sm text-muted py-2">{emptyLabel}</p>;
  }

  return (
    <div>
      {entries.map(([key, val]) => (
        <div
          key={key}
          className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
        >
          <span className="text-sm font-medium text-ink">{key}</span>
          <code className="bg-surface-2 px-2.5 py-1 rounded-lg text-sm text-muted">
            {val}
          </code>
        </div>
      ))}
    </div>
  );
}

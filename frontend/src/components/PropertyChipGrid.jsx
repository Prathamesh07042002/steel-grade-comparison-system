import { useState } from "react";
import { IconCheckCircle, IconXCircle, IconChevronDown } from "./icons/Icons";

const COLS = 6;
const COLLAPSED_ROWS = 2;

export default function PropertyChipGrid({ matched }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(matched || {});
  const collapsedCount = COLS * COLLAPSED_ROWS;
  const visible = expanded ? entries : entries.slice(0, collapsedCount);
  const hasMore = entries.length > collapsedCount;

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No properties to display.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {visible.map(([prop, info]) => (
          <div
            key={prop}
            className={`rounded-lg border px-2 py-2 flex flex-col items-center justify-center text-center ${
              info.within_range
                ? "bg-surface-2 border-border"
                : "bg-danger/10 border-danger/30"
            }`}
          >
            <p className="text-xs font-semibold text-muted truncate w-full">{prop}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="font-mono text-sm font-bold text-ink">{info.test_value}</span>
              {info.within_range ? (
                <IconCheckCircle className="w-5 h-5 text-success shrink-0" strokeWidth={2} />
              ) : (
                <IconXCircle className="w-5 h-5 text-danger shrink-0" strokeWidth={2} />
              )}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center py-1.5 mt-1.5 text-muted hover:text-ink transition-colors"
        >
          <IconChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

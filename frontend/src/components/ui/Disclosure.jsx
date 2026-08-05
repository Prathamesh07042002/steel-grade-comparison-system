import React, { useState } from "react";
import { IconChevronRight } from "../icons/Icons";

export default function Disclosure({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:bg-border/40 transition-colors text-sm font-semibold text-ink"
      >
        <span>{title}</span>
        <IconChevronRight
          className={`w-4 h-4 text-muted transition-transform ${open ? "rotate-90" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

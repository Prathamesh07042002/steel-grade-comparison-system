import React from "react";
import { IconFlask, IconSparkles, IconHome } from "../icons/Icons";

const NAV_ITEMS = [
  { id: "manual", label: "Manual", icon: IconFlask },
  { id: "auto", label: "Auto", icon: IconSparkles },
];

export default function AppShell({ activePage, onNavigate, title, subtitle, actions, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar */}
      <aside className="w-20 bg-navy flex flex-col items-center py-4 shrink-0">
        <button
          onClick={() => onNavigate("landing")}
          title="Back to home"
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-strong flex items-center justify-center shadow-md shadow-accent/30 mb-6 hover:brightness-110 active:scale-95 transition-all"
        >
          <IconHome className="w-5 h-5 text-white" strokeWidth={2} />
        </button>

        <nav className="flex flex-col gap-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1
                  transition-colors
                  ${isActive ? "bg-accent/15 text-accent" : "text-white/60 hover:bg-navy-soft hover:text-white"}
                `}
              >
                <Icon className="w-6 h-6" strokeWidth={1.8} />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-border shrink-0 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold leading-tight text-ink">{title}</h1>
            <p className="text-sm text-muted mt-0.5">{subtitle}</p>
          </div>
          {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}

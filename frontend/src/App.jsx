import { useState } from "react";
import ManualCompare from "./pages/ManualCompare";
import AutoMatch from "./pages/AutoMatch";

export default function App() {
  const [activePage, setActivePage] =
    useState("manual");

  return (
    <div className="min-h-screen bg-slate-100 flex">

      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white border-r border-slate-800 flex flex-col">

        {/* Logo */}
        <div className="px-6 py-8 border-b border-slate-800">
          <h1 className="text-2xl font-bold tracking-wide">
            Steel Intelligence
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Grade Comparison Platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-3">

          <button
            onClick={() =>
              setActivePage("manual")
            }
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200
              ${
                activePage === "manual"
                  ? "bg-blue-600 shadow-lg shadow-blue-600/20"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
              style={{ marginBottom: "0.75rem" }}
          >
            <span className="text-xl">🔬</span>

            <div className="text-left">
              <p className="font-medium">
                Manual Compare
              </p>

              <p className="text-xs text-slate-300">
                Select grades manually
              </p>
            </div>
          </button>

          <button
            onClick={() =>
              setActivePage("auto")
            }
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200
              ${
                activePage === "auto"
                  ? "bg-emerald-600 shadow-lg shadow-emerald-600/20"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
          >
            <span className="text-xl">🤖</span>

            <div className="text-left">
              <p className="font-medium">
                Auto Match
              </p>

              <p className="text-xs text-slate-300">
                AI-powered matching
              </p>
            </div>
          </button>
        </nav>

      
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">

        {/* Page Header */}
        {/* <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800">
            {activePage === "manual"
              ? "Manual Comparison"
              : "Automatic Grade Matching"}
          </h2>

          <p className="text-slate-500 mt-2">
            Analyze and compare steel grades
            across standards.
          </p>
        </div> */}

        {/* Content Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8">

          {activePage === "manual" && (
            <ManualCompare />
          )}

          {activePage === "auto" && (
            <AutoMatch />
          )}

        </div>
      </main>
    </div>
  );
}
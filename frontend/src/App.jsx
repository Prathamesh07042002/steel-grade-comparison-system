import { useState } from "react";

import ManualCompare from "./pages/ManualCompare";
import AutoMatch from "./pages/AutoMatch";

export default function App() {
  const [activePage, setActivePage] =
    useState("manual");

  return (
    <div className="min-h-screen flex">

      <aside className="w-72 bg-slate-950 text-white shadow-xl">
        <div className="p-6">
          <h1 className="text-xl font-bold">
            Steel Intelligence
          </h1>
        </div>

        <div className="space-y-2 px-4">

          <button
            onClick={() =>
              setActivePage("manual")
            }
            className="w-full text-left p-3 rounded bg-blue-600"
          >
            🔬 Manual Compare
          </button>

          <button
            onClick={() =>
              setActivePage("auto")
            }
            className="w-full text-left p-3 rounded bg-slate-700"
          >
            🤖 Auto Match
          </button>

        </div>
      </aside>

      <main className="flex-1 p-6">
        {activePage === "manual" && (
          <ManualCompare />
        )}

        {activePage === "auto" && (
          <AutoMatch />
        )}
      </main>
    </div>
  );
}
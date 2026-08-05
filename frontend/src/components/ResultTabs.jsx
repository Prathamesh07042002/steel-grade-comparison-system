import { useState } from "react";
import PropertyTable from "./PropertyTable";

export default function ResultTabs({ chem_result, mech_result, tableProps = {} }) {
  const [activeTab, setActiveTab] = useState("chem");

  return (
    <div>
      <div className="flex items-center bg-surface-2 p-1 rounded-xl w-fit mb-5">
        <button
          onClick={() => setActiveTab("chem")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === "chem" ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          Chemical Properties
        </button>

        <button
          onClick={() => setActiveTab("mech")}
          className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeTab === "mech" ? "bg-surface text-accent shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          Mechanical Properties
        </button>
      </div>

      <div>
        {activeTab === "chem" && <PropertyTable result={chem_result} {...tableProps} />}
        {activeTab === "mech" && <PropertyTable result={mech_result} {...tableProps} />}
      </div>
    </div>
  );
}

import { useState } from "react";
import PropertyTable from "./PropertyTable";

export default function ResultTabs({
  chem_result,
  mech_result,
}) {
  const [activeTab, setActiveTab] =
    useState("chem");

  return (
    <div>

      {/* Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl w-fit mb-6">

        <button
          onClick={() =>
            setActiveTab("chem")
          }
          className={`
            px-5
            py-2.5
            rounded-lg
            font-medium
            transition-all
            duration-200
            ${
              activeTab === "chem"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }
          `}
        >
          Chemical Properties
        </button>

        <button
          onClick={() =>
            setActiveTab("mech")
          }
          className={`
            px-5
            py-2.5
            rounded-lg
            font-medium
            transition-all
            duration-200
            ${
              activeTab === "mech"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }
          `}
        >
          Mechanical Properties
        </button>

      </div>

      {/* Content */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">

        {activeTab === "chem" && (
          <PropertyTable
            result={chem_result}
          />
        )}

        {activeTab === "mech" && (
          <PropertyTable
            result={mech_result}
          />
        )}

      </div>

    </div>
  );
}
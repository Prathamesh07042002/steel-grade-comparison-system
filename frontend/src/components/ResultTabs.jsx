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
      <div className="flex gap-2 mb-4">

        <button
          onClick={() =>
            setActiveTab("chem")
          }
        >
          Chemical
        </button>

        <button
          onClick={() =>
            setActiveTab("mech")
          }
        >
          Mechanical
        </button>

      </div>

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
  );
}
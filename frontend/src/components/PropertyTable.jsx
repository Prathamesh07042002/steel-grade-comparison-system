import React from "react";
import Badge from "./ui/Badge";

export default function PropertyTable({
  result,
  testLabel = "Test Value",
  testSubLabel = null,
  standardLabel = "Standard Value",
  standardSubLabel = null,
  showNotes = true,
}) {
  const matched = result?.matched || {};
  const notInStd = result?.not_in_standard || {};
  const notInTest = result?.not_in_test || {};

  return (
    <div className="space-y-4">
      {/* Matched Properties */}
      <div>
        {Object.keys(matched).length > 0 ? (
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-sm">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink">Property</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink">
                    {testLabel}
                    {testSubLabel && (
                      <span className="block text-[10px] font-normal text-muted">{testSubLabel}</span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink">
                    {standardLabel}
                    {standardSubLabel && (
                      <span className="block text-[10px] font-normal text-muted">{standardSubLabel}</span>
                    )}
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-ink">Status</th>
                  {showNotes && (
                    <th className="px-3 py-2 text-left text-xs font-semibold text-ink">Notes</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {Object.entries(matched).map(([prop, info]) => (
                  <tr key={prop} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-ink">{prop}</td>
                    <td className="px-3 py-2">
                      <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-muted text-xs">
                        {info.test_value}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <code className="font-mono bg-surface-2 px-1.5 py-0.5 rounded text-muted text-xs">
                        {info.standard_value}
                      </code>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={info.within_range ? "success" : "error"}>
                        {info.within_range ? "PASS" : "FAIL"}
                      </Badge>
                    </td>
                    {showNotes && (
                      <td className="px-3 py-2 text-muted text-xs">{info.note || "-"}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-2 border border-border rounded-xl p-4 text-muted text-sm">
            No matched properties found.
          </div>
        )}
      </div>

      {/* In Test But Not In Standard */}
      {Object.keys(notInStd).length > 0 && (
        <div className="border border-warning/25 bg-warning/10 rounded-xl p-4">
          <h3 className="font-semibold text-warning text-sm mb-2">Present In Test Report Only</h3>
          <div className="space-y-1.5">
            {Object.entries(notInStd).map(([prop, val]) => (
              <div key={prop} className="flex justify-between text-sm border-b border-warning/15 pb-1.5">
                <span className="font-medium text-ink">{prop}</span>
                <code className="font-mono text-muted text-xs">{val}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* In Standard But Not In Test */}
      {Object.keys(notInTest).length > 0 && (
        <div className="border border-info/25 bg-info/10 rounded-xl p-4">
          <h3 className="font-semibold text-info text-sm mb-2">
            Required By Standard But Missing In Test Report
          </h3>
          <div className="space-y-1.5">
            {Object.entries(notInTest).map(([prop, val]) => (
              <div key={prop} className="flex justify-between text-sm border-b border-info/15 pb-1.5">
                <span className="font-medium text-ink">{prop}</span>
                <code className="font-mono text-muted text-xs">{val}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

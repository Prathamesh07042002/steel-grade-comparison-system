import React from "react";

export default function PropertyTable({ result }) {
  const matched = result?.matched || {};
  const notInStd = result?.not_in_standard || {};
  const notInTest = result?.not_in_test || {};

  return (
    <div className="property-table-container">
      {Object.keys(matched).length > 0 ? (
        <>
          <h4>✅ Matched Properties</h4>

          <table className="property-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Test Value</th>
                <th>Standard Value</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(matched).map(([prop, info]) => (
                <tr
                  key={prop}
                  className={info.within_range ? "pass" : "fail"}
                >
                  <td>
                    <strong>{prop}</strong>
                  </td>

                  <td>
                    <code>{info.test_value}</code>
                  </td>

                  <td>
                    <code>{info.standard_value}</code>
                  </td>

                  <td>
                    {info.within_range
                      ? "✅ PASS"
                      : "❌ FAIL"}
                  </td>

                  <td>
                    <em>{info.note || "-"}</em>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>No matched properties</p>
      )}

      {Object.keys(notInStd).length > 0 && (
        <div>
          <h4>ℹ️ In test but NOT in standard</h4>

          {Object.entries(notInStd).map(([prop, val]) => (
            <div key={prop}>
              <code>{prop}</code>: {val}
            </div>
          ))}
        </div>
      )}

      {Object.keys(notInTest).length > 0 && (
        <div>
          <h4>➕ In standard but NOT in test</h4>

          {Object.entries(notInTest).map(([prop, val]) => (
            <div key={prop}>
              <code>{prop}</code>: {val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import React from "react";

export default function PropertyTable({ result }) {
  const matched = result?.matched || {};
  const notInStd = result?.not_in_standard || {};
  const notInTest = result?.not_in_test || {};

  return (
    <div className="space-y-8">

      {/* Matched Properties */}
      <div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Matched Properties
        </h3>

        {Object.keys(matched).length > 0 ? (

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">

            <table className="w-full">

              <thead className="bg-slate-50">

                <tr>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Property
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Test Value
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Standard Value
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Notes
                  </th>

                </tr>

              </thead>

              <tbody>

                {Object.entries(matched).map(
                  ([prop, info]) => (
                    <tr
                      key={prop}
                      className="border-t border-slate-100"
                    >

                      <td className="px-4 py-4 font-medium text-slate-800">
                        {prop}
                      </td>

                      <td className="px-4 py-4">
                        <code className="bg-slate-100 px-2 py-1 rounded">
                          {info.test_value}
                        </code>
                      </td>

                      <td className="px-4 py-4">
                        <code className="bg-slate-100 px-2 py-1 rounded">
                          {info.standard_value}
                        </code>
                      </td>

                      <td className="px-4 py-4">

                        {info.within_range ? (
                          <span
                            className="
                              bg-green-100
                              text-green-700
                              px-3
                              py-1
                              rounded-full
                              text-sm
                              font-medium
                            "
                          >
                            PASS
                          </span>
                        ) : (
                          <span
                            className="
                              bg-red-100
                              text-red-700
                              px-3
                              py-1
                              rounded-full
                              text-sm
                              font-medium
                            "
                          >
                            FAIL
                          </span>
                        )}

                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {info.note || "-"}
                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-500">
            No matched properties found.
          </div>
        )}

      </div>

      {/* In Test But Not In Standard */}
      {Object.keys(notInStd).length > 0 && (

        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-6">

          <h3 className="font-semibold text-amber-800 mb-4">
            Present In Test Report Only
          </h3>

          <div className="space-y-2">

            {Object.entries(notInStd).map(
              ([prop, val]) => (
                <div
                  key={prop}
                  className="
                    flex
                    justify-between
                    border-b
                    border-amber-100
                    pb-2
                  "
                >
                  <span className="font-medium">
                    {prop}
                  </span>

                  <code>{val}</code>
                </div>
              )
            )}

          </div>

        </div>

      )}

      {/* In Standard But Not In Test */}
      {Object.keys(notInTest).length > 0 && (

        <div className="border border-blue-200 bg-blue-50 rounded-2xl p-6">

          <h3 className="font-semibold text-blue-800 mb-4">
            Required By Standard But Missing In Test Report
          </h3>

          <div className="space-y-2">

            {Object.entries(notInTest).map(
              ([prop, val]) => (
                <div
                  key={prop}
                  className="
                    flex
                    justify-between
                    border-b
                    border-blue-100
                    pb-2
                  "
                >
                  <span className="font-medium">
                    {prop}
                  </span>

                  <code>{val}</code>
                </div>
              )
            )}

          </div>

        </div>

      )}

    </div>
  );
}
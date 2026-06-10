import ResultTabs from "./ResultTabs";
import { getAutoMatchStats } from "../utils/propertyUtils";

export default function AutoMatchResults({ result, testData }) {
  const status = result?.result?.status;
  const best = result?.result?.best_match;
  const topMatches = result?.result?.top_matches || [];

  if (status === "NO_MATCH") {
    return (
      <section className="space-y-8">
        <div className="no-match-card">
          <h3>❌ NO MATCH FOUND</h3>
          <p>{result?.result?.message}</p>
          {result?.result?.closest_attempt && (
            <div className="closest-attempt">
              <h4>🔍 Closest Attempt:</h4>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>
                      <strong>Standard:</strong>
                    </td>
                    <td>{result.result.closest_attempt.standard_product}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>File:</strong>
                    </td>
                    <td>{result.result.closest_attempt.standard_file}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Score:</strong>
                    </td>
                    <td>
                      {(
                        result.result.closest_attempt.overall_score * 100
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Reason:</strong>
                    </td>
                    <td>{result.result.closest_attempt.verdict_reason}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (!best) {
    return <div className="error-box">No results available</div>;
  }

  const passCount = best.matched_count;
  const totalCount = best.standard_total;
  const passPercent =
    totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  return (
    <section className="space-y-8">
      <div className="space-y-6">
        {/* Match Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 uppercase tracking-wider text-sm">
                Match Result
              </p>

              <h2 className="text-4xl font-bold mt-2">{best.verdict}</h2>

              <p className="text-blue-100 mt-3">
                {passCount} of {totalCount} properties matched
              </p>
            </div>

            <div className="text-right">
              <p className="text-blue-100 text-sm">Match Score</p>

              <h2 className="text-5xl font-bold">{passPercent}%</h2>
            </div>
          </div>

          <div className="mt-8">
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{
                  width: `${passPercent}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-5" 
        style={{ margin: "0.5rem" }}>
          <div className="bg-[#ffffff] border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Matched Properties</p>

            <h3 className="text-3xl font-bold text-green-600 mt-2">
              {passCount}
            </h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Properties</p>

            <h3 className="text-3xl font-bold text-slate-800 mt-2">
              {totalCount}
            </h3>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500">Match Confidence</p>

            <h3 className="text-3xl font-bold text-blue-600 mt-2">
              {passPercent}%
            </h3>
          </div>
        </div>

        {/* Best Match */}
        <div className="bg-white ">
          <div className="px-4 py-6 border-b border-slate-200">
            <h3 className="text-2xl font-semibold text-slate-800">
              Best Matching Standard
            </h3>

            <p className="text-slate-500 mt-1">
              Highest scoring standard identified from the uploaded certificate.
            </p>
          </div>

          <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Standard Product
              </p>

              <p className="font-semibold text-slate-800 mt-2">
                {best.standard_product}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Test Product
              </p>

              <p className="font-semibold text-slate-800 mt-2">
                {best.test_product || testData?.grade || "Unknown"}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Name Match
              </p>

              <p
                className={`font-semibold mt-2 ${
                  best.name_match ? "text-green-600" : "text-red-600"
                }`}
              >
                {best.name_match ? "Matched" : "Not Matched"}
              </p>
            </div>

            <div className="p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Standard File
              </p>

              <p className="font-semibold text-slate-800 mt-2 break-all">
                {best.standard_file}
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Summary */}
        <div className="bg-[#f1f1f18e] p-6 rounded-2xl">
          <h4 className="text-lg font-semibold text-slate-800 ">
            Analysis Summary : <span className="text-slate-600 text-lg font-normal">
              {best.verdict_reason}
          </span>
          </h4>

      
        </div>
      </div>

      <div className="bg-white pt-9 pb-3">
        <h3 className="text-xl font-semibold text-slate-800 mb-6">
          Property Comparison
        </h3>

        <ResultTabs
          chem_result={best.chemical_properties}
          mech_result={best.mechanical_properties}
        />
      </div>

      {topMatches.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-800 mb-6">
            Top Matching Standards
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3">Rank</th>

                  <th className="text-left py-3">Standard</th>

                  <th className="text-left py-3">Score</th>

                  <th className="text-left py-3">Matched</th>

                  <th className="text-left py-3">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {topMatches.map((match, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 text-align-center"
                  >
                    <td>{idx + 1}</td>
                    <td>{match.standard_product}</td>
                    <td>
                      <span className="font-semibold text-blue-600">
                        {(match.overall_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      {match.matched_count}/{match.standard_total}
                    </td>
                    <td>{match.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

import ResultTabs from "./ResultTabs";
import {
  getAutoMatchStats,
} from "../utils/propertyUtils";

export default function AutoMatchResults(result, testData){
  const status = result?.result?.status;
  const best = result?.result?.best_match;
  const topMatches = result?.result?.top_matches || [];

  if (status === "NO_MATCH") {
    return (
      <section className="results">
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
    <section className="results auto-match">
      <div className={`verdict-card ${best.verdict.toLowerCase()}`}>
        <h3>
          {best.verdict === "MATCHED" ? "✅" : "⚠️"} {best.verdict}
        </h3>
        <div className="verdict-details">
          <p className="match-score">{passPercent}% Match Score</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${passPercent}%` }}
            ></div>
          </div>
          <p className="match-summary">
            {passCount} of {totalCount} properties matched
          </p>
        </div>
      </div>

      <div className="best-match-info">
        <h4>🏆 Best Match</h4>
        <table className="info-table">
          <tbody>
            <tr>
              <td>
                <strong>Standard Product:</strong>
              </td>
              <td>{best.standard_product}</td>
            </tr>
            <tr>
              <td>
                <strong>Standard File:</strong>
              </td>
              <td>{best.standard_file}</td>
            </tr>
            <tr>
              <td>
                <strong>Test Product:</strong>
              </td>
              <td>{best.test_product || testData?.grade || "Unknown"}</td>
            </tr>
            <tr>
              <td>
                <strong>Name Match:</strong>
              </td>
              <td>
                {best.name_match ? "✅ Yes" : "❌ No"} {best.name_match_reason}
              </td>
            </tr>
            <tr>
              <td>
                <strong>Verdict Reason:</strong>
              </td>
              <td>{best.verdict_reason}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tabs-result">
        <ResultTabs
          chem_result={best.chemical_properties}
          mech_result={best.mechanical_properties}
        />
      </div>

      {topMatches.length > 0 && (
        <div className="top-matches">
          <h4>🏆 Top Matches (up to 5)</h4>
          <table className="matches-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Standard Product</th>
                <th>Score</th>
                <th>Matched</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {topMatches.map((match, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td>{match.standard_product}</td>
                  <td>
                    <strong>{(match.overall_score * 100).toFixed(1)}%</strong>
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
      )}
    </section>
  );
}

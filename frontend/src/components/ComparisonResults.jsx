import ResultTabs from "./ResultTabs";
import { calculateResultStats } from "../utils/propertyUtils";

export default function ComparisonResults({
  chem_result,
  mech_result,
  testFilename,
  standardName,
}) {
  const {
    passCount,
    total,
    passPercent,
    verdict,
    verdictClass,
  } = calculateResultStats(
    chem_result,
    mech_result
  );

  return (
    <section className="results">
      <h2>📊 Comparison Results</h2>

      <p>
        <strong>Test:</strong> {testFilename}
        {" | "}
        <strong>Standard:</strong> {standardName}
      </p>

      <div className={`verdict-card ${verdictClass}`}>
        <h3>{verdict}</h3>

        <p>{passPercent}% Passed</p>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${passPercent}%`,
            }}
          />
        </div>

        <p>
          {passCount} of {total} properties passed
        </p>
      </div>

      <ResultTabs
        chem_result={chem_result}
        mech_result={mech_result}
      />
    </section>
  );
}
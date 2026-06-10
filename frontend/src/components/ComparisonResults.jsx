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

  const verdictStyles = {
    excellent: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      progress: "bg-green-500",
    },
    good: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      progress: "bg-blue-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      progress: "bg-yellow-500",
    },
    fail: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      progress: "bg-red-500",
    },
  };

  const style =
    verdictStyles[verdictClass] ||
    verdictStyles.good;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 className="text-2xl font-bold text-slate-800">
          Comparison Results
        </h2>

        <p className="text-slate-500 mt-2">
          Property-by-property comparison
          between the uploaded test report
          and the selected standard.
        </p>
      </div>

      {/* Metadata */}
      <div className="grid md:grid-cols-2 gap-4" style={{ marginBottom: "1.5rem" }}>

        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">
            Test File
          </p>

          <p className="font-medium text-slate-800 mt-1">
            {testFilename}
          </p>
        </div>

        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-500">
            Selected Standard
          </p>

          <p className="font-medium text-slate-800 mt-1">
            {standardName}
          </p>
        </div>

      </div>

      {/* Verdict Card */}
      <div
        className={`
          rounded-3xl
          border
          p-8
          ${style.bg}
          ${style.border}
        `}
        style={{ marginBottom: "0.5rem" }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

          <div>
            <h3
              className={`
                text-3xl
                font-bold
                ${style.text}
              `}
            >
              {verdict}
            </h3>

            <p className="text-slate-600 mt-2">
              {passCount} of {total} properties passed
            </p>
          </div>

          <div className="text-center lg:text-right">
            <div
              className={`
                text-4xl
                font-bold
                ${style.text}
              `}
            >
              {passPercent}%
            </div>

            <p className="text-slate-500">
              Match Score
            </p>
          </div>

        </div>

        {/* Progress */}
        <div className="mt-6">

          <div className="w-full bg-white rounded-full h-4 overflow-hidden">

            <div
              className={`
                h-full
                transition-all
                duration-700
                ${style.progress}
              `}
              style={{
                width: `${passPercent}%`,
              }}
            />

          </div>

        </div>

      </div>

      {/* Detailed Results */}
      <div className=" p-2">
        <ResultTabs
          chem_result={chem_result}
          mech_result={mech_result}
        />
      </div>

    </div>
  );
}
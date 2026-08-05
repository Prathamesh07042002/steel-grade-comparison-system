import { useState } from "react";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ScoreRing from "./ui/ScoreRing";
import ResultTabs from "./ResultTabs";
import {
  IconXCircle,
  IconCheckCircle,
  IconDatabase,
  IconTarget,
  IconList,
  IconDownload,
} from "./icons/Icons";

const TONE_CLASSES = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  accent: "bg-accent/10 text-accent",
};

function StatItem({ icon: Icon, tone, label, value }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${TONE_CLASSES[tone]}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs text-muted whitespace-nowrap">{label}</p>
        <p className="text-sm font-bold text-ink whitespace-nowrap">{value}</p>
      </div>
    </div>
  );
}

function confidenceLabel(percent) {
  if (percent >= 95) return "Very High";
  if (percent >= 85) return "High";
  if (percent >= 70) return "Moderate";
  if (percent >= 50) return "Low";
  return "Very Low";
}

function RankItem({ rank, name, score, isBest }) {
  return (
    <div className={`rounded-xl p-3 ${isBest ? "bg-accent/5 border border-accent/20" : ""}`}>
      <div className="flex items-center gap-3 mb-2">
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
            isBest ? "bg-accent text-white" : "bg-surface-2 text-ink"
          }`}
        >
          {rank}
        </span>
        <span className="font-semibold text-ink text-sm truncate">{name}</span>
        {isBest && (
          <Badge variant="success" className="ml-auto shrink-0">
            Best Match
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 pl-9">
        <span className="text-xs text-muted shrink-0">Match Score</span>
        <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full" style={{ width: `${score}%` }} />
        </div>
        <span className="text-xs font-bold text-ink shrink-0">{score.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export default function AutoMatchResults({ result, testData, standardsCount, onDownloadReport }) {
  const [showAllMatches, setShowAllMatches] = useState(false);

  const status = result?.result?.status;
  const best = result?.result?.best_match;
  const topMatches = result?.result?.top_matches || [];

  if (status === "NO_MATCH") {
    const closest = result?.result?.closest_attempt;
    return (
      <Card className="border-danger/25 bg-danger/5">
        <div className="flex items-start gap-3">
          <IconXCircle className="w-7 h-7 text-danger shrink-0 mt-0.5" strokeWidth={1.8} />
          <div>
            <h3 className="text-xl font-bold text-danger">No Match Found</h3>
            <p className="text-ink mt-2">{result?.result?.message}</p>
          </div>
        </div>

        {closest && (
          <div className="mt-5 border border-border rounded-xl p-5 bg-surface">
            <h4 className="text-sm font-bold text-ink mb-3">Closest Attempt</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Standard</span>
                <span className="font-medium text-ink">{closest.standard_product}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">File</span>
                <span className="font-medium text-ink">{closest.standard_file}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted">Score</span>
                <span className="font-medium text-ink">
                  {(closest.overall_score * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Reason</span>
                <span className="font-medium text-ink text-right">{closest.verdict_reason}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    );
  }

  if (!best) {
    return (
      <Card className="border-danger/25 bg-danger/5 text-danger text-center">
        No results available
      </Card>
    );
  }

  const passCount = best.matched_count;
  const totalCount = best.standard_total;
  const passPercent = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;
  const isMatched = best.verdict === "MATCHED";
  const isPartial = best.verdict === "PARTIAL";
  const visibleMatches = showAllMatches ? topMatches : topMatches.slice(0, 3);
  const heading = isMatched ? "Best Match Found" : isPartial ? "Partial Match" : best.verdict;

  return (
    <div className="space-y-5">
      {/* Match Summary */}
      <Card className={`p-6 ${isPartial ? "border-accent/25 bg-accent/10" : ""}`}>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <ScoreRing percent={passPercent} size={128} strokeWidth={10} className="text-accent" />

          <div className="flex-1 w-full min-w-0">
            <p className="text-accent font-extrabold text-xl uppercase tracking-wide">
              {heading}
            </p>
            <p className="text-muted text-sm mt-1">
              {passCount} of {totalCount} properties matched
            </p>
            <div className="mt-4 h-2.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700"
                style={{ width: `${passPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-6 md:gap-8 shrink-0">
            <StatItem
              icon={IconCheckCircle}
              tone="success"
              label="Matched Properties"
              value={`${passCount} / ${totalCount}`}
            />
            <StatItem
              icon={IconDatabase}
              tone="info"
              label="Total Standards Scanned"
              value={standardsCount ? `${standardsCount}+` : "—"}
            />
            <StatItem
              icon={IconTarget}
              tone="accent"
              label="Match Confidence"
              value={confidenceLabel(passPercent)}
            />
          </div>
        </div>
      </Card>

      {/* Top matches + property comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Card>
          <h3 className="text-lg font-bold text-ink mb-4">Top Matching Standards</h3>
          <div className="space-y-3">
            {visibleMatches.map((match, idx) => (
              <RankItem
                key={idx}
                rank={idx + 1}
                name={match.standard_product}
                score={match.overall_score * 100}
                isBest={idx === 0}
              />
            ))}
          </div>

          {topMatches.length > 3 && (
            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-4"
              onClick={() => setShowAllMatches((v) => !v)}
            >
              <IconList className="w-5 h-5" />
              {showAllMatches ? "Show Top 3" : `View All Matches (Top ${topMatches.length})`}
            </Button>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-bold text-ink mb-5">Property Comparison</h3>
          <ResultTabs
            chem_result={best.chemical_properties}
            mech_result={best.mechanical_properties}
            tableProps={{
              testLabel: "Test Value",
              testSubLabel: "(Extracted)",
              standardLabel: "Best Match Standard",
              standardSubLabel: `(${best.standard_product})`,
              showNotes: false,
            }}
          />
        </Card>
      </div>

      {/* Bottom summary bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-success/10 border border-success/25 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <IconCheckCircle className="w-6 h-6 text-success shrink-0" strokeWidth={2} />
          <span className="font-bold text-ink shrink-0">Analysis Summary:</span>
          <span className="text-muted truncate">{best.verdict_reason}</span>
        </div>
        <Button variant="accent" onClick={onDownloadReport} className="shrink-0">
          <IconDownload className="w-5 h-5" />
          Download Full Report (PDF)
        </Button>
      </div>
    </div>
  );
}

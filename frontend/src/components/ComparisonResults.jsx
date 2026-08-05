import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import ScoreRing from "./ui/ScoreRing";
import PropertyTable from "./PropertyTable";
import PropertyChipGrid from "./PropertyChipGrid";
import { calculateResultStats } from "../utils/propertyUtils";
import {
  IconFileText,
  IconFlask,
  IconShield,
  IconCheckCircle,
  IconXCircle,
  IconMinus,
} from "./icons/Icons";

const VERDICT_STYLES = {
  pass: { bg: "bg-success/10", border: "border-success/25", text: "text-success", ring: "text-success", bar: "bg-success" },
  partial: { bg: "bg-accent/10", border: "border-accent/25", text: "text-accent", ring: "text-accent", bar: "bg-accent" },
  fail: { bg: "bg-danger/10", border: "border-danger/25", text: "text-danger", ring: "text-danger", bar: "bg-danger" },
  warn: { bg: "bg-info/10", border: "border-info/25", text: "text-info", ring: "text-info", bar: "bg-info" },
};

function sectionPassCount(result) {
  const vals = Object.values(result?.matched || {});
  return { pass: vals.filter((v) => v.within_range).length, total: vals.length };
}

export default function ComparisonResults({
  chem_result,
  mech_result,
  testFilename,
  testFileSize,
  standardName,
  onChangeFile,
  onChangeStandard,
}) {
  const { passCount, failCount, notApplicableCount, total, passPercent, verdict, verdictClass } =
    calculateResultStats(chem_result, mech_result);

  const style = VERDICT_STYLES[verdictClass] || VERDICT_STYLES.partial;
  const chemStats = sectionPassCount(chem_result);
  const mechStats = sectionPassCount(mech_result);

  return (
    <div className="space-y-3">
      {/* Test file / standard */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card padding={false} className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <IconFileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Test File</p>
              <p className="font-semibold text-ink truncate">
                {testFilename}
                {testFileSize && <span className="text-muted font-normal"> ({testFileSize})</span>}
              </p>
            </div>
          </div>
          {onChangeFile && (
            <Button variant="secondary" size="sm" onClick={onChangeFile} className="shrink-0">
              Change File
            </Button>
          )}
        </Card>

        <Card padding={false} className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
              <IconShield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Selected Standard</p>
              <p className="font-semibold text-ink truncate">{standardName}</p>
            </div>
          </div>
          {onChangeStandard && (
            <Button variant="secondary" size="sm" onClick={onChangeStandard} className="shrink-0">
              Change Standard
            </Button>
          )}
        </Card>
      </div>

      {/* Score summary */}
      <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ScoreRing percent={passPercent} size={92} className={style.ring} />

          <div className="flex-1 text-center sm:text-left">
            <h3 className={`text-2xl font-extrabold ${style.text}`}>{verdict}</h3>
            <p className="text-muted text-sm mt-1">
              {passCount} of {total} properties passed
            </p>
          </div>

          <div className="flex sm:flex-col gap-4 sm:gap-2.5 shrink-0 text-sm">
            <div className="flex items-center gap-2">
              <IconCheckCircle className="w-6 h-6 text-success" strokeWidth={2} />
              <span className="text-muted">Passed</span>
              <span className="font-bold text-ink ml-auto">{passCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconXCircle className="w-6 h-6 text-danger" strokeWidth={2} />
              <span className="text-muted">Failed</span>
              <span className="font-bold text-ink ml-auto">{failCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconMinus className="w-6 h-6 text-muted" strokeWidth={2} />
              <span className="text-muted">Not Applicable</span>
              <span className="font-bold text-ink ml-auto">{notApplicableCount}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
              style={{ width: `${passPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick-view chips */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconFlask className="w-5 h-5 text-accent" />
              <h4 className="text-sm font-bold text-ink">Chemical Properties</h4>
            </div>
            <Badge variant={chemStats.pass === chemStats.total ? "success" : "error"}>
              {chemStats.pass} / {chemStats.total} Passed
            </Badge>
          </div>
          <PropertyChipGrid matched={chem_result?.matched} />
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <IconShield className="w-5 h-5 text-accent" />
              <h4 className="text-sm font-bold text-ink">Mechanical Properties</h4>
            </div>
            <Badge variant={mechStats.pass === mechStats.total ? "success" : "error"}>
              {mechStats.pass} / {mechStats.total} Passed
            </Badge>
          </div>
          <PropertyChipGrid matched={mech_result?.matched} />
        </Card>
      </div>

      {/* Detail tables */}
      <div className="grid lg:grid-cols-2 gap-3 min-h-0">
        <Card padding={false} className="p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <IconFlask className="w-5 h-5 text-accent" />
            <h4 className="text-sm font-bold text-ink">Chemical Properties</h4>
          </div>
          <div className="overflow-y-auto max-h-64">
            <PropertyTable result={chem_result} />
          </div>
        </Card>

        <Card padding={false} className="p-4 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <IconShield className="w-5 h-5 text-accent" />
            <h4 className="text-sm font-bold text-ink">Mechanical Properties</h4>
          </div>
          <div className="overflow-y-auto max-h-64">
            <PropertyTable result={mech_result} />
          </div>
        </Card>
      </div>
    </div>
  );
}

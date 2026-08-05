import React, { useState, useEffect } from "react";
import axios from "axios";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import StepTabs from "../components/layout/StepTabs";
import AutoMatchResults from "../components/AutoMatchResults";
import {
  IconUpload,
  IconFileText,
  IconSparkles,
  IconTrophy,
  IconEye,
  IconEyeOff,
  IconCheckCircle,
  IconDownload,
  IconRefresh,
} from "../components/icons/Icons";

const API_BASE_URL = "http://localhost:8000";

const STEPS = [
  { id: "upload", title: "Upload Certificate", subtitle: "Material Test Certificate", icon: <IconUpload className="w-6 h-6" /> },
  { id: "run", title: "Run Analysis", subtitle: "AI scans all standards", icon: <IconSparkles className="w-6 h-6" /> },
  { id: "results", title: "Results", subtitle: "Best-matching grade", icon: <IconTrophy className="w-6 h-6" /> },
];

export default function AutoMatch({ onHeaderActionsChange, initialFile, onInitialFileConsumed }) {
  const [currentStep, setCurrentStep] = useState(0);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [autoResult, setAutoResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [standardsCount, setStandardsCount] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/standards/list`)
      .then((res) => setStandardsCount((res.data.standards || []).length))
      .catch(() => {});
  }, []);

  const resetAll = () => {
    setUploadedFile(null);
    setAutoResult(null);
    setTestData(null);
    setPdfPreview(null);
    setShowPdfPreview(false);
    setError(null);
    setCurrentStep(0);
  };

  const handleDownloadReport = async () => {
    const best = autoResult?.result?.best_match;
    if (!best) return;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/report/generate-pdf`,
        {
          test_filename: uploadedFile?.name || "test.pdf",
          selected_spec: best.standard_file || "Auto",
          selected_desig: best.standard_product || "Auto",
          chem_result: best.chemical_properties || {},
          mech_result: best.mechanical_properties || {},
          pipeline: "Auto",
          test_product: best.test_product,
          verdict: best.verdict,
          overall_score: best.overall_score,
          verdict_reason: best.verdict_reason,
          name_match: best.name_match,
          name_match_reason: best.name_match_reason,
          top_matches: autoResult?.result?.top_matches || [],
          section_txw: testData?.section_txw || [],
        },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const base = (uploadedFile?.name || "report").replace(/\.pdf$/i, "");
      link.setAttribute("download", `p2_automatch_${base}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate PDF report");
    }
  };

  useEffect(() => {
    if (!onHeaderActionsChange) return;

    if (currentStep === 2 && autoResult) {
      onHeaderActionsChange(
        <>
          <Button variant="secondary" size="sm" onClick={handleDownloadReport}>
            <IconDownload className="w-5 h-5" />
            Download Report
          </Button>
          <Button variant="secondary" size="sm" onClick={resetAll}>
            <IconRefresh className="w-5 h-5" />
            Compare Another
          </Button>
        </>
      );
    } else {
      onHeaderActionsChange(null);
    }

    return () => onHeaderActionsChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, autoResult]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setAutoResult(null);
    setTestData(null);
    setError(null);
    setShowPdfPreview(false);

    const reader = new FileReader();
    reader.onload = (event) => setPdfPreview(event.target.result);
    reader.readAsDataURL(file);

    setCurrentStep(1);
  };

  useEffect(() => {
    if (!initialFile) return;
    handleFileUpload({ target: { files: [initialFile] } });
    onInitialFileConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleAutoMatch = async () => {
    if (!uploadedFile) {
      setError("Please upload a PDF first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await axios.post(`${API_BASE_URL}/compare/auto`, formData);
      setAutoResult(res.data);
      setTestData(res.data.test_data);
      setCurrentStep(2);
    } catch (err) {
      setError("Auto match failed");
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (idx) => setCurrentStep(idx);

  return (
    <div className="w-full space-y-5">
      <StepTabs steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {error && (
        <div className="bg-danger/10 border border-danger/25 text-danger rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Step 1 — Upload */}
      {currentStep === 0 && (
        <Card>
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-border hover:border-accent hover:bg-accent/5 rounded-2xl p-12 text-center transition-colors">
              <div className="w-14 h-14 rounded-xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                <IconUpload className="w-7 h-7" strokeWidth={1.6} />
              </div>
              <h3 className="text-base font-bold text-ink">Click to upload PDF</h3>
              <p className="text-sm text-muted mt-1">Material Test Certificate (MTC)</p>
            </div>
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>
        </Card>
      )}

      {currentStep > 0 && uploadedFile && (
        <button
          type="button"
          onClick={() => goToStep(0)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-2 border border-border text-left"
        >
          <span className="flex items-center gap-2 text-sm text-ink min-w-0">
            <IconCheckCircle className="w-5 h-5 text-success shrink-0" strokeWidth={2} />
            <IconFileText className="w-5 h-5 text-muted shrink-0" />
            <span className="font-medium truncate">{uploadedFile.name}</span>
            <span className="text-muted shrink-0">
              ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </span>
          <span className="flex items-center gap-1 text-xs font-semibold text-accent shrink-0 ml-3">
            <IconUpload className="w-4 h-4" strokeWidth={2} />
            Change File
          </span>
        </button>
      )}

      {/* Step 2 — Run analysis */}
      {currentStep === 1 && (
        <Card className="space-y-5">
          {pdfPreview && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPdfPreview(!showPdfPreview)}
              >
                {showPdfPreview ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                {showPdfPreview ? "Hide certificate preview" : "Preview certificate"}
              </Button>
              {showPdfPreview && (
                <div className="mt-3 border border-border rounded-xl overflow-hidden">
                  <iframe src={pdfPreview} title="PDF Preview" className="w-full h-[500px]" />
                </div>
              )}
            </div>
          )}

          <p className="text-sm text-muted">
            The AI will compare this certificate against every standard on file and
            return the closest matching grade.
          </p>

          <Button variant="accent" size="xl" onClick={handleAutoMatch} disabled={loading}>
            <IconSparkles className="w-5 h-5" />
            {loading ? "Analyzing..." : "Find Best Match"}
          </Button>
        </Card>
      )}

      {/* Step 3 — Results */}
      {currentStep === 2 && autoResult && (
        <AutoMatchResults
          result={autoResult}
          testData={testData}
          standardsCount={standardsCount}
          onDownloadReport={handleDownloadReport}
        />
      )}
    </div>
  );
}

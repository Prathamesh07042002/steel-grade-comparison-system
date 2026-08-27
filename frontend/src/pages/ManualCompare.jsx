import React, { useState, useEffect } from "react";
import axios from "axios";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Disclosure from "../components/ui/Disclosure";
import PropertyList from "../components/ui/PropertyList";
import StepTabs from "../components/layout/StepTabs";
import ComparisonResults from "../components/ComparisonResults";
import {
  IconUpload,
  IconFileText,
  IconSearch,
  IconTrophy,
  IconEye,
  IconEyeOff,
  IconCheckCircle,
  IconDownload,
  IconChevronDown,
} from "../components/icons/Icons";
import {
  parseProperties,
  renderStandardProperties,
} from "../utils/propertyUtils";
import { trackEvent } from "../ga";
// Relative, subpath-aware base ("/api" in dev, "/tc_compliance/api" in a
// production build). The old hardcoded "http://localhost:8000" only ever
// worked on a developer machine.
import { API_BASE as API_BASE_URL } from "../api";

const STEPS = [
  { id: "upload", title: "Upload Certificate", subtitle: "Material Test Certificate", icon: <IconUpload className="w-6 h-6" /> },
  { id: "standard", title: "Select Standard", subtitle: "Choose grade to compare", icon: <IconSearch className="w-6 h-6" /> },
  { id: "results", title: "Results", subtitle: "Pass / fail breakdown", icon: <IconTrophy className="w-6 h-6" /> },
];

export default function ManualCompare({
  initialFile,
  onFileChange,
  initialTestData,
  onTestDataChange,
}) {
  const [currentStep, setCurrentStep] = useState(0);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState("");
  const [standardDropdownOpen, setStandardDropdownOpen] = useState(true);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [standards, setStandards] = useState([]);
  const [standardDetails, setStandardDetails] = useState(null);

  const [testData, setTestData] = useState(null);
  const [chem_result, setChemResult] = useState(null);
  const [mech_result, setMechResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStandards();
  }, []);

  const loadStandards = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/standards/list`);
      setStandards(res.data.standards || []);
    } catch (err) {
      setError("Failed to load standards");
    }
  };

  const handleFileUpload = (e, cachedTestData = null) => {
    const file = e.target.files[0];
    if (!file) return;

    trackEvent("file_uploaded", {
      feature: "pipeline_1_manual",
      app_name: "Test Certificate Compliance",
    });

    setUploadedFile(file);
    onFileChange?.(file);
    setSelectedStandard("");
    setStandardDropdownOpen(true);
    setSelectedDesignation(null);
    setStandardDetails(null);
    setError(null);
    // Reuse an already-extracted result carried over from Auto Compare for
    // this same file, instead of wiping it and re-running OCR.
    setTestData(cachedTestData);
    setChemResult(null);
    setMechResult(null);
    setShowPdfPreview(false);

    const reader = new FileReader();
    reader.onload = (event) => setPdfPreview(event.target.result);
    reader.readAsDataURL(file);

    setCurrentStep(1);
  };

  useEffect(() => {
    if (!initialFile || initialFile === uploadedFile) return;
    handleFileUpload({ target: { files: [initialFile] } }, initialTestData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  const handleStandardSelect = async (stdName) => {
    setSelectedStandard(stdName);
    setStandardDropdownOpen(!stdName);
    setSelectedDesignation(null);
    setStandardDetails(null);
    setTestData(null);
    setChemResult(null);
    setMechResult(null);
    setError(null);

    if (!stdName) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/standards/${stdName}`);
      const stdData = res.data.standard;
      setStandardDetails(stdData);
      setSelectedDesignation(Object.keys(stdData)[0]);
    } catch (err) {
      setError("Failed to load standard details");
    }
  };

  const handleCompare = async () => {
    if (!uploadedFile || !selectedStandard || !selectedDesignation) {
      setError("Please upload a PDF and select a standard");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      trackEvent("comparison_run", {
        feature: "pipeline_1_manual",
        app_name: "Test Certificate Compliance",
      });

      let testEntry = testData;
      if (!testEntry) {
        const formData = new FormData();
        formData.append("file", uploadedFile);

        const extractRes = await axios.post(`${API_BASE_URL}/extract/test-json`, formData);
        testEntry = extractRes.data.test_data;
        setTestData(testEntry);
        onTestDataChange?.(testEntry);
      }

      const stdData = standardDetails[selectedDesignation];
      const stdProps = parseProperties(stdData?.parameters || []);

      // Compare chemical against chemical and mechanical against mechanical
      // separately, using the certificate's own section split (testEntry.*)
      // instead of merging everything and re-guessing the split afterwards.
      const [chemRes, mechRes] = await Promise.all([
        axios.post(`${API_BASE_URL}/compare/direct`, {
          test_props: testEntry.chemical_properties || {},
          std_props: stdProps.chemical_properties || {},
        }),
        axios.post(`${API_BASE_URL}/compare/direct`, {
          test_props: testEntry.mechanical_properties || {},
          std_props: stdProps.mechanical_properties || {},
        }),
      ]);

      setChemResult(chemRes.data.result);
      setMechResult(mechRes.data.result);
      setCurrentStep(2);
    } catch (err) {
      console.error("Comparison failed:", err);
      setError(err.response?.data?.detail || "Comparison failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!uploadedFile || !chem_result || !mech_result) return;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/report/generate-pdf`,
        {
          test_filename: uploadedFile.name,
          selected_spec: selectedDesignation,
          selected_desig: selectedDesignation,
          chem_result,
          mech_result,
          pipeline: "Manual",
          section_txw: testData?.section_txw || [],
        },
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      const base = uploadedFile.name.replace(/\.pdf$/i, "");
      link.setAttribute("download", `p1_comparison_${base}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      trackEvent("file_downloaded", {
        feature: "pipeline_1_manual",
        app_name: "Test Certificate Compliance",
      });
    } catch (err) {
      setError("Failed to generate PDF report");
    }
  };

  const goToStep = (idx) => setCurrentStep(idx);

  const resetAll = () => {
    setUploadedFile(null);
    setSelectedStandard("");
    setStandardDropdownOpen(true);
    setSelectedDesignation(null);
    setStandardDetails(null);
    setTestData(null);
    setChemResult(null);
    setMechResult(null);
    setPdfPreview(null);
    setShowPdfPreview(false);
    setError(null);
    setCurrentStep(0);
  };

  return (
    <div className="w-full space-y-6">
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

      {currentStep === 1 && uploadedFile && (
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
          <span className="text-xs font-semibold text-accent shrink-0 ml-3">Change</span>
        </button>
      )}

      {/* Step 2 — Select standard */}
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

          <div>
            <label className="text-sm font-semibold text-ink block mb-2">
              Compare against standard
            </label>
            {selectedStandard && !standardDropdownOpen ? (
              <button
                type="button"
                onClick={() => setStandardDropdownOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-accent/30 bg-accent/10 text-accent font-semibold text-sm text-left"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <IconCheckCircle className="w-5 h-5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{selectedStandard}</span>
                </span>
                <IconChevronDown className="w-5 h-5 shrink-0" strokeWidth={2} />
              </button>
            ) : (
              <div className="border border-border rounded-xl max-h-64 overflow-y-auto divide-y divide-border">
                {standards.map((std) => {
                  const isSelected = selectedStandard === std.name;
                  return (
                    <button
                      key={std.name}
                      type="button"
                      onClick={() => handleStandardSelect(std.name)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors ${
                        isSelected ? "bg-accent/10 text-accent font-semibold" : "text-ink hover:bg-surface-2"
                      }`}
                    >
                      <span>{std.name}</span>
                      {isSelected && <IconCheckCircle className="w-5 h-5 shrink-0" strokeWidth={2} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {standardDetails && selectedDesignation && (
            <>
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface-2">
                    <h4 className="text-sm font-bold text-ink">Chemical Properties</h4>
                  </div>
                  <div className="p-4 max-h-72 overflow-y-auto">
                    {renderStandardProperties(standardDetails[selectedDesignation]?.parameters, "chem")}
                  </div>
                </div>

                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-border bg-surface-2">
                    <h4 className="text-sm font-bold text-ink">Mechanical Properties</h4>
                  </div>
                  <div className="p-4 max-h-72 overflow-y-auto">
                    {renderStandardProperties(standardDetails[selectedDesignation]?.parameters, "mech")}
                  </div>
                </div>
              </div>

              <Button variant="accent" size="xl" onClick={handleCompare} disabled={loading}>
                {loading ? "Running comparison..." : "Compare Now"}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Step 3 — Results */}
      {currentStep === 2 && chem_result && mech_result && (
        <div className="space-y-3">
          {testData && (
            <Disclosure title="View extracted certificate values">
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-ink mb-2">Chemical Properties</h4>
                  <PropertyList data={testData.chemical_properties} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink mb-2">Mechanical Properties</h4>
                  <PropertyList data={testData.mechanical_properties} />
                </div>
              </div>
            </Disclosure>
          )}

          <ComparisonResults
            chem_result={chem_result}
            mech_result={mech_result}
            testFilename={uploadedFile?.name}
            testFileSize={
              uploadedFile ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB` : null
            }
            standardName={selectedDesignation}
            onChangeFile={() => goToStep(0)}
            onChangeStandard={() => goToStep(1)}
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="accent" size="xl" onClick={handleDownloadReport} className="flex-1">
              <IconDownload className="w-5 h-5" />
              Download PDF Report
            </Button>
            <Button variant="secondary" size="xl" onClick={resetAll} className="flex-1">
              Compare Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

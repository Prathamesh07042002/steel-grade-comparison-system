import React, { useState, useEffect } from "react";
import axios from "axios";
import ComparisonResults from "../components/ComparisonResults";
import {
  parseProperties,
  renderStandardProperties,
} from "../utils/propertyUtils";

const API_BASE_URL = "http://localhost:8000";

export default function ManualCompare() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState("");
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setUploadedFile(file);
    setSelectedStandard("");
    setSelectedDesignation(null);
    setStandardDetails(null);
    setError(null);
    setTestData(null);
    setChemResult(null);
    setMechResult(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      setPdfPreview(event.target.result);
    };

    reader.readAsDataURL(file);
  };

  const handleStandardSelect = async (stdName) => {
    setSelectedStandard(stdName);

    setSelectedDesignation(null);
    setStandardDetails(null);

    // Clear previous comparison results
    setTestData(null);
    setChemResult(null);
    setMechResult(null);

    setError(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/standards/${stdName}`);

      const stdData = res.data.standard;

      setStandardDetails(stdData);

      const gradeKey = Object.keys(stdData)[0];

      setSelectedDesignation(gradeKey);
    } catch (err) {
      setError("Failed to load standard details");
    }
  };

  const handleCompare = async () => {
    if (!uploadedFile || !selectedStandard || !selectedDesignation) {
      setError("Please upload PDF and select standard");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", uploadedFile);

      const extractRes = await axios.post(
        `${API_BASE_URL}/extract/test-json`,
        formData,
      );

      const testEntry = extractRes.data.test_data;

      setTestData(testEntry);

      const stdData = standardDetails[selectedDesignation];

      const stdProps = parseProperties(stdData?.parameters || []);

      const chemRes = await axios.post(`${API_BASE_URL}/compare/direct`, {
        test_props: testEntry.chemical_properties || {},
        std_props: stdProps.chemical_properties || {},
      });

      const mechRes = await axios.post(`${API_BASE_URL}/compare/direct`, {
        test_props: testEntry.mechanical_properties || {},
        std_props: stdProps.mechanical_properties || {},
      });

      setChemResult(chemRes.data.result);
      setMechResult(mechRes.data.result);
    } catch (err) {
      setError("Comparison Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          🔬 Manual Grade Comparison
        </h1>

        <p className="mt-3 text-slate-500" style={{ marginBottom: "1.5rem" }}>
          Upload a Material Test Certificate, select a standard, and compare
          chemical and mechanical properties against the selected grade.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Upload Card */}
      <section className="bg-white">
        <label className="block cursor-pointer">
          <div
            className="
              border-2
              border-dashed
              border-slate-300
              hover:border-blue-500
              rounded-2xl
              p-12
              text-center
              transition
            "
          >
            <div className="text-5xl mb-4">📄</div>

            <h3 className="font-semibold text-slate-700">
              Click to Upload PDF
            </h3>

            <p className="text-sm text-slate-500 mt-2">
              Material Test Certificate (MTC)
            </p>
          </div>

          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {uploadedFile && (
          <div
            className="mt-6 border border-green-200 bg-green-50 rounded-lg p-4"
            style={{ marginBottom: "1.5rem" }}
          >
            <div className="flex items-center justify-between">
              {/* File Info */}
              <div>
                <p className="font-semibold text-slate-800">
                  {uploadedFile.name}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  Uploaded
                </span>

                <button
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className="
                    bg-white
                    border
                    border-slate-300
                    hover:border-blue-500
                    hover:bg-blue-50
                    px-4
                    py-2
                    rounded-xl
                    text-sm
                    font-medium
                    transition-all
                  "
                >
                  {showPdfPreview ? "Hide Preview" : "Preview PDF"}
                </button>
              </div>
            </div>
          </div>
        )}

        {pdfPreview && (
          <div className="mt-5">
            {showPdfPreview && (
              <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
                <iframe
                  src={pdfPreview}
                  title="PDF Preview"
                  className="w-full h-[700px]"
                />
              </div>
            )}
          </div>
        )}
      </section>

      {uploadedFile && standards.length > 0 && (
        <section className="bg-white p-3">
          <h2 className="text-xl font-semibold text-slate-800 mb-6" >
            Select Standard
          </h2>

          <select
            value={selectedStandard}
            onChange={(e) => handleStandardSelect(e.target.value)}
            className="
        w-full
        border
        border-slate-300
        rounded-xl
        px-4
        py-3
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
      "
      style={{ marginBottom: "1rem" }}
          >
            <option value="">Select Standard</option>

            {standards.map((std) => (
              <option key={std.name} value={std.name}>
                {std.name}
              </option>
            ))}
          </select>

          {/* PUT THE PREVIEW BLOCK HERE */}

          {standardDetails && selectedDesignation && (
            <>
              <div className="mt-8 space-y-6">
                {/* Properties */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Chemical */}
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h4 className="font-semibold text-slate-800">
                        Chemical Properties
                      </h4>

                      <p className="text-sm text-slate-500 mt-1">
                        Composition limits and requirements.
                      </p>
                    </div>

                    <div className="p-6 max-h-[500px] overflow-y-auto">
                      {renderStandardProperties(
                        standardDetails[selectedDesignation]?.parameters,
                        "chem",
                      )}
                    </div>
                  </div>

                  {/* Mechanical */}
                  <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                      <h4 className="font-semibold text-slate-800">
                        Mechanical Properties
                      </h4>

                      <p className="text-sm text-slate-500 mt-1">
                        Strength, hardness and performance requirements.
                      </p>
                    </div>

                    <div className="p-6 max-h-[500px] overflow-y-auto">
                      {renderStandardProperties(
                        standardDetails[selectedDesignation]?.parameters,
                        "mech",
                      )}
                    </div>
                  </div>
                </div>

                

                {/* Action Area */}
                <div className="bg-white  p-6">
                  <div className="flex justify-center">
                    

                    <button
                      onClick={handleCompare}
                      disabled={loading}
                      className="
                      w-[95%]
          bg-blue-600
          hover:bg-blue-700
          text-white
          px-8
          py-3
          rounded-2xl
          font-semibold
          transition-all
          shadow-sm
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
                    >
                      {loading ? "Running Comparison..." : "Compare Now"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {testData && (
        <section className="bg-white p-5">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6"
          style={{ marginBottom: "0.5rem" }}>
            Extracted Values
          </h2>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="border border-slate-200 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Chemical Properties</h3>

              {Object.entries(testData.chemical_properties || {}).map(
                ([key, val]) => (
                  <div
                    key={key}
                    className="
            flex
            justify-between
            py-3
            border-b
            border-slate-100
          "
                  >
                    <span>{key}</span>

                    <code className="bg-slate-100 px-3 py-1 rounded">
                      {val}
                    </code>
                  </div>
                ),
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl p-6">
              <h3 className="font-semibold mb-4">Mechanical Properties</h3>

              {Object.entries(testData.mechanical_properties || {}).map(
                ([key, val]) => (
                  <div
                    key={key}
                    className="
            flex
            justify-between
            py-3
            border-b
            border-slate-100
          "
                  >
                    <span>{key}</span>

                    <code className="bg-slate-100 px-3 py-1 rounded">
                      {val}
                    </code>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {chem_result && mech_result && (
        <section className="p-4">
          <ComparisonResults
            chem_result={chem_result}
            mech_result={mech_result}
            testFilename={uploadedFile?.name}
            standardName={selectedDesignation}
          />
        </section>
      )}
    </div>
  );
}

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
    const res = await axios.get(
      `${API_BASE_URL}/standards/${stdName}`
    );

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
          Manual Grade Comparison
        </h1>

        <p className="mt-3 text-slate-500">
          Upload a Material Test Certificate, select a standard, and compare
          chemical and mechanical properties against the selected grade.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">
          Step 1 — Upload PDF
        </h2>

        <label className="block cursor-pointer">
          <div
            className="
        border-2
        border-dashed
        border-slate-300
        hover:border-blue-500
        rounded-3xl
        p-14
        text-center
        transition-all
      "
          >
            <h3 className="text-lg font-semibold text-slate-700">
              Upload Material Test Certificate
            </h3>

            <p className="text-slate-500 mt-2">
              Click here to select a PDF file
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
          <div className="mt-5 bg-green-50 border border-green-200 text-green-700 rounded-xl p-4">
            {uploadedFile.name}
          </div>
        )}
      </section>

      {uploadedFile && standards.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            Step 2 — Select Standard
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
    <div className="mt-8">

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800">
          {selectedDesignation}
        </h3>

        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          Selected Grade
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        <div className="border border-slate-200 rounded-2xl p-6">
          <h4 className="font-semibold text-slate-800 mb-4">
            Chemical Properties
          </h4>

          {renderStandardProperties(
            standardDetails[selectedDesignation]?.parameters,
            "chem"
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-6">
          <h4 className="font-semibold text-slate-800 mb-4">
            Mechanical Properties
          </h4>

          {renderStandardProperties(
            standardDetails[selectedDesignation]?.parameters,
            "mech"
          )}
        </div>

      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4">
        Review the selected standard and then run the comparison.
      </div>

      <div className="mt-6 flex justify-end">

        <button
          onClick={handleCompare}
          disabled={loading}
          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            px-6
            py-3
            rounded-xl
            font-medium
            transition
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
        >
          {loading
            ? "Running Comparison..."
            : "Compare Now"}
        </button>

      </div>

    </div>
  </>
)}
        </section>
      )}

      

      {testData && (
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
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
        <section className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8">
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

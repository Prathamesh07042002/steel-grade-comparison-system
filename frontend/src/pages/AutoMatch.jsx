import React, { useState } from "react";
import axios from "axios";

import AutoMatchResults from "../components/AutoMatchResults";

const API_BASE_URL = "http://localhost:8000";

export default function AutoMatch() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [autoResult, setAutoResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setUploadedFile(file);
    setAutoResult(null);
    setTestData(null);
    setError(null);

    const reader = new FileReader();

    reader.onload = (event) => {
      setPdfPreview(event.target.result);
    };

    reader.readAsDataURL(file);
  };

  const handleAutoMatch = async () => {
    if (!uploadedFile) {
      setError("Please upload a PDF first.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", uploadedFile);

      const res = await axios.post(
        `${API_BASE_URL}/compare/auto`,
        formData
      );

      setAutoResult(res.data);
      setTestData(res.data.test_data);
    } catch (err) {
      setError("Auto Match Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800">
          🤖 Automatic Grade Matching
        </h1>

        <p className="mt-2 text-slate-500">
          Upload a material test certificate and
          automatically find the closest matching
          steel grade across all standards.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Upload Card */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

        <h2 className="text-lg font-semibold text-slate-800 mb-5">
          📄 Upload PDF
        </h2>

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
            <div className="text-5xl mb-4">
              📄
            </div>

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
          <div className="mt-5 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3">
            ✅ {uploadedFile.name}
          </div>
        )}

        {pdfPreview && (
          <div className="mt-5">

            <button
              onClick={() =>
                setShowPdfPreview(!showPdfPreview)
              }
              className="
                bg-slate-100
                hover:bg-slate-200
                px-4
                py-2
                rounded-lg
                transition
              "
            >
              👁️ {showPdfPreview ? "Hide" : "Preview"} PDF
            </button>

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

      {/* Run Auto Match */}
      {uploadedFile && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            ⚡ Run Analysis
          </h2>

          <button
            onClick={handleAutoMatch}
            disabled={loading}
            className="
              bg-blue-600
              hover:bg-blue-700
              disabled:opacity-50
              disabled:cursor-not-allowed
              text-white
              px-6
              py-3
              rounded-xl
              font-medium
              transition
            "
          >
            {loading
              ? "⏳ Finding Best Match..."
              : "🚀 Find Best Match"}
          </button>

        </section>
      )}

      {/* Extracted Properties */}
      {testData && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">

          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            📋 Extracted Properties
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {/* Chemical */}
            <div className="border border-slate-200 rounded-xl p-5">

              <h3 className="font-semibold text-slate-800 mb-4">
                🧪 Chemical Properties
              </h3>

              {Object.entries(
                testData.chemical_properties || {}
              ).length > 0 ? (
                Object.entries(
                  testData.chemical_properties
                ).map(([key, val]) => (
                  <div
                    key={key}
                    className="
                      flex
                      justify-between
                      items-center
                      py-2
                      border-b
                      border-slate-100
                    "
                  >
                    <span className="text-slate-700">
                      {key}
                    </span>

                    <code className="bg-slate-100 px-2 py-1 rounded">
                      {val}
                    </code>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">
                  No chemical properties found
                </p>
              )}
            </div>

            {/* Mechanical */}
            <div className="border border-slate-200 rounded-xl p-5">

              <h3 className="font-semibold text-slate-800 mb-4">
                ⚙️ Mechanical Properties
              </h3>

              {Object.entries(
                testData.mechanical_properties || {}
              ).length > 0 ? (
                Object.entries(
                  testData.mechanical_properties
                ).map(([key, val]) => (
                  <div
                    key={key}
                    className="
                      flex
                      justify-between
                      items-center
                      py-2
                      border-b
                      border-slate-100
                    "
                  >
                    <span className="text-slate-700">
                      {key}
                    </span>

                    <code className="bg-slate-100 px-2 py-1 rounded">
                      {val}
                    </code>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">
                  No mechanical properties found
                </p>
              )}
            </div>

          </div>
        </section>
      )}

      {/* Results */}
      {autoResult && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <AutoMatchResults
            result={autoResult}
            testData={testData}
          />
        </section>
      )}

    </div>
  );
}
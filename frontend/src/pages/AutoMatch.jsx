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

      const res = await axios.post(`${API_BASE_URL}/compare/auto`, formData);

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
        <h1
          className="text-3xl font-bold text-slate-800"
          style={{ marginBottom: "0.4rem" }}
        >
          🤖 Automatic Grade Matching
        </h1>

        <p className="mt-2 text-slate-500" style={{ marginBottom: "1.5rem" }}>
          Upload a material test certificate and automatically find the closest
          matching steel grade across all standards.
        </p>
      </div>

      {/* Error */}
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

      {/* Run Auto Match */}
      {uploadedFile && (
        <section className="flex justify-center"
        style={{ marginBottom: "2rem" }}>
            <button
              onClick={handleAutoMatch}
              disabled={loading}
              className="
               w-[95%]
              bg-blue-600
              hover:bg-blue-700
              disabled:opacity-50
              disabled:cursor-not-allowed
              text-white
              px-8
              py-3
              rounded-2xl
              font-semibold
              shadow-sm
              transition-all
        "
            >
              {loading ? "Analyzing..." : "Run Analysis"}
            </button>
        
        </section>
      )}

      {/* Extracted Properties */}
      {testData && (
        <section >
          <div className="flex items-center justify-between"
            style={{ margin: "0.5rem" }}>
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">
                Extracted Properties
              </h2>

              <p className="text-slate-500 mt-1">
                Properties extracted from the uploaded certificate.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-5 mb-8"
          style={{ margin: "0.5rem" }}>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Chemical Properties</p>

              <h3 className="text-3xl font-bold text-blue-600 mt-2">
                {Object.keys(testData.chemical_properties || {}).length}
              </h3>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Mechanical Properties</p>

              <h3 className="text-3xl font-bold text-emerald-600 mt-2">
                {Object.keys(testData.mechanical_properties || {}).length}
              </h3>
            </div>

            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
              <p className="text-sm text-slate-500">Total Properties</p>

              <h3 className="text-3xl font-bold text-violet-600 mt-2">
                {Object.keys(testData.chemical_properties || {}).length +
                  Object.keys(testData.mechanical_properties || {}).length}
              </h3>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Chemical */}
            <div className="border border-slate-200 rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-5">
                Chemical Properties
              </h3>

              <div className="max-h-[450px] overflow-y-auto">
                {Object.entries(testData.chemical_properties || {}).length >
                0 ? (
                  Object.entries(testData.chemical_properties).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="
                  flex
                  justify-between
                  items-center
                  py-3
                  border-b
                  border-slate-100
                "
                      >
                        <span className="text-slate-700 font-medium">
                          {key}
                        </span>

                        <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
                          {val}
                        </code>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-slate-400">No chemical properties found</p>
                )}
              </div>
            </div>

            {/* Mechanical */}
            <div className="border border-slate-200 rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-5">
                Mechanical Properties
              </h3>

              <div className="max-h-[450px] overflow-y-auto">
                {Object.entries(testData.mechanical_properties || {}).length >
                0 ? (
                  Object.entries(testData.mechanical_properties).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="
                  flex
                  justify-between
                  items-center
                  py-3
                  border-b
                  border-slate-100
                "
                      >
                        <span className="text-slate-700 font-medium">
                          {key}
                        </span>

                        <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
                          {val}
                        </code>
                      </div>
                    ),
                  )
                ) : (
                  <p className="text-slate-400">
                    No mechanical properties found
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {autoResult && (
        <section className="bg-white py-6">
          <AutoMatchResults result={autoResult} testData={testData} />
        </section>
      )}
    </div>
  );
}

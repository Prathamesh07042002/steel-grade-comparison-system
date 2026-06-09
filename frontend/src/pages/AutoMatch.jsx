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
      setError("Please upload PDF");
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
    <div className="pipeline">
      <h2>🤖 Pipeline 2 — Automatic Best Match</h2>

      <p>Upload a test PDF → scan all standards → return best match</p>

      {error && <div className="error-box">{error}</div>}

      <section className="step">
        <h3>📄 Step 1 — Upload PDF</h3>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="file-input"
        />

        {uploadedFile && <p className="success">✅ {uploadedFile.name}</p>}

        {pdfPreview && (
          <>
            <button
              onClick={() => setShowPdfPreview(!showPdfPreview)}
              className="btn-secondary"
            >
              👁️ {showPdfPreview ? "Hide" : "Preview"} PDF
            </button>

            {showPdfPreview && (
              <div className="pdf-preview">
                <iframe src={pdfPreview} type="application/pdf" />
              </div>
            )}
          </>
        )}
      </section>

      {uploadedFile && (
        <section className="step">
          <h3>⚡ Step 2 — Run Auto Match</h3>

          <button
            onClick={handleAutoMatch}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "⏳ Finding..." : "▶ Find Best Match"}
          </button>
        </section>
      )}

      {testData && (
        <section className="extracted-values">
          <h3>📋 Extracted Test Values from PDF</h3>

          <div className="properties-grid">
            <div className="property-column">
              <h4>🧪 Chemical Properties</h4>

              {Object.entries(testData.chemical_properties || {}).length > 0 ? (
                Object.entries(testData.chemical_properties).map(
                  ([key, val]) => (
                    <div key={key} className="property-item">
                      <strong>{key}:</strong> <code>{val}</code>
                    </div>
                  ),
                )
              ) : (
                <p className="no-data">No chemical properties found</p>
              )}
            </div>

            <div className="property-column">
              <h4>⚙️ Mechanical Properties</h4>

              {Object.entries(testData.mechanical_properties || {}).length >
              0 ? (
                Object.entries(testData.mechanical_properties).map(
                  ([key, val]) => (
                    <div key={key} className="property-item">
                      <strong>{key}:</strong> <code>{val}</code>
                    </div>
                  ),
                )
              ) : (
                <p className="no-data">No mechanical properties found</p>
              )}
            </div>
          </div>
        </section>
      )}

      {autoResult && (
        <AutoMatchResults result={autoResult} testData={testData} />
      )}
    </div>
  );
}

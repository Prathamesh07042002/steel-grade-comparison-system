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
    <div className="pipeline">
      <h2>🔬 Pipeline 1 — Manual Comparison</h2>

      <p>
        Upload a test / mill-certificate PDF → choose the standard to compare →
        get a property-by-property pass / fail report
      </p>

      {error && <div className="error-box">{error}</div>}

      <section className="step">
        <h3>📄 Step 1 — Upload test PDF</h3>

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

      {uploadedFile && standards.length > 0 && (
        <section className="step">
          <h3>🎯 Step 2 — Choose standard</h3>

          <select
            value={selectedStandard}
            onChange={(e) => handleStandardSelect(e.target.value)}
            className="select-input"
          >
            <option value="">-- Select a standard --</option>

            {standards.map((std) => (
              <option key={std.name} value={std.name}>
                {std.name}
              </option>
            ))}
          </select>

          {standardDetails && selectedDesignation && (
            <div className="standard-preview">
              <h4>
                📋 Preview:
                {selectedDesignation}
              </h4>

              <div className="properties-grid">
                <div className="property-column">
                  <h5>🧪 Chemical</h5>

                  {renderStandardProperties(
                    standardDetails[selectedDesignation]?.parameters,
                    "chem",
                  )}
                </div>

                <div className="property-column">
                  <h5>⚙️ Mechanical</h5>

                  {renderStandardProperties(
                    standardDetails[selectedDesignation]?.parameters,
                    "mech",
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {uploadedFile && selectedDesignation && (
        <section className="step">
          <h3>⚡ Step 3 — Run comparison</h3>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "⏳ Running..." : "▶ Compare Now"}
          </button>
        </section>
      )}

      {testData && (
        <section className="extracted-values">
          <h3>📋 Extracted Values from PDF</h3>

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

      {chem_result && mech_result && (
        <ComparisonResults
          chem_result={chem_result}
          mech_result={mech_result}
          testFilename={uploadedFile?.name}
          standardName={selectedDesignation}
        />
      )}
    </div>
  );
}

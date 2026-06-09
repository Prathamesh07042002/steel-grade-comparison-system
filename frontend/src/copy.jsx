import React, { useState, useEffect } from "react";
import axios from "axios";
import "./index.css";

const API_BASE_URL = "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("pipeline1");

  return (
    <div className="app">
      <header className="header">
        <h1>🔩 Steel Grade Comparison System</h1>
        <p>
          Manual and automatic comparison of mill certificates against steel
          standards.
        </p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "pipeline1" ? "active" : ""}`}
          onClick={() => setActiveTab("pipeline1")}
        >
          🔬 Pipeline 1 — Manual Compare
        </button>
        <button
          className={`tab ${activeTab === "pipeline2" ? "active" : ""}`}
          onClick={() => setActiveTab("pipeline2")}
        >
          🤖 Pipeline 2 — Auto Match
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "pipeline1" && <Pipeline1 />}
        {activeTab === "pipeline2" && <Pipeline2 />}
      </div>
    </div>
  );
}

function Pipeline1() {
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
      const stdList = res.data.standards || [];
      setStandards(stdList);
      console.log("✅ Loaded standards:", stdList);
    } catch (err) {
      setError("Failed to load standards: " + (err.message || "Unknown error"));
      console.error("Error loading standards:", err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    setTestData(null);
    setChemResult(null);
    setMechResult(null);
    setSelectedStandard("");
    setSelectedDesignation(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setPdfPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleStandardSelect = async (stdName) => {
    console.log("Standard selected:", stdName);
    setSelectedStandard(stdName);
    setSelectedDesignation(null);
    setStandardDetails(null);

    if (!stdName) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/standards/${stdName}`);
      const stdData = res.data.standard;
      setStandardDetails(stdData);
      const gradeKey = Object.keys(stdData)[0];
      setSelectedDesignation(gradeKey);
      console.log("✅ Standard details loaded:", gradeKey);
    } catch (err) {
      setError(
        "Failed to load standard details: " + (err.message || "Unknown error"),
      );
      console.error("Error loading standard:", err);
    }
  };

  const handleCompare = async () => {
    if (!uploadedFile || !selectedStandard || !selectedDesignation) {
      setError("Please upload a PDF and select a standard");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Starting comparison...");
    try {
      // Extract test data
      const formData = new FormData();
      formData.append("file", uploadedFile);

      console.log("Extracting test data...");
      const extractRes = await axios.post(
        `${API_BASE_URL}/extract/test-json`,
        formData,
      );
      const testEntry = extractRes.data.test_data;
      console.log("✅ Test data extracted:", testEntry);
      setTestData(testEntry);

      // Get standard data
      const stdData = standardDetails[selectedDesignation];

      // Separate properties into chemical and mechanical
      const stdProps = parseProperties(stdData?.parameters || []);

      console.log("Comparing chemical properties...");
      // Compare chemical
      const chemRes = await axios.post(`${API_BASE_URL}/compare/direct`, {
        test_props: testEntry.chemical_properties || {},
        std_props: stdProps.chemical_properties || {},
      });
      console.log("✅ Chemical comparison done:", chemRes.data.result);

      console.log("Comparing mechanical properties...");
      // Compare mechanical
      const mechRes = await axios.post(`${API_BASE_URL}/compare/direct`, {
        test_props: testEntry.mechanical_properties || {},
        std_props: stdProps.mechanical_properties || {},
      });
      console.log("✅ Mechanical comparison done:", mechRes.data.result);

      setChemResult(chemRes.data.result);
      setMechResult(mechRes.data.result);
    } catch (err) {
      console.error("Comparison error:", err);
      setError(
        "Comparison failed: " + (err.response?.data?.detail || err.message),
      );
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
                <iframe src={pdfPreview} type="application/pdf"></iframe>
              </div>
            )}
          </>
        )}
      </section>

      {uploadedFile && standards.length > 0 && (
        <section className="step">
          <h3>🎯 Step 2 — Choose standard to compare against</h3>
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
              <h4>📋 Preview: {selectedDesignation}</h4>
              <div className="properties-grid">
                <div className="property-column">
                  <h5>🧪 Chemical Properties</h5>
                  {renderStandardProperties(
                    standardDetails[selectedDesignation]?.parameters,
                    "chem",
                  )}
                </div>
                <div className="property-column">
                  <h5>⚙️ Mechanical Properties</h5>
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

function Pipeline2() {
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
      setError("Please upload a PDF");
      return;
    }

    setLoading(true);
    setError(null);
    console.log("Starting auto-match...");
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      console.log("Sending to /compare/auto...");
      const res = await axios.post(`${API_BASE_URL}/compare/auto`, formData);
      console.log("✅ Auto-match result:", res.data);
      setAutoResult(res.data);
      setTestData(res.data.test_data);
    } catch (err) {
      console.error("Auto-match error:", err);
      const errorMsg = err.response?.data?.detail || err.message;
      setError("Auto-match failed: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pipeline">
      <h2>🤖 Pipeline 2 — Automatic Best-Match</h2>
      <p>
        Upload a test PDF → the LLM scans ALL stored standards and selects the
        best-matching grade automatically
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
                <iframe src={pdfPreview} type="application/pdf"></iframe>
              </div>
            )}
          </>
        )}
      </section>

      {uploadedFile && (
        <section className="step">
          <h3>⚡ Step 2 — Run auto-match</h3>
          <p>
            The LLM will compare this PDF against all standard JSONs and return
            the best match.
          </p>
          <button
            onClick={handleAutoMatch}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "⏳ Finding best match..." : "▶ Find Best Match"}
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

function ComparisonResults({
  chem_result,
  mech_result,
  testFilename,
  standardName,
}) {
  const allMatched = [
    ...Object.values(chem_result?.matched || {}),
    ...Object.values(mech_result?.matched || {}),
  ];

  const passCount = allMatched.filter((m) => m.within_range === true).length;
  const failCount = allMatched.filter((m) => m.within_range === false).length;
  const total = allMatched.length;
  const passPercent = total > 0 ? Math.round((passCount / total) * 100) : 0;

  let verdict = "❌ FAIL";
  let verdictClass = "fail";

  if (total === 0) {
    verdict = "⚠️ NO DATA";
    verdictClass = "warn";
  } else if (failCount === 0) {
    verdict = "✅ PASS";
    verdictClass = "pass";
  } else if (passCount === 0) {
    verdict = "❌ FAIL";
    verdictClass = "fail";
  } else {
    verdict = "⚠️ PARTIAL PASS";
    verdictClass = "partial";
  }

  return (
    <section className="results">
      <h2>📊 Comparison Results</h2>
      <p className="result-subtitle">
        <strong>Test:</strong> {testFilename} | <strong>Standard:</strong>{" "}
        {standardName}
      </p>

      <div className={`verdict-card ${verdictClass}`}>
        <h3>{verdict}</h3>
        <div className="verdict-details">
          <p className="match-score">{passPercent}% Passed</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${passPercent}%` }}
            ></div>
          </div>
          <p className="match-summary">
            {passCount} of {total} properties passed
          </p>
        </div>
      </div>

      <div className="tabs-result">
        <ResultTabs chem_result={chem_result} mech_result={mech_result} />
      </div>
    </section>
  );
}

function ResultTabs({ chem_result, mech_result }) {
  const [activeTab, setActiveTab] = useState("chem");

  return (
    <div className="result-tabs">
      <div className="result-tab-buttons">
        <button
          className={`result-tab-btn ${activeTab === "chem" ? "active" : ""}`}
          onClick={() => setActiveTab("chem")}
        >
          🧪 Chemical Properties
        </button>
        <button
          className={`result-tab-btn ${activeTab === "mech" ? "active" : ""}`}
          onClick={() => setActiveTab("mech")}
        >
          ⚙️ Mechanical Properties
        </button>
      </div>

      <div className="result-tab-content">
        {activeTab === "chem" && <PropertyTable result={chem_result} />}
        {activeTab === "mech" && <PropertyTable result={mech_result} />}
      </div>
    </div>
  );
}

function PropertyTable({ result }) {
  const matched = result?.matched || {};
  const notInStd = result?.not_in_standard || {};
  const notInTest = result?.not_in_test || {};

  return (
    <div className="property-table-container">
      {Object.keys(matched).length > 0 ? (
        <>
          <h4>✅ Matched Properties</h4>
          <table className="property-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Test Value</th>
                <th>Standard Value</th>
                <th>Status</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(matched).map(([prop, info]) => (
                <tr key={prop} className={info.within_range ? "pass" : "fail"}>
                  <td>
                    <strong>{prop}</strong>
                  </td>
                  <td>
                    <code>{info.test_value}</code>
                  </td>
                  <td>
                    <code>{info.standard_value}</code>
                  </td>
                  <td className={info.within_range ? "pass" : "fail"}>
                    {info.within_range ? "✅ PASS" : "❌ FAIL"}
                  </td>
                  <td>
                    <em>{info.note || "-"}</em>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="no-data">No matched properties</p>
      )}

      {Object.keys(notInStd).length > 0 && (
        <div className="extra-properties">
          <h4>ℹ️ In test but NOT in standard:</h4>
          {Object.entries(notInStd).map(([prop, val]) => (
            <div key={prop} className="property-item">
              <code>{prop}</code>: {val}
            </div>
          ))}
        </div>
      )}

      {Object.keys(notInTest).length > 0 && (
        <div className="missing-properties">
          <h4>➕ In standard but NOT in test:</h4>
          {Object.entries(notInTest).map(([prop, val]) => (
            <div key={prop} className="property-item">
              <code>{prop}</code>: {val}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AutoMatchResults({ result, testData }) {
  const status = result?.result?.status;
  const best = result?.result?.best_match;
  const topMatches = result?.result?.top_matches || [];

  if (status === "NO_MATCH") {
    return (
      <section className="results">
        <div className="no-match-card">
          <h3>❌ NO MATCH FOUND</h3>
          <p>{result?.result?.message}</p>
          {result?.result?.closest_attempt && (
            <div className="closest-attempt">
              <h4>🔍 Closest Attempt:</h4>
              <table className="info-table">
                <tbody>
                  <tr>
                    <td>
                      <strong>Standard:</strong>
                    </td>
                    <td>{result.result.closest_attempt.standard_product}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>File:</strong>
                    </td>
                    <td>{result.result.closest_attempt.standard_file}</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Score:</strong>
                    </td>
                    <td>
                      {(
                        result.result.closest_attempt.overall_score * 100
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Reason:</strong>
                    </td>
                    <td>{result.result.closest_attempt.verdict_reason}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (!best) {
    return <div className="error-box">No results available</div>;
  }

  const passCount = best.matched_count;
  const totalCount = best.standard_total;
  const passPercent =
    totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  return (
    <section className="results auto-match">
      <div className={`verdict-card ${best.verdict.toLowerCase()}`}>
        <h3>
          {best.verdict === "MATCHED" ? "✅" : "⚠️"} {best.verdict}
        </h3>
        <div className="verdict-details">
          <p className="match-score">{passPercent}% Match Score</p>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${passPercent}%` }}
            ></div>
          </div>
          <p className="match-summary">
            {passCount} of {totalCount} properties matched
          </p>
        </div>
      </div>

      <div className="best-match-info">
        <h4>🏆 Best Match</h4>
        <table className="info-table">
          <tbody>
            <tr>
              <td>
                <strong>Standard Product:</strong>
              </td>
              <td>{best.standard_product}</td>
            </tr>
            <tr>
              <td>
                <strong>Standard File:</strong>
              </td>
              <td>{best.standard_file}</td>
            </tr>
            <tr>
              <td>
                <strong>Test Product:</strong>
              </td>
              <td>{best.test_product || testData?.grade || "Unknown"}</td>
            </tr>
            <tr>
              <td>
                <strong>Name Match:</strong>
              </td>
              <td>
                {best.name_match ? "✅ Yes" : "❌ No"} {best.name_match_reason}
              </td>
            </tr>
            <tr>
              <td>
                <strong>Verdict Reason:</strong>
              </td>
              <td>{best.verdict_reason}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="tabs-result">
        <ResultTabs
          chem_result={best.chemical_properties}
          mech_result={best.mechanical_properties}
        />
      </div>

      {topMatches.length > 0 && (
        <div className="top-matches">
          <h4>🏆 Top Matches (up to 5)</h4>
          <table className="matches-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Standard Product</th>
                <th>Score</th>
                <th>Matched</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {topMatches.map((match, idx) => (
                <tr key={idx}>
                  <td>#{idx + 1}</td>
                  <td>{match.standard_product}</td>
                  <td>
                    <strong>{(match.overall_score * 100).toFixed(1)}%</strong>
                  </td>
                  <td>
                    {match.matched_count}/{match.standard_total}
                  </td>
                  <td>{match.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Helper functions

function parseProperties(params) {
  const MECH_KEYWORDS = new Set([
    "ys",
    "uts",
    "el",
    "bh",
    "hardness",
    "impact",
    "r-bar",
    "n-value",
    "mpa",
    "hv",
    "hrc",
    "strength",
  ]);

  const chem = {},
    mech = {};

  for (const p of params || []) {
    const elem = p.element || "";
    const rv = p.rv || "";

    if (
      Array.from(MECH_KEYWORDS).some((kw) => elem.toLowerCase().includes(kw))
    ) {
      mech[elem] = rv;
    } else {
      chem[elem] = rv;
    }
  }

  return { chemical_properties: chem, mechanical_properties: mech };
}

function renderStandardProperties(params, type) {
  const MECH_KEYWORDS = new Set([
    "ys",
    "uts",
    "el",
    "bh",
    "hardness",
    "impact",
    "r-bar",
    "n-value",
    "mpa",
    "hv",
    "hrc",
    "strength",
  ]);

  const filtered = (params || []).filter((p) => {
    const elem = p.element || "";
    const isMech = Array.from(MECH_KEYWORDS).some((kw) =>
      elem.toLowerCase().includes(kw),
    );
    return type === "mech" ? isMech : !isMech;
  });

  return filtered.length > 0 ? (
    filtered.map((p, idx) => (
      <div key={idx} className="property-item">
        <strong>{p.element}:</strong> <code>{p.rv}</code>
      </div>
    ))
  ) : (
    <p className="no-data">None</p>
  );
}

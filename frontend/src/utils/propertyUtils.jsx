import React from "react";

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
  "hrb",
  "ra",
  "er",
  "bend",
  "strength",
]);

export function parseProperties(params = []) {
  const chemical_properties = {};
  const mechanical_properties = {};

  for (const p of params) {
    const elem = p.element || "";
    const rv = p.rv || "";

    const isMechanical = Array.from(MECH_KEYWORDS).some((kw) =>
      elem.toLowerCase().includes(kw)
    );

    if (isMechanical) {
      mechanical_properties[elem] = rv;
    } else {
      chemical_properties[elem] = rv;
    }
  }

  return {
    chemical_properties,
    mechanical_properties,
  };
}

export function getPropertiesByType(
  params = [],
  type = "chemical"
) {
  return params.filter((p) => {
    const elem = p.element || "";

    const isMechanical = Array.from(MECH_KEYWORDS).some((kw) =>
      elem.toLowerCase().includes(kw)
    );

    return type === "mechanical"
      ? isMechanical
      : !isMechanical;
  });
}

export function getPropertyCount(result) {
  const matched = Object.keys(
    result?.matched || {}
  ).length;

  const notInStandard = Object.keys(
    result?.not_in_standard || {}
  ).length;

  const notInTest = Object.keys(
    result?.not_in_test || {}
  ).length;

  return matched + notInStandard + notInTest;
}

export function calculateResultStats(
  chem_result,
  mech_result
) {
  const allMatched = [
    ...Object.values(chem_result?.matched || {}),
    ...Object.values(mech_result?.matched || {}),
  ];

  const passCount = allMatched.filter(
    (m) => m.within_range === true
  ).length;

  const failCount = allMatched.filter(
    (m) => m.within_range === false
  ).length;

  const notApplicableCount =
    Object.keys(chem_result?.not_in_standard || {}).length +
    Object.keys(mech_result?.not_in_standard || {}).length;

  const total = allMatched.length;

  const passPercent =
    total > 0
      ? Math.round((passCount / total) * 100)
      : 0;

  let verdict = "FAIL";
  let verdictClass = "fail";

  if (total === 0) {
    verdict = "NO DATA";
    verdictClass = "warn";
  } else if (failCount === 0) {
    verdict = "PASS";
    verdictClass = "pass";
  } else if (passCount === 0) {
    verdict = "FAIL";
    verdictClass = "fail";
  } else {
    verdict = "PARTIAL PASS";
    verdictClass = "partial";
  }

  return {
    passCount,
    failCount,
    notApplicableCount,
    total,
    passPercent,
    verdict,
    verdictClass,
  };
}

export function getAutoMatchStats(bestMatch) {
  if (!bestMatch) {
    return {
      passCount: 0,
      totalCount: 0,
      passPercent: 0,
    };
  }

  const passCount =
    bestMatch.matched_count || 0;

  const totalCount =
    bestMatch.standard_total || 0;

  const passPercent =
    totalCount > 0
      ? Math.round(
          (passCount / totalCount) * 100
        )
      : 0;

  return {
    passCount,
    totalCount,
    passPercent,
  };
}

export function renderStandardProperties(
  params = [],
  type = "chemical"
) {
  const filtered = getPropertiesByType(
    params,
    type === "mech"
      ? "mechanical"
      : "chemical"
  );

  return filtered.map((p, idx) => (
    <div
      key={idx}
      className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"
    >
      <span className="text-sm font-medium text-ink">{p.element}</span>
      <code className="font-mono bg-surface-2 px-2.5 py-1 rounded-lg text-sm text-muted">
        {p.rv}
      </code>
    </div>
  ));
}
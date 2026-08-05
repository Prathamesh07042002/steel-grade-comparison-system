import React from "react";

export default function ScoreRing({ percent, size = 112, strokeWidth = 10, className = "" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  // Inner text must fit inside the ring's stroke — scale font sizes off the
  // usable diameter instead of a fixed text size, or small rings overflow.
  const innerDiameter = size - strokeWidth * 2.5;
  const percentSize = Math.max(12, Math.round(innerDiameter * 0.32));
  const labelSize = Math.max(8, Math.round(innerDiameter * 0.14));
  const showLabel = innerDiameter >= 46;

  return (
    <div
      className="relative shrink-0 grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-2"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-all duration-700 ${className}`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center px-1">
        <div className="text-center">
          <div
            className={`font-extrabold leading-none whitespace-nowrap ${className}`}
            style={{ fontSize: percentSize }}
          >
            {percent}%
          </div>
          {showLabel && (
            <div
              className="text-muted leading-none mt-1 whitespace-nowrap"
              style={{ fontSize: labelSize }}
            >
              Match Score
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

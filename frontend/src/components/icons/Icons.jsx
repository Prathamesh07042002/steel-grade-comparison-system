import React from "react";

function Svg({ children, strokeWidth = 1.8, className = "w-5 h-5", ...rest }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconUpload(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 15v2.25A2.25 2.25 0 009.75 19.5h4.5A2.25 2.25 0 0016.5 17.25V15M12 4.5v10.5m0-10.5l-3.75 3.75M12 4.5l3.75 3.75"
      />
    </Svg>
  );
}

export function IconCloudUpload(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 16.5a4 4 0 01-.88-7.903A5 5 0 1115.9 6.5 5 5 0 0117 16.5m-8-3l3-3m0 0l3 3m-3-3v9"
      />
    </Svg>
  );
}

export function IconFileText(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 3.75h4.94a1.5 1.5 0 011.06.44l3.06 3.06c.28.28.44.665.44 1.06V19.5a1.5 1.5 0 01-1.5 1.5H8.25a1.5 1.5 0 01-1.5-1.5V5.25a1.5 1.5 0 011.5-1.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 12h4.5M9.75 15.5h4.5" />
    </Svg>
  );
}

export function IconFlask(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.75h4.5M10.5 3.75v5.44c0 .38-.12.75-.35 1.05l-4.2 5.58a2.1 2.1 0 001.68 3.38h8.74a2.1 2.1 0 001.68-3.38l-4.2-5.58a1.75 1.75 0 01-.35-1.05V3.75"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25h9" />
    </Svg>
  );
}

export function IconSparkles(props) {
  return (
    <svg
      className={props.className || "w-5 h-5"}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M11 4l1.2 3.6L16 8.8l-3.8 1.2L11 13.6l-1.2-3.6L6 8.8l3.8-1.2L11 4z" />
      <path d="M18 13l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
    </svg>
  );
}

export function IconCheckCircle(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75l1.94 1.94a.75.75 0 001.09-.04L16.5 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </Svg>
  );
}

export function IconXCircle(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5l-5 5m0-5l5 5" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
  );
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </Svg>
  );
}

export function IconEye(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
    </Svg>
  );
}

export function IconEyeOff(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M6.6 6.7C4.4 8.1 2.9 10 2.25 12c0 0 3.75 7.5 9.75 7.5 1.85 0 3.47-.42 4.86-1.06M9.9 4.7A10.6 10.6 0 0112 4.5c6 0 9.75 7.5 9.75 7.5a15.6 15.6 0 01-2.42 3.36"
      />
    </Svg>
  );
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5h7.5v4.5a3.75 3.75 0 01-7.5 0V4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 5.25h-2.1A1.65 1.65 0 004.5 6.9c0 2 1.6 3.6 3.6 3.6M15.75 5.25h2.1A1.65 1.65 0 0119.5 6.9c0 2-1.6 3.6-3.6 3.6"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5v3M9 19.5h6M9.75 16.5h4.5v3h-4.5v-3z" />
    </Svg>
  );
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <path d="M11 18a7 7 0 100-14 7 7 0 000 14z" />
      <path strokeLinecap="round" d="M20 20l-4.35-4.35" />
    </Svg>
  );
}

export function IconDownload(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </Svg>
  );
}

export function IconCpu(props) {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path
        strokeLinecap="round"
        d="M9 4v3M15 4v3M9 17v3M15 17v3M4 9h3M4 15h3M17 9h3M17 15h3"
      />
    </Svg>
  );
}

export function IconTarget(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconArrowRight(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M14 6l6 6-6 6" />
    </Svg>
  );
}

export function IconBolt(props) {
  return (
    <svg className={props.className || "w-5 h-5"} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function IconHome(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5L12 4l8 6.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9.5V19a1 1 0 001 1h3v-5h4v5h3a1 1 0 001-1V9.5" />
    </Svg>
  );
}

export function IconShield(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l7 2.5v5.2c0 4.6-3 8.2-7 9.3-4-1.1-7-4.7-7-9.3V6l7-2.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.25 12l1.75 1.75L14.75 10" />
    </Svg>
  );
}

export function IconChevronDown(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8.5l7 7 7-7" />
    </Svg>
  );
}

export function IconMinus(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </Svg>
  );
}

export function IconDatabase(props) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 11.5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </Svg>
  );
}

export function IconRefresh(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12a7.5 7.5 0 0112.79-5.3M19.5 12a7.5 7.5 0 01-12.79 5.3"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.5 3.5v3.5H14M6.5 20.5V17H10" />
    </Svg>
  );
}

export function IconList(props) {
  return (
    <Svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6h11M9 12h11M9 18h11" />
      <path strokeLinecap="round" d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </Svg>
  );
}

export function IconPencil(props) {
  return (
    <Svg {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.86 4.49a1.75 1.75 0 012.48 2.48L8.6 17.7l-3.6.9.9-3.6L16.86 4.49z"
      />
    </Svg>
  );
}

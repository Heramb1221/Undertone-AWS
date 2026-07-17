// Single source of truth for non-color design tokens used across components.
// Colors live in tailwind.config.ts + globals.css (so both Tailwind classes and
// raw CSS vars stay in sync with docs/Colour.md).

export const radius = {
  sm: "6px", // chips, Tokens
  md: "12px", // cards, post containers
  lg: "20px", // modals, bottom sheets
};

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px", // comment indent step, mobile
  4: "16px", // default card padding / comment indent step, web
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
};

// Glossary.md — the renamed system, kept as constants so copy never drifts
export const TERMS = {
  resonance: "Resonance",
  nod: "Nod",
  pass: "Pass",
  circle: "Circle",
  token: "Token",
  rhythm: "Rhythm",
  report: "Report",
} as const;

export const AUTH_THEME = {
  bg: "#0b1220",
  surface: "#111a2e",
  surfaceLight: "#162035",
  border: "#1e2d4a",
  text: "#e8ecf4",
  textMuted: "#c8d0e0",
  textDim: "#9ba8bc",
  accent: "#c8a64e",
  accentGlow: "rgba(200,166,78,0.12)",
  green: "#34d399",
  red: "#f87171",
  blue: "#60a5fa",
  purple: "#a78bfa",
  cyan: "#22d3ee",
} as const;

export const AGENT_SHOWCASE = [
  { name: "Prime", letter: "\u2655", color: "#c8a64e", role: "Your Assistant" },
  { name: "Byte", letter: "B", color: "#34d399", role: "Smart Import" },
  { name: "Tag", letter: "T", color: "#22d3ee", role: "Categorizer" },
  { name: "Crystal", letter: "C", color: "#a78bfa", role: "Analytics" },
] as const;

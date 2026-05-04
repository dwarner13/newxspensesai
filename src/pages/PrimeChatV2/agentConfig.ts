export const THEME = {
  bg: "#0b1220",
  surface: "#111a2e",
  surfaceLight: "#162035",
  border: "#1e2d4a",
  borderLight: "#2a3f66",
  text: "#e8ecf4",
  textMuted: "#c8d0e0",
  textDim: "#9ba8bc",
  accent: "#c8a64e",
  accentGlow: "rgba(200,166,78,0.12)",
  green: "#34d399",
  greenBg: "rgba(52,211,153,0.08)",
  red: "#f87171",
  redBg: "rgba(248,113,113,0.08)",
  blue: "#60a5fa",
  blueBg: "rgba(96,165,250,0.08)",
  purple: "#a78bfa",
  purpleBg: "rgba(167,139,250,0.08)",
  orange: "#fb923c",
  orangeBg: "rgba(251,146,60,0.08)",
  cyan: "#22d3ee",
  cyanBg: "rgba(34,211,238,0.08)",
  slate: "#e2e8f0",
  slateBg: "rgba(226,232,240,0.08)",
} as const;

export type AgentName = "Prime" | "Tag" | "Crystal" | "Byte" | "Goalie" | "Custodian";

export const AGENT_COLORS: Record<AgentName, string> = {
  Prime: THEME.accent,
  Tag: THEME.cyan,
  Crystal: THEME.purple,
  Byte: THEME.green,
  Goalie: THEME.orange,
  Custodian: THEME.slate,
};

export const AGENT_BG: Record<AgentName, string> = {
  Prime: THEME.accentGlow,
  Tag: THEME.cyanBg,
  Crystal: THEME.purpleBg,
  Byte: THEME.greenBg,
  Goalie: THEME.orangeBg,
  Custodian: THEME.slateBg,
};

export const AGENT_LABELS: Record<AgentName, string> = {
  Prime: "\u2655",
  Tag: "T",
  Crystal: "C",
  Byte: "B",
  Goalie: "G",
  Custodian: "\u2699",
};

export const AGENT_ROLES: Record<AgentName, string> = {
  Prime: "Advisor",
  Tag: "Categorizer",
  Crystal: "Insights",
  Byte: "Documents",
  Goalie: "Goals",
  Custodian: "App Guide",
};

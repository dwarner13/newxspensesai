export const MKTG_THEME = {
  bg: "#0b1220",
  surface: "#111a2e",
  surfaceLight: "#162035",
  border: "#1e2d4a",
  text: "#e8ecf4",
  textMuted: "#7b8ba5",
  textDim: "#4a5a75",
  accent: "#c8a64e",
  accentGlow: "rgba(200,166,78,0.12)",
  green: "#34d399",
  red: "#f87171",
  blue: "#60a5fa",
  purple: "#a78bfa",
  orange: "#fb923c",
  cyan: "#22d3ee",
  yellow: "#fbbf24",
  pink: "#f472b6",
} as const;

export interface AgentShowcase {
  name: string;
  letter: string;
  color: string;
  role: string;
  quote: string;
}

export const AGENTS: AgentShowcase[] = [
  { name: "Prime", letter: "\u2655", color: "#c8a64e", role: "Your Advisor", quote: "Your dining is up 23% this month. Want me to break it down?" },
  { name: "Byte", letter: "B", color: "#34d399", role: "Smart Import", quote: "Just processed your statement. 24 transactions ready." },
  { name: "Tag", letter: "T", color: "#22d3ee", role: "Categorizer", quote: "Found 3 that don't look right. Takes 2 minutes to fix." },
  { name: "Crystal", letter: "C", color: "#a78bfa", role: "Analytics", quote: "Delivery apps are 68% of your dining spend increase." },
  { name: "Goalie", letter: "G", color: "#fbbf24", role: "Goals Coach", quote: "Your emergency fund hits $5K by July at this rate." },
  { name: "Ledger", letter: "L", color: "#34d399", role: "Tax Organizer", quote: "Organized $3,280 in potential deductions. Your accountant will love this." },
];

export const THEME = {
  bg: "#0b1220",
  surface: "#111a2e",
  surfaceLight: "#162035",
  border: "#1e2d4a",
  borderLight: "#2a3f66",
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
  pink: "#ec4899",
  amber: "#fbbf24",
} as const;

export interface CategoryData {
  name: string;
  spent: number;
  budget: number;
  color: string;
  icon: string;
  trend: number;
  topMerchant: string;
  transactionCount: number;
}

export const CATEGORY_META: Record<string, { color: string; icon: string; budget: number }> = {
  "Groceries":     { color: "#34d399", icon: "\ud83e\uded2", budget: 800 },
  "Food & Dining": { color: "#fb923c", icon: "\ud83c\udf7d\ufe0f", budget: 600 },
  "Transportation":{ color: "#60a5fa", icon: "\ud83d\ude97", budget: 400 },
  "Shopping":      { color: "#a78bfa", icon: "\ud83d\udecd\ufe0f", budget: 500 },
  "Subscriptions": { color: "#818cf8", icon: "\ud83d\udd01", budget: 200 },
  "Personal Care": { color: "#ec4899", icon: "\u2728", budget: 300 },
  "Healthcare":    { color: "#f87171", icon: "\ud83c\udfe5", budget: 400 },
  "Bank Fees":     { color: "#94a3b8", icon: "\ud83c\udfe6", budget: 100 },
  "Income":        { color: "#34d399", icon: "\ud83d\udcb0", budget: 0 },
  "Other":         { color: "#475569", icon: "\ud83d\udcc1", budget: 300 },
  "Transfers":     { color: "#60a5fa", icon: "\ud83d\udd04", budget: 0 },
  "Housing":       { color: "#a78bfa", icon: "\ud83c\udfe0", budget: 2000 },
  "Debt Payments": { color: "#f87171", icon: "\ud83d\udcb3", budget: 500 },
  "Savings":       { color: "#34d399", icon: "\ud83e\udea3", budget: 500 },
  "Recreation":    { color: "#fb923c", icon: "\ud83c\udfae", budget: 300 },
  "Entertainment": { color: "#818cf8", icon: "\ud83c\udfac", budget: 200 },
  "Insurance":     { color: "#94a3b8", icon: "\ud83d\udee1\ufe0f", budget: 300 },
  "Education":     { color: "#60a5fa", icon: "\ud83d\udcda", budget: 200 },
  "Travel":        { color: "#fbbf24", icon: "\ud83c\udf0d", budget: 500 },
  "Home & Garden": { color: "#34d399", icon: "\ud83d\udd28", budget: 200 },
  "Business":      { color: "#c8a64e", icon: "\ud83d\udcbc", budget: 0 },
  "Uncategorized": { color: "#f59e0b", icon: "\u2753", budget: 0 },
};

export function getCategoryMeta(name: string) {
  return CATEGORY_META[name] || { color: "#475569", icon: "\ud83d\udcc1", budget: 300 };
}

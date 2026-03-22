import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#f87171";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

export interface ScoreFactor {
  label: string;
  value: string;
  status: "pass" | "warn" | "fail";
  tip: string;
}

export interface ScorePillar {
  name: string;
  score: number;
  icon: string;
  weight: number;
  factors: ScoreFactor[];
}

export interface ScoreHistoryPoint {
  month: string;
  score: number;
}

export interface ScoreAction {
  action: string;
  impact: string;
  agent: string;
  color: string;
}

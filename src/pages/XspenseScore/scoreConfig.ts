import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export function getScoreColor(score: number): string {
  if (score >= 90) return "#22d3ee";
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#86efac";
  if (score >= 50) return "#fbbf24";
  if (score >= 30) return "#fb923c";
  return "#f87171";
}

export function getScoreGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return "Financial Elite";
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "On Track";
  if (score >= 30) return "Building Up";
  return "Needs Attention";
}

export const SCORE_GRADES = [
  { grade: "S", min: 90, max: 100, label: "Financial Elite", color: "#22d3ee" },
  { grade: "A", min: 80, max: 89, label: "Excellent", color: "#34d399" },
  { grade: "B", min: 65, max: 79, label: "Strong", color: "#86efac" },
  { grade: "C", min: 50, max: 64, label: "On Track", color: "#fbbf24" },
  { grade: "D", min: 30, max: 49, label: "Building Up", color: "#fb923c" },
  { grade: "F", min: 0, max: 29, label: "Needs Attention", color: "#f87171" },
];

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

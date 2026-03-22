import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export const GOALIE_COLOR = "#fbbf24";

export interface GoalData {
  name: string;
  target: number;
  current: number;
  icon: string;
  color: string;
  deadline: string;
  priority: "high" | "medium" | "low";
  tip: string;
}

export interface DebtData {
  name: string;
  balance: number;
  rate: number;
  minPayment: number;
  color: string;
  type: string;
}

export interface LessonData {
  title: string;
  desc: string;
  duration: string;
  icon: string;
  color: string;
  agent: string;
}

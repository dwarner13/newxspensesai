import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export const RECAP_COLOR = "#ec4899";

export interface RecapEpisode {
  id: string;
  title: string;
  month: string;
  duration: string;
  date: string;
  income: number;
  expenses: number;
  net: number;
  healthGrade: string;
  agentHighlights: { agent: string; color: string; text: string }[];
  hasAudio: boolean;
}

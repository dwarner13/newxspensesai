import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export const RECAP_COLOR = "#ec4899";

/**
 * One calendar month of RECORDED transactions (UX-FST2-2; owner 2026-11-26). Figures are the
 * server's calendarMonths[] (fst2-summary-2). Months are never compared and never graded.
 */
export interface RecapEpisode {
  id: string;            // YYYY-MM
  title: string;         // e.g. "November 2026"
  month: string;
  coverage: "complete" | "partial" | "unknown" | "none";
  coverageText: string;  // the month's coverage label, always shown
  deposits: number;
  withdrawals: number;
  netCashFlow: number;
  count: number;
  agentHighlights: { agent: string; color: string; text: string }[];
  hasAudio: boolean;
}

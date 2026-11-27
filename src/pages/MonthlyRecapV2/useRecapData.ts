/**
 * Monthly Recap data — UX-FST2-2 (owner 2026-11-26; AR-1b FR-004).
 * Owner: "Show verified available-transaction totals for older imports with unknown statement
 * coverage. Clearly label coverage unknown. No comparisons or completeness claims. If the database
 * read is incomplete, show no totals."
 * Every figure is the server's calendarMonths[] (fst2-summary-2). This file does no money
 * arithmetic: the browser income regex, the local month buckets, the A–D grade and the invented
 * read durations are retired.
 */
import { useMemo } from "react";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange, type CalendarMonth, type FinancialSummary } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";
import type { RecapEpisode } from "./recapConfig";

export interface RecapData {
  financial: ReturnType<typeof useFinancialSummary>;
  summary: FinancialSummary | null;
  episodes: RecapEpisode[];
  loading: boolean;
}

/** "2026-11" -> "November 2026" (calendar label only). */
export function monthName(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-CA", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The coverage label every month carries (wording from the final contract). */
export function monthCoverageText(key: string, coverage: CalendarMonth["coverage"]): string {
  const short = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, 1)).toLocaleDateString("en-CA", { month: "short", year: "numeric", timeZone: "UTC" });
  // G3 (Prime HQ 2c545f67): months no statement covers are "none". Rendered as the server says.
  const cov = coverage === "complete" ? "statement coverage complete" : coverage === "partial" ? "statement coverage partial" : coverage === "none" ? "no imported statement covers this month, so this may not be every transaction" : "statement coverage unknown";
  return `Recorded transactions dated in ${short} (${cov})`;
}

export function toEpisodes(months: ReadonlyArray<CalendarMonth>): RecapEpisode[] {
  return [...months]
    .sort((a, b) => b.start.localeCompare(a.start))
    .map(m => {
      const key = m.label.slice(0, 7);
      return {
        id: key,
        title: monthName(key),
        month: monthName(key),
        coverage: m.coverage,
        coverageText: monthCoverageText(key, m.coverage),
        deposits: m.deposits,
        withdrawals: m.withdrawals,
        netCashFlow: m.netCashFlow,
        count: m.count,
        agentHighlights: [
          { agent: "Byte", color: "#34d399", text: `${m.count} transaction${m.count === 1 ? "" : "s"} recorded in this month` },
        ],
        hasAudio: false,
      };
    });
}

export function useRecapData(): RecapData {
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);
  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    return {
      financial,
      summary,
      episodes: summary ? toEpisodes(summary.calendarMonths ?? []) : [],
      loading: financial.status === "loading",
    };
  }, [financial]);
}

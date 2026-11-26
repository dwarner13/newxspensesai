/**
 * My Story data — UX-FST2-3 (owner 2026-11-26; AR-1b FR-003).
 * Owner: remove the unsupported A–F health grade; one possible-business-expenses line replaces the
 * per-section "deductions"; server-generated figures only; no month comparisons.
 * Every figure is the shared engine's (fst2-summary-2 FINAL). This file does no money arithmetic:
 * the income regex, local non-spend list, local category sums, month buckets, "% vs previous month",
 * the grade, the "deductible" category list and the per-category confidence are retired.
 */
import { useMemo } from "react";
import { useImportList } from "@/hooks/useImportList";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange, type FinancialSummary, type Insight } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";
import { insightText, spendingClaim } from "@/lib/insightWording";
import { monthName } from "../MonthlyRecapV2/useRecapData";

const CAT_COLORS: Record<string, string> = {
  "Groceries": "#34d399", "Food & Dining": "#f87171", "Dining": "#f87171", "Transportation": "#22d3ee",
  "Shopping": "#fb923c", "Subscriptions": "#60a5fa", "Personal Care": "#f472b6", "Housing": "#c8a64e",
  "Healthcare": "#f87171", "Health": "#f87171", "Bank Fees": "#94a3b8", "Utilities": "#60a5fa", "Other": "#4a5a75",
};

export interface StoryTrend { label: string; kind: "trend" | "stable"; direction?: "up" | "down"; percent?: number; text: string }

export interface StoryData {
  financial: ReturnType<typeof useFinancialSummary>;
  summary: FinancialSummary | null;
  statementCount: number;
  transactionCount: number | null;
  needsReviewCount: number | null;
  periodStart: string;
  periodEnd: string;
  monthsRecorded: number;
  categoryBreakdown: { cat: string; amount: number; pct: number; color: string }[];
  /** Server category insights only (coverage-gated). Empty without comparable history. */
  trends: StoryTrend[];
  /** The server's overall spending claim (trend / stable / not enough history), phrased. */
  spendingClaimText: string | null;
  topCategoryText: string | null;
  loading: boolean;
}

export function storyTrends(insights: ReadonlyArray<Insight>): StoryTrend[] {
  const out: StoryTrend[] = [];
  for (const i of insights) {
    if (i.subject !== "category" || !i.category || (i.kind !== "trend" && i.kind !== "stable")) continue;
    const text = insightText(i);
    if (!text) continue; // insightText refuses anything without server coverage
    out.push({ label: i.category, kind: i.kind, direction: i.direction, percent: i.percent, text });
  }
  return out;
}

export function useStoryData(): StoryData {
  const { imports, isLoading: impLoading } = useImportList();
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);

  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    const months = summary?.calendarMonths ?? [];
    const sortedKeys = months.map(m => m.label.slice(0, 7)).sort();
    const claim = summary ? spendingClaim(summary.insights) : null;
    const top = summary?.insights.find(i => i.kind === "top_category") ?? null;
    return {
      financial,
      summary,
      statementCount: imports.length,
      transactionCount: summary ? summary.transactionCount : null,
      needsReviewCount: summary ? summary.needsReviewCount : null,
      periodStart: sortedKeys[0] ? monthName(sortedKeys[0]) : "",
      periodEnd: sortedKeys.length ? monthName(sortedKeys[sortedKeys.length - 1]) : "",
      monthsRecorded: sortedKeys.length,
      categoryBreakdown: (summary?.spendingByCategory ?? []).map(c => ({ cat: c.category, amount: c.amount, pct: c.share, color: CAT_COLORS[c.category] || "#4a5a75" })),
      trends: summary ? storyTrends(summary.insights) : [],
      spendingClaimText: claim ? insightText(claim) : null,
      topCategoryText: top ? insightText(top) : null,
      loading: impLoading || financial.status === "loading",
    };
  }, [imports, impLoading, financial]);
}

/** Crystal's intro: facts only (counts and the recorded months). No analysis claims. */
export function buildCrystalIntro(d: StoryData): string {
  if (!d.summary) return "Here's where your financial story will appear once your figures are available.";
  const m = d.monthsRecorded;
  return `Here's your financial story from ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""} and ${d.transactionCount} transaction${d.transactionCount !== 1 ? "s" : ""}, recorded across ${m} month${m !== 1 ? "s" : ""}. ${d.summary.dataQuality.totalsLabel}`;
}

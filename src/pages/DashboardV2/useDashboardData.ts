/**
 * Home (Dashboard) data — UX-FST2-1 (owner GO 2026-11-26; AR-1b FR-001).
 * Every money figure, count and claim comes from the shared financial engine through
 * useFinancialSummary (fst2-summary-2). This file does no money arithmetic, applies no
 * income or spending rule of its own, and makes no month comparison: the browser income
 * regex, the calendar-month trends, the 'Deductions Found' label sum and the 3-month
 * 'trend alert' are retired. Import facts (statement count, pending imports, recent
 * imports) still come from the import list; they are not money.
 */
import { useMemo } from "react";
import { useImportList } from "@/hooks/useImportList";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange, type FinancialSummary } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";

export interface DashboardData {
  /** The shared engine's answer for all imported data. */
  financial: ReturnType<typeof useFinancialSummary>;
  /** Present only for verified / verified_zero. */
  summary: FinancialSummary | null;
  statementCount: number;
  pendingImports: number;
  /** Server counts (null until verified). */
  transactionCount: number | null;
  needsReviewCount: number | null;
  recentAgentActions: { agent: string; action: string; detail: string; time: string }[];
  loading: boolean;
}

export function useDashboardData(): DashboardData {
  const { imports, isLoading: impLoading } = useImportList();
  // Stable "all time" scope for this page load.
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);

  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    const pendingImports = imports.filter(i => i.status === "parsed" || i.status === "pending").length;
    const actions: DashboardData["recentAgentActions"] = [];
    for (const imp of [...imports].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3)) {
      actions.push({ agent: "Byte", action: `Imported ${imp.statementLabel || imp.docName}`, detail: `Status: ${imp.status}`, time: getTimeAgo(imp.created_at) });
    }
    if (summary) {
      if (summary.needsReviewCount > 0) {
        actions.push({ agent: "Tag", action: `Flagged ${summary.needsReviewCount} for review`, detail: "Uncategorized or marked Needs Review", time: "recently" });
      } else if (summary.transactionCount > 0) {
        actions.push({ agent: "Tag", action: "All transactions categorized", detail: "Every transaction has a category", time: "recently" });
      }
    }
    return {
      financial,
      summary,
      statementCount: imports.length,
      pendingImports,
      transactionCount: summary ? summary.transactionCount : null,
      needsReviewCount: summary ? summary.needsReviewCount : null,
      recentAgentActions: actions,
      loading: impLoading || financial.status === "loading",
    };
  }, [imports, impLoading, financial]);
}

function getTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** The recap line: facts only (import counts, review count). No money, no trend claims. */
export function buildRecapText(d: DashboardData): string {
  const parts: string[] = [];
  if (d.statementCount > 0 && d.transactionCount !== null) {
    parts.push(`Byte imported ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""} (${d.transactionCount} transactions)`);
  }
  if (d.needsReviewCount !== null) {
    if (d.needsReviewCount === 0 && (d.transactionCount ?? 0) > 0) parts.push("every transaction has a category");
    else if (d.needsReviewCount > 0) parts.push(`Tag flagged ${d.needsReviewCount} transaction${d.needsReviewCount !== 1 ? "s" : ""} for review`);
  }
  return parts.length > 0 ? `So far: ${parts.join(", ")}.` : "Your AI team is standing by. Upload a statement to get started.";
}

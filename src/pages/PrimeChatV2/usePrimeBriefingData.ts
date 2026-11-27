/**
 * Prime briefing panel data — UX-FST2-8 (owner FST-2 GO: employee reporting cards; AR-1b FR-007,
 * with Prime HQ). Every figure is the shared engine's (fst2-summary-2, all imported data), exactly as
 * on Home: owner labels, dataQuality.totalsLabel, server insights and the served review line.
 * Retired from the browser: the PAYMENT|CREDIT|REFUND income rule and non-spend lists, totals and
 * category sums, month-over-month and three-month trend claims, the 'deductions' label sum and the
 * Tax-Workspace mirror (taxSummary; the server no longer accepts it). Anything the contract does not
 * serve is hidden, not computed.
 */
import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange, type FinancialSummary } from "@/lib/financialSummary";
import { hasFigures, formatMoney } from "@/components/finance/FinancialState";
import { FINANCIAL_LABELS } from "@/lib/financialLabels";
import { insightText, spendingClaim, needsReviewText, POSSIBLE_BUSINESS_EXPENSES_TEXT } from "@/lib/insightWording";
import { classifyCashFlow } from "@/shared/financial-taxonomy";

const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#34d399", "Food & Dining": "#f87171", "Transportation": "#60a5fa",
  "Shopping": "#a78bfa", "Subscriptions": "#818cf8", "Personal Care": "#ec4899",
  "Healthcare": "#f87171", "Bank Fees": "#94a3b8", "Income": "#34d399", "Other": "#4a5a75",
};

export interface TopTransaction {
  merchant: string;
  date: string;
  amount: number;
  category: string;
  categoryColor: string;
  /** Row direction from the engine classifier (inflow); plain sign only when unclassified. */
  isIncome: boolean;
}

export interface PrimeBriefingData {
  financial: ReturnType<typeof useFinancialSummary>;
  summary: FinancialSummary | null;
  statementCount: number;
  transactionCount: number;
  /** Server Actual Spending / Actual Income / Net Cash Flow (0 until verified). */
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  currency: string;
  /** Server spending categories (amount, server share). */
  categoryBreakdown: { label: string; amount: number; share: number; color: string }[];
  categorySummary: string;
  topTransactions: TopTransaction[];
  topMerchant: { name: string; amount: number } | null;
  uncategorizedCount: number;
  pendingImports: number;
  /** Server insight wording (coverage-gated); null when the server makes no such claim. */
  spendingClaimText: string | null;
  topCategoryText: string | null;
  /** The served review line (LA-4). */
  needsReviewLine: string | null;
  /** Possible business expenses (needs review; not a tax decision), from the server. */
  possibleBusinessExpensesLine: string | null;
  loading: boolean;
}

export function usePrimeBriefingData(): PrimeBriefingData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);

  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    const currency = summary?.scope.currency ?? "CAD";
    const money = (amount: number) => formatMoney(amount, currency);
    const pendingImports = imports.filter(i => i.status === "parsed" || i.status === "pending").length;

    // Largest single rows (row facts, no totals); direction from the engine classifier.
    const topTransactions: TopTransaction[] = [...transactions]
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 10)
      .map(t => {
        const cat = t.category || "Other";
        const d = new Date(t.posted_at || "");
        const c = classifyCashFlow({ type: (t as { type?: string | null }).type, category: t.category, subcategory: t.subcategory, amount: t.amount });
        return {
          merchant: t.merchant_name || "Unknown",
          date: isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          amount: Math.abs(t.amount),
          category: cat,
          categoryColor: CATEGORY_COLORS[cat] || "#4a5a75",
          isIncome: c.direction === "inflow" || (c.direction === "unclassified" && Number(t.amount) > 0),
        };
      });
    const topMerchant = topTransactions.length > 0 && !topTransactions[0].isIncome
      ? { name: topTransactions[0].merchant, amount: topTransactions[0].amount }
      : null;

    const categoryBreakdown = (summary?.spendingByCategory ?? []).map(c => ({
      label: c.category, amount: c.amount, share: c.share, color: CATEGORY_COLORS[c.category] || "#4a5a75",
    }));
    const claim = summary ? spendingClaim(summary.insights) : null;
    const top = summary?.insights.find(i => i.kind === "top_category") ?? null;
    const pbe = summary?.possibleBusinessExpenses ?? null;

    return {
      financial,
      summary,
      statementCount: imports.length,
      transactionCount: summary ? summary.transactionCount : 0,
      totalSpent: summary ? summary.labels.actualSpending.amount : 0,
      totalIncome: summary ? summary.labels.actualIncome.amount : 0,
      netCashFlow: summary ? summary.labels.netCashFlow.amount : 0,
      currency,
      categoryBreakdown,
      categorySummary: categoryBreakdown.slice(0, 5).map(c => `${c.label} ${c.share}%`).join(" • "),
      topTransactions,
      topMerchant,
      uncategorizedCount: summary ? summary.needsReviewCount : 0,
      pendingImports,
      spendingClaimText: claim && summary ? insightText(claim, summary.wording) : null,
      topCategoryText: top && summary ? insightText(top, summary.wording) : null,
      needsReviewLine: summary && summary.needsReviewCount > 0
        ? needsReviewText(summary.needsReview, summary.needsReviewCount, c => money(c / 100))
        : null,
      possibleBusinessExpensesLine: pbe && pbe.count > 0 ? POSSIBLE_BUSINESS_EXPENSES_TEXT(pbe.count, money(pbe.amount)) : null,
      loading: txLoading || impLoading || financial.status === "loading",
    };
  }, [transactions, imports, txLoading, impLoading, financial]);
}

/** The briefing's opening summary: server figures and server wording only. */
export function buildSummaryText(d: PrimeBriefingData): string {
  if (!d.summary) {
    return d.financial.status === "no_data"
      ? "No transactions yet. Upload a statement to get started."
      : "Your figures aren't available right now, so I won't guess. Please try again shortly.";
  }
  if (d.transactionCount === 0) return "No transactions yet. Upload a statement to get started.";
  const money = (n: number) => formatMoney(n, d.currency);
  const parts: string[] = [];
  parts.push(`Across ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""}: ${FINANCIAL_LABELS.actualSpending} ${money(d.totalSpent)}, ${FINANCIAL_LABELS.actualIncome} ${money(d.totalIncome)}, ${FINANCIAL_LABELS.netCashFlow} ${d.netCashFlow > 0 ? "+" : ""}${money(d.netCashFlow)}.`);
  if (d.summary.dataQuality && d.summary.dataQuality.statementCoverage !== "complete") parts.push(d.summary.dataQuality.totalsLabel);
  if (d.topCategoryText) parts.push(d.topCategoryText);
  if (d.spendingClaimText) parts.push(d.spendingClaimText);
  if (d.possibleBusinessExpensesLine) parts.push(d.possibleBusinessExpensesLine);
  return parts.join(" ");
}

/** Prime's take: server claims only (no browser trends or shares). */
export function buildThoughtsText(d: PrimeBriefingData): string {
  const parts: string[] = [];
  if (d.spendingClaimText) parts.push(d.spendingClaimText);
  if (d.needsReviewLine) parts.push(`${d.needsReviewLine}. Clearing those sharpens everything else.`);
  if (d.topCategoryText) parts.push(d.topCategoryText);
  return parts.length > 0 ? parts.join(" ") : "Everything looks solid. No flags to report.";
}

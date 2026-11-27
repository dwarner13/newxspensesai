/**
 * Categories data — UX-FST2-6 (owner FST-2 GO; AR-1b FR-002; owner 2026-11-26: "hide unsupported
 * financial figures temporarily, do not retain inaccurate calculations").
 * Every money figure is the shared engine's (fst2-summary-2) for the page scope: year / month /
 * custom range, plus the selected account. Retired from the browser: the PAYMENT|CREDIT|REFUND
 * income rule and non-spend list, category sums, the "budget" (an average monthly spend), month-
 * over-month trends, keyword-guessed subcategory amounts and top merchants (contract gap G6/G7:
 * hidden until the engine serves them). Non-money facts (periods, counts, rows to review) stay.
 */
import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import type { CategoryData } from "./categoryConfig";
import { getCategoryMeta } from "./categoryConfig";
import { needsCategory, countNeedsCategory } from "@/lib/needsCategory";
import { calendarDayOfTx, periodKeyOf, yearOf, isRangeActive, type DateRange } from "@/lib/categoryPeriod";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange, yearRange, type FinancialSummary, type SummaryRequest } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";
import { categoryTrend, insightText, spendingClaim } from "@/lib/insightWording";

export interface FlaggedTransaction {
  id: string;
  merchant: string;
  amount: string;
  issue: string;
  category: string;
}

export interface SubcategorySuggestion {
  parentCategory: string;
  parentColor: string;
  subcategories: { name: string; amount: string; count: number; topMerchant: string }[];
}

export interface CategoriesPageData {
  categories: CategoryData[];
  /** Server Actual Spending / Actual Income / Net Cash Flow for the scope (0 until verified). */
  totalSpent: number;
  totalIncome: number;
  netCashFlow: number;
  totalBudget: number;
  categoryCount: number;
  uncategorizedCount: number;
  avgSpentPerCategory: number;
  loading: boolean;
  financial: ReturnType<typeof useFinancialSummary>;
  summary: FinancialSummary | null;
  /** Server insight wording (top category; overall spending claim). */
  topCategoryText: string | null;
  spendingClaimText: string | null;
  flaggedTransactions: FlaggedTransaction[];
  /** G6: subcategory amounts are not served yet, so no suggestions with amounts are made. */
  subcategorySuggestions: SubcategorySuggestion[];
  availablePeriods: string[];
  availableYears: number[];
  refetch: () => Promise<void>;
}

/** K-d: optional custom range (replaces year / month when active) and account scope. */
export interface CategoriesScope {
  range?: DateRange | null;
  /** Import ids of the selected account; null = all accounts. */
  importIds?: Set<string> | null;
}

/** The server scope for the page's period selection (dates only; account added by the caller). */
export function categoriesDates(selectedPeriod?: string, selectedYear?: number | 'all', range?: DateRange | null): { startDate: string; endDate: string } {
  if (isRangeActive(range ?? null)) {
    const today = new Date().toISOString().slice(0, 10);
    return { startDate: range?.from || '2000-01-01', endDate: range?.to || today };
  }
  if (selectedPeriod && /^[0-9]{4}-[0-9]{2}$/.test(selectedPeriod)) {
    const [y, m] = selectedPeriod.split('-').map(Number);
    return { startDate: `${selectedPeriod}-01`, endDate: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
  }
  if (typeof selectedYear === 'number') return yearRange(selectedYear);
  return allTimeRange();
}

export function useCategoriesData(selectedPeriod?: string, selectedYear?: number | 'all', scope?: CategoriesScope): CategoriesPageData {
  const { transactions: allTransactions, isLoading, refetch } = useTransactions();
  const range = scope?.range ?? null;
  const importIds = scope?.importIds ?? null;
  const importKey = importIds ? [...importIds].sort().join(',') : '';

  const summaryReq: SummaryRequest | null = useMemo(() => {
    const dates = categoriesDates(selectedPeriod, selectedYear, range);
    if (importIds && importIds.size === 0) return null;
    return { ...dates, ...(importIds ? { importIds: [...importIds] } : {}) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedYear, range?.from, range?.to, importKey]);
  const financial = useFinancialSummary(summaryReq);

  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    // K-d: account scope applies to rows on the page (same rule as Transactions).
    const transactions = importIds ? allTransactions.filter(t => importIds.has(t.import_id || "")) : allTransactions;

    // Periods and years from row dates (navigation only, no money).
    const yearSet = new Set<number>();
    yearSet.add(new Date().getFullYear());
    if (typeof selectedYear === 'number') yearSet.add(selectedYear);
    transactions.forEach(t => { const y = yearOf(calendarDayOfTx(t)); if (y !== null) yearSet.add(y); });
    const availableYears = Array.from(yearSet).sort((a, b) => b - a);
    const yearFiltered = typeof selectedYear === 'number' ? transactions.filter(t => yearOf(calendarDayOfTx(t)) === selectedYear) : transactions;
    const periodSet = new Set<string>();
    yearFiltered.forEach(t => { const key = periodKeyOf(calendarDayOfTx(t)); if (key) periodSet.add(key); });
    const availablePeriods = Array.from(periodSet).sort().reverse();

    // Rows to review in the same period (row facts; the count is the server's when available).
    const dates = categoriesDates(selectedPeriod, selectedYear, range);
    const inPeriod = transactions.filter(t => { const d = calendarDayOfTx(t); return !!d && d >= dates.startDate && d <= dates.endDate; });
    const uncategorizedCount = summary ? summary.needsReviewCount : countNeedsCategory(inPeriod);
    const flaggedTransactions: FlaggedTransaction[] = inPeriod
      .filter(t => needsCategory(t.category))
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        merchant: t.merchant_name || "Unknown",
        amount: `$${Math.abs(t.amount).toFixed(2)}`,
        issue: "Uncategorized — Tag needs your input",
        category: t.category || "Uncategorized",
      }));

    // Categories: the server's spending categories (purpose 'spending'), amounts and shares.
    const categories: CategoryData[] = summary
      ? summary.spendingByCategory.map(c => {
          const meta = getCategoryMeta(c.category);
          const t = categoryTrend(summary.insights, c.category);
          return {
            name: c.category,
            spent: c.amount,
            budget: 0, // no budget is served; the old "average monthly spend" stand-in is retired
            color: meta.color,
            icon: meta.icon,
            trend: t && typeof t.percent === 'number' ? (t.direction === 'down' ? -t.percent : t.percent) : 0,
            topMerchant: '', // G6: merchants per category are not served yet
            transactionCount: c.count,
            share: c.share,
          };
        })
      : [];

    const claim = summary ? spendingClaim(summary.insights) : null;
    const top = summary?.insights.find(i => i.kind === 'top_category') ?? null;
    return {
      categories,
      totalSpent: summary ? summary.labels.actualSpending.amount : 0,
      totalIncome: summary ? summary.labels.actualIncome.amount : 0,
      netCashFlow: summary ? summary.labels.netCashFlow.amount : 0,
      totalBudget: 0,
      categoryCount: categories.length,
      uncategorizedCount,
      avgSpentPerCategory: 0,
      loading: isLoading || financial.status === 'loading',
      financial,
      summary,
      topCategoryText: top && summary ? insightText(top, summary.wording) : null,
      spendingClaimText: claim && summary ? insightText(claim, summary.wording) : null,
      flaggedTransactions,
      subcategorySuggestions: [],
      availablePeriods,
      availableYears,
      refetch,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTransactions, isLoading, selectedPeriod, selectedYear, range?.from, range?.to, importKey, refetch, financial]);
}

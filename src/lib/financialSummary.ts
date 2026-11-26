/**
 * FST-2 client (owner GO 2026-11-26: every financial screen on the shared engine).
 * Contract: fst2-summary-2 (Prime HQ, Desktop/xspensesai-security-evidence/FST2_SUMMARY_2_CONTRACT.md;
 * built in netlify/functions/_shared/financial-summary-v2.ts).
 *
 * The browser does NO money arithmetic and applies NO thresholds: it requests a scope and renders
 * what the server returns. `partial` carries no totals and is never shown as numbers.
 */
import { getSupabase } from '@/lib/supabase';

export type SummaryStatus = 'verified' | 'verified_zero' | 'partial' | 'no_data' | 'unavailable';

export interface Money { amount: number; cents: number; count?: number }
export interface PeriodRow {
  start: string; end: string; label: string;
  deposits: number; withdrawals: number; netCashFlow: number;
  actualIncome: number; actualSpending: number; refunds: number; count: number;
}
export interface CalendarMonth extends PeriodRow { coverage: 'complete' | 'partial' | 'unknown'; comparable: false }
export interface StatementTotals extends PeriodRow { importId: string; periodStart: string; periodEnd: string }
export interface CategoryTotal { category: string; purpose: string; direction?: string; totalCents: number; amount: number; count: number }
export interface SpendingCategory { category: string; amount: number; cents: number; count: number; share: number }
export interface Insight {
  kind: 'trend' | 'stable' | 'top_category' | 'needs_review' | 'not_enough_history';
  subject: 'actual_spending' | 'category' | 'transactions';
  category?: string;
  direction?: 'up' | 'down';
  percent?: number;
  count?: number;
  periods?: Array<{ start: string; end: string }>;
  coverage: { complete: boolean; periodsAvailable: number; periodsRequired: number };
}

/** fst2-summary-2 body for `verified` / `verified_zero` (fields the screens use). */
export interface FinancialSummary {
  contractVersion: string;
  status: 'verified' | 'verified_zero';
  scope: { startDate: string; endDate: string; currency?: string; label: string };
  transactionCount: number;
  labels: { deposits: Money; withdrawals: Money; netCashFlow: Money; actualIncome: Money; actualSpending: Money; refunds: Money };
  netExcludingTransfersAndSavings: Money;
  spendingByCategory: SpendingCategory[];
  categories: CategoryTotal[];
  coverage: { status: string; comparison: { allowed: boolean; periodsAvailable: number; reason?: string }; completedWithoutPeriod?: number; limitations?: string[] };
  periods: PeriodRow[];
  calendarMonths: CalendarMonth[];
  needsReviewCount: number;
  perStatement: StatementTotals[];
  goals: { averageNetCashFlowPerPeriod: number | null; periodsUsed: number; savingsContributions: number };
  possibleBusinessExpenses: { status: 'needs_review'; count: number; amount: number; cents: number; categories: string[] };
  insights: Insight[];
}

export type SummaryResult =
  | { status: 'verified' | 'verified_zero'; summary: FinancialSummary }
  | { status: 'partial' | 'no_data' | 'unavailable' | 'signed_out' };

export interface SummaryRequest { startDate: string; endDate: string; importIds?: string[] }

/** "Everything": the earliest date the product supports to today (the server reads every row). */
export function allTimeRange(today = new Date()): SummaryRequest {
  return { startDate: '2000-01-01', endDate: today.toISOString().slice(0, 10) };
}
/** One calendar year (Transactions / Categories year filter). */
export function yearRange(year: number): SummaryRequest {
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

/** Read a server response into a result. Anything unexpected is 'unavailable' (nothing guessed). */
export function readSummaryResponse(httpStatus: number, body: unknown): SummaryResult {
  if (httpStatus === 401) return { status: 'signed_out' };
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const s = b.status;
  if (s === 'partial') return { status: 'partial' };
  if (s === 'no_data') return { status: 'no_data' };
  if ((s === 'verified' || s === 'verified_zero') && httpStatus >= 200 && httpStatus < 300 && b.labels && typeof b.labels === 'object') {
    return { status: s, summary: b as unknown as FinancialSummary };
  }
  return { status: 'unavailable' };
}

// In-flight de-duplication only (Prime HQ agreed): several cards asking for the same scope during one
// page load share one request. Nothing is kept once it settles — no cache, no re-derivation.
const inFlight = new Map<string, Promise<SummaryResult>>();

export function fetchFinancialSummary(req: SummaryRequest): Promise<SummaryResult> {
  const body = { startDate: req.startDate, endDate: req.endDate, ...(req.importIds && req.importIds.length ? { importIds: [...req.importIds].sort() } : {}) };
  const key = JSON.stringify(body);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const p = (async (): Promise<SummaryResult> => {
    try {
      const sb = getSupabase();
      if (!sb) return { status: 'unavailable' };
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) return { status: 'signed_out' };
      const res = await fetch('/.netlify/functions/financial-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      return readSummaryResponse(res.status, json);
    } catch {
      return { status: 'unavailable' };
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, p);
  return p;
}

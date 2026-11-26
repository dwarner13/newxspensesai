/**
 * Financial Snapshot Builder
 * 
 * Builds a normalized financial snapshot that Prime reasons over.
 * Simple rules only (no ML).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTransactionsInRange, type RangeFetchClient } from '../../../src/shared/transaction-range-fetch';
import { buildPeriodAggregate } from '../../../src/shared/period-aggregate';
import { classifyCashFlow } from '../../../src/shared/financial-taxonomy';
// Type imports (TypeScript types)
type FinancialSnapshot = import('../../../src/types/prime-state').FinancialSnapshot;
type StressSignal = import('../../../src/types/prime-state').StressSignal;

// FST-1: every figure comes from the ONE shared engine (complete paged read +
// buildPeriodAggregate / classifyCashFlow). The previous unpaged select returned at most
// 1,000 arbitrary rows; its count-keyed cache could also serve stale figures after a
// confirmed Tag correction (same count, different categories). There is no cache now:
// a correction is reflected on the very next read.

export async function buildFinancialSnapshot(
  supabase: SupabaseClient,
  userId: string,
  userTimezone?: string | null,
): Promise<FinancialSnapshot> {
  // Derive user-local month boundaries using timezone-aware logic.
  // This prevents the Edmonton 11PM problem where UTC is already next month.
  let localYear: number, localMonth: number;
  const now = new Date();
  if (userTimezone) {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone, year: 'numeric', month: '2-digit',
      });
      const parts = fmt.formatToParts(now);
      localYear = parseInt(parts.find(p => p.type === 'year')?.value || '', 10);
      localMonth = parseInt(parts.find(p => p.type === 'month')?.value || '', 10) - 1; // 0-indexed
    } catch {
      localYear = now.getFullYear();
      localMonth = now.getMonth();
    }
  } else {
    localYear = now.getFullYear();
    localMonth = now.getMonth();
  }
  const monthStartYmd = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-01`;
  const monthEndYmd = new Date(Date.UTC(localYear, localMonth + 1, 0)).toISOString().slice(0, 10);

  // 1. Complete paged transactions, debt and goals in parallel
  const [fetchResult, { data: debtDataParallel }, { data: goalsDataParallel }] = await Promise.all([
    fetchTransactionsInRange(supabase as unknown as RangeFetchClient,
      { userId, startDate: '1900-01-01', endDate: '9999-12-31' },
      { columns: ['merchant_name', 'merchant'] }),
    supabase.from('debt').select('balance').eq('user_id', userId).then((r: any) => r).catch(() => ({ data: null })),
    supabase.from('goals').select('id, status').eq('user_id', userId).eq('status', 'active').then((r: any) => r).catch(() => ({ data: null })),
  ]);
  if (fetchResult.error) {
    console.warn('[buildFinancialSnapshot] Error fetching transactions:', fetchResult.error);
  }
  const transactions = fetchResult.rows as Array<Record<string, any>>;
  const dataComplete = !fetchResult.error && fetchResult.complete;
  const hasTransactions = transactions.length > 0;
  const transactionCount = transactions.length;

  // 2. CATEGORIZATION STATE
  const uncategorizedCount = transactions.filter(t => !t.category || t.category === 'Uncategorized').length;
  const categorizedCount = transactionCount - uncategorizedCount;
  const categoryCount = new Set(transactions.map(t => t.category).filter(Boolean)).size;

  // 3. MONTHLY SPENDING / INCOME (calendar dates, user-local month, canonical classifier)
  const month = buildPeriodAggregate(transactions, {
    fetch: { complete: fetchResult.complete, truncated: fetchResult.truncated, rowsFetched: fetchResult.rowsFetched },
    period: { start: monthStartYmd, end: monthEndYmd },
  });
  const monthlyExpenses = month.cents.spending / 100;
  const monthlyIncome = month.cents.income / 100;
  const netCashflow = month.cents.netExcludingInternalMovements / 100;

  // 4. TOP CATEGORIES (current month ordinary spending)
  const topCategories = month.categories
    .filter(c => c.purpose === 'spending')
    .slice(0, 5)
    .map(c => ({ category: c.category, totalAmount: c.totalCents / 100, transactionCount: c.count }));

  // 5. TOP MERCHANTS (current month ordinary spending, same classifier)
  const merchantMap = new Map<string, { cents: number; count: number }>();
  for (const t of transactions) {
    const d = typeof t.date === 'string' ? t.date.slice(0, 10) : '';
    if (!d || d < monthStartYmd || d > monthEndYmd) continue;
    const c = classifyCashFlow(t);
    if (c.purpose !== 'spending' || c.amountCents === null) continue;
    const merchant = t.merchant_name || t.merchant || 'Unknown';
    const e = merchantMap.get(merchant) || { cents: 0, count: 0 };
    merchantMap.set(merchant, { cents: e.cents + c.amountCents, count: e.count + 1 });
  }
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, v]) => ({ merchant, totalAmount: v.cents / 100, transactionCount: v.count }))
    .sort((a, b) => b.totalAmount - a.totalAmount || a.merchant.localeCompare(b.merchant))
    .slice(0, 5);

  // 6. DATE RANGES
  const dates = transactions.map(t => t.date).filter(Boolean).map((d: string) => d.slice(0, 10)).sort();
  const firstTransactionDate = dates.length > 0 ? dates[0] : null;
  const lastTransactionDate = dates.length > 0 ? dates[dates.length - 1] : null;
  
  // 7. DEBT STATE (fetched in parallel above)
  let hasDebt: 'yes' | 'no' | 'unknown' = 'unknown';
  let debtTotal: number | null = null;
  if (debtDataParallel) {
    if (debtDataParallel.length > 0) {
      hasDebt = 'yes';
      debtTotal = debtDataParallel.reduce((sum: number, d: any) => sum + (Number(d.balance) || 0), 0);
    } else {
      hasDebt = 'no';
    }
  }

  // 8. GOALS STATE (fetched in parallel above)
  let hasGoals: 'yes' | 'no' | 'unknown' = 'unknown';
  let activeGoalCount: number | null = null;
  if (goalsDataParallel) {
    activeGoalCount = goalsDataParallel.length;
    hasGoals = activeGoalCount > 0 ? 'yes' : 'no';
  }
  
  // 9. STRESS SIGNALS (simple heuristics)
  const stressSignals: StressSignal[] = [];
  
  // High uncategorized (>20% uncategorized)
  const uncategorizedRatio = transactionCount > 0 
    ? uncategorizedCount / transactionCount 
    : 0;
  if (uncategorizedRatio > 0.2 && transactionCount > 10) {
    stressSignals.push({
      type: 'high_uncategorized',
      severity: uncategorizedRatio > 0.5 ? 'high' : 'medium',
      message: `${Math.round(uncategorizedRatio * 100)}% of transactions are uncategorized`,
      suggestedAction: 'Categorize transactions to get better insights',
    });
  }
  
  // Negative cashflow
  if (netCashflow < 0 && monthlyIncome > 0) {
    stressSignals.push({
      type: 'negative_cashflow',
      severity: Math.abs(netCashflow) > monthlyIncome * 0.2 ? 'high' : 'medium',
      message: `Spending exceeds income by ${Math.abs(netCashflow).toFixed(2)} this month`,
      suggestedAction: 'Review spending patterns or set a budget',
    });
  }
  
  // Missing categories (no categories used)
  if (categoryCount === 0 && transactionCount > 5) {
    stressSignals.push({
      type: 'missing_categories',
      severity: 'medium',
      message: 'No categories assigned to transactions',
      suggestedAction: 'Set up categories to organize your expenses',
    });
  }
  
  const snapshot: FinancialSnapshot = {
    hasTransactions,
    transactionCount,
    uncategorizedCount,
    categorizedCount,
    categoryCount,
    monthlySpend: monthlyExpenses,
    monthlyIncome,
    netCashflow,
    topCategories,
    topMerchants,
    firstTransactionDate,
    lastTransactionDate,
    hasDebt,
    debtTotal,
    hasGoals,
    activeGoalCount,
    stressSignals,
    dataComplete,
  };

  return snapshot;
}

/**
 * Financial Snapshot Builder
 * 
 * Builds a normalized financial snapshot that Prime reasons over.
 * Simple rules only (no ML).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
// Type imports (TypeScript types)
type FinancialSnapshot = import('../../../src/types/prime-state').FinancialSnapshot;
type StressSignal = import('../../../src/types/prime-state').StressSignal;

/**
 * Build financial snapshot for a user
 * 
 * @param supabase - Supabase client (service role)
 * @param userId - User ID
 * @returns FinancialSnapshot
 */
export async function buildFinancialSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialSnapshot> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // 1. BASIC FLAGS - Fetch all transactions
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('id, date, amount, category, merchant, type')
    .eq('user_id', userId);
  
  if (txError) {
    console.warn('[buildFinancialSnapshot] Error fetching transactions:', txError);
  }
  
  const transactions = allTransactions || [];
  const hasTransactions = transactions.length > 0;
  const transactionCount = transactions.length;
  
  // 2. CATEGORIZATION STATE
  const uncategorizedTransactions = transactions.filter(
    t => !t.category || t.category === 'Uncategorized'
  );
  const uncategorizedCount = uncategorizedTransactions.length;
  const categorizedCount = transactionCount - uncategorizedCount;
  
  const uniqueCategories = new Set(
    transactions.map(t => t.category).filter(Boolean)
  );
  const categoryCount = uniqueCategories.size;
  
  // 3. MONTHLY SPENDING
  const currentMonthTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const txDate = new Date(t.date);
    return txDate >= currentMonthStart && txDate <= currentMonthEnd;
  });
  
  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income' || (t.type === null && t.amount > 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const netCashflow = monthlyIncome - monthlyExpenses;
  
  // 4. TOP CATEGORIES (current month expenses)
  const categoryMap = new Map<string, { total: number; count: number }>();
  currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .forEach(t => {
      const cat = t.category || 'Uncategorized';
      const existing = categoryMap.get(cat) || { total: 0, count: 0 };
      categoryMap.set(cat, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    });
  
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      totalAmount: stats.total,
      transactionCount: stats.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
  
  // 5. TOP MERCHANTS (current month expenses)
  const merchantMap = new Map<string, { total: number; count: number }>();
  currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .forEach(t => {
      const merchant = t.merchant || 'Unknown';
      const existing = merchantMap.get(merchant) || { total: 0, count: 0 };
      merchantMap.set(merchant, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    });
  
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, stats]) => ({
      merchant,
      totalAmount: stats.total,
      transactionCount: stats.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
  
  // 6. DATE RANGES
  const dates = transactions.map(t => t.date).filter(Boolean).sort();
  const firstTransactionDate = dates.length > 0 ? dates[0] : null;
  const lastTransactionDate = dates.length > 0 ? dates[dates.length - 1] : null;
  
  // 7. DEBT STATE (if debt table exists)
  let hasDebt: 'yes' | 'no' | 'unknown' = 'unknown';
  let debtTotal: number | null = null;
  
  try {
    const { data: debtData, error: debtError } = await supabase
      .from('debt')
      .select('balance')
      .eq('user_id', userId);
    
    if (!debtError && debtData) {
      if (debtData.length > 0) {
        hasDebt = 'yes';
        debtTotal = debtData.reduce((sum, d) => sum + (Number(d.balance) || 0), 0);
      } else {
        hasDebt = 'no';
      }
    }
  } catch (error: any) {
    // Table doesn't exist or error - gracefully handle
    if (error.code !== '42P01') { // 42P01 = table doesn't exist
      console.warn('[buildFinancialSnapshot] Error checking debt:', error);
    }
    hasDebt = 'unknown';
  }
  
  // 8. GOALS STATE (if goals table exists)
  let hasGoals: 'yes' | 'no' | 'unknown' = 'unknown';
  let activeGoalCount: number | null = null;
  
  try {
    const { data: goalsData, error: goalsError } = await supabase
      .from('goals')
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (!goalsError && goalsData) {
      activeGoalCount = goalsData.length;
      hasGoals = activeGoalCount > 0 ? 'yes' : 'no';
    }
  } catch (error: any) {
    // Table doesn't exist or error - gracefully handle
    if (error.code !== '42P01') { // 42P01 = table doesn't exist
      console.warn('[buildFinancialSnapshot] Error checking goals:', error);
    }
    hasGoals = 'unknown';
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
  
  return {
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
  };
}


/**
 * Smart Categories Summarizer
 * Groups transactions by category and computes totals, counts, and trends
 */

import { supabase } from './supabase';
import type { Transaction } from '../types/transactions';

export interface CategorySummary {
  category: string;
  totalAmount: number;
  transactionCount: number;
  avgAmount: number;
  trendDirection: 'up' | 'down' | 'flat';
  trendPercent: number;
}

export interface PeriodSummary {
  period: {
    start: string;
    end: string;
    label: string;
  };
  categories: CategorySummary[];
  totalExpenses: number;
  totalIncome: number;
  totalTransactions: number;
}

const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

/**
 * Get date range for a period
 */
function getPeriodDates(period: 'this-month' | 'last-month' | 'this-year'): { start: string; end: string; label: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === 'this-month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: 'This Month'
    };
  }

  if (period === 'last-month') {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: 'Last Month'
    };
  }

  // this-year
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: 'This Year'
  };
}

/**
 * Get previous period dates for trend comparison
 */
function getPreviousPeriodDates(period: 'this-month' | 'last-month' | 'this-year'): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  if (period === 'this-month') {
    // Previous month
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  if (period === 'last-month') {
    // Two months ago
    const start = new Date(year, month - 2, 1);
    const end = new Date(year, month - 1, 0, 23, 59, 59, 999);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  // Previous year
  const start = new Date(year - 1, 0, 1);
  const end = new Date(year - 1, 11, 31, 23, 59, 59, 999);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
}

/**
 * Summarize transactions by category for a given period
 */
export async function summarizeCategoriesByPeriod(
  period: 'this-month' | 'last-month' | 'this-year' = 'this-month',
  userId: string = TEST_USER_ID
): Promise<PeriodSummary> {
  if (!supabase) {
    throw new Error('Supabase client not available');
  }

  const { start, end, label } = getPeriodDates(period);
  const prevPeriod = getPreviousPeriodDates(period);

  // Fetch current period transactions (expenses only for now)
  // Filter by date field (fallback to posted_at if date is null)
  const { data: currentTransactions, error: currentError } = await supabase
    .from('transactions')
    .select('id, amount, category, type, date, posted_at')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: false });

  if (currentError) {
    throw new Error(`Failed to fetch current period transactions: ${currentError.message}`);
  }

  // Fetch previous period transactions for trend comparison
  const { data: previousTransactions, error: prevError } = await supabase
    .from('transactions')
    .select('id, amount, category, type, date, posted_at')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', prevPeriod.start)
    .lte('date', prevPeriod.end);

  if (prevError) {
    console.warn('Failed to fetch previous period transactions for trends:', prevError);
  }

  // Group current period by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  const allCategories = new Set<string>();

  (currentTransactions || []).forEach((tx) => {
    const category = tx.category || 'Uncategorized';
    allCategories.add(category);
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + Math.abs(Number(tx.amount) || 0),
      count: existing.count + 1
    });
  });

  // Group previous period by category for trends
  const prevCategoryMap = new Map<string, { total: number; count: number }>();
  (previousTransactions || []).forEach((tx) => {
    const category = tx.category || 'Uncategorized';
    const existing = prevCategoryMap.get(category) || { total: 0, count: 0 };
    prevCategoryMap.set(category, {
      total: existing.total + Math.abs(Number(tx.amount) || 0),
      count: existing.count + 1
    });
  });

  // Build category summaries with trends
  const categories: CategorySummary[] = Array.from(allCategories)
    .map((category) => {
      const current = categoryMap.get(category) || { total: 0, count: 0 };
      const previous = prevCategoryMap.get(category) || { total: 0, count: 0 };

      const avgAmount = current.count > 0 ? current.total / current.count : 0;

      // Calculate trend
      let trendDirection: 'up' | 'down' | 'flat' = 'flat';
      let trendPercent = 0;

      if (previous.total > 0) {
        const change = ((current.total - previous.total) / previous.total) * 100;
        trendPercent = Math.round(change * 10) / 10; // Round to 1 decimal
        if (Math.abs(trendPercent) < 1) {
          trendDirection = 'flat';
        } else if (trendPercent > 0) {
          trendDirection = 'up';
        } else {
          trendDirection = 'down';
        }
      } else if (current.total > 0) {
        // New category this period
        trendDirection = 'up';
        trendPercent = 100;
      }

      return {
        category,
        totalAmount: current.total,
        transactionCount: current.count,
        avgAmount,
        trendDirection,
        trendPercent: Math.abs(trendPercent)
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount); // Sort by total descending

  // Calculate totals
  const totalExpenses = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.total, 0);
  const totalTransactions = (currentTransactions || []).length;

  // Fetch income separately if needed
  const { data: incomeTransactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('date', start)
    .lte('date', end);

  const totalIncome = (incomeTransactions || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);

  return {
    period: { start, end, label },
    categories,
    totalExpenses,
    totalIncome,
    totalTransactions
  };
}


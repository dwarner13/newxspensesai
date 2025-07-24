import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

export async function generateMonthlySummary(userId?: string): Promise<Array<{
  month: string;
  totalIncome: number;
  totalExpenses: number;
  net: number;
}>> {
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');
      userId = user.id;
    }

    // Fetch all transactions for the user
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('date, amount, type')
      .eq('user_id', userId);
    if (error) throw error;
    if (!transactions || transactions.length === 0) return [];

    // Group by year-month
    const summaryMap: Record<string, { income: number; expenses: number }> = {};
    for (const tx of transactions) {
      const month = dayjs(tx.date).format('YYYY-MM');
      if (!summaryMap[month]) {
        summaryMap[month] = { income: 0, expenses: 0 };
      }
      if (tx.type && tx.type.toLowerCase() === 'income') {
        summaryMap[month].income += Number(tx.amount);
      } else if (tx.type && tx.type.toLowerCase() === 'expense') {
        summaryMap[month].expenses += Number(tx.amount);
      }
    }

    // Build summary array
    const summary = Object.entries(summaryMap).map(([month, { income, expenses }]) => ({
      month,
      totalIncome: income,
      totalExpenses: expenses,
      net: income - expenses
    }));

    // Sort by month descending
    summary.sort((a, b) => b.month.localeCompare(a.month));

    return summary;
  } catch (error) {
    console.error('Error generating monthly summary:', error);
    return [];
  }
} 
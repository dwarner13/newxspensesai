import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'transaction_category_totals';

export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format
  endDate: z.string().optional(), // YYYY-MM-DD format
  type: z.enum(['expense', 'income', 'all']).optional().default('all'),
});

export const outputSchema = z.object({
  categoryTotals: z.array(z.object({
    category: z.string().nullable(),
    totalAmount: z.number(),
    transactionCount: z.number(),
    avgAmount: z.number(),
  })),
  grandTotal: z.number(),
  dateRange: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get transaction totals grouped by category
 * 
 * Use this when Finley needs category-level spending summaries for forecasts
 * or pattern analysis.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    // Build query
    let query = supabase
      .from('transactions')
      .select('category, amount, date, type')
      .eq('user_id', userId);

    // Apply filters
    if (input.startDate) {
      query = query.gte('date', input.startDate);
    }
    if (input.endDate) {
      query = query.lte('date', input.endDate);
    }
    if (input.type !== 'all') {
      query = query.eq('type', input.type);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    const txns = transactions || [];

    // Group by category
    const categoryMap = new Map<string, { total: number; count: number }>();

    txns.forEach(t => {
      const category = t.category || 'Uncategorized';
      const amount = Math.abs(t.amount);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { total: 0, count: 0 });
      }
      
      const entry = categoryMap.get(category)!;
      entry.total += amount;
      entry.count += 1;
    });

    // Convert to array and calculate averages
    const categoryTotals = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category: category === 'Uncategorized' ? null : category,
        totalAmount: stats.total,
        transactionCount: stats.count,
        avgAmount: stats.count > 0 ? stats.total / stats.count : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get date range
    const dates = txns.map(t => t.date).filter(Boolean).sort();
    const dateRange = {
      start: dates.length > 0 ? dates[0] : null,
      end: dates.length > 0 ? dates[dates.length - 1] : null,
    };

    const grandTotal = categoryTotals.reduce((sum, c) => sum + c.totalAmount, 0);

    return Ok({
      categoryTotals,
      grandTotal,
      dateRange,
    });
  } catch (error) {
    console.error('[transaction_category_totals] Error:', error);
    return Err(error as Error);
  }
}







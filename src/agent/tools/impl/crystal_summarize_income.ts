import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'crystal_summarize_income';

export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format
  endDate: z.string().optional(), // YYYY-MM-DD format
});

export const outputSchema = z.object({
  total: z.number(),
  count: z.number(),
  average: z.number(),
  topMerchants: z.array(z.object({
    merchant: z.string(),
    total: z.number(),
    count: z.number(),
  })),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Summarize income transactions
 * 
 * Provides clean financial summary of income: total, count, average, top merchants.
 * Use this when users ask about income totals, income breakdowns, or income summaries.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Crystal Summarize Income] Executing for userId: ${userId}`);
    }

    const supabase = getSupabaseServerClient();

    // Build query for income transactions
    let query = supabase
      .from('transactions')
      .select('amount, merchant')
      .eq('user_id', userId)
      .eq('type', 'income');

    // Apply date filters if provided
    if (input.startDate) {
      query = query.gte('date', input.startDate);
    }
    if (input.endDate) {
      query = query.lte('date', input.endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[Crystal Summarize Income] Query error:', error);
      return Err(new Error(`Failed to query income transactions: ${error.message}`));
    }

    // Log query results (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Crystal Summarize Income] Found ${transactions?.length || 0} income transactions`);
    }

    const txns = transactions || [];

    // Handle empty case
    if (txns.length === 0) {
      return Ok({
        total: 0,
        count: 0,
        average: 0,
        topMerchants: [],
      });
    }

    // Calculate totals
    const total = txns.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const count = txns.length;
    const average = count > 0 ? total / count : 0;

    // Group by merchant and calculate totals
    const merchantMap = new Map<string, { total: number; count: number }>();

    txns.forEach(t => {
      const merchant = t.merchant || 'Unknown';
      const amount = Math.abs(t.amount || 0);

      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, { total: 0, count: 0 });
      }

      const entry = merchantMap.get(merchant)!;
      entry.total += amount;
      entry.count += 1;
    });

    // Convert to array and sort by total descending
    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, stats]) => ({
        merchant,
        total: stats.total,
        count: stats.count,
      }))
      .sort((a, b) => b.total - a.total);

    return Ok({
      total: Math.round(total * 100) / 100, // Round to 2 decimals
      count,
      average: Math.round(average * 100) / 100,
      topMerchants,
    });
  } catch (error) {
    console.error('[Crystal Summarize Income] Error:', error);
    return Err(error as Error);
  }
}







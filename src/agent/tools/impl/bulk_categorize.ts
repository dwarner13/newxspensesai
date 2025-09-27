import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'bulk_categorize';

export const inputSchema = z.object({
  category: z.string(),
  vendorPattern: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  updated: z.number(),
  transactions: z.array(z.object({
    id: z.string(),
    vendor: z.string(),
    amount: z.number(),
    date: z.string(),
  })),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { category, vendorPattern, dateRange, confirm } = input;
    
    if (!confirm) {
      return Ok({
        ok: false,
        updated: 0,
        transactions: [],
      });
    }
    
    const client = getSupabaseServerClient();
    
    // Build query
    let query = client
      .from('transactions')
      .select('id, vendor, amount, date, category')
      .eq('user_id', ctx.userId)
      .is('category', null); // Only uncategorized transactions
    
    if (vendorPattern) {
      query = query.ilike('vendor', `%${vendorPattern}%`);
    }
    
    if (dateRange) {
      query = query
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }
    
    const { data: transactions, error } = await query;
    
    if (error) throw error;
    
    if (!transactions || transactions.length === 0) {
      return Ok({
        ok: true,
        updated: 0,
        transactions: [],
      });
    }
    
    // Update transactions
    const transactionIds = transactions.map(tx => tx.id);
    
    const { error: updateError } = await client
      .from('transactions')
      .update({ 
        category,
        auto_category: category,
        confidence: 0.9,
        updated_at: new Date().toISOString(),
      })
      .in('id', transactionIds);
    
    if (updateError) throw updateError;
    
    // Update analytics cache
    await updateAnalyticsCache(ctx.userId, transactions, category);
    
    return Ok({
      ok: true,
      updated: transactions.length,
      transactions: transactions.map(tx => ({
        id: tx.id,
        vendor: tx.vendor,
        amount: tx.amount,
        date: tx.date,
      })),
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

async function updateAnalyticsCache(
  userId: string, 
  transactions: any[], 
  category: string
): Promise<void> {
  const client = getSupabaseServerClient();
  
  // Group by month
  const groups = new Map<string, { amount: number; count: number }>();
  
  for (const tx of transactions) {
    const month = tx.date.substring(0, 7); // YYYY-MM
    const existing = groups.get(month) || { amount: 0, count: 0 };
    groups.set(month, {
      amount: existing.amount + tx.amount,
      count: existing.count + 1,
    });
  }
  
  // Update cache for each month
  for (const [period, data] of groups) {
    await client
      .from('analytics_cache')
      .upsert({
        user_id: userId,
        period,
        category,
        total_amount: data.amount,
        transaction_count: data.count,
        avg_amount: data.amount / data.count,
      }, {
        onConflict: 'user_id,period,category',
      });
  }
}

export const metadata = {
  name: 'Bulk Categorization',
  description: 'Bulk categorize transactions by vendor pattern or date range',
  requiresConfirm: true,
  mutates: true,
  dangerous: false,
  category: 'data_management',
};

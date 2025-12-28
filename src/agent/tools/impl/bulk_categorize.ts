import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'bulk_categorize';

// Safety limit: Maximum number of transactions that can be bulk categorized in a single operation
const MAX_BULK_CATEGORIZE_TRANSACTIONS = 50;

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
  // Optional fields for error responses
  reason: z.string().optional(),
  count: z.number().optional(),
  maxAllowed: z.number().optional(),
  message: z.string().optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { category, vendorPattern, dateRange, confirm } = input;
    
    console.log(`[bulk_categorize] Starting execution for user ${ctx.userId}`, {
      category,
      vendorPattern,
      dateRange,
      confirm,
    });
    
    if (!confirm) {
      console.log(`[bulk_categorize] Execution skipped - no confirmation provided`);
      return Ok({
        ok: false,
        updated: 0,
        transactions: [],
        message: 'Confirmation required to proceed with bulk categorization.',
      });
    }
    
    const client = getSupabaseServerClient();
    
    // Build count query first to check safety limit
    let countQuery = client
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .is('category', null); // Only uncategorized transactions
    
    if (vendorPattern) {
      countQuery = countQuery.ilike('vendor', `%${vendorPattern}%`);
    }
    
    if (dateRange) {
      countQuery = countQuery
        .gte('date', dateRange.start)
        .lte('date', dateRange.end);
    }
    
    // Check transaction count before proceeding
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error(`[bulk_categorize] Failed to check transaction count:`, countError);
      return Err(new Error(`Failed to check transaction count: ${countError.message}`));
    }
    
    const transactionCount = count || 0;
    console.log(`[bulk_categorize] Found ${transactionCount} transactions matching filters`);
    
    // Safety check: Enforce maximum limit
    if (transactionCount > MAX_BULK_CATEGORIZE_TRANSACTIONS) {
      const errorMessage = `This action would affect ${transactionCount} transactions, which is above the safety limit of ${MAX_BULK_CATEGORIZE_TRANSACTIONS}. Please narrow your filters and try again.`;
      console.warn(`[bulk_categorize] Safety limit exceeded: ${transactionCount} > ${MAX_BULK_CATEGORIZE_TRANSACTIONS}`);
      
      // Return structured error response (serializable, not Err)
      return Ok({
        ok: false,
        updated: 0,
        transactions: [],
        reason: 'too_many_transactions',
        count: transactionCount,
        maxAllowed: MAX_BULK_CATEGORIZE_TRANSACTIONS,
        message: errorMessage,
      });
    }
    
    if (transactionCount === 0) {
      console.log(`[bulk_categorize] No transactions found matching filters`);
      return Ok({
        ok: true,
        updated: 0,
        transactions: [],
        message: 'No transactions found matching the specified filters.',
      });
    }
    
    // Build full query to get transaction details (now safe to proceed)
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
    
    if (error) {
      console.error(`[bulk_categorize] Failed to fetch transactions:`, error);
      throw error;
    }
    
    if (!transactions || transactions.length === 0) {
      console.log(`[bulk_categorize] No transactions returned from query`);
      return Ok({
        ok: true,
        updated: 0,
        transactions: [],
        message: 'No transactions found matching the specified filters.',
      });
    }
    
    console.log(`[bulk_categorize] Updating ${transactions.length} transactions to category: ${category}`);
    
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
    
    if (updateError) {
      console.error(`[bulk_categorize] Failed to update transactions:`, updateError);
      throw updateError;
    }
    
    // Update analytics cache (non-blocking, errors are logged but don't fail the operation)
    try {
      await updateAnalyticsCache(ctx.userId, transactions, category);
      console.log(`[bulk_categorize] Analytics cache updated successfully`);
    } catch (cacheError) {
      console.warn(`[bulk_categorize] Failed to update analytics cache (non-critical):`, cacheError);
    }
    
    const updatedCount = transactions.length;
    console.log(`[bulk_categorize] Successfully updated ${updatedCount} transactions`);
    
    return Ok({
      ok: true,
      updated: updatedCount,
      transactions: transactions.map(tx => ({
        id: tx.id,
        vendor: tx.vendor,
        amount: tx.amount,
        date: tx.date,
      })),
      message: `Successfully updated ${updatedCount} transaction${updatedCount === 1 ? '' : 's'}.`,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[bulk_categorize] Unexpected error:`, error);
    
    // Return structured error response (serializable)
    return Ok({
      ok: false,
      updated: 0,
      transactions: [],
      reason: 'execution_error',
      message: `An error occurred while processing bulk categorization: ${errorMessage}`,
    });
  }
}

async function updateAnalyticsCache(
  userId: string, 
  transactions: any[], 
  category: string
): Promise<void> {
  try {
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
      const { error } = await client
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
      
      if (error) {
        console.warn(`[bulk_categorize] Failed to update analytics cache for period ${period}:`, error);
      }
    }
  } catch (error) {
    console.warn(`[bulk_categorize] Error updating analytics cache:`, error);
    throw error; // Re-throw to be caught by caller
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

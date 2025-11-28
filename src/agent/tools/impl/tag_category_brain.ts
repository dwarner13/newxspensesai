import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'tag_category_brain';

export const inputSchema = z.object({
  category: z.string().min(1, 'Category name is required'),
  timeframe: z.enum(['all', 'last_30_days', 'this_month', 'last_month']).optional().default('all'),
});

export const outputSchema = z.object({
  category: z.string(),
  timeframe: z.string(),
  totalTransactions: z.number(),
  totalSpent: z.number(),
  totalIncome: z.number(),
  avgTransactionAmount: z.number(),
  firstSeenAt: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
  topMerchants: z.array(z.object({
    name: z.string(),
    count: z.number(),
    totalAmount: z.number(),
  })),
  aiConfidenceSummary: z.object({
    avgConfidence: z.number().nullable(),
    aiCount: z.number(),
    learnedCount: z.number(),
  }),
  notes: z.array(z.string()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get Tag's aggregated intelligence for a category
 * 
 * Provides comprehensive stats, top merchants, confidence metrics, and insights
 * for a specific spending category. Use this when users ask about category-level
 * patterns, spending totals, or merchant distribution.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { category, timeframe } = input;
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Tag Category Brain] Executing for category: "${category}", timeframe: "${timeframe}", userId: ${userId}`);
    }

    const supabase = getSupabaseServerClient();

    // Build date filter based on timeframe
    let dateFilter: { gte?: string; lte?: string } = {};
    const now = new Date();
    
    if (timeframe === 'last_30_days') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.gte = thirtyDaysAgo.toISOString().split('T')[0];
    } else if (timeframe === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter.gte = firstDay.toISOString().split('T')[0];
    } else if (timeframe === 'last_month') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      dateFilter.gte = firstDayLastMonth.toISOString().split('T')[0];
      dateFilter.lte = lastDayLastMonth.toISOString().split('T')[0];
    }

    // Query transactions for this category
    let query = supabase
      .from('transactions')
      .select('id, date, posted_at, amount, type, merchant, category_source, confidence')
      .eq('user_id', userId)
      .eq('category', category);

    // Apply date filter if needed
    // Note: We'll filter in memory if both posted_at and date exist, or use the simpler approach
    // For now, filter on posted_at (most common field) and handle date fallback in processing
    if (dateFilter.gte) {
      query = query.gte('posted_at', dateFilter.gte);
    }
    if (dateFilter.lte) {
      query = query.lte('posted_at', dateFilter.lte);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('[Tag Category Brain] Query error:', error);
      return Err(new Error(`Failed to query transactions: ${error.message}`));
    }

    // Log query results (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Tag Category Brain] Found ${transactions?.length || 0} transactions for category "${category}"`);
    }
    
    // If timeframe filter was applied but we got no results, try filtering on 'date' field as fallback
    let filteredTransactions = transactions || [];
    if (timeframe !== 'all' && filteredTransactions.length === 0 && transactions && transactions.length === 0) {
      // Retry with 'date' field instead (only if we got 0 results and timeframe is not 'all')
      let dateQuery = supabase
        .from('transactions')
        .select('id, date, posted_at, amount, type, merchant, category_source, confidence')
        .eq('user_id', userId)
        .eq('category', category);
      
      if (dateFilter.gte) {
        dateQuery = dateQuery.gte('date', dateFilter.gte);
      }
      if (dateFilter.lte) {
        dateQuery = dateQuery.lte('date', dateFilter.lte);
      }
      
      const { data: dateFiltered, error: dateError } = await dateQuery;
      if (!dateError && dateFiltered) {
        filteredTransactions = dateFiltered;
      }
    }

    // Use filtered transactions
    const finalTransactions = filteredTransactions;

    if (!finalTransactions || finalTransactions.length === 0) {
      // Return empty result with helpful notes
      return Ok({
        category,
        timeframe,
        totalTransactions: 0,
        totalSpent: 0,
        totalIncome: 0,
        avgTransactionAmount: 0,
        firstSeenAt: null,
        lastSeenAt: null,
        topMerchants: [],
        aiConfidenceSummary: {
          avgConfidence: null,
          aiCount: 0,
          learnedCount: 0,
        },
        notes: [
          `No transactions found in "${category}" category${timeframe !== 'all' ? ` for ${timeframe}` : ''}.`,
          `This category might be new or the timeframe filter excluded all transactions.`,
        ],
      });
    }

    // Calculate aggregates
    const totalTransactions = finalTransactions.length;
    
    // Separate income and expenses
    const expenses = finalTransactions.filter(tx => {
      const type = tx.type?.toLowerCase();
      return type === 'expense' || type === 'debit' || (typeof tx.amount === 'number' && tx.amount < 0);
    });
    const incomes = finalTransactions.filter(tx => {
      const type = tx.type?.toLowerCase();
      return type === 'income' || type === 'credit' || (typeof tx.amount === 'number' && tx.amount > 0);
    });

    // Calculate totals (use absolute values for expenses)
    const totalSpent = Math.abs(expenses.reduce((sum, tx) => sum + (Math.abs(Number(tx.amount)) || 0), 0));
    const totalIncome = incomes.reduce((sum, tx) => sum + (Math.abs(Number(tx.amount)) || 0), 0);
    
    // Average transaction amount (absolute values)
    const allAmounts = finalTransactions.map(tx => Math.abs(Number(tx.amount)) || 0);
    const avgTransactionAmount = allAmounts.length > 0
      ? allAmounts.reduce((sum, amt) => sum + amt, 0) / allAmounts.length
      : 0;

    // Find date range (handle null/undefined dates safely)
    const dates = finalTransactions
      .map(tx => tx.posted_at || tx.date)
      .filter((d): d is string => !!d && typeof d === 'string')
      .sort();
    
    const firstSeenAt = dates.length > 0 ? dates[0] : null;
    const lastSeenAt = dates.length > 0 ? dates[dates.length - 1] : null;

    // Top merchants (group by merchant name)
    const merchantMap = new Map<string, { count: number; totalAmount: number }>();
    
    finalTransactions.forEach(tx => {
      const merchant = tx.merchant || 'Unknown';
      const amount = Math.abs(Number(tx.amount)) || 0;
      
      if (!merchantMap.has(merchant)) {
        merchantMap.set(merchant, { count: 0, totalAmount: 0 });
      }
      
      const entry = merchantMap.get(merchant)!;
      entry.count++;
      entry.totalAmount += amount;
    });

    // Sort merchants by count, then by total amount
    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.totalAmount - a.totalAmount;
      })
      .slice(0, 10); // Top 10 merchants

    // AI confidence summary
    const aiTransactions = finalTransactions.filter(tx => tx.category_source === 'ai');
    const learnedTransactions = finalTransactions.filter(tx => tx.category_source === 'learned');
    
    const confidences = finalTransactions
      .map(tx => tx.confidence)
      .filter((conf): conf is number => conf !== null && conf !== undefined && typeof conf === 'number');
    
    const avgConfidence = confidences.length > 0
      ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      : null;

    // Generate insights/notes
    const notes: string[] = [];
    
    if (totalTransactions > 0) {
      const learnedPercent = Math.round((learnedTransactions.length / totalTransactions) * 100);
      const aiPercent = Math.round((aiTransactions.length / totalTransactions) * 100);
      
      if (learnedPercent >= 70) {
        notes.push(`Tag has learned ${learnedPercent}% of transactions in this category from your corrections - excellent learning!`);
      } else if (learnedPercent >= 50) {
        notes.push(`Tag has learned ${learnedPercent}% of transactions in this category. More corrections will help Tag learn faster.`);
      } else if (aiPercent >= 70) {
        notes.push(`Most transactions (${aiPercent}%) are AI-categorized. Consider correcting a few to help Tag learn your preferences.`);
      }
      
      if (avgConfidence !== null && avgConfidence < 0.7) {
        notes.push(`Average confidence is ${Math.round(avgConfidence * 100)}% - Tag could use more learning data for this category.`);
      } else if (avgConfidence !== null && avgConfidence >= 0.9) {
        notes.push(`High average confidence (${Math.round(avgConfidence * 100)}%) - Tag is very confident about this category.`);
      }
      
      if (topMerchants.length > 0) {
        const topMerchant = topMerchants[0];
        if (topMerchant.count >= totalTransactions * 0.5) {
          notes.push(`${topMerchant.name} dominates this category with ${topMerchant.count} transaction${topMerchant.count !== 1 ? 's' : ''} (${Math.round((topMerchant.count / totalTransactions) * 100)}%).`);
        }
      }
      
      if (totalSpent > 0 && totalTransactions > 0) {
        const avgSpent = totalSpent / totalTransactions;
        notes.push(`Average spending per transaction: $${avgSpent.toFixed(2)}`);
      }
    }

    return Ok({
      category,
      timeframe,
      totalTransactions,
      totalSpent,
      totalIncome,
      avgTransactionAmount,
      firstSeenAt,
      lastSeenAt,
      topMerchants,
      aiConfidenceSummary: {
        avgConfidence,
        aiCount: aiTransactions.length,
        learnedCount: learnedTransactions.length,
      },
      notes,
    });

  } catch (error) {
    console.error('[Tag Category Brain] Unexpected error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Category Brain',
  description: 'Get aggregated intelligence for a spending category including totals, top merchants, confidence metrics, and insights. Use this when users ask "what have you learned about this category?", "how much do I usually spend here?", "which merchants are most common?", or "is this category trending up or down?".',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};


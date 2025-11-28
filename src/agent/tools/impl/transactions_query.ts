import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'transactions_query';

export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format
  endDate: z.string().optional(), // YYYY-MM-DD format
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  type: z.enum(['expense', 'income', 'all']).optional().default('all'),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  merchant: z.string().optional(),
  limit: z.number().optional().default(100),
  offset: z.number().optional().default(0),
});

export const outputSchema = z.object({
  transactions: z.array(z.object({
    id: z.string(),
    date: z.string(),
    description: z.string().nullable(),
    merchant: z.string().nullable(),
    amount: z.number(),
    category: z.string().nullable(),
    type: z.string().nullable(),
  })),
  total: z.number(),
  summary: z.object({
    totalAmount: z.number(),
    totalExpenses: z.number(),
    totalIncome: z.number(),
    transactionCount: z.number(),
    dateRange: z.object({
      start: z.string().nullable(),
      end: z.string().nullable(),
    }),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Query transactions with flexible filters
 * 
 * Use this when Finley needs to analyze spending patterns, calculate totals,
 * or run projections based on actual transaction data.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    // Build query
    let query = supabase
      .from('transactions')
      .select('id, date, description, merchant, amount, category, type')
      .eq('user_id', userId);

    // Apply filters
    if (input.startDate) {
      query = query.gte('date', input.startDate);
    }
    if (input.endDate) {
      query = query.lte('date', input.endDate);
    }
    if (input.category) {
      query = query.eq('category', input.category);
    }
    if (input.categories && input.categories.length > 0) {
      query = query.in('category', input.categories);
    }
    if (input.type !== 'all') {
      query = query.eq('type', input.type);
    }
    if (input.minAmount !== undefined) {
      query = query.gte('amount', Math.abs(input.minAmount));
    }
    if (input.maxAmount !== undefined) {
      query = query.lte('amount', Math.abs(input.maxAmount));
    }
    if (input.merchant) {
      query = query.ilike('merchant', `%${input.merchant}%`);
    }

    // Order by date descending
    query = query.order('date', { ascending: false });

    // Apply pagination
    query = query.range(input.offset || 0, (input.offset || 0) + (input.limit || 100) - 1);

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    const txns = transactions || [];

    // Calculate summary
    const totalAmount = txns.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalExpenses = txns
      .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = txns
      .filter(t => t.type === 'income' || (t.type === null && t.amount > 0))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Get date range
    const dates = txns.map(t => t.date).filter(Boolean).sort();
    const dateRange = {
      start: dates.length > 0 ? dates[0] : null,
      end: dates.length > 0 ? dates[dates.length - 1] : null,
    };

    return Ok({
      transactions: txns.map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        merchant: t.merchant,
        amount: t.amount,
        category: t.category,
        type: t.type,
      })),
      total: txns.length,
      summary: {
        totalAmount,
        totalExpenses,
        totalIncome,
        transactionCount: txns.length,
        dateRange,
      },
    });
  } catch (error) {
    console.error('[transactions_query] Error:', error);
    return Err(error as Error);
  }
}







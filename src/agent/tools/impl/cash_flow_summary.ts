import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { isNonSpendCategory, isIncomeCashFlow } from '../../../shared/financial-taxonomy';

export const id = 'cash_flow_summary';

export const inputSchema = z.object({
  startDate: z.string(), // YYYY-MM-DD format
  endDate: z.string(),   // YYYY-MM-DD format
});

export const outputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  income: z.number(),
  spending: z.number(),
  nonSpend: z.number(),
  netCashFlow: z.number(),
  transactionCount: z.number(),
  incomeTransactionCount: z.number(),
  spendingTransactionCount: z.number(),
  nonSpendTransactionCount: z.number(),
  queryStatus: z.enum(['verified', 'verified_zero', 'query_error']),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * P3.2A — Cash Flow Summary
 *
 * Read-only, user-scoped financial evidence tool.
 * Returns income, spending, non-spend, and net cash flow for a date range.
 *
 * Classification semantics (canonical, from financial-taxonomy.ts):
 * - INCOME: isIncomeCashFlow() — type='income' OR type='Credit' OR category='Income'
 * - NON-SPEND: isNonSpendCategory() — transfers, loan/debt payments, investments
 * - SPENDING: everything else (not income, not non-spend)
 * - netCashFlow = income - spending
 *
 * Refund/credit note: Refunds are not reliably distinguishable from true income
 * in the current data model. A refund with type='Credit' will appear in the
 * income total. This matches the canonical financial-position.ts behavior.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, type, category')
      .eq('user_id', userId)
      .gte('date', input.startDate)
      .lte('date', input.endDate);

    if (error) {
      console.error('[cash_flow_summary] Query error:', error);
      return Ok({
        startDate: input.startDate,
        endDate: input.endDate,
        income: 0,
        spending: 0,
        nonSpend: 0,
        netCashFlow: 0,
        transactionCount: 0,
        incomeTransactionCount: 0,
        spendingTransactionCount: 0,
        nonSpendTransactionCount: 0,
        queryStatus: 'query_error' as const,
      });
    }

    const txns = transactions || [];

    if (txns.length === 0) {
      return Ok({
        startDate: input.startDate,
        endDate: input.endDate,
        income: 0,
        spending: 0,
        nonSpend: 0,
        netCashFlow: 0,
        transactionCount: 0,
        incomeTransactionCount: 0,
        spendingTransactionCount: 0,
        nonSpendTransactionCount: 0,
        queryStatus: 'verified_zero' as const,
      });
    }

    let income = 0;
    let spending = 0;
    let nonSpend = 0;
    let incomeCount = 0;
    let spendingCount = 0;
    let nonSpendCount = 0;

    for (const t of txns) {
      const amount = Math.abs(t.amount || 0);

      if (isIncomeCashFlow(t)) {
        income += amount;
        incomeCount++;
      } else if (isNonSpendCategory(t.category)) {
        nonSpend += amount;
        nonSpendCount++;
      } else {
        spending += amount;
        spendingCount++;
      }
    }

    return Ok({
      startDate: input.startDate,
      endDate: input.endDate,
      income: Math.round(income * 100) / 100,
      spending: Math.round(spending * 100) / 100,
      nonSpend: Math.round(nonSpend * 100) / 100,
      netCashFlow: Math.round((income - spending) * 100) / 100,
      transactionCount: txns.length,
      incomeTransactionCount: incomeCount,
      spendingTransactionCount: spendingCount,
      nonSpendTransactionCount: nonSpendCount,
      queryStatus: 'verified' as const,
    });
  } catch (error) {
    console.error('[cash_flow_summary] Error:', error);
    return Err(error as Error);
  }
}

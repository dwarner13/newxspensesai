import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { crystalSummary } from './_crystal-summary-engine';

export const id = 'crystal_summarize_expenses';

export const inputSchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD format
  endDate: z.string().optional(), // YYYY-MM-DD format
});

export const outputSchema = z.object({
  /** null when not every transaction could be read (never a partial total). */
  total: z.number().nullable(),
  count: z.number(),
  average: z.number().nullable(),
  topMerchants: z.array(z.object({
    merchant: z.string(),
    total: z.number(),
    count: z.number(),
  })),
  /** Money back on spending categories; never part of spending. */
  refunds: z.number().nullable(),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']),
  definition: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Summarize ACTUAL SPENDING from the shared engine (owner GO 2026-11-26; AR-1b FR-036).
 * Complete paged read; purpose 'spending' from classifyCashFlow (no transfers, cash withdrawals, debt
 * payments or savings); refunds separate; no totals when the read is incomplete.
 * Use when users ask about spending totals or breakdowns.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    return Ok(await crystalSummary(ctx.userId, input, 'spending'));
  } catch (error) {
    console.error('[Crystal Summarize Expenses] Error:', error);
    return Err(error as Error);
  }
}

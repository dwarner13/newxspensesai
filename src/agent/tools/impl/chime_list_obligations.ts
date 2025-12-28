import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'chime_list_obligations';

export const inputSchema = z.object({
  include_inactive: z.boolean().optional().default(false),
  category_filter: z.string().optional(),
});

export const outputSchema = z.object({
  obligations: z.array(z.object({
    merchant_name: z.string(),
    category: z.string().nullable(),
    average_amount: z.number(),
    frequency: z.string(),
    next_estimated_date: z.string().nullable(),
    confidence: z.number().optional(),
  })),
  total_count: z.number(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * List all recurring payment obligations for the user
 * 
 * Returns a clean list of detected recurring payments without sensitive data.
 * Use this when users ask about their recurring payments or want to see what
 * the system has detected.
 * 
 * Guardrails:
 * - All queries scoped by user_id
 * - No account numbers or sensitive IDs in response
 * - Merchant names sanitized (no PII)
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const { include_inactive, category_filter } = input;

    const supabase = getSupabaseServerClient();

    // Build query
    let query = supabase
      .from('recurring_obligations')
      .select('merchant_name, category, average_amount, avg_amount, frequency, next_estimated_date, confidence, is_active')
      .eq('user_id', userId)
      .order('next_estimated_date', { ascending: true, nullsLast: true });

    if (!include_inactive) {
      query = query.eq('is_active', true);
    }

    if (category_filter) {
      query = query.eq('category', category_filter);
    }

    const { data: obligations, error } = await query;

    if (error) {
      // If table doesn't exist, return empty list
      if (error.code === '42P01') {
        return Ok({
          obligations: [],
          total_count: 0,
        });
      }
      return Err(new Error(`Failed to query recurring obligations: ${error.message}`));
    }

    const obligationsList = obligations || [];

    // Map to clean output format (use average_amount or avg_amount for backward compatibility)
    const cleanObligations = obligationsList.map(ob => ({
      merchant_name: sanitizeMerchantName(ob.merchant_name),
      category: ob.category || null,
      average_amount: Number(ob.average_amount || ob.avg_amount || 0),
      frequency: ob.frequency,
      next_estimated_date: ob.next_estimated_date || null,
      confidence: ob.confidence ? Number(ob.confidence) : undefined,
    }));

    return Ok({
      obligations: cleanObligations,
      total_count: cleanObligations.length,
    });
  } catch (error) {
    console.error('[Chime List Obligations] Error:', error);
    return Err(error as Error);
  }
}

/**
 * Sanitize merchant name to remove any potential PII
 * For now, just return as-is, but this could be enhanced to mask account numbers
 */
function sanitizeMerchantName(merchantName: string): string {
  // Remove any potential account numbers (basic pattern)
  return merchantName
    .replace(/\d{4,}/g, (match) => {
      // If it looks like an account number (long sequence), mask it
      if (match.length >= 12) {
        return `****${match.slice(-4)}`;
      }
      return match;
    })
    .trim();
}

export const metadata = {
  name: 'Chime List Obligations',
  description: 'List all recurring payment obligations detected for the user. Returns merchant names, amounts, frequencies, and next estimated dates. Use when users ask "what recurring payments do I have?" or "show me my recurring bills".',
  requiresConfirmation: false,
  dangerous: false,
  category: 'notifications',
};




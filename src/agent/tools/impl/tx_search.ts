import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tx_search';

export const inputSchema = z.object({
  importId: z.string().optional(),
  documentId: z.string().optional(),
  q: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  uncategorizedOnly: z.boolean().optional(),
  includePending: z.boolean().optional(),
  limit: z.number().min(1).max(200).optional().default(25),
  /** P3.2B2C: Merchant display names to exclude via NOT ILIKE at DB level.
   *  Used internally by the merchant analysis bridge. Max 20. */
  excludeMerchants: z.array(z.string()).max(20).optional(),
  /** P3.2B2C parity: merchant-analysis scope mode (internal — used by the merchant
   *  analysis bridge). Returns the same row set merchant_totals aggregates. */
  merchantScope: z.object({
    merchantQuery: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    category: z.string().optional(),
    type: z.enum(['expense', 'income']).optional(),
    includeGroups: z.array(z.string()).max(50).optional(),
    excludeGroups: z.array(z.string()).max(50).optional(),
  }).optional(),
  /** P3.3C: Semantic purpose — model declares why it is calling tx_search.
   *  When transaction candidates already exist:
   *  - 'new_candidate_scope': user wants DIFFERENT transactions (replaces frame)
   *  - 'analytical_evidence': supporting data for analysis (preserves frame)
   *  Code-initiated searches set this directly. */
  purpose: z.enum(['new_candidate_scope', 'analytical_evidence'])
    .describe('Required when transaction candidates already exist. Use new_candidate_scope when the user asks about DIFFERENT transactions than currently shown. Use analytical_evidence when fetching supporting data for analysis of current candidates.')
    .optional(),
});

export const outputSchema = z.object({
  rows: z.array(z.object({
    id: z.string(),
    date: z.string().nullable().optional(),
    merchant: z.string().nullable().optional(),
    merchant_normalized: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    amount: z.number().optional(),
    signed_amount: z.number().optional(),
    possible_duplicate: z.boolean().optional(),
    duplicate_group_size: z.number().optional(),
    category: z.string().nullable().optional(),
    subcategory: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    import_id: z.string().nullable().optional(),
    document_id: z.string().nullable().optional(),
  })),
  totals: z.object({
    count: z.number(),
    sum: z.number(),
    income: z.number(),
    spending: z.number(),
  }),
  topSpendCategory: z.object({
    category: z.string(),
    amount: z.number(),
  }).nullable().optional(),
  queryStatus: z.enum([
    'verified', 'verified_zero', 'unresolved_category',
    'insufficient_scope', 'query_error',
  ]).optional(),
  resolvedCategory: z.object({
    category: z.string(),
    subcategory: z.string().optional(),
    section: z.string().optional(),
  }).nullable().optional(),
  pendingRows: z.array(z.object({
    id: z.string(),
    import_id: z.string().nullable().optional(),
    parsed_at: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    merchant: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    amount: z.number().optional(),
  })).optional().default([]),
  meta: z.object({
    usedFilters: z.record(z.any()),
  }).passthrough(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(
  input: Input,
  ctx: { userId: string; authHeader?: string; abortSignal?: AbortSignal }
): Promise<Result<Output>> {
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
    const authHeader = ctx.authHeader || '';

    if (!authHeader) {
      return Err(new Error('Missing auth header for tx_search'));
    }

    const res = await fetch(`${baseUrl}/.netlify/functions/tx-search`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader,
      },
      body: JSON.stringify(input),
      signal: ctx.abortSignal,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Err(new Error(payload?.error || `tx-search failed (${res.status})`));
    }

    return Ok(payload as Output);
  } catch (error) {
    return Err(error as Error);
  }
}


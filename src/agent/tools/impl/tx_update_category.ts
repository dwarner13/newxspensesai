import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tx_update_category';

export const inputSchema = z.object({
  id: z.string().min(1),
  table: z.enum(['transactions', 'transactions_staging']).optional().default('transactions'),
  category: z.string().min(1),
  subcategory: z.string().nullable().optional(),
  applyToVendor: z.boolean().optional(),
  vendor: z.string().nullable().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  updated: z.object({
    id: z.string(),
    table: z.enum(['transactions', 'transactions_staging']),
    category: z.string(),
    subcategory: z.string().nullable(),
  }),
  learned: z.object({
    applied: z.boolean(),
    method: z.string().optional(),
    vendor: z.string().nullable().optional(),
  }),
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
      return Err(new Error('Missing auth header for tx_update_category'));
    }

    const res = await fetch(`${baseUrl}/.netlify/functions/tx-update-category`, {
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
      return Err(new Error(payload?.error || `tx-update-category failed (${res.status})`));
    }

    return Ok(payload as Output);
  } catch (error) {
    return Err(error as Error);
  }
}


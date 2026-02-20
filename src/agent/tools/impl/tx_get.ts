import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tx_get';

export const inputSchema = z.object({
  id: z.string().min(1),
  table: z.enum(['transactions', 'transactions_staging']).optional().default('transactions'),
});

export const outputSchema = z.object({
  row: z.object({
    id: z.string(),
    table: z.enum(['transactions', 'transactions_staging']),
    date: z.string().nullable().optional(),
    merchant: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    memo: z.string().nullable().optional(),
    amount: z.number().optional(),
    signed_amount: z.number().optional(),
    category: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    import_id: z.string().nullable().optional(),
    document_id: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
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
      return Err(new Error('Missing auth header for tx_get'));
    }

    const res = await fetch(`${baseUrl}/.netlify/functions/tx-get`, {
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
      return Err(new Error(payload?.error || `tx-get failed (${res.status})`));
    }

    return Ok(payload as Output);
  } catch (error) {
    return Err(error as Error);
  }
}


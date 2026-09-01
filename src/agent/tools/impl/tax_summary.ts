import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';

export const id = 'tax_summary';

export const inputSchema = z.object({
  year: z.number().int().min(2020).max(2030).optional(),
});

const bucketSchema = z.object({
  label: z.string(),
  total: z.number(),
  count: z.number(),
});

const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  total: z.number(),
  count: z.number(),
  buckets: z.array(bucketSchema),
});

export const outputSchema = z.object({
  year: z.number(),
  sections: z.array(sectionSchema),
  grandTotal: z.number(),
  transactionCount: z.number(),
  queryStatus: z.enum([
    'verified', 'verified_zero', 'query_error',
  ]),
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
      return Err(new Error('Missing auth header for tax_summary'));
    }

    const res = await fetch(`${baseUrl}/.netlify/functions/tax-summary`, {
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
      return Err(new Error(payload?.error || `tax-summary failed (${res.status})`));
    }

    return Ok(payload as Output);
  } catch (error) {
    return Err(error as Error);
  }
}

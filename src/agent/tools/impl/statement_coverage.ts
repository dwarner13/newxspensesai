/**
 * L-B — statement_coverage: read-only inventory of the customer's imported statements.
 * Identity is ctx.userId only (server-verified). No writes. Logs carry counts and status only.
 */

import { z } from 'zod';
import { Result, Ok } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { loadStatementCoverage, type CoverageDbClient } from '../../../shared/statement-coverage';

export const id = 'statement_coverage';

export const inputSchema = z.object({}).strict();

const record = z.object({
  institution: z.string().nullable(),
  accountLast4: z.string().nullable(),
  statementType: z.enum(['bank', 'credit_card', 'unknown']),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  uploadedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  state: z.enum(['completed', 'awaiting_review', 'in_progress', 'failed', 'unknown']),
  fileName: z.string().nullable(),
  metadataMissing: z.boolean(),
});

export const outputSchema = z.object({
  status: z.enum(['ok', 'no_statements', 'query_error']),
  lastUploadAttempt: record.nullable(),
  lastCompletedImport: record.nullable(),
  statusCounts: z.object({ completed: z.number(), awaiting_review: z.number(), in_progress: z.number(), failed: z.number(), unknown: z.number() }),
  accounts: z.array(z.object({
    institution: z.string().nullable(),
    accountLast4: z.string().nullable(),
    label: z.string(),
    statementCount: z.number(),
    earliestPeriodStart: z.string().nullable(),
    latestPeriodEnd: z.string().nullable(),
    gaps: z.array(z.object({ from: z.string(), to: z.string() })),
  })),
  completedWithoutPeriod: z.number(),
  limitations: z.array(z.string()),
  readOnly: z.literal(true),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(_input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  const sb = getSupabaseServerClient() as unknown as CoverageDbClient;
  const result = await loadStatementCoverage(sb, ctx.userId);
  console.log(`[statement_coverage] status=${result.status} accounts=${result.accounts.length} completed=${result.statusCounts.completed} pending=${result.statusCounts.awaiting_review + result.statusCounts.in_progress} failed=${result.statusCounts.failed}`);
  return Ok(result);
}

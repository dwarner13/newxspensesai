/**
 * Attachments D1 — tag_document_findings: read-only Prime → Tag consultation about documents the
 * customer attached in THIS conversation (COLLAB-2a pattern).
 *
 * Identity is ctx.userId only (server-verified); the session is ctx.sessionId. Document scope is
 * the session's own attachments, re-checked every call. Returns masked excerpts with real page
 * labels, unverified document findings, and committed-record matches (amount + date) with shared
 * provenance classes. No writes of any kind. Logs carry counts and status only.
 */
import { z } from 'zod';
import { Result, Ok } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { getTagDocumentFindings } from '../../../../netlify/functions/_shared/tagDocumentFindings';

export const id = 'tag_document_findings';

export const inputSchema = z.object({
  /** Optional: specific documents attached in this conversation. Others are ignored. */
  documentIds: z.array(z.string().uuid()).max(10).optional(),
  /** Optional: what the customer asked, used only to pick relevant pages. */
  question: z.string().max(500).optional(),
}).strict();

const provenance = z.enum(['verified_customer', 'protected_unverified', 'automatic', 'needs_review', 'unknown']);

export const outputSchema = z.object({
  status: z.enum(['ok', 'partial_extraction', 'no_amount_lines', 'document_not_ready', 'document_unavailable', 'no_documents_in_conversation', 'query_error']),
  documents: z.array(z.object({
    documentId: z.string(),
    name: z.string(),
    pagesTotal: z.number().nullable(),
    pagesIncluded: z.array(z.number()),
    paged: z.boolean(),
    partial: z.boolean(),
    alreadyImported: z.boolean(),
  })),
  excerpts: z.string().nullable(),
  documentFindings: z.array(z.object({
    documentId: z.string(),
    page: z.number().nullable(),
    text: z.string(),
    amount: z.number(),
    date: z.string().nullable(),
  })),
  verifiedRecords: z.array(z.object({
    documentId: z.string(),
    page: z.number().nullable(),
    amount: z.number(),
    date: z.string().nullable(),
    matchesCommittedTransaction: z.boolean().nullable(),
    reason: z.enum(['matched', 'no_match', 'date_unavailable', 'lookup_unavailable']),
    committedCategory: z.string().nullable(),
    committedProvenance: provenance.nullable(),
  })),
  skipped: z.array(z.object({ documentId: z.string(), reason: z.string() })),
  caveats: z.array(z.string()),
  readOnly: z.literal(true),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string; sessionId?: string }): Promise<Result<Output>> {
  const sb = getSupabaseServerClient();
  const result = await getTagDocumentFindings(sb, ctx.userId, ctx.sessionId ?? null, {
    documentIds: input.documentIds,
    question: input.question,
  });
  console.log('[tag_document_findings]', {
    status: result.status,
    documents: result.documents.length,
    findings: result.documentFindings.length,
    matched: result.verifiedRecords.filter((r) => r.matchesCommittedTransaction === true).length,
    skipped: result.skipped.length,
  });
  return Ok(result);
}

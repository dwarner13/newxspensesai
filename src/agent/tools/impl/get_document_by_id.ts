// @wiring:byte-docs
// @area:tools/get_document_by_id
// @purpose:Fetches a document record including stored ocr_text and parse status.

import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'get_document_by_id';

export const inputSchema = z.object({
  documentId: z.string().uuid('documentId must be a valid UUID'),
});

export const outputSchema = z.object({
  document: z.object({
    id: z.string(),
    original_name: z.string().nullable(),
    mime_type: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    ocr_completed_at: z.string().nullable(),
    pii_types: z.array(z.string()).nullable(),
    ocr_text: z.string().nullable(), // Redacted OCR text (safe to include)
    ocr_text_length: z.number().nullable(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get a specific document by ID, including OCR text
 * 
 * Use this when Byte needs to summarize or analyze a specific document.
 * The OCR text is already redacted (PII masked) by guardrails, so it's safe to include.
 * Only returns documents owned by the user (RLS-safe).
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    const { data: document, error } = await supabase
      .from('user_documents')
      .select('id, original_name, mime_type, status, created_at, ocr_completed_at, pii_types, ocr_text')
      .eq('id', input.documentId)
      .eq('user_id', userId) // RLS-safe: filter by user_id
      .maybeSingle();

    if (error) {
      console.error('[get_document_by_id] Database error:', {
        error: error.message,
        code: error.code,
        userId,
        documentId: input.documentId,
      });
      throw error;
    }

    if (!document) {
      return Err(new Error(`Document ${input.documentId} not found or not accessible`));
    }

    // Don't log OCR text in production
    const safeLogData = process.env.NETLIFY_DEV === 'true'
      ? { ocr_text_preview: document.ocr_text?.substring(0, 100) }
      : { ocr_text_length: document.ocr_text?.length || 0 };

    // Dev mode: Log tool execution (without full sensitive data)
    if (process.env.NETLIFY_DEV === 'true') {
      console.log('[get_document_by_id] Tool executed:', {
        userId,
        documentId: input.documentId,
        documentName: document.original_name,
        status: document.status,
        ...safeLogData,
      });
    }

    return Ok({
      document: {
        id: document.id,
        original_name: document.original_name,
        mime_type: document.mime_type,
        status: document.status,
        created_at: document.created_at,
        ocr_completed_at: document.ocr_completed_at,
        pii_types: document.pii_types || [],
        ocr_text: document.ocr_text, // Already redacted by guardrails
        ocr_text_length: document.ocr_text ? document.ocr_text.length : null,
      },
    });
  } catch (error) {
    console.error('[get_document_by_id] Error:', error);
    return Err(error as Error);
  }
}





// @wiring:byte-docs
// @area:tools/get_recent_documents
// @purpose:Lists most recent uploaded documents for Byte to select a target document.

import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'get_recent_documents';

export const inputSchema = z.object({
  limit: z.number().min(1).max(20).optional().default(5),
});

export const outputSchema = z.object({
  documents: z.array(z.object({
    id: z.string(),
    original_name: z.string().nullable(),
    mime_type: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    ocr_completed_at: z.string().nullable(),
    pii_types: z.array(z.string()).nullable(),
    // Don't include ocr_text in output - too sensitive
    // Include summary fields instead
    has_ocr_text: z.boolean(),
    ocr_text_length: z.number().nullable(),
  })),
  total: z.number(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Get recent documents uploaded by the user
 * 
 * Use this when the user asks about their latest uploads, imports, or documents.
 * Returns metadata about documents (name, status, dates) but NOT the raw OCR text.
 * For full OCR text, use get_document_by_id instead.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    const { data: documents, error } = await supabase
      .from('user_documents')
      .select('id, original_name, mime_type, status, created_at, ocr_completed_at, pii_types, ocr_text')
      .eq('user_id', userId) // RLS-safe: filter by user_id
      .order('created_at', { ascending: false })
      .limit(input.limit);

    if (error) {
      console.error('[get_recent_documents] Database error:', {
        error: error.message,
        code: error.code,
        userId,
      });
      throw error;
    }

    const docs = documents || [];

    // Don't expose raw OCR text - only include metadata
    const safeDocuments = docs.map(doc => ({
      id: doc.id,
      original_name: doc.original_name,
      mime_type: doc.mime_type,
      status: doc.status,
      created_at: doc.created_at,
      ocr_completed_at: doc.ocr_completed_at,
      pii_types: doc.pii_types || [],
      has_ocr_text: !!doc.ocr_text,
      ocr_text_length: doc.ocr_text ? doc.ocr_text.length : null,
    }));

    // Dev mode: Log tool execution (without sensitive data)
    if (process.env.NETLIFY_DEV === 'true') {
      console.log('[get_recent_documents] Tool executed:', {
        userId,
        limit: input.limit,
        documentsFound: safeDocuments.length,
        documentIds: safeDocuments.map(d => d.id),
      });
    }

    return Ok({
      documents: safeDocuments,
      total: safeDocuments.length,
    });
  } catch (error) {
    console.error('[get_recent_documents] Error:', error);
    return Err(error as Error);
  }
}





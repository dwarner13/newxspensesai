/**
 * Byte Activity Event Logger
 * 
 * Emits completion events for Byte's import/OCR work.
 * Ensures idempotency and prevents duplicates.
 */

import { admin } from './supabase';
import { logAiActivity } from './logAiActivity';

export interface ByteImportCompletedPayload {
  userId: string;
  importRunId: string; // Unique ID for this import run (prevents duplicates)
  docIds: string[]; // Array of document IDs in this run
  docCount: number;
  pages?: number; // Estimated pages (for PDFs)
  txnCount?: number; // Transaction count (if available)
  warnings?: string[]; // Any warnings during processing
  durationMs: number; // Processing duration
  threadId?: string; // Optional chat thread ID
}

/**
 * Log Byte import completion event
 * 
 * Ensures idempotency by checking for existing event with same importRunId.
 * Only emits ONE event per import run, even on retries/refresh.
 * 
 * @param authToken - Authorization token (for RLS)
 * @param payload - Completion payload
 */
export async function logByteImportCompleted(
  authToken: string,
  payload: ByteImportCompletedPayload
): Promise<void> {
  const { userId, importRunId, docCount, pages, txnCount, warnings, durationMs, threadId } = payload;

  if (!authToken || !userId || !importRunId) {
    console.warn('[logByteImportCompleted] Missing required fields:', { userId, importRunId });
    return;
  }

  try {
    const sb = admin();

    // Build details object
    const details: Record<string, unknown> = {
      import_run_id: importRunId,
      doc_count: docCount,
      doc_ids: payload.docIds,
      duration_ms: durationMs,
    };

    if (pages !== undefined) {
      details.pages = pages;
    }

    if (txnCount !== undefined) {
      details.txn_count = txnCount;
    }

    if (warnings && warnings.length > 0) {
      details.warnings = warnings;
    }

    if (threadId) {
      details.thread_id = threadId;
    }

    // ⚡ DB-LEVEL IDEMPOTENCY: INSERT with UNIQUE constraint protection
    // UNIQUE constraint: (user_id, event_type, details->>'import_run_id')
    // This ensures exactly-one event per import run, even on concurrent requests
    // The UNIQUE index will catch duplicates at DB level (race-condition safe)
    const { error: insertError } = await sb
      .from('ai_activity_events')
      .insert({
        user_id: userId,
        employee_id: 'byte-docs',
        event_type: 'byte.import.completed',
        status: 'completed',
        label: `Byte finished importing ${docCount} document${docCount > 1 ? 's' : ''}`,
        details,
      });

    if (insertError) {
      // Check if error is due to unique constraint violation (idempotency)
      // Error code 23505 = unique_violation
      if (insertError.code === '23505' || insertError.message?.includes('unique') || insertError.message?.includes('duplicate')) {
        console.log(`[logByteImportCompleted] Event already exists (DB constraint), skipping: ${importRunId}`);
        return;
      }
      // Re-throw other errors
      throw insertError;
    }

    console.log(`[logByteImportCompleted] Event logged for importRunId: ${importRunId}`);
  } catch (error: any) {
    console.error('[logByteImportCompleted] Error logging event:', error);
    // Don't throw - activity logging should not break main flow
  }
}

/**
 * Generate import run ID from request ID or doc IDs
 * 
 * @param requestId - Optional request ID from upload
 * @param docIds - Array of document IDs
 * @returns Unique import run ID
 */
export function generateImportRunId(requestId?: string, docIds?: string[]): string {
  if (requestId) {
    return `import-${requestId}`;
  }
  
  if (docIds && docIds.length > 0) {
    // Use first doc ID + timestamp as fallback
    return `import-${docIds[0]}-${Date.now()}`;
  }
  
  // Last resort: timestamp-based
  return `import-${Date.now()}`;
}


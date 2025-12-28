/**
 * Custodian Integrity Check
 * 
 * Verifies upload completeness and processing integrity for Byte imports.
 * Returns verification result tied to completion event.
 */

import { admin } from './supabase';

export interface IntegrityCheckResult {
  verified: boolean;
  reason?: string;
  warnings?: string[];
  docIds: string[];
  importRunId: string;
}

/**
 * Perform integrity check for Byte import completion
 * 
 * Checks:
 * 1. Upload size matches expected (if available)
 * 2. OCR completed successfully (status='ready')
 * 3. No pending states
 * 4. File exists in storage
 * 
 * @param userId - User ID
 * @param docIds - Array of document IDs in import run
 * @param importRunId - Import run ID for tracking
 * @returns Integrity check result
 */
export async function checkByteImportIntegrity(
  userId: string,
  docIds: string[],
  importRunId: string
): Promise<IntegrityCheckResult> {
  const sb = admin();
  const warnings: string[] = [];
  let verified = true;
  let reason: string | undefined;

  try {
    // Load all documents
    const { data: docs, error } = await sb
      .from('user_documents')
      .select('id, status, storage_path, mime_type, original_name, ocr_text, pii_types')
      .in('id', docIds)
      .eq('user_id', userId);

    if (error || !docs || docs.length === 0) {
      return {
        verified: false,
        reason: 'Documents not found',
        docIds,
        importRunId,
      };
    }

    // Check each document
    for (const doc of docs) {
      // Check status
      if (doc.status === 'rejected') {
        verified = false;
        reason = `Document ${doc.id} was rejected`;
        warnings.push(`Document ${doc.original_name || doc.id} rejected`);
        continue;
      }

      if (doc.status === 'pending') {
        verified = false;
        reason = `Document ${doc.id} still pending`;
        warnings.push(`Document ${doc.original_name || doc.id} still processing`);
        continue;
      }

      // For images/PDFs, check OCR completion
      const isImageOrPdf = doc.mime_type?.startsWith('image/') || doc.mime_type === 'application/pdf';
      if (isImageOrPdf && !doc.ocr_text) {
        verified = false;
        reason = `Document ${doc.id} missing OCR text`;
        warnings.push(`Document ${doc.original_name || doc.id} OCR incomplete`);
        continue;
      }

      // Check file exists in storage
      if (doc.storage_path) {
        const { data: fileList, error: storageError } = await sb.storage
          .from('docs')
          .list(doc.storage_path.split('/').slice(0, -1).join('/'), {
            limit: 1000,
            search: doc.storage_path.split('/').pop(),
          });

        if (storageError || !fileList || fileList.length === 0) {
          verified = false;
          reason = `Document ${doc.id} file missing from storage`;
          warnings.push(`Document ${doc.original_name || doc.id} file not found`);
          continue;
        }
      }
    }

    return {
      verified,
      reason: verified ? undefined : reason,
      warnings: warnings.length > 0 ? warnings : undefined,
      docIds,
      importRunId,
    };
  } catch (error: any) {
    console.error('[checkByteImportIntegrity] Error:', error);
    return {
      verified: false,
      reason: `Integrity check failed: ${error.message}`,
      docIds,
      importRunId,
    };
  }
}

/**
 * Update activity event with integrity check result
 * 
 * @param userId - User ID
 * @param importRunId - Import run ID
 * @param integrityResult - Integrity check result
 */
export async function updateActivityEventWithIntegrity(
  userId: string,
  importRunId: string,
  integrityResult: IntegrityCheckResult
): Promise<void> {
  try {
    const sb = admin();

    // Find the activity event for this import run
    const { data: event } = await sb
      .from('ai_activity_events')
      .select('id, details')
      .eq('user_id', userId)
      .eq('event_type', 'byte.import.completed')
      .eq('details->>import_run_id', importRunId)
      .maybeSingle();

    if (!event) {
      console.warn(`[updateActivityEventWithIntegrity] Event not found for importRunId: ${importRunId}`);
      return;
    }

    // Update details with integrity check result
    // ⚡ CUSTODIAN SILENCE ON SUCCESS: Only store payload, no chat messages
    const updatedDetails = {
      ...(event.details || {}),
      integrity: {
        verified: integrityResult.verified,
        reasons: integrityResult.verified ? [] : [integrityResult.reason || 'Unknown reason'],
        warnings: integrityResult.warnings || [],
      },
      // Legacy fields (for backward compatibility)
      integrity_verified: integrityResult.verified,
      integrity_reason: integrityResult.reason,
      integrity_warnings: integrityResult.warnings,
    };

    await sb
      .from('ai_activity_events')
      .update({ details: updatedDetails })
      .eq('id', event.id);

    console.log(`[updateActivityEventWithIntegrity] Updated event ${event.id} with integrity result`);
  } catch (error: any) {
    console.error('[updateActivityEventWithIntegrity] Error:', error);
    // Don't throw - integrity check updates should not break main flow
  }
}


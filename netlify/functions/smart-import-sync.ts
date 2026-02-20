/**
 * Smart Import Sync Netlify Function
 * 
 * Phase 2 sync step: Waits for/executes OCR/parse, normalization, and commit
 * Returns actual transaction counts for newly uploaded documents.
 * 
 * Flow:
 * 1. Takes docIds from recent uploads
 * 2. Finds corresponding imports records
 * 3. Waits for OCR/parse to complete (if needed)
 * 4. Triggers normalization if not already done
 * 5. Commits transactions from staging to final table
 * 6. Returns transaction count
 * 
 * Internal function map:
 * - smart-import-init.ts: Creates doc record, returns signed URL
 * - smart-import-finalize.ts: Routes by file type, triggers OCR/parse (async)
 * - smart-import-ocr.ts: Runs OCR, calls normalize-transactions (async)
 * - smart-import-parse-csv.ts: Parses CSV, calls normalize-transactions (async)
 * - normalize-transactions.ts: Extracts transactions, saves to staging, sets status='parsed'
 * - commit-import.ts: Moves from staging to final table, categorizes with Tag
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

export type SmartImportSyncResult = {
  docIds: string[];
  importIds?: string[];
  transactionCount: number;
  // Optional: more fields later
  // categorizedCount?: number;
  // categoryCount?: number;
};

const MAX_WAIT_MS = 30000; // 30 seconds max wait for async jobs
const POLL_INTERVAL_MS = 1000; // Poll every 1 second
const OCR_DEBUG_ENABLED =
  process.env.OCR_DEBUG === '1' ||
  process.env.OCR_DEBUG === 'true' ||
  process.env.VITE_OCR_DEBUG === '1' ||
  process.env.VITE_OCR_DEBUG === 'true';
const SYNC_DEBUG_ENABLED =
  OCR_DEBUG_ENABLED ||
  String(process.env.VITE_LOG_LEVEL || '').toLowerCase() === 'debug';
const PREFER_AI_STATEMENTS = process.env.OCR_PREFER_AI_STATEMENTS === '1';
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function shouldProceedWithNormalize(input: {
  ocrStatus: string | null | undefined;
  textHash?: string | null;
  textLength?: number | null;
  hasExtractedData?: boolean;
  hasNormalizedJson?: boolean;
  hasReadyMarker?: boolean;
  hasProofs?: boolean;
  ocrJobDone?: boolean;
}): boolean {
  const status = String(input.ocrStatus || '').toLowerCase();
  const readyState =
    status === 'ready' ||
    status === 'ready_cached' ||
    status === 'needs_review' ||
    status === 'rejected';
  const hasMetrics = Boolean(input.textHash) || Number(input.textLength || 0) > 0;
  const hasStructured = Boolean(input.hasExtractedData) || Boolean(input.hasNormalizedJson);
  const hasReadyMarker = Boolean(input.hasReadyMarker);
  const hasProofs = Boolean(input.hasProofs);
  return hasProofs || (readyState && (hasMetrics || hasStructured || hasReadyMarker)) || Boolean(input.ocrJobDone);
}

export function shouldBlockCachedNoInput(input: {
  textHash?: string | null;
  textLength?: number | null;
  hasExtractedData?: boolean;
  hasNormalizedJson?: boolean;
  hasStagingRows?: boolean;
  hasReadyMarker?: boolean;
  hasImportRecord?: boolean;
  ocrJobDone?: boolean;
  readyForNormalize?: boolean;
}): boolean {
  const noInput =
    !input.textHash &&
    Number(input.textLength || 0) <= 0 &&
    !input.hasExtractedData &&
    !input.hasNormalizedJson &&
    !input.hasStagingRows;
  const weakProofOnly =
    !input.hasExtractedData &&
    !input.hasNormalizedJson &&
    (Boolean(input.hasReadyMarker) || Boolean(input.hasImportRecord) || Boolean(input.ocrJobDone));
  return Boolean(input.readyForNormalize) && noInput && weakProofOnly;
}

async function waitForOcrReadyOrMetrics(
  sb: any,
  docId: string,
  userId: string,
  maxMs: number = 15000,
  pollMs: number = 500
): Promise<{
  ok: boolean;
  len: number;
  ocrStatus: string | null;
  textHash: string | null;
  hasStructured: boolean;
  metricsReady: boolean;
  reason: string;
}> {
  const start = Date.now();
  const READY_EMPTY_GRACE_MS = 2500;
  let warnedReadyEmpty = false;
  console.log('[smart-import-sync] waitForOcrReadyOrMetrics start', { docId, maxMs, pollMs });

  while (Date.now() - start < maxMs) {
    const { data, error } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (error) {
      console.error('[smart-import-sync] waitForOcrReadyOrMetrics error', { docId, error });
      // keep waiting in case schema cache / transient
    } else {
      const mimeType = data?.mime_type || '';
      const fileName = data?.original_name || '';
      const ocrStatus = String(data?.ocr_status || data?.status || '');
      const textLengthValue = data?.ocr_text_length ?? data?.extracted_data?.text_length ?? null;
      const textLength = Number.isFinite(Number(textLengthValue)) ? Number(textLengthValue) : 0;
      const textHash = (data?.ocr_text_hash || data?.extracted_data?.text_hash || null) as string | null;

      if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        console.log('[smart-import-sync] waitForOcrReadyOrMetrics skip (CSV)', {
          docId,
          mimeType,
          fileName,
          elapsedMs: Date.now() - start,
        });
        return { ok: true, len: 0, ocrStatus: ocrStatus || null, textHash, hasStructured: false, metricsReady: true, reason: 'csv_skip' };
      }

      const { data: importRecord } = await sb
        .from('imports')
        .select('id, status')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .maybeSingle();
      let stagingCount = 0;
      if (importRecord?.id) {
        const { count } = await sb
          .from('transactions_staging')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', importRecord.id)
          .eq('user_id', userId);
        stagingCount = Number(count || 0);
      }
      const { data: ocrJob } = await sb
        .from('ocr_jobs')
        .select('status')
        .eq('document_id', docId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const ocrJobStatus = String(ocrJob?.status || '');
      const hasStructured = Boolean(data?.extracted_data) || Boolean(data?.normalized_json) || Boolean(data?.structured_extraction) || Boolean(data?.extraction_artifacts);
      const metricsReady = Boolean(textHash) || textLength > 0;
      const hasReadyMarker = Boolean(
        data?.ocr_completed_at ||
        data?.ocr_engine ||
        data?.ocr_provider ||
        data?.extraction_quality ||
        Number(data?.pages_detected || 0) > 0
      );
      const hasImportRecord = Boolean(importRecord?.id);
      const hasStagingRows = stagingCount > 0;
      const ocrJobDone = ocrJobStatus === 'done';
      const hasSafeProofs = metricsReady || hasStructured || hasStagingRows;
      const proofsFound = [
        metricsReady,
        hasStructured,
        hasStagingRows,
        hasImportRecord,
        hasReadyMarker,
        ocrJobDone,
      ];
      const hasProofs = proofsFound.some(Boolean);
      if (SYNC_DEBUG_ENABLED) {
        console.log('[smart-import-sync] OCR ready check with', {
          docId,
          ocr_status: ocrStatus || null,
          ocr_text_length: Number.isFinite(Number(textLengthValue)) ? Number(textLengthValue) : null,
          text_hash_present: Boolean(textHash),
          proofs_found: proofsFound,
        });
      }
      const readyForNormalize = shouldProceedWithNormalize({
        ocrStatus,
        textHash,
        textLength,
        hasExtractedData: Boolean(data?.extracted_data),
        hasNormalizedJson: Boolean(data?.normalized_json),
        hasReadyMarker,
        hasProofs: hasSafeProofs,
        ocrJobDone,
      });

      const normalizedStatus = String(ocrStatus || '').toLowerCase();
      const statusLooksReady =
        normalizedStatus === 'ready' ||
        normalizedStatus === 'ready_cached' ||
        normalizedStatus === 'needs_review' ||
        normalizedStatus === 'rejected';
      if (hasSafeProofs && !statusLooksReady) {
        console.log('[smart-import-sync] OCR ready via proofs (status ignored)', {
          docId,
          ocr_status: ocrStatus || null,
          proofs_found: proofsFound,
        });
      }

      const shouldMarkNeedsReviewForNoInput = shouldBlockCachedNoInput({
        textHash,
        textLength,
        hasExtractedData: Boolean(data?.extracted_data),
        hasNormalizedJson: Boolean(data?.normalized_json),
        hasStagingRows,
        hasReadyMarker,
        hasImportRecord,
        ocrJobDone,
        readyForNormalize,
      });
      if (shouldMarkNeedsReviewForNoInput) {
        try {
          const metadata = {
            ...(data?.metadata && typeof data.metadata === 'object' ? data.metadata : {}),
            import_block_reason: 'cached_no_input',
            import_block_detail: {
              textHash: textHash || null,
              textLength,
              hasExtractedData: Boolean(data?.extracted_data),
              hasNormalizedJson: Boolean(data?.normalized_json),
              hasStagingRows,
              hasReadyMarker,
            },
          };
          await sb
            .from('user_documents')
            .update({
              ocr_status: 'needs_review',
              status: 'needs_review',
              metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', docId);
        } catch {
          // Best effort; sync should still proceed with safe reason.
        }
        console.warn('[smart-import-sync] cached doc has no input; marking needs_review and skipping normalize', {
          docId,
        });
        return {
          ok: true,
          len: textLength,
          ocrStatus: 'needs_review',
          textHash,
          hasStructured,
          metricsReady,
          reason: 'cached_no_input_needs_review',
        };
      }

      if (hasStagingRows) {
        return { ok: true, len: textLength, ocrStatus: ocrStatus || null, textHash, hasStructured, metricsReady, reason: 'staging_rows_ready' };
      }
      if (hasImportRecord) {
        return { ok: true, len: textLength, ocrStatus: ocrStatus || null, textHash, hasStructured, metricsReady, reason: `import_exists:${importRecord.status}` };
      }
      if (String(ocrStatus).toLowerCase() === 'ready' && !readyForNormalize && Date.now() - start >= READY_EMPTY_GRACE_MS) {
        if (!warnedReadyEmpty) {
          warnedReadyEmpty = true;
          console.warn('[smart-import-sync] OCR ready but empty; marking needs_review', {
            docId,
            ocr_status: ocrStatus || null,
            ocr_text_length: Number.isFinite(Number(textLengthValue)) ? Number(textLengthValue) : null,
            text_hash_present: Boolean(textHash),
            proofs_found: proofsFound,
          });
        }
        try {
          await sb
            .from('user_documents')
            .update({
              ocr_status: 'needs_review',
              status: data?.status === 'ready' ? 'needs_review' : data?.status,
            })
            .eq('id', docId)
            .eq('user_id', userId);
        } catch {
          // Best effort; continue without blocking sync.
        }
        return {
          ok: true,
          len: textLength,
          ocrStatus: 'needs_review',
          textHash,
          hasStructured,
          metricsReady,
          reason: 'ocr_ready_empty_needs_review',
        };
      }
      if (readyForNormalize) {
        return {
          ok: true,
          len: textLength,
          ocrStatus: ocrStatus || null,
          textHash,
          hasStructured,
          metricsReady,
          reason: ocrJobStatus === 'done'
            ? 'ocr_job_done'
            : (textLength === 0 && !textHash && hasStructured ? 'ready_with_structured_only' : 'ready_with_metrics'),
        };
      }
    }

    await new Promise(r => setTimeout(r, pollMs));
  }

  console.warn('[smart-import-sync] OCR readiness NOT reached before timeout', {
    docId,
    maxMs,
    elapsedMs: Date.now() - start,
  });
  return { ok: false, len: 0, ocrStatus: null, textHash: null, hasStructured: false, metricsReady: false, reason: 'timeout' };
}

/**
 * Wait for import status to become 'parsed' (ready to commit)
 */
async function waitForImportReady(
  sb: any,
  importId: string,
  userId: string,
  maxWaitMs: number = MAX_WAIT_MS
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data: importRecord } = await sb
      .from('imports')
      .select('status')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (importRecord?.status === 'parsed') {
      return true;
    }
    
    if (importRecord?.status === 'committed') {
      // Already committed, skip
      return true;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  
  return false;
}

/**
 * Trigger normalization for a document if not already normalized
 */
async function ensureNormalized(
  sb: any,
  documentId: string,
  userId: string,
  netlifyUrl: string,
  payload?: { ocrText?: string; ocrTextHash?: string | null; ocrTextLength?: number | null }
): Promise<{ ok: boolean; importId?: string }> {
  if (!documentId || !UUID_V4_RE.test(String(documentId))) {
    console.warn('[smart-import-sync] Skipping normalize-transactions due to invalid documentId', {
      documentId,
    });
    return { ok: false };
  }
  // Check if import already exists and is parsed
  const { data: existingImport } = await sb
    .from('imports')
    .select('id, status')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existingImport?.status === 'parsed' || existingImport?.status === 'committed') {
    let stagingCount = 0;
    if (existingImport?.id) {
      const { count } = await sb
        .from('transactions_staging')
        .select('id', { count: 'exact', head: true })
        .eq('import_id', existingImport.id)
        .eq('user_id', userId);
      stagingCount = Number(count || 0);
    }
    const shouldSkipAsReady =
      existingImport.status === 'committed' || stagingCount > 0;
    if (shouldSkipAsReady) {
      if (OCR_DEBUG_ENABLED) {
        console.log('[smart-import-sync] Normalize skipped (already parsed/committed)', {
          documentId,
          importId: existingImport.id,
          status: existingImport.status,
          stagingCount,
        });
      }
      return { ok: true, importId: existingImport.id };
    }
    console.warn('[smart-import-sync] Parsed import has zero staging rows; re-running normalize', {
      documentId,
      importId: existingImport.id,
      status: existingImport.status,
      stagingCount,
    });
  }
  
  // Trigger normalization
  try {
    if (OCR_DEBUG_ENABLED) {
      console.log('[smart-import-sync] Triggering normalize-transactions', { documentId });
    }
    const normalizeRes = await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        documentId,
        ocrText: typeof payload?.ocrText === 'string' ? payload?.ocrText : undefined,
        ocrTextHash: payload?.ocrTextHash || undefined,
        ocrTextLength: Number.isFinite(Number(payload?.ocrTextLength)) ? Number(payload?.ocrTextLength) : undefined,
      }),
    });
    
    if (!normalizeRes.ok) {
      const errorText = await normalizeRes.text();
      console.error('[smart-import-sync] normalize-transactions failed:', errorText);
      return { ok: false };
    }
    
    const normalizeData = await normalizeRes.json();
    const importId = normalizeData.importId || existingImport?.id;
    
    // Wait for normalization to complete
    if (importId) {
      const ready = await waitForImportReady(sb, importId, userId);
      return { ok: ready, importId };
    }
    
    return { ok: false };
  } catch (err: any) {
    console.error('[smart-import-sync] Error calling normalize-transactions:', err);
    return { ok: false };
  }
}

async function buildDebugResponse(
  sb: any,
  params: {
    userId: string;
    docIds: string[];
    importIds: string[];
    headers: Record<string, string>;
    includeAllAccounts?: boolean;
  }
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  const { userId, docIds, importIds, headers, includeAllAccounts } = params;
  const result: SmartImportSyncResult & Record<string, any> = {
    docIds,
    importIds,
    transactionCount: 0,
  };

  const debugItems: any[] = [];
  for (const docId of docIds) {
    let { data: docData } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .eq('user_id', userId)
      .maybeSingle();
    const needsIdFallback = !docData || !docData.storage_path;
    if (needsIdFallback) {
      const { data: docDataById } = await sb
        .from('user_documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();
      if (docDataById) {
        docData = docDataById;
        if (OCR_DEBUG_ENABLED) {
          console.warn('[smart-import-sync] Debug doc lookup bypassed user_id filter', {
            docId,
            userId,
            docUserId: docDataById.user_id,
          });
        }
      }
    }

    const { data: importRecord } = await sb
      .from('imports')
      .select('id, error')
      .eq('document_id', docId)
      .eq('user_id', userId)
      .maybeSingle();

    let parsedTransactions: any[] = [];
    if (importRecord?.id) {
      const { data: stagingRows } = await sb
        .from('transactions_staging')
        .select('data_json, parsed_at, hash')
        .eq('import_id', importRecord.id)
        .eq('user_id', userId)
        .order('parsed_at', { ascending: true })
        .limit(50);
      parsedTransactions = (stagingRows || []).map((row: any) => row.data_json);
    }
    const parseWarnings: string[] = [];
    const ocrLengthValue = docData?.ocr_text_length ?? docData?.extracted_data?.text_length ?? null;
    const ocrTextLength = Number.isFinite(Number(ocrLengthValue)) ? Number(ocrLengthValue) : 0;
    const ocrTextHash = docData?.ocr_text_hash || docData?.extracted_data?.text_hash || null;
    if (ocrTextHash === null && ocrTextLength <= 0) parseWarnings.push('missing_ocr_metrics');
    if (parsedTransactions.length === 0) parseWarnings.push('no_parsed_transactions');
    const docStatus = docData?.ocr_status || docData?.status || null;
    if (docStatus === 'needs_review' || docStatus === 'rejected') {
      parseWarnings.push(`doc_status:${docStatus}`);
    }
    if (SYNC_DEBUG_ENABLED) {
      console.log('[smart-import-sync][debug] doc metrics', {
        docId,
        ocr_status: docStatus,
        ocr_text_length: ocrTextLength,
        text_hash: ocrTextHash,
      });
    }

    debugItems.push({
      docId,
      importId: importRecord?.id || undefined,
      rawTextLength: ocrTextLength,
      ocrTextHash,
      ocrStatus: docStatus,
      parsedTransactions,
      parseWarnings,
      parseError: importRecord?.error || null,
      ocrEngineUsed: docData?.ocr_engine || null,
      includeAllAccounts: Boolean(includeAllAccounts),
      aiFallbackEnabled: Boolean(PREFER_AI_STATEMENTS),
    });
  }

  result.debug = { items: debugItems };
  if (debugItems.length === 1) {
    Object.assign(result, debugItems[0]);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result),
  };
}

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, docIds, includeAllAccounts } = body;
    const waitForOcrMsRaw = Number(body?.waitForOcrMs);
    const pollForOcrMsRaw = Number(body?.pollForOcrMs);
    const waitForOcrMs = Number.isFinite(waitForOcrMsRaw)
      ? Math.max(0, Math.min(30000, waitForOcrMsRaw))
      : 15000;
    const pollForOcrMs = Number.isFinite(pollForOcrMsRaw)
      ? Math.max(100, Math.min(2000, pollForOcrMsRaw))
      : 500;

    if (!userId || !docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing userId or docIds array' }),
      };
    }

    const sb = admin();
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    
    console.log('[smart-import-sync] Starting sync', { userId: userId.substring(0, 8) + '...', docIds });

    // 1. Find or ensure imports records exist for each docId
    // Note: normalize-transactions creates import records, so if import doesn't exist,
    // we'll trigger normalization which will create it
    const importIds: string[] = [];
    
    for (const docId of docIds) {
      // Check if import exists
      let { data: importRecord } = await sb
        .from('imports')
        .select('id, status, document_id')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!importRecord) {
        // Import doesn't exist yet - trigger normalization which will create it
        console.log('[smart-import-sync] Import not found, triggering normalization for docId:', docId);
        const waitResult = await waitForOcrReadyOrMetrics(sb, docId, userId, waitForOcrMs, pollForOcrMs);
        if (!waitResult.ok) {
          let docStatus = 'ocr_processing';
          let docTextLength: number | null = null;
          let docTextHash: string | null = null;
          let ocrEngineUsed: string | null = null;
          try {
            const { data: pendingDoc } = await sb
              .from('user_documents')
              .select('*')
              .eq('id', docId)
              .eq('user_id', userId)
              .maybeSingle();
            docStatus = pendingDoc?.ocr_status || pendingDoc?.status || docStatus;
            docTextLength = Number.isFinite(Number(pendingDoc?.ocr_text_length))
              ? Number(pendingDoc?.ocr_text_length)
              : null;
            docTextHash = pendingDoc?.ocr_text_hash || null;
            ocrEngineUsed = pendingDoc?.ocr_engine || null;
          } catch {
            // Best effort only; do not fail sync response for debug metadata.
          }
          console.log('[smart-import-sync] Skipping normalize; OCR not ready', { docId, reason: waitResult.reason });
          const processingBody: Record<string, any> = {
            ok: true,
            processing: true,
            reason: 'ocr_not_ready',
            docId,
            docIds,
            importIds: [],
            transactionCount: 0,
          };
          if (OCR_DEBUG_ENABLED) {
            processingBody.debug = {
              items: [
                {
                  docId,
                  importId: undefined,
                  rawTextLength: 0,
                  parsedTransactions: [],
                  parseWarnings: ['ocr_not_ready', `doc_status:${docStatus}`, `wait_reason:${waitResult.reason}`],
                  parseError: null,
                  ocrEngineUsed,
                  ocrTextLength: docTextLength,
                  ocrTextHash: docTextHash,
                },
              ],
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(processingBody),
          };
        }
        const shouldSkipNormalizeTrigger =
          waitResult.reason.startsWith('import_exists:') ||
          waitResult.reason === 'staging_rows_ready' ||
          waitResult.reason === 'ocr_ready_empty_needs_review' ||
          waitResult.reason === 'cached_no_input_needs_review';
        let normalized: { ok: boolean; importId?: string } = { ok: false };
        if (!shouldSkipNormalizeTrigger) {
          normalized = await ensureNormalized(sb, docId, userId, netlifyUrl, {
            ocrText: undefined,
            ocrTextHash: waitResult.textHash,
            ocrTextLength: waitResult.len,
          });
        } else if (SYNC_DEBUG_ENABLED) {
          console.log('[smart-import-sync][debug] normalize trigger skipped', {
            docId,
            reason: waitResult.reason,
          });
        }

        if (normalized.ok && normalized.importId) {
          importRecord = { id: normalized.importId, status: 'parsed', document_id: docId };
        } else {
          // Check again after a short wait
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: retryImport } = await sb
            .from('imports')
            .select('id, status, document_id')
            .eq('document_id', docId)
            .eq('user_id', userId)
            .maybeSingle();
          
          if (retryImport) {
            importRecord = retryImport;
          } else {
            console.warn('[smart-import-sync] Could not find or create import for docId:', docId);
            continue;
          }
        }
      }
      
      if (importRecord.id) {
        importIds.push(importRecord.id);
      }
    }
    
    if (OCR_DEBUG_ENABLED) {
      return await buildDebugResponse(sb, {
        userId,
        docIds,
        importIds,
        headers,
        includeAllAccounts,
      });
    }
    
    if (importIds.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          docIds,
          importIds: [],
          transactionCount: 0,
        } as SmartImportSyncResult),
      };
    }
    
    console.log('[smart-import-sync] Found imports', { importIds });

    // 2. Ensure all imports are normalized (status='parsed')
    const readyImportIds: string[] = [];
    
    for (const importId of importIds) {
      // Get document_id for this import
      const { data: importRecord } = await sb
        .from('imports')
        .select('document_id, status')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!importRecord || !importRecord.document_id) {
        console.warn('[smart-import-sync] Import missing document_id:', importId);
        continue;
      }
      
      // If already parsed or committed, we're good
      if (importRecord.status === 'parsed' || importRecord.status === 'committed') {
        readyImportIds.push(importId);
        continue;
      }
      
      // Ensure normalized
      const normalized = await ensureNormalized(sb, importRecord.document_id, userId, netlifyUrl);
      
      if (normalized.ok && normalized.importId) {
        readyImportIds.push(normalized.importId);
      } else {
        // Wait a bit and check again
        const ready = await waitForImportReady(sb, importId, userId, 10000); // 10s wait
        if (ready) {
          readyImportIds.push(importId);
        }
      }
    }
    
    console.log('[smart-import-sync] Ready imports', { readyImportIds });

    // 3. Commit all ready imports
    let totalTransactionCount = 0;
    const summaries: Record<string, any> = {};
    const issuesByImport: Record<string, any> = {};
    
    for (const importId of readyImportIds) {
      // Check if already committed
      const { data: importRecord } = await sb
        .from('imports')
        .select('status')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (importRecord?.status === 'committed') {
        const { count: committedCount } = await sb
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', importId)
          .eq('user_id', userId);
        totalTransactionCount += committedCount || 0;
        continue;
      }
      
      // Commit this import
      try {
        const commitRes = await fetch(`${netlifyUrl}/.netlify/functions/commit-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({ importId }),
        });
        
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          const committed = commitData.committed || commitData.insertedCount || 0;
          totalTransactionCount += committed;
          if (commitData?.summary) {
            summaries[importId] = commitData.summary;
          }
          if (commitData?.issues) {
            issuesByImport[importId] = commitData.issues;
          }
          console.log('[smart-import-sync] Committed import', { importId, committed });
        } else {
          const errorText = await commitRes.text();
          console.error('[smart-import-sync] commit-import failed:', errorText);
        }
      } catch (err: any) {
        console.error('[smart-import-sync] Error calling commit-import:', err);
      }
    }
    
    // TODO: Trigger Tag AI to categorize new transactions for these docIds
    // e.g. call `tag-autocategorize` with userId + docIds or importIds
    // Note: commit-import already categorizes transactions using Tag learning,
    // so this might be redundant unless we want additional categorization passes
    
    console.log('[smart-import-sync] Sync complete', { docIds, transactionCount: totalTransactionCount });

    // ⚡ BYTE ACTIVITY EVENT: Emit completion event for Prime/Custodian visibility
    // Only emit once per import run (idempotency via importRunId)
    try {
      const { logByteImportCompleted, generateImportRunId } = await import('./_shared/byteActivityEvents');
      const authToken = event.headers.authorization || event.headers['x-authorization'] || '';
      
      // Generate import run ID from first docId (or use requestId if available)
      const requestId = body.requestId;
      const importRunId = generateImportRunId(requestId, docIds);
      
      // Calculate duration (approximate - from first doc creation to sync completion)
      const { data: firstDoc } = await sb
        .from('user_documents')
        .select('created_at')
        .eq('id', docIds[0])
        .single();
      
      const durationMs = firstDoc?.created_at
        ? Date.now() - new Date(firstDoc.created_at).getTime()
        : 0;

      // Get document metadata for pages estimate
      const { data: docs } = await sb
        .from('user_documents')
        .select('id, mime_type, status')
        .in('id', docIds);
      
      const pages = docs?.filter(d => d.mime_type === 'application/pdf').length || 0;
      
      // Check for warnings (rejected docs, etc.)
      const warnings: string[] = [];
      const rejectedDocs = docs?.filter(d => d.status === 'rejected');
      if (rejectedDocs && rejectedDocs.length > 0) {
        warnings.push(`${rejectedDocs.length} document(s) rejected`);
      }

      await logByteImportCompleted(authToken, {
        userId,
        importRunId,
        docIds,
        docCount: docIds.length,
        pages,
        txnCount: totalTransactionCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        durationMs,
      });

      // ⚡ CUSTODIAN INTEGRITY CHECK: Verify upload completeness and processing integrity
      // ⚡ CUSTODIAN SILENCE ON SUCCESS: Only stores integrity payload, no chat messages
      try {
        const { checkByteImportIntegrity, updateActivityEventWithIntegrity } = await import('./_shared/custodianIntegrityCheck');
        const integrityResult = await checkByteImportIntegrity(userId, docIds, importRunId);
        
        // Update event with integrity result (silent - no chat messages)
        await updateActivityEventWithIntegrity(userId, importRunId, integrityResult);
        
        // ⚡ EXCEPTION-ONLY: Only create warning event if verified=false
        if (!integrityResult.verified) {
          // Create warning event for Prime (not a chat message, but an activity event)
          try {
            const { logAiActivity } = await import('./_shared/logAiActivity.js');
            await logAiActivity(authToken, {
              employeeId: 'custodian',
              eventType: 'byte.import.integrity_warning',
              status: 'warning',
              label: `Integrity check failed for Byte import: ${integrityResult.reason}`,
              details: {
                import_run_id: importRunId,
                doc_ids: docIds,
                integrity_verified: false,
                integrity_reason: integrityResult.reason,
                integrity_warnings: integrityResult.warnings,
              },
            });
          } catch (warningError: any) {
            console.error('[smart-import-sync] Error creating integrity warning event:', warningError);
            // Don't fail sync if warning event creation fails
          }
        } else {
          // ⚡ CRYSTAL ANALYTICS: Trigger Crystal analytics after successful Custodian verification
          // Runs exactly once per import_run_id (idempotent via DB constraint)
          const DISABLE_CRYSTAL = process.env.DISABLE_CRYSTAL === '1' || process.env.DISABLE_CRYSTAL === 'true';
          if (DISABLE_CRYSTAL) {
            console.log('[crystal] disabled by env');
          } else {
            try {
              const { triggerCrystalAnalytics } = await import('./_shared/crystalAnalytics.js');
              await triggerCrystalAnalytics(userId, importRunId);
              // Silent on success - Crystal failures don't affect Custodian flow
            } catch (crystalError: any) {
              console.error('[smart-import-sync] Error triggering Crystal analytics:', crystalError);
              // Don't fail sync if Crystal analytics fails - it's a downstream consumer
            }
          }
        }
      } catch (error: any) {
        console.error('[smart-import-sync] Error performing integrity check:', error);
        // Don't fail sync if integrity check fails
      }
    } catch (error: any) {
      console.error('[smart-import-sync] Error logging Byte completion event:', error);
      // Don't fail sync if event logging fails
    }

    const result: SmartImportSyncResult & Record<string, any> = {
      docIds,
      importIds: readyImportIds,
      transactionCount: totalTransactionCount,
    };
    if (Object.keys(summaries).length > 0) {
      result.summaries = summaries;
      const firstImportId = readyImportIds[0];
      if (firstImportId && summaries[firstImportId]) {
        result.summary = summaries[firstImportId];
      }
    }
    if (Object.keys(issuesByImport).length > 0) {
      result.issuesByImport = issuesByImport;
      const firstImportId = readyImportIds[0];
      if (firstImportId && issuesByImport[firstImportId]) {
        result.issues = issuesByImport[firstImportId];
      }
    }

    if (OCR_DEBUG_ENABLED) {
      const debugItems: any[] = [];
      for (const docId of docIds) {
        let { data: docData } = await sb
          .from('user_documents')
          .select('*')
          .eq('id', docId)
          .eq('user_id', userId)
          .maybeSingle();
        const needsIdFallback = !docData || !docData.storage_path;
        if (needsIdFallback) {
          const { data: docDataById } = await sb
            .from('user_documents')
            .select('*')
            .eq('id', docId)
            .maybeSingle();
          if (docDataById) {
            docData = docDataById;
            if (OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] Debug doc lookup bypassed user_id filter', {
                docId,
                userId,
                docUserId: docDataById.user_id,
              });
            }
          }
        }

        const { data: importRecord } = await sb
          .from('imports')
          .select('id, error')
          .eq('document_id', docId)
          .eq('user_id', userId)
          .maybeSingle();

        let parsedTransactions: any[] = [];
        if (importRecord?.id) {
          const { data: stagingRows } = await sb
            .from('transactions_staging')
            .select('data_json, parsed_at, hash')
            .eq('import_id', importRecord.id)
            .eq('user_id', userId)
            .order('parsed_at', { ascending: true })
            .limit(50);
          parsedTransactions = (stagingRows || []).map((row: any) => row.data_json);
        }
        const parseWarnings: string[] = [];
        const ocrLengthValue = docData?.ocr_text_length ?? docData?.extracted_data?.text_length ?? null;
        const ocrTextLength = Number.isFinite(Number(ocrLengthValue)) ? Number(ocrLengthValue) : 0;
        const ocrTextHash = docData?.ocr_text_hash || docData?.extracted_data?.text_hash || null;
        if (ocrTextHash === null && ocrTextLength <= 0) parseWarnings.push('missing_ocr_metrics');
        if (parsedTransactions.length === 0) parseWarnings.push('no_parsed_transactions');
        const docStatus = docData?.ocr_status || docData?.status || null;
        if (docStatus === 'needs_review' || docStatus === 'rejected') {
          parseWarnings.push(`doc_status:${docStatus}`);
        }
        if (SYNC_DEBUG_ENABLED) {
          console.log('[smart-import-sync][debug] doc metrics', {
            docId,
            ocr_status: docStatus,
            ocr_text_length: ocrTextLength,
            text_hash: ocrTextHash,
          });
        }

        debugItems.push({
          docId,
          importId: importRecord?.id || undefined,
          rawTextLength: ocrTextLength,
          ocrTextHash,
          ocrStatus: docStatus,
          parsedTransactions,
          parseWarnings,
          parseError: importRecord?.error || null,
          ocrEngineUsed: docData?.ocr_engine || null,
          includeAllAccounts: Boolean(includeAllAccounts),
          aiFallbackEnabled: Boolean(PREFER_AI_STATEMENTS),
        });
      }

      result.debug = { items: debugItems };
      if (debugItems.length === 1) {
        Object.assign(result, debugItems[0]);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error: any) {
    console.error('[smart-import-sync] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};


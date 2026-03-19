console.log('[smart-import-sync] MODULE LOADED', new Date().toISOString());
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
const OCR_EMPTY_MIN_LEN = Number(process.env.OCR_EMPTY_MIN_LEN || 20);
const SYNC_DOWNSTREAM_TIMEOUT_MS = Number(process.env.SMART_IMPORT_SYNC_DOWNSTREAM_TIMEOUT_MS || 30000);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
  hasAnyProof?: boolean;
}): boolean {
  if (input.hasAnyProof) return false;
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

type LatestOcrOutcome = {
  status: string | null;
  errorCode: string | null;
  retryable: boolean;
  pending: boolean;
  recent: boolean;
  updatedAtMs: number | null;
};

function mapOcrFailureState(errorCode: string): 'ocr_timed_out_retry' | 'ocr_failed_retry' | 'ocr_unusable' {
  if (errorCode === 'timeout') return 'ocr_timed_out_retry';
  if (errorCode === 'unusable_ocr_text') return 'ocr_unusable';
  return 'ocr_failed_retry';
}

function isOcrFailureRetryable(errorCode: string): boolean {
  return errorCode !== 'unusable_ocr_text';
}

function normalizeLatestOcrOutcome(row: any): LatestOcrOutcome {
  const statusRaw = String(row?.status || '').toLowerCase();
  const errorCodeRaw = String(row?.error_code || '').toLowerCase();
  const errorText = String(row?.error || '').toLowerCase();
  const status =
    statusRaw === 'succeeded' || statusRaw === 'done'
      ? 'succeeded'
      : statusRaw === 'timed_out'
        ? 'timed_out'
        : statusRaw === 'failed' || statusRaw === 'error'
          ? 'failed'
          : statusRaw || null;
  let errorCode = errorCodeRaw || null;
  if (!errorCode) {
    if (errorText.includes('timeout') || errorText.includes('aborted')) errorCode = 'timeout';
    else if (
      errorText.includes('invalid pdf structure') ||
      errorText.includes('bad fcheck') ||
      errorText.includes('flate stream') ||
      errorText.includes('error e301') ||
      errorText.includes('input file corrupted') ||
      errorText.includes('malformed pdf')
    ) errorCode = 'malformed_pdf';
    else if (errorText.includes('no provider returned text')) errorCode = 'no_provider_text';
    else if (
      errorText.includes('unable to extract any text') ||
      errorText.includes('appears to be blank or empty') ||
      errorText.includes('no readable text found') ||
      errorText.includes('unusable_ocr_text')
    ) errorCode = 'unusable_ocr_text';
    else if (errorText) errorCode = 'provider_error';
  }
  const retryableErrorCode =
    errorCode === 'malformed_pdf' ||
    errorCode === 'unusable_ocr_text' ||
    errorCode === 'ocr_empty' ||
    errorCode === 'pdf_worker_missing' ||
    errorCode === 'timeout';
  const hasFailureText =
    errorText.includes('invalid pdf structure') ||
    errorText.includes('bad fcheck') ||
    errorText.includes('flate stream') ||
    errorText.includes('malformed pdf') ||
    errorText.includes('no provider returned text') ||
    errorText.includes('ocr failed') ||
    errorText.includes('unable to extract any text') ||
    errorText.includes('appears to be blank or empty') ||
    errorText.includes('no readable text found') ||
    errorText.includes('input file corrupted') ||
    errorText.includes('provider') ||
    errorText.includes('e301');
  const retryable =
    status === 'failed' ||
    status === 'timed_out' ||
    retryableErrorCode ||
    hasFailureText;
  const pending = statusRaw === 'running' || statusRaw === 'queued' || statusRaw === 'processing';
  const updatedAtMs = Date.parse(String(row?.updated_at || row?.created_at || ''));
  const recent = Number.isFinite(updatedAtMs) ? (Date.now() - updatedAtMs) < 10 * 60 * 1000 : false;
  return {
    status,
    errorCode,
    retryable,
    pending,
    recent,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : null,
  };
}

async function fetchLatestOcrOutcome(
  sb: any,
  docId: string
): Promise<LatestOcrOutcome | null> {
  try {
    const { data } = await sb
      .from('ocr_jobs')
      .select('*')
      .eq('document_id', docId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return normalizeLatestOcrOutcome(data);
  } catch {
    return null;
  }
}

async function fetchRecentOcrGuardOutcome(
  sb: any,
  docId: string
): Promise<LatestOcrOutcome | null> {
  try {
    const { data } = await sb
      .from('ocr_jobs')
      .select('status, error_code, error, updated_at, created_at')
      .eq('document_id', docId)
      .order('updated_at', { ascending: false })
      .limit(6);
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return null;
    const normalized = rows.map((row) => normalizeLatestOcrOutcome(row));
    const latest = normalized[0];
    const latestFailureTs = normalized
      .filter((o) => o.retryable && o.updatedAtMs !== null)
      .reduce((max, o) => Math.max(max, Number(o.updatedAtMs || 0)), 0);
    const latestSuccessTs = normalized
      .filter((o) => o.status === 'succeeded' && o.updatedAtMs !== null)
      .reduce((max, o) => Math.max(max, Number(o.updatedAtMs || 0)), 0);
    // Block when the newest failure is newer than any success in the recent OCR window.
    // This prevents stale parsed imports from being reused right after a failed re-read.
    if (latestFailureTs > 0 && latestFailureTs >= latestSuccessTs) {
      const latestFailure = normalized.find((o) => o.retryable && Number(o.updatedAtMs || 0) === latestFailureTs) || latest;
      return {
        ...latestFailure,
        retryable: true,
        pending: false,
      };
    }
    return latest;
  } catch {
    return fetchLatestOcrOutcome(sb, docId);
  }
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
    const recentGuard = await fetchRecentOcrGuardOutcome(sb, docId);
    if (recentGuard?.retryable) {
      const code = recentGuard.errorCode || (recentGuard.status === 'timed_out' ? 'timeout' : 'provider_error');
      console.warn('[smart-import-sync] fast-fail from recent OCR guard', {
        docId,
        status: recentGuard.status,
        errorCode: code,
      });
      return {
        ok: false,
        len: 0,
        ocrStatus: recentGuard.status || null,
        textHash: null,
        hasStructured: false,
        metricsReady: false,
        reason: `ocr_failed:${code}`,
      };
    }

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
      const ocrProvider = (data?.ocr_provider || data?.ocr_engine || null) as string | null;
      const metadata = data?.metadata && typeof data.metadata === 'object'
        ? (data.metadata as Record<string, any>)
        : {};
      const metadataOcr = metadata?.ocr && typeof metadata.ocr === 'object'
        ? (metadata.ocr as Record<string, any>)
        : {};
      const metadataTextLengthRaw =
        metadata?.ocr_text_length ??
        metadata?.text_length ??
        metadataOcr?.text_length ??
        null;
      const metadataTextLength = Number.isFinite(Number(metadataTextLengthRaw))
        ? Number(metadataTextLengthRaw)
        : 0;
      const metadataTextHash =
        metadata?.text_hash ||
        metadata?.ocr_text_hash ||
        metadataOcr?.text_hash ||
        null;
      const metadataProvider =
        metadata?.ocr_provider ||
        metadataOcr?.provider ||
        null;
      const metadataStatus =
        String(metadata?.ocr_status || metadataOcr?.status || '').toLowerCase();
      const metadataErrorCode =
        String(metadataOcr?.error_code || metadata?.ocr_error_code || metadata?.error_code || '').toLowerCase();
      const metadataErrorText =
        String(metadataOcr?.error || metadata?.ocr_error || metadata?.error || '').toLowerCase();
      const ocrStatusLower = String(ocrStatus || '').toLowerCase();
      const docStatusLower = String(data?.status || '').toLowerCase();
      const docShowsFailure =
        docStatusLower === 'rejected' ||
        docStatusLower === 'failed' ||
        ocrStatusLower === 'failed' ||
        ocrStatusLower === 'timed_out' ||
        metadataStatus === 'failed' ||
        metadataStatus === 'timed_out' ||
        metadataErrorCode === 'malformed_pdf' ||
        metadataErrorCode === 'unusable_ocr_text' ||
        metadataErrorCode === 'timeout' ||
        metadataErrorCode === 'ocr_empty' ||
        metadataErrorCode === 'no_provider_text' ||
        metadataErrorCode === 'provider_error' ||
        metadataErrorText.includes('invalid pdf structure') ||
        metadataErrorText.includes('bad fcheck') ||
        metadataErrorText.includes('flate stream') ||
        metadataErrorText.includes('malformed pdf') ||
        metadataErrorText.includes('no provider returned text') ||
        metadataErrorText.includes('unable to extract any text') ||
        metadataErrorText.includes('appears to be blank or empty') ||
        metadataErrorText.includes('no readable text found') ||
        metadataErrorText.includes('ocr failed') ||
        metadataErrorText.includes('input file corrupted') ||
        metadataErrorText.includes('e301') ||
        metadataErrorText.includes('timeout');
      if (docShowsFailure) {
        const failCode =
          metadataErrorCode ||
          (metadataErrorText.includes('invalid pdf structure') ||
            metadataErrorText.includes('bad fcheck') ||
            metadataErrorText.includes('flate stream') ||
            metadataErrorText.includes('malformed pdf') ||
            metadataErrorText.includes('input file corrupted') ||
            metadataErrorText.includes('e301')
            ? 'malformed_pdf'
            : null) ||
          (ocrStatusLower === 'timed_out' || metadataStatus === 'timed_out' ? 'timeout' : 'provider_error');
        if (failCode === 'unusable_ocr_text') {
          console.log('[smart-import-sync] Skipping normalize; OCR unusable', { docId, reason: `ocr_failed:${failCode}` });
        }
        return {
          ok: false,
          len: textLength,
          ocrStatus: ocrStatus || null,
          textHash,
          hasStructured: false,
          metricsReady: false,
          reason: `ocr_failed:${failCode}`,
        };
      }

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
        .select('*')
        .eq('document_id', docId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const ocrOutcome = normalizeLatestOcrOutcome(ocrJob || {});
      const ocrJobStatus = String(ocrOutcome?.status || '');
      const hasStructured = Boolean(data?.extracted_data) || Boolean(data?.normalized_json) || Boolean(data?.structured_extraction) || Boolean(data?.extraction_artifacts);
      const metricsReady = Boolean(textHash) || textLength >= OCR_EMPTY_MIN_LEN;
      if (ocrOutcome.retryable) {
        console.warn('[smart-import-sync] stage=sync_check_latest_ocr', {
          docId,
          status: ocrOutcome.status,
          errorCode: ocrOutcome.errorCode,
        });
        return {
          ok: false,
          len: textLength,
          ocrStatus: ocrStatus || null,
          textHash,
          hasStructured,
          metricsReady,
          reason: `ocr_failed:${ocrOutcome.errorCode || ocrOutcome.status || 'provider_error'}`,
        };
      }
      const hasReadyMarker = Boolean(
        data?.ocr_completed_at ||
        data?.ocr_engine ||
        data?.ocr_provider ||
        data?.extraction_quality ||
        Number(data?.pages_detected || 0) > 0
      );
      const hasImportRecord = Boolean(importRecord?.id);
      const hasStagingRows = stagingCount > 0;
      const ocrJobDone = ocrJobStatus === 'done' || ocrJobStatus === 'succeeded';
      const normalizedStatus = String(ocrStatus || '').toLowerCase();
      const statusLooksReady =
        normalizedStatus === 'ready' ||
        normalizedStatus === 'ready_cached' ||
        normalizedStatus === 'needs_review' ||
        normalizedStatus === 'rejected';
      const metadataLooksReady =
        metadataStatus === 'ready' ||
        metadataStatus === 'ready_cached';
      const hasStatusProof =
        statusLooksReady &&
        (textLength >= OCR_EMPTY_MIN_LEN || Boolean(textHash) || Boolean(ocrProvider));
      const hasMetadataProof =
        metadataLooksReady ||
        metadataTextLength >= OCR_EMPTY_MIN_LEN ||
        Boolean(metadataTextHash) ||
        Boolean(metadataProvider);
      const hasSafeProofs = metricsReady || hasStructured || hasStagingRows || hasStatusProof || hasMetadataProof;
      const proofsFound = [
        metricsReady,
        hasStructured,
        hasStagingRows,
        hasStatusProof,
        hasMetadataProof,
        hasImportRecord,
        hasReadyMarker,
        ocrJobDone,
      ];
      const hasAnyProof = proofsFound.some(Boolean);
      const hasProofs = proofsFound.some(Boolean);
      if (SYNC_DEBUG_ENABLED) {
        console.log('[smart-import-sync] stage=ocr_proof_check', {
          docId,
          ocr_status: ocrStatus || null,
          ocr_text_length: Number.isFinite(Number(textLengthValue)) ? Number(textLengthValue) : null,
          text_hash_present: Boolean(textHash),
          ocr_provider_present: Boolean(ocrProvider),
          metadata_text_length: metadataTextLength || null,
          metadata_text_hash_present: Boolean(metadataTextHash),
          metadata_provider_present: Boolean(metadataProvider),
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
        hasAnyProof,
      });
      if (shouldMarkNeedsReviewForNoInput) {
        console.warn('[smart-import-sync] cached doc has no input; returning retryable OCR failure', {
          docId,
        });
        return {
          ok: false,
          len: textLength,
          ocrStatus: 'failed',
          textHash,
          hasStructured,
          metricsReady,
          reason: 'ocr_failed:ocr_empty',
        };
      }

      if (hasStagingRows) {
        return { ok: true, len: textLength, ocrStatus: ocrStatus || null, textHash, hasStructured, metricsReady, reason: 'staging_rows_ready' };
      }
      if (hasImportRecord) {
        return { ok: true, len: textLength, ocrStatus: ocrStatus || null, textHash, hasStructured, metricsReady, reason: `import_exists:${importRecord.status}` };
      }
      if (String(ocrStatus).toLowerCase() === 'ready' && !readyForNormalize && Date.now() - start >= READY_EMPTY_GRACE_MS) {
        if (hasAnyProof) {
          return {
            ok: true,
            len: textLength,
            ocrStatus: ocrStatus || null,
            textHash,
            hasStructured,
            metricsReady,
            reason: 'ready_with_proof',
          };
        }
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
        return {
          ok: false,
          len: textLength,
          ocrStatus: 'failed',
          textHash,
          hasStructured,
          metricsReady,
          reason: 'ocr_failed:ocr_empty',
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
  const terminalAfterTimeout = await fetchRecentOcrGuardOutcome(sb, docId);
  if (terminalAfterTimeout?.retryable && String(terminalAfterTimeout.errorCode || '') === 'unusable_ocr_text') {
    console.log('[smart-import-sync] Skipping normalize; OCR unusable', { docId, reason: 'ocr_failed:unusable_ocr_text' });
    return {
      ok: false,
      len: 0,
      ocrStatus: terminalAfterTimeout.status || null,
      textHash: null,
      hasStructured: false,
      metricsReady: false,
      reason: 'ocr_failed:unusable_ocr_text',
    };
  }
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
  payload?: { ocrText?: string; ocrTextHash?: string | null; ocrTextLength?: number | null; traceId?: string }
): Promise<{ ok: boolean; importId?: string; processing?: boolean; reason?: string }> {
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

  // Preflight gate: avoid racing normalize when OCR signals are not persisted yet.
  // This commonly happens when smart-import-sync fires while smart-import-ocr already
  // queued normalize with transient OCR text.
  const hasTransientPayload =
    (typeof payload?.ocrText === 'string' && payload.ocrText.trim().length > 0) ||
    Boolean(payload?.ocrTextHash) ||
    Number(payload?.ocrTextLength || 0) > 0;
  if (!hasTransientPayload) {
    const docSelectAttempts = [
      'id, mime_type, status, ocr_status, ocr_text_hash, ocr_text_length, extracted_data, normalized_json, metadata',
      'id, mime_type, status, ocr_status, ocr_text_hash, ocr_text_length, metadata',
      'id, mime_type, status, ocr_status, metadata',
      'id, mime_type, status',
    ];
    let docRow: any = null;
    for (const selectClause of docSelectAttempts) {
      const { data, error } = await sb
        .from('user_documents')
        .select(selectClause)
        .eq('id', documentId)
        .maybeSingle();
      if (!error) {
        docRow = data;
        break;
      }
    }
    const mimeType = String(docRow?.mime_type || '').toLowerCase();
    const isCsv = mimeType === 'text/csv';
    if (!isCsv) {
      const docOcrStatus = String(docRow?.ocr_status || docRow?.status || '').toLowerCase();
      const persistedHash = String(docRow?.ocr_text_hash || docRow?.extracted_data?.text_hash || '').trim();
      const persistedLenRaw = docRow?.ocr_text_length ?? docRow?.extracted_data?.text_length ?? 0;
      const persistedLen = Number.isFinite(Number(persistedLenRaw)) ? Number(persistedLenRaw) : 0;
      const hasPersistedStructured = Boolean(docRow?.extracted_data) || Boolean(docRow?.normalized_json);
      const metadata = docRow?.metadata && typeof docRow.metadata === 'object' ? docRow.metadata : {};
      const metadataReady = Boolean(
        metadata?.ocr?.status === 'ready' ||
        metadata?.ocr?.status === 'ready_cached' ||
        metadata?.ocr_status === 'ready' ||
        metadata?.ocr_status === 'ready_cached' ||
        metadata?.ocr_text_length ||
        metadata?.text_hash
      );
      const ocrLooksReady =
        docOcrStatus === 'ready' ||
        docOcrStatus === 'ready_cached' ||
        docOcrStatus === 'needs_review' ||
        docOcrStatus === 'rejected';
      const hasPersistedSignals =
        Boolean(persistedHash) ||
        persistedLen > 0 ||
        hasPersistedStructured ||
        metadataReady;
      if (!ocrLooksReady && !hasPersistedSignals) {
        if (SYNC_DEBUG_ENABLED) {
          console.log('[smart-import-sync] normalize preflight waiting for OCR signals', {
            documentId,
            importId: existingImport?.id || null,
            importStatus: existingImport?.status || null,
            ocrStatus: docOcrStatus || null,
          });
        }
        return {
          ok: false,
          importId: existingImport?.id,
          processing: true,
          reason: 'awaiting_ocr_signals',
        };
      }
    }
  }
  
  // Trigger normalization
  try {
    if (OCR_DEBUG_ENABLED) {
      console.log('[smart-import-sync] Triggering normalize-transactions', { documentId });
    }
    const normalizeRes = await fetchWithTimeout(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(payload?.traceId ? { 'x-trace-id': payload.traceId } : {}),
      },
      body: JSON.stringify({
        userId,
        documentId,
        ocrText: typeof payload?.ocrText === 'string' ? payload?.ocrText : undefined,
        ocrTextHash: payload?.ocrTextHash || undefined,
        ocrTextLength: Number.isFinite(Number(payload?.ocrTextLength)) ? Number(payload?.ocrTextLength) : undefined,
      }),
    }, SYNC_DOWNSTREAM_TIMEOUT_MS);
    
    if (!normalizeRes.ok) {
      const errorText = await normalizeRes.text();
      console.error('[smart-import-sync] normalize-transactions failed:', errorText);
      return { ok: false };
    }
    
    const normalizeData = await normalizeRes.json();
    const importId = normalizeData.importId || existingImport?.id;
    if (normalizeData?.reason === 'normalize_in_progress' || normalizeData?.processing === true) {
      if (SYNC_DEBUG_ENABLED) {
        console.log('[smart-import-sync] normalize-transactions still in progress', {
          documentId,
          importId: importId || null,
        });
      }
      return { ok: false, importId, processing: true, reason: 'normalize_in_progress' };
    }
    if (normalizeData?.skipped === true && normalizeData?.reason === 'no_input') {
      const status = String(existingImport?.status || '').toLowerCase();
      if (status === 'parsing' || status === 'normalizing' || status === 'ocr_processing' || status === 'uploaded') {
        if (SYNC_DEBUG_ENABLED) {
          console.log('[smart-import-sync] normalize-transactions reported no_input while import still in-flight', {
            documentId,
            importId: importId || null,
            status,
          });
        }
        return { ok: false, importId, processing: true, reason: 'normalize_no_input_inflight' };
      }
    }
    
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
    const requestImportRunId = String(body?.importRunId || body?.requestId || '').trim();
    const autoCommit = body?.autoCommit !== false;
    const traceId: string = body?.traceId || event.headers['x-trace-id'] || event.headers['X-Trace-Id'] || `trace_${Date.now()}`;
    const syncDebug = process.env.SMART_IMPORT_SYNC_DEBUG === '1';
    const waitForOcrMsRaw = Number(body?.waitForOcrMs);
    const pollForOcrMsRaw = Number(body?.pollForOcrMs);
    const waitForOcrMs = Number.isFinite(waitForOcrMsRaw)
      ? Math.max(0, Math.min(60000, waitForOcrMsRaw))
      : 8000;
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
    
    console.log('[smart-import-sync] Starting sync', { userId: userId.substring(0, 8) + '...', docIds, importRunId: requestImportRunId || null });
    if (syncDebug) {
      console.log('[smart-import-sync][debug] options', {
        autoCommit,
        includeAllAccounts: Boolean(includeAllAccounts),
        waitForOcrMs,
        pollForOcrMs,
      });
    }

    // 1. Find or ensure imports records exist for each docId
    // Note: normalize-transactions creates import records, so if import doesn't exist,
    // we'll trigger normalization which will create it
    const importIds: string[] = [];
    const blockedByLatestOcr: Array<{ importId: string; docId: string; errorCode: string }> = [];
    
    let anyNormalizeProcessing = false;
    for (const docId of docIds) {
      // Doc-level hard gate: if OCR already marked this document failed/rejected,
      // short-circuit immediately even when no import exists yet.
      let { data: sourceDoc } = await sb
        .from('user_documents')
        .select('status, ocr_status, metadata')
        .eq('id', String(docId))
        .eq('user_id', userId)
        .maybeSingle();
      if (!sourceDoc) {
        const { data: sourceDocFallback } = await sb
          .from('user_documents')
          .select('status, ocr_status, metadata')
          .eq('id', String(docId))
          .maybeSingle();
        sourceDoc = sourceDocFallback || null;
      }
      const docStatusPre = String(sourceDoc?.status || '').toLowerCase();
      const docOcrStatusPre = String(sourceDoc?.ocr_status || '').toLowerCase();
      const docImportRunId = String(
        sourceDoc?.metadata?.import_run_id ||
        sourceDoc?.metadata?.importRunId ||
        ''
      ).trim();
      const effectiveImportRunId = requestImportRunId || docImportRunId;
      const isOrphanDoc = !effectiveImportRunId;
      console.log('[smart-import-sync] entry', {
        docId,
        importRunId: effectiveImportRunId || null,
        orphan: isOrphanDoc,
        matchUploadContext: !isOrphanDoc,
      });
      const metadataErrorTextPre = String(
        sourceDoc?.metadata?.ocr?.error ||
        sourceDoc?.metadata?.ocr_error ||
        sourceDoc?.metadata?.error ||
        ''
      ).toLowerCase();
      const metadataErrorCodePre = String(
        sourceDoc?.metadata?.ocr?.error_code ||
        sourceDoc?.metadata?.ocr_error_code ||
        sourceDoc?.metadata?.error_code ||
        ''
      ).toLowerCase();
      const hasDocFailureSignalPre =
        metadataErrorTextPre.includes('no provider returned text') ||
        metadataErrorTextPre.includes('ocr failed') ||
        metadataErrorTextPre.includes('input file corrupted') ||
        metadataErrorTextPre.includes('e301') ||
        metadataErrorTextPre.includes('provider') ||
        metadataErrorCodePre === 'malformed_pdf' ||
        metadataErrorCodePre === 'unusable_ocr_text' ||
        metadataErrorCodePre === 'ocr_empty' ||
        metadataErrorCodePre === 'no_provider_text' ||
        metadataErrorCodePre === 'provider_error' ||
        metadataErrorCodePre === 'timeout';
      if (isOrphanDoc) {
        console.log('[smart-import-sync] Skipping normalize; terminal or orphan doc', {
          docId,
          reason: 'orphan_doc_missing_import_run_id',
          importRunId: null,
        });
        continue;
      }
      if (
        docStatusPre === 'rejected' ||
        docStatusPre === 'failed' ||
        docOcrStatusPre === 'failed' ||
        hasDocFailureSignalPre
      ) {
        console.log('[smart-import-sync] Skipping normalize; terminal or orphan doc', {
          docId,
          reason: 'terminal_doc_state',
          importRunId: effectiveImportRunId,
          docStatus: docStatusPre,
          ocrStatus: docOcrStatusPre,
          errorCode: metadataErrorCodePre || null,
        });
        const guardErrorCode = String(metadataErrorCodePre || (docOcrStatusPre === 'timed_out' ? 'timeout' : 'provider_error'));
        if (guardErrorCode === 'unusable_ocr_text') {
          console.log('[smart-import-sync] Skipping normalize; OCR unusable', { docId, reason: 'ocr_failed:unusable_ocr_text' });
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: false,
            state: mapOcrFailureState(guardErrorCode),
            error_code: guardErrorCode,
            retryable: isOcrFailureRetryable(guardErrorCode),
            importId: null,
            docId,
            docIds,
            importIds: [],
            transactionCount: 0,
          }),
        };
      }

      // Hard pre-check: block sync before import discovery when recent OCR evidence
      // indicates a retryable failure on this document. This prevents stale import reuse.
      const docOcrGuard = await fetchRecentOcrGuardOutcome(sb, String(docId));
      if (docOcrGuard?.retryable) {
        const guardErrorCode = String(docOcrGuard.errorCode || 'provider_error');
        console.warn('[smart-import-sync] stage=sync_guard_doc_latest_ocr_failed', {
          docId,
          status: docOcrGuard.status,
          errorCode: guardErrorCode,
        });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: false,
            state: mapOcrFailureState(guardErrorCode),
            error_code: guardErrorCode,
            retryable: isOcrFailureRetryable(guardErrorCode),
            importId: null,
            docId,
            docIds,
            importIds: [],
            transactionCount: 0,
          }),
        };
      }
      if (docOcrGuard?.pending && docOcrGuard?.recent) {
        anyNormalizeProcessing = true;
        continue;
      }
      // Check if import exists
      let { data: importRecord } = await sb
        .from('imports')
        .select('id, status, document_id')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .maybeSingle();
      if (importRecord?.document_id && String(importRecord.document_id) !== String(docId)) {
        console.warn('[smart-import-sync] Skipping orphan doc mismatch', {
          incomingDocId: String(docId),
          expectedOriginalUploadDocId: String(importRecord.document_id),
          importId: importRecord.id,
          mismatch: true,
        });
        continue;
      }
      
      if (!importRecord) {
        // Import doesn't exist yet - trigger normalization which will create it
        console.log('[smart-import-sync] Import not found, triggering normalization for docId:', docId);
        const waitResult = await waitForOcrReadyOrMetrics(sb, docId, userId, waitForOcrMs, pollForOcrMs);
        if (!waitResult.ok) {
          if (String(waitResult.reason || '').startsWith('ocr_failed:')) {
            const errorCode = String(waitResult.reason || '').split(':')[1] || 'provider_error';
            if (errorCode === 'unusable_ocr_text') {
              console.log('[smart-import-sync] Skipping normalize; OCR unusable', { docId, reason: waitResult.reason });
            }
            console.warn('[smart-import-sync] stage=sync_check_latest_ocr', {
              docId,
              status: 'failed',
              errorCode,
            });
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                ok: false,
                state: mapOcrFailureState(errorCode),
                error_code: errorCode,
                retryable: isOcrFailureRetryable(errorCode),
                importId: null,
                docId,
                docIds,
                importIds: [],
                transactionCount: 0,
              }),
            };
          }
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
        let normalized: { ok: boolean; importId?: string; processing?: boolean; reason?: string } = { ok: false };
        if (!shouldSkipNormalizeTrigger) {
          const { data: docWithText } = await sb
            .from('user_documents')
            .select('ocr_text')
            .eq('id', docId)
            .maybeSingle();
          console.log('[smart-import-sync] normalize_entry', {
            incomingDocId: String(docId),
            expectedOriginalUploadDocId: String(docId),
            importId: importRecord?.id || null,
            mismatch: false,
          });
            
          normalized = await ensureNormalized(sb, docId, userId, netlifyUrl, {
            ocrText: docWithText?.ocr_text || undefined,
            ocrTextHash: waitResult.textHash,
            ocrTextLength: waitResult.len,
            traceId,
          });
          if (normalized.processing) {
            anyNormalizeProcessing = true;
          }
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
      } else {
        if (importRecord?.document_id && String(importRecord.document_id) !== String(docId)) {
          console.warn('[smart-import-sync] Skipping orphan doc mismatch', {
            incomingDocId: String(docId),
            expectedOriginalUploadDocId: String(importRecord.document_id),
            importId: importRecord.id,
            mismatch: true,
          });
          continue;
        }
        // Existing import path: still honor latest OCR failure signals for this doc.
        // Without this gate, a stale parsed/committed import can be reused even when
        // the newest OCR attempt for the same docId just failed.
        const latestOcrOutcome = await fetchRecentOcrGuardOutcome(sb, String(importRecord.document_id || docId));
        if (latestOcrOutcome?.retryable) {
        if (String(latestOcrOutcome.errorCode || '') === 'unusable_ocr_text') {
          console.log('[smart-import-sync] Skipping normalize; OCR unusable', {
            docId: String(importRecord.document_id || docId),
            reason: 'ocr_failed:unusable_ocr_text',
          });
        }
          console.warn('[smart-import-sync] stage=sync_check_latest_ocr (existing import blocked)', {
            importId: importRecord.id,
            docId: String(importRecord.document_id || docId),
            status: latestOcrOutcome.status,
            errorCode: latestOcrOutcome.errorCode,
          });
          blockedByLatestOcr.push({
            importId: importRecord.id,
            docId: String(importRecord.document_id || docId),
            errorCode: latestOcrOutcome.errorCode || 'provider_error',
          });
          continue;
        }
        if (latestOcrOutcome?.pending && latestOcrOutcome?.recent) {
          console.warn('[smart-import-sync] stage=sync_wait_latest_ocr (existing import pending)', {
            importId: importRecord.id,
            docId: String(importRecord.document_id || docId),
            status: latestOcrOutcome.status,
          });
          anyNormalizeProcessing = true;
          continue;
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
    
    if (importIds.length === 0 && blockedByLatestOcr.length > 0) {
      const firstBlocked = blockedByLatestOcr[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: false,
          state: mapOcrFailureState(firstBlocked.errorCode),
          error_code: firstBlocked.errorCode,
          retryable: isOcrFailureRetryable(firstBlocked.errorCode),
          importId: null,
          blockedImportIds: blockedByLatestOcr.map((b) => b.importId),
          docIds,
          importIds: [],
          transactionCount: 0,
        }),
      };
    }

    if (importIds.length === 0 && anyNormalizeProcessing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          processing: true,
          reason: 'ocr_processing',
          docIds,
          importIds: [],
          transactionCount: 0,
        }),
      };
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
        .select('document_id, status, updated_at')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!importRecord || !importRecord.document_id) {
        console.warn('[smart-import-sync] Import missing document_id:', importId);
        continue;
      }

      // Hard safety gate: never auto-commit when the source document is already
      // marked failed/rejected by OCR. This prevents "not ready" statements from
      // being treated as ready due to stale parsed/import state.
      let { data: sourceDoc } = await sb
        .from('user_documents')
        .select('status, ocr_status, metadata, updated_at')
        .eq('id', String(importRecord.document_id))
        .eq('user_id', userId)
        .maybeSingle();
      // Schema/tenant fallback: some environments do not expose user_id on user_documents.
      if (!sourceDoc) {
        const { data: sourceDocFallback } = await sb
          .from('user_documents')
          .select('status, ocr_status, metadata, updated_at')
          .eq('id', String(importRecord.document_id))
          .maybeSingle();
        sourceDoc = sourceDocFallback || null;
      }
      const docStatus = String(sourceDoc?.status || '').toLowerCase();
      const docOcrStatus = String(sourceDoc?.ocr_status || '').toLowerCase();
      const metadataErrorText = String(
        sourceDoc?.metadata?.ocr?.error ||
        sourceDoc?.metadata?.ocr_error ||
        sourceDoc?.metadata?.error ||
        ''
      ).toLowerCase();
      const metadataErrorCode = String(
        sourceDoc?.metadata?.ocr?.error_code ||
        sourceDoc?.metadata?.ocr_error_code ||
        sourceDoc?.metadata?.error_code ||
        ''
      ).toLowerCase();
      const hasDocFailureSignal =
        metadataErrorText.includes('no provider returned text') ||
        metadataErrorText.includes('ocr failed') ||
        metadataErrorText.includes('input file corrupted') ||
        metadataErrorText.includes('e301') ||
        metadataErrorText.includes('provider') ||
        metadataErrorCode === 'malformed_pdf' ||
        metadataErrorCode === 'unusable_ocr_text' ||
        metadataErrorCode === 'ocr_empty' ||
        metadataErrorCode === 'no_provider_text' ||
        metadataErrorCode === 'provider_error' ||
        metadataErrorCode === 'timeout';
      const docProcessingNow =
        docStatus === 'ocr_processing' ||
        docStatus === 'processing' ||
        docOcrStatus === 'processing' ||
        docOcrStatus === 'queued';
      if (docProcessingNow) {
        console.log('[smart-import-sync] source document still processing OCR; deferring import readiness', {
          importId,
          docId: String(importRecord.document_id),
          docStatus: docStatus || null,
          docOcrStatus: docOcrStatus || null,
        });
        anyNormalizeProcessing = true;
        continue;
      }
      if (
        docStatus === 'rejected' ||
        docStatus === 'failed' ||
        docOcrStatus === 'failed' ||
        hasDocFailureSignal
      ) {
        console.warn('[smart-import-sync] blocking import due to document failure state', {
          importId,
          docId: String(importRecord.document_id),
          docStatus: docStatus || null,
          docOcrStatus: docOcrStatus || null,
          metadataErrorCode: metadataErrorCode || null,
        });
        blockedByLatestOcr.push({
          importId,
          docId: String(importRecord.document_id),
          errorCode: metadataErrorCode || 'ocr_failed',
        });
        continue;
      }

      const latestOcrOutcome = await fetchRecentOcrGuardOutcome(sb, String(importRecord.document_id));
      if (latestOcrOutcome?.retryable) {
        console.warn('[smart-import-sync] stage=sync_check_latest_ocr', {
          importId,
          docId: String(importRecord.document_id),
          status: latestOcrOutcome.status,
          errorCode: latestOcrOutcome.errorCode,
        });
        blockedByLatestOcr.push({
          importId,
          docId: String(importRecord.document_id),
          errorCode: latestOcrOutcome.errorCode || 'provider_error',
        });
        continue;
      }
      if (latestOcrOutcome?.pending && latestOcrOutcome?.recent) {
        console.warn('[smart-import-sync] stage=sync_wait_latest_ocr', {
          importId,
          docId: String(importRecord.document_id),
          status: latestOcrOutcome.status,
        });
        anyNormalizeProcessing = true;
        continue;
      }
      
      // If already parsed or committed, we're good
      if (importRecord.status === 'parsed' || importRecord.status === 'committed') {
        readyImportIds.push(importId);
        continue;
      }

      // Ensure normalized
      const normalized = await ensureNormalized(sb, importRecord.document_id, userId, netlifyUrl, { traceId });
      if (normalized.processing) {
        anyNormalizeProcessing = true;
        continue;
      }
      
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
    if (readyImportIds.length === 0 && anyNormalizeProcessing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          processing: true,
          reason: 'normalize_in_progress',
          docIds,
          importIds,
          transactionCount: 0,
        }),
      };
    }
    if (readyImportIds.length === 0 && blockedByLatestOcr.length > 0) {
      const firstBlocked = blockedByLatestOcr[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: false,
          state: mapOcrFailureState(firstBlocked.errorCode),
          error_code: firstBlocked.errorCode,
          retryable: isOcrFailureRetryable(firstBlocked.errorCode),
          importId: null,
          blockedImportIds: blockedByLatestOcr.map((b) => b.importId),
          docIds,
          importIds: [],
          transactionCount: 0,
        }),
      };
    }

    if (!autoCommit) {
      if (syncDebug) {
        console.log('[smart-import-sync][debug] autoCommit=false, returning ready imports only', { readyImportIds });
      }
      const noCommitResult: SmartImportSyncResult & Record<string, any> = {
        docIds,
        importIds: readyImportIds,
        transactionCount: 0,
        readyImportIds,
        pendingApprovalImportIds: readyImportIds,
        committedImportIds: [],
        approvalRequired: readyImportIds.length > 0,
      };
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(noCommitResult),
      };
    }

    // 3. Commit all ready imports
    let totalTransactionCount = 0;
    const summaries: Record<string, any> = {};
    const issuesByImport: Record<string, any> = {};
    const committedImportIds: string[] = [];
    
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
        // Auto-commit path must persist approval server-side before commit gate.
        const { data: approvalRow } = await sb
          .from('imports')
          .select('approved_at')
          .eq('id', importId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!approvalRow?.approved_at) {
          const nowIso = new Date().toISOString();
          await sb
            .from('imports')
            .update({ approved_at: nowIso, updated_at: nowIso })
            .eq('id', importId)
            .eq('user_id', userId)
            .eq('status', 'parsed');
          console.log('[APPROVAL] Auto-approved import for autoCommit', { importId, userId });
        }

        const commitRes = await fetchWithTimeout(`${netlifyUrl}/.netlify/functions/commit-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
            'x-trace-id': traceId,
          },
          body: JSON.stringify({ importId }),
        }, SYNC_DOWNSTREAM_TIMEOUT_MS);
        
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          const committed = commitData.committed || commitData.insertedCount || 0;
          totalTransactionCount += committed;
          committedImportIds.push(importId);
          if (commitData?.summary) {
            // Tag as analytics-only data so consumers know this is NOT a display narrative.
            // Display narratives are rendered exclusively by prime-summary (the sole renderer of
            // StatementBreakdown written by commit-import). See: prime-summary.ts.
            summaries[importId] = { ...commitData.summary, _source: 'commit_analytics' };
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
      // Include overlap warnings detected during normalization (non-blocking signal).
      if (readyImportIds.length > 0) {
        const { data: overlapRows } = await sb
          .from('imports')
          .select('id, metadata')
          .in('id', readyImportIds)
          .eq('user_id', userId);
        for (const row of overlapRows || []) {
          const overlapWarning = String(row?.metadata?.overlap_warning || '').trim();
          if (overlapWarning) {
            warnings.push(`[OVERLAP] import ${row.id}: ${overlapWarning}`);
          }
        }
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

      // --- Approve + Commit ready imports ---
      if (readyImportIds.length > 0) {
        const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
        for (const importId of readyImportIds) {
          try {
            await fetch(`${netlifyUrl}/.netlify/functions/approve-import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
              body: JSON.stringify({ importId, userId }),
            });
            await fetch(`${netlifyUrl}/.netlify/functions/commit-import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
              },
              body: JSON.stringify({ importId, userId }),
            });
            console.log('[COMMIT] import committed:', importId);
          } catch (commitErr: any) {
            console.error('[COMMIT] approve/commit failed:', importId, commitErr?.message || commitErr);
          }
        }
      }

      // --- Byte -> Prime announcement ---
      // Uses the existing helper to convert unannounced byte.import.completed events
      // into exactly-once chat_messages in Prime's thread.
      try {
        const { announceByteCompletionToPrime } = await import('./_shared/primeByteAnnouncement.js');
        const announced = await announceByteCompletionToPrime(userId);
        console.log('[BYTE ANNOUNCEMENT]', {
          userId,
          importRunId,
          announced: announced?.announced === true,
          reason: announced?.reason || null,
        });
      } catch (announceError: any) {
        console.error('[BYTE ANNOUNCEMENT] Failed:', announceError);
      }

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
      readyImportIds,
      pendingApprovalImportIds: [],
      committedImportIds,
      approvalRequired: false,
    };
    if (Object.keys(summaries).length > 0) {
      // `summaries` / `summary` hold lightweight per-import analytics objects from commit-import
      // (totals, top categories, date range).  These are NOT display narratives.
      // Display narratives are rendered exclusively by prime-summary from StatementBreakdown in DB.
      // Each entry is tagged with _source:'commit_analytics' to prevent misuse as narrative text.
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



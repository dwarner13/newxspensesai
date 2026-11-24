import { Handler } from '@netlify/functions';
import { createHash, randomUUID } from 'crypto';
import { admin } from './_shared/upload.js';
import { authenticateUser, claimedUserIdMatches } from './_shared/internalJobAuth.js';
import {
  CHAT_DOCUMENT_MAX_BYTES,
  CHAT_DOCUMENT_PURPOSE,
  CHAT_DOCUMENT_TYPES,
  chatDocumentModeEnabled,
  effectivePurpose,
  parseRequestedPurpose,
  type DocumentPurpose,
} from './_shared/documentPurpose.js';
import { claimChatDocumentUpload, resolveChatDocumentLimits } from './_shared/chatDocumentQuota.js';

const MAX_FILE_NAME_LENGTH = 180;

/**
 * P0-C2a: reduce a client-supplied file name to a safe single path segment.
 * Strips control characters and any directory part (both / and \), removes leading dots
 * (".", "..", hidden files), replaces characters that are unsafe in storage keys, and caps the
 * length while keeping the extension. Returns '' when nothing usable is left.
 */
export function sanitizeUploadFileName(raw: unknown): string {
  let name = [...String(raw ?? '')]
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  name = name.split(/[\\/]/).pop() || '';
  name = name.replace(/^\.+/, '').replace(/[<>:"|?*]/g, '_').trim();
  if (name.length > MAX_FILE_NAME_LENGTH) {
    const ext = name.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || '';
    name = name.slice(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
  }
  return name;
}

/** A storage path is usable only if it lives inside the verified user's own folder. */
function isOwnedStoragePath(storagePath: string | null | undefined, userId: string): boolean {
  const p = String(storagePath || '');
  return p.startsWith(`${userId}/`) && !p.split('/').includes('..');
}

type ExistingDoc = {
  id: string;
  status: string | null;
  storage_path: string | null;
  file_url?: string | null;
  storage_key?: string | null;
  original_url?: string | null;
  redacted_url?: string | null;
  original_name: string | null;
  mime_type: string | null;
  extracted_data?: any;
  content_hash?: string | null;
  ocr_completed_at?: string | null;
  ocr_text?: string | null;
  [key: string]: any;
};

const BUCKET = 'docs';

function isOcrLikeMime(mime: string | null | undefined): boolean {
  const normalized = String(mime || '').toLowerCase();
  return normalized === 'application/pdf' || normalized.startsWith('image/');
}

function isOcrLikeFileName(fileName: string | null | undefined): boolean {
  const normalized = String(fileName || '').toLowerCase().trim();
  return (
    normalized.endsWith('.pdf') ||
    normalized.endsWith('.png') ||
    normalized.endsWith('.jpg') ||
    normalized.endsWith('.jpeg') ||
    normalized.endsWith('.webp') ||
    normalized.endsWith('.heic')
  );
}

function toInt(input: unknown, fallback = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function inferMimeTypeFromFileName(fileName: string | null | undefined): string | null {
  const lower = String(fileName || '').trim().toLowerCase();
  if (!lower) return null;
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.csv')) return 'text/csv';
  return null;
}

function normalizeMimeType(rawMime: string | null | undefined, fileName: string | null | undefined): string {
  const trimmed = String(rawMime || '').trim().toLowerCase();
  const inferred = inferMimeTypeFromFileName(fileName);
  // Force PDF uploads to keep canonical MIME even when callers send generic types.
  if (inferred === 'application/pdf') return 'application/pdf';
  if (trimmed && trimmed !== 'application/octet-stream') return trimmed;
  return inferred || 'application/octet-stream';
}

function computeUploadHash(args: {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
  purpose?: DocumentPurpose;
}): string {
  const parts = [
    args.userId.trim().toLowerCase(),
    args.fileName.trim().toLowerCase(),
    String(args.fileSize || 0),
    args.mimeType.trim().toLowerCase(),
    String(args.lastModified || 0),
  ];
  // Attachments B1: chat documents never share an upload hash with an import of the same file.
  // Import hashes are unchanged.
  if (args.purpose === CHAT_DOCUMENT_PURPOSE) parts.push('purpose=chat_document');
  const normalized = parts.join('|');
  return createHash('sha256').update(normalized).digest('hex');
}

async function fetchOcrJobStatus(
  sb: any,
  userId: string,
  docId?: string | null,
  contentHash?: string | null
): Promise<string | null> {
  if (docId) {
    const { data: byDoc, error: byDocError } = await sb
      .from('ocr_jobs')
      .select('status')
      .eq('user_id', userId)
      .eq('document_id', docId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!byDocError && byDoc?.status) {
      return byDoc.status;
    }
  }
  if (!contentHash) return null;
  const { data, error } = await sb
    .from('ocr_jobs')
    .select('status')
    .eq('user_id', userId)
    .eq('file_hash', contentHash)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data?.status || null;
}

function hasExtractedDataSignal(extractedData: any): boolean {
  if (!extractedData || typeof extractedData !== 'object') return false;
  if (extractedData?.fields && typeof extractedData.fields === 'object') return true;
  if (extractedData?.normalized_json?.fields && typeof extractedData.normalized_json.fields === 'object') return true;
  return false;
}

function hasFileReference(doc: ExistingDoc): boolean {
  const candidates = [
    doc.storage_path,
    doc.file_url,
    doc.storage_key,
    doc.original_url,
    doc.redacted_url,
  ];
  return candidates.some((value) => typeof value === 'string' && value.trim().length > 0);
}

function safeToSkipUpload(
  doc: ExistingDoc,
  ocrJobStatus: string | null,
  hasFileRefOverride?: boolean | null
): { safe: boolean; reason: string } {
  const hasOcrText = typeof doc.ocr_text === 'string' && doc.ocr_text.trim().length > 0;
  const updatedAtMs = Date.parse(String(doc?.updated_at || ''));
  const ageMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;
  const OCR_STALE_MS = 2 * 60 * 1000;
  const isStaleProcessingWithoutText =
    doc?.status === 'ocr_processing' &&
    !hasOcrText &&
    ageMs > OCR_STALE_MS &&
    ocrJobStatus !== 'done';

  // If a reused document is stuck in OCR for too long with no text,
  // force a fresh upload/finalize path so OCR can be re-triggered.
  if (isStaleProcessingWithoutText) {
    return { safe: false, reason: 'stale_ocr_processing_without_text' };
  }

  const hasFileRef = typeof hasFileRefOverride === 'boolean' ? hasFileRefOverride : hasFileReference(doc);
  if (hasFileRef) {
    return { safe: true, reason: 'has_file_ref' };
  }
  const hasExtractedData = hasExtractedDataSignal(doc.extracted_data);
  if (hasExtractedData) {
    return { safe: true, reason: 'has_extracted_data' };
  }
  if (ocrJobStatus === 'running' || ocrJobStatus === 'done') {
    return { safe: true, reason: ocrJobStatus === 'running' ? 'has_ocr_job_running' : 'has_ocr_job_done' };
  }
  return { safe: false, reason: 'missing_file_ref_extracted_data_and_ocr_job' };
}

async function createSignedUrl(sb: any, storagePath: string | null | undefined): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error) return null;
  return data?.signedUrl || null;
}

async function storageObjectExists(sb: any, storagePath: string | null | undefined): Promise<boolean> {
  const rawPath = String(storagePath || '').trim();
  if (!rawPath) return false;
  const parts = rawPath.split('/').filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) return false;
  const parentDir = parts.join('/');
  const { data, error } = await sb.storage
    .from(BUCKET)
    .list(parentDir, { limit: 1000, search: fileName });
  if (error || !Array.isArray(data)) return false;
  return data.some((item: any) => item?.name === fileName);
}

function buildInitResponse(args: {
  doc: ExistingDoc;
  status: 'created' | 'reused';
  uploadUrl: string | null;
  uploadHash: string;
  ocrJobStatus?: string | null;
  hasLiveStorageObject?: boolean | null;
  forceReupload?: boolean;
}) {
  const extracted = args.doc.extracted_data || null;
  const confidence = extracted?.confidence?.overall ?? null;
  const hasExtracted = hasExtractedDataSignal(extracted);
  const hasRecordedFileRef = hasFileReference(args.doc);
  const hasFileRef = args.hasLiveStorageObject === false ? false : hasRecordedFileRef;
  const defaultSkipDecision = safeToSkipUpload(args.doc, args.ocrJobStatus || null, hasFileRef);
  const skipDecision = args.forceReupload
    ? { safe: false, reason: 'ocr_reupload_required' }
    : defaultSkipDecision;
  return {
    docId: args.doc.id,
    document_id: args.doc.id,
    uploadUrl: args.uploadUrl,
    storagePath: args.doc.storage_path,
    status: args.status,
    processingStatus: args.doc.status || null,
    uploadHash: args.uploadHash,
    extracted_data: extracted,
    confidence,
    hasFileRef,
    purpose: effectivePurpose(args.doc),
    hasExtractedData: hasExtracted,
    ocrJobStatus: args.ocrJobStatus || null,
    safeToSkipUpload: skipDecision.safe,
    safeToSkipReason: skipDecision.reason,
    alreadyProcessed:
      Boolean(args.doc.ocr_completed_at) ||
      (typeof args.doc.ocr_text === 'string' && args.doc.ocr_text.trim().length > 0) ||
      args.ocrJobStatus === 'done',
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // P0-C2a: identity comes only from the verified Supabase JWT; checked before any database or
  // storage access. A client-supplied userId must match if present.
  const authn = await authenticateUser(event);
  if (!authn.ok) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = authn.principal.userId;

  try {
    const body = JSON.parse(event.body || '{}');
    if (!claimedUserIdMatches(body?.userId, userId)) {
      console.warn('[smart-import-init] stage=auth_denied', { code: 'identity_mismatch' });
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    const {
      fileSize,
      mimeType,
      mime,
      lastModified,
      source,
    } = body;
    const fileName = sanitizeUploadFileName(body?.fileName);

    if (!fileName) {
      console.error('[smart-import-init] Missing required fields:', { fileName: false });
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields',
          missing: {
            fileName: true,
          },
        })
      };
    }

    // Attachments B1: purpose is decided here, server-side, once. Absent = 'import' (unchanged).
    const purposeParse = parseRequestedPurpose(body?.purpose);
    if (!purposeParse.ok) {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_purpose' }) };
    }
    const purpose = purposeParse.purpose;

    const sb = admin();
    const effectiveMime = normalizeMimeType(mimeType || mime, fileName);
    const normalizedFileSize = toInt(fileSize, 0);
    const normalizedLastModified = toInt(lastModified, 0);

    if (purpose === CHAT_DOCUMENT_PURPOSE) {
      if (!chatDocumentModeEnabled()) {
        return { statusCode: 403, body: JSON.stringify({ error: 'chat_documents_disabled' }) };
      }
      if (!(CHAT_DOCUMENT_TYPES as readonly string[]).includes(effectiveMime)) {
        return { statusCode: 415, body: JSON.stringify({ error: 'unsupported_file_type' }) };
      }
      // The declared size is only a first check; smart-import-finalize re-checks the stored bytes.
      if (normalizedFileSize <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'file_size_required' }) };
      }
      if (normalizedFileSize > CHAT_DOCUMENT_MAX_BYTES) {
        return { statusCode: 413, body: JSON.stringify({ error: 'file_too_large' }) };
      }
      // Attachments E8: atomic per-user upload quota (verified user id only), checked after the
      // cheap validation so rejected requests don't use quota. Fails closed if unavailable.
      const quota = await claimChatDocumentUpload(sb, userId, await resolveChatDocumentLimits(userId));
      if (!quota.allowed) {
        if ('unavailable' in quota) {
          console.warn('[smart-import-init] chat document quota unavailable');
          return { statusCode: 503, body: JSON.stringify({ error: 'chat_documents_unavailable' }) };
        }
        console.warn('[smart-import-init] chat document quota reached', { scope: quota.scope });
        return {
          statusCode: 429,
          headers: { 'Retry-After': String(quota.retryAfterSeconds) },
          body: JSON.stringify({ error: 'chat_document_limit', scope: quota.scope, retryAfterSeconds: quota.retryAfterSeconds }),
        };
      }
    }

    const uploadHash = computeUploadHash({
      userId,
      fileName,
      fileSize: normalizedFileSize,
      mimeType: effectiveMime,
      lastModified: normalizedLastModified,
      purpose,
    });

    let existingByUploadHash: ExistingDoc | null = null;
    const { data: existingDocData, error: existingDocError } = await sb
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('upload_hash', uploadHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    // Only reuse a document whose storage path is inside this user's folder.
    if (
      !existingDocError &&
      existingDocData &&
      isOwnedStoragePath(existingDocData.storage_path, userId) &&
      effectivePurpose(existingDocData) === purpose
    ) {
      existingByUploadHash = existingDocData;
    }

    if (existingByUploadHash?.id) {
      const ocrJobStatus = await fetchOcrJobStatus(sb, userId, existingByUploadHash.id, existingByUploadHash.content_hash);
      const hasLiveStorageObject = await storageObjectExists(sb, existingByUploadHash.storage_path);
      const forceReupload = isOcrLikeMime(effectiveMime) || isOcrLikeFileName(fileName);
      if (forceReupload) {
        // For OCR-backed docs, always create a fresh document row.
        // Reusing docId can cause stale parsed imports/summaries to leak through.
      } else {
      console.log('[smart-import-init] doc_row_reused', {
        docId: existingByUploadHash.id,
        sourcePath: 'smart-import-init:upload_hash_reuse',
        requestId: String(body?.requestId || body?.importRunId || ''),
      });
      const uploadUrl = (!forceReupload && (existingByUploadHash.status === 'ready' || ocrJobStatus === 'done') && hasLiveStorageObject)
        ? null
        : await createSignedUrl(sb, existingByUploadHash.storage_path);

      return {
        statusCode: 200,
        body: JSON.stringify(
          buildInitResponse({
            doc: existingByUploadHash,
            status: 'reused',
            uploadUrl,
            uploadHash,
            ocrJobStatus,
            hasLiveStorageObject,
            forceReupload,
          })
        )
      };
      }
    }

    const docId = randomUUID();
    const storagePath = `${userId}/${docId}/${fileName}`;
    const insertPayload: Record<string, any> = {
      id: docId,
      user_id: userId,
      source: source || 'upload',
      original_name: fileName,
      storage_path: storagePath,
      mime_type: effectiveMime,
      status: 'uploading',
      upload_hash: uploadHash,
      purpose,
      updated_at: new Date().toISOString(),
    };
    if (normalizedFileSize > 0) {
      insertPayload.file_size = normalizedFileSize;
    }

    let insertedDoc: ExistingDoc | null = null;
    let insertError: any = null;
    ({ data: insertedDoc, error: insertError } = await sb
      .from('user_documents')
      .insert(insertPayload)
      .select('*')
      .single());
    // Attachments B1: before the purpose migration is applied, imports keep working without the
    // column; chat documents cannot be created at all (fail closed).
    if (insertError && /purpose/i.test(String(insertError.message || '')) && /does not exist|schema cache/i.test(String(insertError.message || ''))) {
      if (purpose === CHAT_DOCUMENT_PURPOSE) {
        return { statusCode: 503, body: JSON.stringify({ error: 'chat_documents_unavailable' }) };
      }
      delete insertPayload.purpose;
      ({ data: insertedDoc, error: insertError } = await sb
        .from('user_documents')
        .insert(insertPayload)
        .select('*')
        .single());
    }
    if (insertError && String(insertError.message || '').includes('upload_hash')) {
      delete insertPayload.upload_hash;
      ({ data: insertedDoc, error: insertError } = await sb
        .from('user_documents')
        .insert(insertPayload)
        .select('*')
        .single());
    }
    if (insertError && String(insertError.message || '').includes('file_size')) {
      delete insertPayload.file_size;
      ({ data: insertedDoc, error: insertError } = await sb
        .from('user_documents')
        .insert(insertPayload)
        .select('*')
        .single());
    }

    // Handle idempotent race when unique(upload_hash) exists.
    if (insertError && (insertError.code === '23505' || String(insertError.message || '').toLowerCase().includes('duplicate'))) {
      const { data: racedDoc } = await sb
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('upload_hash', uploadHash)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (racedDoc?.id) {
        if (isOcrLikeMime(effectiveMime) || isOcrLikeFileName(fileName)) {
          // Keep going so we insert a fresh row without upload_hash (fallback below),
          // rather than reusing a raced OCR document.
          delete insertPayload.upload_hash;
          ({ data: insertedDoc, error: insertError } = await sb
            .from('user_documents')
            .insert(insertPayload)
            .select('*')
            .single());
          if (!insertError && insertedDoc) {
            // Fresh insert recovered; continue normal created response path.
          } else {
            // If still colliding, fall back to existing raced doc to avoid hard failure.
          }
        }
      }
      if (
        racedDoc?.id &&
        (!insertedDoc || insertError) &&
        isOwnedStoragePath(racedDoc.storage_path, userId) &&
        effectivePurpose(racedDoc) === purpose
      ) {
        console.log('[smart-import-init] doc_row_reused', {
          docId: racedDoc.id,
          sourcePath: 'smart-import-init:race_reuse',
          requestId: String(body?.requestId || body?.importRunId || ''),
        });
        const ocrJobStatus = await fetchOcrJobStatus(sb, userId, racedDoc.id, racedDoc.content_hash);
        const hasLiveStorageObject = await storageObjectExists(sb, racedDoc.storage_path);
        const forceReupload = isOcrLikeMime(effectiveMime) || isOcrLikeFileName(fileName);
        const uploadUrl = (!forceReupload && (racedDoc.status === 'ready' || ocrJobStatus === 'done') && hasLiveStorageObject)
          ? null
          : await createSignedUrl(sb, racedDoc.storage_path);
        return {
          statusCode: 200,
          body: JSON.stringify(
            buildInitResponse({
              doc: racedDoc,
              status: 'reused',
              uploadUrl,
              uploadHash,
              ocrJobStatus,
              hasLiveStorageObject,
              forceReupload,
            })
          ),
        };
      }
    }

    if (insertError || !insertedDoc) {
      console.error('[smart-import-init] Database error:', insertError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create document' })
      };
    }
    console.log('[smart-import-init] doc_row_created', {
      docId: insertedDoc.id,
      sourcePath: 'smart-import-init:create',
      requestId: String(body?.requestId || body?.importRunId || ''),
    });

    const uploadUrl = await createSignedUrl(sb, storagePath);
    if (!uploadUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to generate upload URL' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(
        buildInitResponse({
          doc: insertedDoc,
          status: 'created',
          uploadUrl,
          uploadHash,
          ocrJobStatus: null,
        })
      )
    };
  } catch (e: any) {
    console.error('[smart-import-init] Error:', e?.name || 'Error');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'init_failed' })
    };
  }
};

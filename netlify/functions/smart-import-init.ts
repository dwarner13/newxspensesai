import { Handler } from '@netlify/functions';
import { createHash, randomUUID } from 'crypto';
import { admin } from './_shared/upload.js';

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

function toInt(input: unknown, fallback = 0): number {
  const n = Number(input);
  return Number.isFinite(n) ? n : fallback;
}

function computeUploadHash(args: {
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  lastModified: number;
}): string {
  const normalized = [
    args.userId.trim().toLowerCase(),
    args.fileName.trim().toLowerCase(),
    String(args.fileSize || 0),
    args.mimeType.trim().toLowerCase(),
    String(args.lastModified || 0),
  ].join('|');
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

function safeToSkipUpload(doc: ExistingDoc, ocrJobStatus: string | null): { safe: boolean; reason: string } {
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

  const hasFileRef = hasFileReference(doc);
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
    .from('docs')
    .createSignedUploadUrl(storagePath);
  if (error) return null;
  return data?.signedUrl || null;
}

function buildInitResponse(args: {
  doc: ExistingDoc;
  status: 'created' | 'reused';
  uploadUrl: string | null;
  uploadHash: string;
  ocrJobStatus?: string | null;
}) {
  const extracted = args.doc.extracted_data || null;
  const confidence = extracted?.confidence?.overall ?? null;
  const hasExtracted = hasExtractedDataSignal(extracted);
  const hasFileRef = hasFileReference(args.doc);
  const skipDecision = safeToSkipUpload(args.doc, args.ocrJobStatus || null);
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

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      userId,
      fileName,
      fileSize,
      mimeType,
      mime,
      lastModified,
      source,
    } = body;
    
    if (!userId || !fileName) {
      console.error('[smart-import-init] Missing required fields:', { userId: !!userId, fileName: !!fileName });
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missing: {
            userId: !userId,
            fileName: !fileName,
          },
        }) 
      };
    }

    const sb = admin();
    const effectiveMime = String(mimeType || mime || 'application/octet-stream');
    const normalizedFileSize = toInt(fileSize, 0);
    const normalizedLastModified = toInt(lastModified, 0);
    const uploadHash = computeUploadHash({
      userId,
      fileName,
      fileSize: normalizedFileSize,
      mimeType: effectiveMime,
      lastModified: normalizedLastModified,
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
    if (!existingDocError) {
      existingByUploadHash = existingDocData;
    }

    if (existingByUploadHash?.id) {
      const ocrJobStatus = await fetchOcrJobStatus(sb, userId, existingByUploadHash.id, existingByUploadHash.content_hash);
      const uploadUrl = existingByUploadHash.status === 'ready' || ocrJobStatus === 'done'
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
          })
        )
      };
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
        const ocrJobStatus = await fetchOcrJobStatus(sb, userId, racedDoc.id, racedDoc.content_hash);
        const uploadUrl = racedDoc.status === 'ready' || ocrJobStatus === 'done'
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
    console.error('[smart-import-init] Error:', e);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message }) 
    };
  }
};

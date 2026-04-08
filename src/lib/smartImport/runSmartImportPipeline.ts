import { safeToSkipUpload, logReuseDecision, pollRunningOcrJob } from '../upload/safeToSkipUpload';

export type SmartImportPipelineInput = {
  userId: string;
  source?: 'upload' | 'chat';
  file?: File;
  base64?: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  lastModified?: number;
  requestId?: string;
  authToken?: string;
  onProgress?: (progress: number) => void;
};

export type SmartImportPipelineResult = {
  docId: string;
  importId?: string;
  importIds?: string[];
  queued: boolean;
  via: 'ocr' | 'statement-parse' | 'vision-parse' | 'unsupported';
  reused?: boolean;
  reuseReason?: string;
  rejected?: boolean;
  reason?: string;
  pii_redacted?: boolean;
  pii_types?: string[];
  transactionCount?: number;
  normalizedTransactionCount?: number;
  stats?: {
    transactionCount?: number;
  };
};

function isTerminalRouterOcrFailure(payload: any): boolean {
  const details = payload?.details || null;
  const firstItem = Array.isArray(details?.items) ? details.items[0] : null;
  const state = String(payload?.state || details?.state || '').toLowerCase();
  const errorCode = String(
    payload?.error_code ||
    details?.error_code ||
    firstItem?.error_code ||
    ''
  ).toLowerCase();
  const error = String(
    payload?.error ||
    details?.error ||
    firstItem?.error ||
    ''
  ).toLowerCase();
  return (
    state === 'ocr_failed_retry' ||
    state === 'ocr_timed_out_retry' ||
    errorCode === 'malformed_pdf' ||
    errorCode === 'unusable_ocr_text' ||
    errorCode === 'no_provider_text' ||
    errorCode === 'provider_error' ||
    errorCode === 'timeout' ||
    error.includes('malformed_or_unsupported_pdf') ||
    error.includes('invalid pdf structure') ||
    error.includes('bad fcheck') ||
    error.includes('flate stream') ||
    error.includes('error e301') ||
    error.includes('input file corrupted') ||
    error.includes('unable to extract any text') ||
    error.includes('appears to be blank or empty') ||
    error.includes('no readable text found')
  );
}

function toTerminalOcrUserMessage(payload: any, item?: any): string {
  const details = payload?.details || null;
  const firstItem = item || (Array.isArray(details?.items) ? details.items[0] : null);
  const errorCode = String(
    payload?.error_code ||
    details?.error_code ||
    firstItem?.error_code ||
    ''
  ).toLowerCase();
  const error = String(
    payload?.error ||
    payload?.primeMessage ||
    details?.error ||
    firstItem?.error ||
    ''
  ).toLowerCase();
  if (errorCode === 'unusable_ocr_text' || error.includes('unable to extract any text') || error.includes('blank or empty')) {
    return 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.';
  }
  if (
    errorCode === 'malformed_pdf' ||
    error.includes('invalid pdf structure') ||
    error.includes('bad fcheck') ||
    error.includes('flate stream') ||
    error.includes('error e301') ||
    error.includes('input file corrupted') ||
    error.includes('no provider returned text')
  ) {
    return 'Unreadable PDF structure. Please re-save this PDF and upload the new copy.';
  }
  return String(payload?.error || payload?.primeMessage || firstItem?.error || 'OCR processing failed');
}

const inFlightPipelines = new Map<string, Promise<SmartImportPipelineResult>>();

function buildPreInitPipelineKey(input: SmartImportPipelineInput): string {
  const size = input.fileSize ?? input.file?.size ?? 0;
  const lm = input.lastModified ?? input.file?.lastModified ?? 0;
  return [
    input.userId,
    input.fileName,
    input.mimeType,
    String(size),
    String(lm),
    input.source || 'upload',
  ].join('|');
}

function getAuthHeaders(input: SmartImportPipelineInput): Record<string, string> {
  return input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {};
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');
}

async function logPdfUploadProbe(input: SmartImportPipelineInput): Promise<void> {
  const isPdf =
    (input.mimeType || '').toLowerCase() === 'application/pdf' ||
    String(input.fileName || '').toLowerCase().endsWith('.pdf');
  if (!isPdf) return;
  try {
    if (input.file) {
      const first16 = new Uint8Array(await input.file.slice(0, 16).arrayBuffer());
      const first8 = first16.slice(0, 8);
      const tailStart = Math.max(0, input.file.size - 32);
      const last32 = new Uint8Array(await input.file.slice(tailStart, input.file.size).arrayBuffer());
      const tailWindowStart = Math.max(0, input.file.size - 256);
      const tailWindow = new Uint8Array(await input.file.slice(tailWindowStart, input.file.size).arrayBuffer());
      const tailAscii = bytesToAscii(tailWindow);
      console.log('[upload-pdf-debug] frontend_before_upload', {
        fileName: input.file.name,
        mimeType: input.file.type || input.mimeType,
        fileSize: input.file.size,
        first16Hex: bytesToHex(first16),
        first8Ascii: bytesToAscii(first8),
        last32Hex: bytesToHex(last32),
        tailHasEof: tailAscii.includes('%%EOF'),
      });
      return;
    }
    if (typeof input.base64 === 'string' && input.base64.length > 0) {
      const normalizedBase64 = input.base64.includes(',')
        ? input.base64.slice(input.base64.indexOf(',') + 1)
        : input.base64;
      const decoded = Uint8Array.from(atob(normalizedBase64), (c) => c.charCodeAt(0));
      const first16 = decoded.slice(0, 16);
      const first8 = decoded.slice(0, 8);
      const last32 = decoded.slice(Math.max(0, decoded.length - 32));
      const tailAscii = bytesToAscii(decoded.slice(Math.max(0, decoded.length - 256)));
      console.log('[upload-pdf-debug] frontend_before_upload_base64', {
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSize: decoded.length,
        first16Hex: bytesToHex(first16),
        first8Ascii: bytesToAscii(first8),
        last32Hex: bytesToHex(last32),
        tailHasEof: tailAscii.includes('%%EOF'),
      });
    }
  } catch (error: any) {
    console.warn('[upload-pdf-debug] frontend_probe_failed', {
      error: error?.message || String(error),
    });
  }
}

async function runViaPrimeRouter(input: SmartImportPipelineInput): Promise<SmartImportPipelineResult | null> {
  // Prime Router mode A requires multipart/form-data; keep legacy path for base64 callers.
  if (!input.file) return null;
  const autoCommit = true;
  await logPdfUploadProbe(input);

  input.onProgress?.(10);
  const formData = new FormData();
  formData.append('file', input.file, input.fileName);
  formData.append('userId', input.userId);
  formData.append('source', input.source || 'upload');
  if (input.requestId) formData.append('requestId', input.requestId);

  const uploadRes = await fetch('/.netlify/functions/prime-router', {
    method: 'POST',
    headers: getAuthHeaders(input),
    body: formData,
  });
  const uploadPayload = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) {
    const msg = uploadPayload?.error || uploadPayload?.step || `prime-router upload failed (${uploadRes.status})`;
    throw new Error(String(msg));
  }

  const importId = String(uploadPayload?.importId || uploadPayload?.import_id || '').trim();
  const documentId = String(
    uploadPayload?.documentId ||
    uploadPayload?.document_id ||
    uploadPayload?.docId ||
    ''
  ).trim();
  if (!documentId) {
    throw new Error('prime-router upload missing documentId');
  }
  input.onProgress?.(70);

  // Some router responses do not have importId until OCR/sync has progressed.
  // In that case, poll OCR status by docId and then run sync directly.
  if (!importId) {
    // Scanned PDFs can take significantly longer due to render + OCR fallback.
    const ocrDeadline = Date.now() + 90000;
    let bestProgressNoImport = 72;
    while (Date.now() < ocrDeadline) {
      const statusRes = await fetch('/.netlify/functions/ocr-job-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(input),
        },
        body: JSON.stringify({ userId: input.userId, docIds: [documentId] }),
      });
      if (statusRes.ok) {
        const statusPayload = await statusRes.json().catch(() => ({}));
        if (statusPayload?.terminal === true) {
          console.warn('[client] Terminal OCR - skipping fallback', {
            docId: documentId,
            importRunId: input.requestId || null,
            source: 'runViaPrimeRouter:no-import-status-poll',
          });
          return {
            docId: documentId,
            importIds: [],
            queued: false,
            via: 'ocr',
            rejected: true,
            reason: toTerminalOcrUserMessage(statusPayload),
          };
        }
        const item = Array.isArray(statusPayload?.items) ? statusPayload.items[0] : null;
        const itemStatus = String(item?.status || '').toLowerCase();
        if (itemStatus === 'error' || itemStatus === 'failed') {
          const reason = String(item?.error || statusPayload?.error || 'OCR processing failed');
          const terminalLike =
            statusPayload?.terminal === true ||
            isTerminalRouterOcrFailure(statusPayload) ||
            isTerminalRouterOcrFailure({
              error: reason,
              error_code: item?.error_code,
              details: { items: [item] },
            });
          console.warn('[client] Terminal OCR - skipping fallback', {
            docId: documentId,
            importRunId: input.requestId || null,
            source: 'runViaPrimeRouter:no-import-status-item-error',
            terminal: terminalLike,
            reason,
          });
          return {
            docId: documentId,
            importIds: [],
            queued: false,
            via: 'ocr',
            rejected: true,
            reason: terminalLike ? toTerminalOcrUserMessage(statusPayload, item) : reason,
          };
        }
        if (itemStatus === 'done') {
          break;
        }
      }
      bestProgressNoImport = Math.min(89, bestProgressNoImport + 1);
      input.onProgress?.(bestProgressNoImport);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const syncRes = await fetch('/.netlify/functions/smart-import-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(input),
      },
      body: JSON.stringify({
        userId: input.userId,
        docIds: [documentId],
        waitForOcrMs: 60000,
        pollForOcrMs: 500,
        autoCommit,
        importRunId: input.requestId || `router-sync-${documentId}-${Date.now()}`,
      }),
    });
    let syncPayload = syncRes.ok ? await syncRes.json().catch(() => ({})) : {};
    let syncedImportId = String(syncPayload?.importIds?.[0] || '').trim() || undefined;

    // Retry sync if no imports found - AI fallback parser may still be running.
    // This matches the retry logic already present in runWithInit (line ~675).
    if (!syncedImportId) {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`[runViaPrimeRouter] sync retry ${attempt}/${maxRetries} - waiting for normalize to complete`, { documentId });
        await new Promise((r) => setTimeout(r, 5000));
        try {
          const retryRes = await fetch('/.netlify/functions/smart-import-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(input),
            },
            body: JSON.stringify({
              userId: input.userId,
              docIds: [documentId],
              waitForOcrMs: 60000,
              pollForOcrMs: 500,
              autoCommit,
              importRunId: input.requestId || `router-sync-retry-${documentId}-${Date.now()}`,
            }),
          });
          if (retryRes.ok) {
            const retryPayload = await retryRes.json().catch(() => ({}));
            const retryImportId = String(retryPayload?.importIds?.[0] || '').trim() || undefined;
            if (retryImportId) {
              syncPayload = retryPayload;
              syncedImportId = retryImportId;
              console.log(`[runViaPrimeRouter] sync retry ${attempt} succeeded`, { documentId, importId: retryImportId, transactionCount: retryPayload?.transactionCount });
              break;
            }
          }
        } catch {
          // Best effort - continue retrying
        }
      }
    }

    input.onProgress?.(100);
    return {
      docId: documentId,
      importId: syncedImportId,
      importIds: Array.isArray(syncPayload?.importIds) ? syncPayload.importIds : (syncedImportId ? [syncedImportId] : undefined),
      queued: !syncedImportId,
      via: 'ocr',
      transactionCount: syncPayload?.transactionCount ?? syncPayload?.stats?.transactionCount,
    };
  }

  const pollDeadline = Date.now() + 90000;
  let bestProgress = 72;
  while (Date.now() < pollDeadline) {
    const statusRes = await fetch('/.netlify/functions/prime-router', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(input),
      },
      body: JSON.stringify({
        mode: 'status',
        importId,
        autoCommit,
        importRunId: input.requestId || `router-status-${importId}-${Date.now()}`,
      }),
    });
    if (statusRes.ok) {
      const statusPayload = await statusRes.json().catch(() => ({}));
      if (statusPayload?.terminal === true) {
        console.warn('[client] Terminal OCR - skipping fallback', {
          docId: documentId,
          importId,
          importRunId: input.requestId || null,
          source: 'runViaPrimeRouter:status-poll',
        });
        return {
          docId: documentId,
          importId,
          importIds: importId ? [importId] : [],
          queued: false,
          via: 'ocr',
          rejected: true,
          reason: toTerminalOcrUserMessage(statusPayload),
        };
      }
      const status = String(statusPayload?.status || '').toLowerCase();
      if (status === 'error') {
        const reason = String(statusPayload?.error || statusPayload?.details?.error || 'OCR processing failed');
        const terminalLike = statusPayload?.terminal === true || isTerminalRouterOcrFailure(statusPayload);
        console.warn('[client] Terminal OCR - skipping fallback', {
          docId: documentId,
          importId,
          importRunId: input.requestId || null,
          source: 'runViaPrimeRouter:status-error',
          terminal: terminalLike,
          reason,
        });
        return {
          docId: documentId,
          importId,
          importIds: importId ? [importId] : [],
          queued: false,
          via: 'ocr',
          rejected: true,
          reason: terminalLike ? toTerminalOcrUserMessage(statusPayload) : reason,
        };
      }
      if (status === 'complete') {
        input.onProgress?.(100);
        return {
          docId: documentId,
          importId,
          importIds: [importId],
          queued: false,
          via: 'ocr',
          transactionCount:
            statusPayload?.sync?.transactionCount ??
            statusPayload?.sync?.stats?.transactionCount,
        };
      }
    }
    bestProgress = Math.min(89, bestProgress + 1);
    input.onProgress?.(bestProgress);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Timeout fallback keeps UI responsive while backend finishes.
  input.onProgress?.(90);
  return {
    docId: documentId,
    importId,
    importIds: [importId],
    queued: true,
    via: 'ocr',
  };
}

async function putBytesToSignedUrl(input: SmartImportPipelineInput, uploadUrl: string): Promise<void> {
  await logPdfUploadProbe(input);
  if (input.file) {
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': input.mimeType },
      body: input.file,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }
    return;
  }
  if (typeof input.base64 === 'string') {
    const normalizedBase64 = input.base64.includes(',')
      ? input.base64.slice(input.base64.indexOf(',') + 1)
      : input.base64;
    const buffer = Uint8Array.from(atob(normalizedBase64), (c) => c.charCodeAt(0));
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': input.mimeType || 'application/octet-stream' },
      body: buffer,
    });
    if (!res.ok) {
      throw new Error(`Upload failed: ${res.statusText}`);
    }
    return;
  }
  throw new Error('No file bytes provided');
}

async function initializePipeline(input: SmartImportPipelineInput): Promise<{ init: any; fileSize: number }> {
  const source = input.source || 'upload';
  const fileSize = input.fileSize ?? input.file?.size ?? (input.base64 ? Math.floor((input.base64.length * 3) / 4) : 0);
  const lastModified = input.lastModified ?? input.file?.lastModified ?? 0;
  const initRes = await fetch('/.netlify/functions/smart-import-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      fileName: input.fileName,
      fileSize,
      lastModified,
      mime: input.mimeType,
      source,
      requestId: input.requestId,
    }),
  });
  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`Init failed: ${err}`);
  }
  const init = await initRes.json();
  return { init, fileSize };
}

async function runWithInit(input: SmartImportPipelineInput, init: any, fileSize: number): Promise<SmartImportPipelineResult> {
  const docId = init.document_id || init.docId;
  if (!docId) throw new Error('Init failed: missing document id');
  input.onProgress?.(15);

  const skipDecision = safeToSkipUpload(init);
  const forceRerunForPendingOcr =
    init?.status === 'reused' &&
    init?.processingStatus === 'ocr_processing' &&
    init?.ocrJobStatus !== 'running' &&
    init?.ocrJobStatus !== 'done' &&
    !init?.alreadyProcessed;

  if (skipDecision.safe && !forceRerunForPendingOcr) {
    logReuseDecision('REUSED_DOC_SKIP_UPLOAD', {
      docId,
      reason: skipDecision.reason,
      ocrJobStatus: init?.ocrJobStatus || null,
      hasFileRef: Boolean(init?.hasFileRef),
      hasExtractedData: Boolean(init?.hasExtractedData),
    });
    if (init?.ocrJobStatus === 'running') {
      const polled = await pollRunningOcrJob(input.userId, docId);
      if (polled.status === 'error') {
        throw new Error(polled.error || 'OCR job failed');
      }
    }
    let syncImportIds: string[] = [];
    let syncTransactionCount: number | undefined;
    try {
      const syncRes = await fetch('/.netlify/functions/smart-import-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
        },
        body: JSON.stringify({
          userId: input.userId,
          docIds: [docId],
          // Keep reuse path aligned with canonical flow so OCR has time to finish.
          waitForOcrMs: 60000,
          pollForOcrMs: 500,
          autoCommit: true,
        }),
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (Array.isArray(syncData?.importIds)) {
          syncImportIds = syncData.importIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
        }
        if (typeof syncData?.transactionCount === 'number') {
          syncTransactionCount = syncData.transactionCount;
        }
      }
    } catch {
      // Best effort only - reused docs should still resolve without blocking on sync.
    }
    const hasReusableEvidence =
      syncImportIds.length > 0 ||
      typeof syncTransactionCount === 'number' ||
      init?.ocrJobStatus === 'running' ||
      init?.ocrJobStatus === 'done' ||
      init?.alreadyProcessed === true ||
      init?.processingStatus === 'parsed' ||
      init?.processingStatus === 'committed';

    if (hasReusableEvidence) {
      input.onProgress?.(100);
      return {
        docId,
        importId: syncImportIds[0],
        importIds: syncImportIds,
        queued: init?.ocrJobStatus === 'running',
        via: 'ocr',
        reused: true,
        reuseReason: String(skipDecision.reason || 'reused'),
        transactionCount:
          syncTransactionCount ??
          init?.transactionCount ??
          init?.normalizedTransactionCount ??
          init?.stats?.transactionCount,
      };
    }

    // Safety: if reused-doc skip path cannot prove import/sync evidence,
    // continue with full upload so we do not falsely report success.
    logReuseDecision('REUSED_DOC_NOT_SAFE_UPLOAD_CONTINUES', {
      docId,
      reason: 'reuse_without_sync_evidence',
      ocrJobStatus: init?.ocrJobStatus || null,
      hasFileRef: Boolean(init?.hasFileRef),
      hasExtractedData: Boolean(init?.hasExtractedData),
      syncImportIds: syncImportIds.length,
      syncTransactionCount: syncTransactionCount ?? null,
    });
  }
  if (forceRerunForPendingOcr) {
    logReuseDecision('REUSED_DOC_NOT_SAFE_UPLOAD_CONTINUES', {
      docId,
      reason: 'pending_ocr_without_active_job',
      processingStatus: init?.processingStatus || null,
      ocrJobStatus: init?.ocrJobStatus || null,
      hasFileRef: Boolean(init?.hasFileRef),
      hasExtractedData: Boolean(init?.hasExtractedData),
    });
  }
  if (init?.status === 'reused') {
    logReuseDecision('REUSED_DOC_NOT_SAFE_UPLOAD_CONTINUES', {
      docId,
      reason: skipDecision.reason,
      ocrJobStatus: init?.ocrJobStatus || null,
      hasFileRef: Boolean(init?.hasFileRef),
      hasExtractedData: Boolean(init?.hasExtractedData),
    });
  }

  if (init.uploadUrl) {
    await putBytesToSignedUrl(input, init.uploadUrl);
  } else if (!(init?.status === 'reused' && init?.hasFileRef)) {
    throw new Error('Init did not return uploadUrl');
  }
  input.onProgress?.(70);

  const finalizeRes = await fetch('/.netlify/functions/smart-import-finalize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: input.userId,
      docId,
      requestId: input.requestId,
      expectedSize: fileSize,
    }),
  });
  if (!finalizeRes.ok) {
    const err = await finalizeRes.text();
    throw new Error(`Finalize failed: ${err}`);
  }
  const finalized = await finalizeRes.json();
  if (finalized?.pending === true) {
    const pendingMessage = String(finalized?.message || finalized?.status || 'upload not complete');
    throw new Error(`Upload pending for ${input.fileName}: ${pendingMessage}`);
  }
  if (finalized?.rejected === true) {
    const rejectReason = String(finalized?.reason || finalized?.error || 'upload rejected');
    throw new Error(`Upload rejected for ${input.fileName}: ${rejectReason}`);
  }
  const ocrPollStartedAt = Date.now();
  let bestProgress = 72;
  let reachedTerminalOcrState = false;

  // Keep frontend deterministic: poll OCR status for image/PDF-like flow.
  const pollDeadline = Date.now() + 90000;
  while (Date.now() < pollDeadline) {
    const statusRes = await fetch('/.netlify/functions/ocr-job-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
      },
      body: JSON.stringify({ userId: input.userId, docIds: [docId] }),
    });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      const item = Array.isArray(statusData?.items) ? statusData.items[0] : null;
      if (item) {
        const processed = Number(item?.progress?.processedPages || 0);
        const total = Number(item?.progress?.totalPages || 0);
        if (total > 0 && processed >= 0) {
          const fraction = Math.max(0, Math.min(1, processed / total));
          const mapped = 70 + Math.round(fraction * 20);
          bestProgress = Math.max(bestProgress, Math.min(89, mapped));
        } else {
          const elapsedMs = Date.now() - ocrPollStartedAt;
          const ramp = Math.min(17, Math.floor(elapsedMs / 4000)); // ~+1% every 4s up to 89%
          bestProgress = Math.max(bestProgress, 72 + ramp);
        }
        input.onProgress?.(bestProgress);
      }
      if (item?.status === 'done' || item?.status === 'error') {
        reachedTerminalOcrState = true;
        break;
      }
    } else {
      const elapsedMs = Date.now() - ocrPollStartedAt;
      const ramp = Math.min(17, Math.floor(elapsedMs / 4000));
      bestProgress = Math.max(bestProgress, 72 + ramp);
      input.onProgress?.(bestProgress);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  input.onProgress?.(90);

  const syncRes = await fetch('/.netlify/functions/smart-import-sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
    },
    body: JSON.stringify({
      userId: input.userId,
      docIds: [docId],
      // Give OCR enough time to produce text so sync can actually normalize/import.
      // Too-short waits cause "nothing happened" stalls in Prime narration.
      waitForOcrMs: 60000,
      pollForOcrMs: 500,
      autoCommit: true,
    }),
  });
  let syncData = syncRes.ok ? await syncRes.json() : null;
  const initialImportIds = Array.isArray(syncData?.importIds)
    ? syncData.importIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : [];
  // OCR can still be finishing right after finalize; retry sync once with a longer wait
  // instead of returning an empty import result that looks like a silent/no-op upload.
  if (initialImportIds.length === 0) {
    try {
      const retrySyncRes = await fetch('/.netlify/functions/smart-import-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
        },
        body: JSON.stringify({
          userId: input.userId,
          docIds: [docId],
          waitForOcrMs: 60000,
          pollForOcrMs: 500,
          autoCommit: true,
        }),
      });
      if (retrySyncRes.ok) {
        syncData = await retrySyncRes.json();
      }
    } catch {
      // Best effort only; keep original sync result.
    }
  }
  console.log('[pipeline] syncData at commit point:', JSON.stringify({ importIds: syncData?.importIds, keys: syncData ? Object.keys(syncData) : null }));
  const allImportIds = Array.isArray(syncData?.importIds) ? syncData.importIds : [];
  if (allImportIds.length > 0) {
    for (const importId of allImportIds) {
      try {
        await fetch('/.netlify/functions/approve-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
          },
          body: JSON.stringify({ importId, userId: input.userId }),
        });
        await fetch('/.netlify/functions/commit-import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(input.authToken ? { Authorization: `Bearer ${input.authToken}` } : {}),
          },
          body: JSON.stringify({ importId, userId: input.userId }),
        });
      } catch {
        // Best effort - sync autoCommit may have already handled this.
      }
    }
  }
  input.onProgress?.(100);
  return {
    docId,
    importId: syncData?.importIds?.[0],
    importIds: syncData?.importIds,
    reused: init?.status === 'reused',
    reuseReason: init?.status === 'reused' ? String(skipDecision.reason || 'reused') : undefined,
    ...finalized,
    transactionCount:
      syncData?.transactionCount ??
      finalized?.normalizedTransactionCount ??
      finalized?.transactionCount ??
      finalized?.stats?.transactionCount,
  };
}

export function runSmartImportPipeline(input: SmartImportPipelineInput): Promise<SmartImportPipelineResult> {
  const preInitKey = buildPreInitPipelineKey(input);
  const existing = inFlightPipelines.get(preInitKey);
  if (existing) return existing;
  const promise = (async () => {
    let activeKey = preInitKey;
    try {
      // Canonical upload route: Prime Router mode A/B orchestration.
      // Falls back to legacy init/upload/finalize path if router is unavailable.
      try {
        const routed = await runViaPrimeRouter(input);
        if (routed) return routed;
      } catch (routerErr) {
        const msg = String((routerErr as any)?.message || routerErr || '').toLowerCase();
        const terminalRouterFailure =
          msg.includes('unusable_ocr_text') ||
          msg.includes('malformed_pdf') ||
          msg.includes('parser_incompatible_pdf') ||
          msg.includes('ocr_unusable') ||
          msg.includes('ocr_failed_retry') ||
          msg.includes('ocr_timed_out_retry') ||
          msg.includes('upload rejected');
        if (terminalRouterFailure) {
          throw routerErr;
        }
        console.warn('[runSmartImportPipeline] prime-router path failed, falling back to legacy path:', routerErr);
      }

      const { init, fileSize } = await initializePipeline(input);
      const uploadHash = init?.uploadHash;
      if (typeof uploadHash === 'string' && uploadHash.trim().length > 0) {
        const postInitKey = `${input.userId}|${uploadHash}`;
        if (postInitKey !== activeKey) {
          const already = inFlightPipelines.get(postInitKey);
          if (already) {
            return await already;
          }
          inFlightPipelines.set(postInitKey, promise);
          activeKey = postInitKey;
        }
      }
      return await runWithInit(input, init, fileSize);
    } finally {
      inFlightPipelines.delete(preInitKey);
      inFlightPipelines.delete(activeKey);
    }
  })();
  inFlightPipelines.set(preInitKey, promise);
  return promise;
}


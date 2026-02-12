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
  queued: boolean;
  via: 'ocr' | 'statement-parse' | 'vision-parse' | 'unsupported';
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

async function putBytesToSignedUrl(input: SmartImportPipelineInput, uploadUrl: string): Promise<void> {
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
    const buffer = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
    const res = await fetch(uploadUrl, {
      method: 'PUT',
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
    input.onProgress?.(100);
    return {
      docId,
      queued: init?.ocrJobStatus === 'running',
      via: 'ocr',
      transactionCount: init?.transactionCount ?? init?.normalizedTransactionCount ?? init?.stats?.transactionCount,
    };
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
  const ocrPollStartedAt = Date.now();
  let bestProgress = 72;
  let reachedTerminalOcrState = false;

  // Keep frontend deterministic: poll OCR status for image/PDF-like flow.
  const pollDeadline = Date.now() + 45000;
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
      // Fast mode: don't block UI for long waits when OCR is still running.
      waitForOcrMs: reachedTerminalOcrState ? 15000 : 1200,
      pollForOcrMs: 250,
    }),
  });
  const syncData = syncRes.ok ? await syncRes.json() : null;
  input.onProgress?.(100);
  return {
    docId,
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


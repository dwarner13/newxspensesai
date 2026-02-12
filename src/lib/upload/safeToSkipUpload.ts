export type InitReuseSignals = {
  status?: string | null;
  safeToSkipUpload?: boolean | null;
  safeToSkipReason?: string | null;
  hasFileRef?: boolean | null;
  hasExtractedData?: boolean | null;
  ocrJobStatus?: string | null;
  document_id?: string | null;
  docId?: string | null;
};

export function safeToSkipUpload(input: InitReuseSignals): { safe: boolean; reason: string } {
  if (input?.status !== 'reused') {
    return { safe: false, reason: 'not_reused' };
  }
  if (input?.safeToSkipUpload === true) {
    return { safe: true, reason: input?.safeToSkipReason || 'server_safe_to_skip' };
  }
  return {
    safe: false,
    reason: input?.safeToSkipReason || 'server_not_safe_to_skip',
  };
}

export function logReuseDecision(
  tag: 'REUSED_DOC_SKIP_UPLOAD' | 'REUSED_DOC_NOT_SAFE_UPLOAD_CONTINUES',
  payload: Record<string, unknown>
): void {
  if (!import.meta.env.DEV) return;
  console.log(`[${tag}]`, payload);
}

export async function pollRunningOcrJob(
  userId: string,
  docId: string,
  attempts = 5,
  intervalMs = 1200
): Promise<{ status: 'done' | 'running' | 'error'; error?: string }> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    const statusRes = await fetch('/.netlify/functions/ocr-job-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, docIds: [docId] }),
    });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const item = Array.isArray(statusData?.items) ? statusData.items[0] : null;
    if (!item?.status) continue;
    if (item.status === 'done') return { status: 'done' };
    if (item.status === 'error') return { status: 'error', error: item?.error || 'OCR job failed' };
  }
  return { status: 'running' };
}


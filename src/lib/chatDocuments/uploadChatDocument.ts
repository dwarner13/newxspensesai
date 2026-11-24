/**
 * Attachments Phase C2 — upload a file as a CHAT DOCUMENT (attach-and-discuss, never imported).
 *
 * Reuses the existing secure Smart Import upload pipeline with purpose 'chat_document':
 *   smart-import-init  → signed upload URL (server decides and records the purpose)
 *   PUT to the signed URL
 *   smart-import-finalize → server checks the stored bytes (type, 15 MB, 50 pages), starts OCR
 *   ocr-job-status     → poll until ready / unreadable
 *
 * It never calls smart-import-sync, approve-import or commit-import, so no transactions can be
 * created from here; the server enforces the same rule independently (Attachments B1).
 *
 * The returned documentId is the id the server issued for the authenticated user. Document text
 * is never read, kept, or logged here.
 */

export const CHAT_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']);
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
};

export type ChatDocumentStage = 'uploading' | 'processing' | 'ready' | 'unreadable';

export type ChatDocumentFailure =
  | 'unauthorized'
  | 'disabled'
  | 'too_large'
  | 'too_many_pages'
  | 'unsupported'
  | 'unreadable'
  | 'upload_failed'
  | 'timeout'
  | 'aborted'
  | 'server_mismatch'
  | 'failed';

export type UploadChatDocumentResult =
  | { ok: true; documentId: string; status: 'ready'; fileName: string; mimeType: string; pages: number | null }
  | { ok: false; reason: ChatDocumentFailure; documentId: string | null };

export type UploadableFile = Blob & { name: string; lastModified?: number };

export type UploadChatDocumentInput = {
  file: UploadableFile;
  authToken: string;
  /** Optional; the server derives identity from the token and only checks this matches. */
  userId?: string;
  onStage?: (stage: ChatDocumentStage) => void;
  signal?: AbortSignal;
  pollIntervalMs?: number;
  timeoutMs?: number;
  /** Test seams. */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

function resolveMime(file: UploadableFile): string | null {
  const declared = String(file.type || '').toLowerCase();
  if (ALLOWED_MIME.has(declared)) return declared;
  const ext = String(file.name || '').toLowerCase().split('.').pop() || '';
  return EXT_TO_MIME[ext] ?? null;
}

function failureForStatus(status: number, code?: unknown): ChatDocumentFailure {
  const c = String(code || '').toUpperCase();
  if (status === 401) return 'unauthorized';
  if (status === 403 && c === 'CHAT_DOCUMENTS_DISABLED') return 'disabled';
  if (status === 403) return 'unauthorized';
  if (c === 'TOO_MANY_PAGES') return 'too_many_pages';
  if (status === 413) return 'too_large';
  if (status === 415) return 'unsupported';
  if (status === 422) return 'unreadable';
  return 'failed';
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const body = await res.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function uploadChatDocument(input: UploadChatDocumentInput): Promise<UploadChatDocumentResult> {
  const doFetch = input.fetchImpl ?? fetch;
  const sleep = input.sleep ?? defaultSleep;
  const now = input.now ?? Date.now;
  const pollIntervalMs = input.pollIntervalMs ?? 2000;
  const timeoutMs = input.timeoutMs ?? 120_000;
  const { file } = input;
  let documentId: string | null = null;
  const fail = (reason: ChatDocumentFailure): UploadChatDocumentResult => ({ ok: false, reason, documentId });
  const aborted = () => Boolean(input.signal?.aborted);

  if (!input.authToken) return fail('unauthorized');
  const mimeType = resolveMime(file);
  if (!mimeType) return fail('unsupported');
  if (!file.size || file.size <= 0) return fail('unsupported');
  if (file.size > CHAT_DOCUMENT_MAX_BYTES) return fail('too_large');

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${input.authToken}` };
  const post = (fn: string, body: Record<string, unknown>) =>
    doFetch(`/.netlify/functions/${fn}`, { method: 'POST', headers: authHeaders, body: JSON.stringify(body), signal: input.signal });

  try {
    input.onStage?.('uploading');

    // 1. Init: the server creates the document row with purpose chat_document.
    const initRes = await post('smart-import-init', {
      ...(input.userId ? { userId: input.userId } : {}),
      fileName: file.name,
      fileSize: file.size,
      lastModified: file.lastModified || 0,
      mime: mimeType,
      source: 'chat',
      purpose: 'chat_document',
    });
    const init = await readJson(initRes);
    if (!initRes.ok) return fail(failureForStatus(initRes.status, init.error));
    documentId = typeof init.document_id === 'string' ? init.document_id : typeof init.docId === 'string' ? init.docId : null;
    // Fail closed if the server did not record this as a chat document (e.g. an older deploy that
    // ignores the purpose): never upload bytes into an import document from the chat path.
    if (!documentId || init.purpose !== 'chat_document' || typeof init.uploadUrl !== 'string' || !init.uploadUrl) {
      return fail('server_mismatch');
    }

    // 2. Upload the bytes to the signed URL.
    const putRes = await doFetch(init.uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': mimeType },
      body: file,
      signal: input.signal,
    });
    if (!putRes.ok) return fail('upload_failed');

    // 3. Finalize: the server validates the stored bytes and starts OCR. A just-finished upload
    //    can briefly report pending; retry a few times.
    let finalized: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      if (aborted()) return fail('aborted');
      const res = await post('smart-import-finalize', { docId: documentId, expectedSize: file.size });
      const body = await readJson(res);
      if (!res.ok) return fail(failureForStatus(res.status, body.error));
      if (body.pending === true) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      finalized = body;
      break;
    }
    if (!finalized) return fail('upload_failed');
    if (finalized.rejected === true) return fail('unreadable');

    // 4. Poll processing status until ready / unreadable.
    input.onStage?.('processing');
    const deadline = now() + timeoutMs;
    while (now() < deadline) {
      if (aborted()) return fail('aborted');
      const res = await post('ocr-job-status', { docIds: [documentId] });
      if (res.ok) {
        const body = await readJson(res);
        const items = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
        const item = items.find((i) => i?.docId === documentId) ?? null;
        if (item?.status === 'done') {
          const result = (item.result ?? null) as { pages?: unknown } | null;
          const pages = typeof result?.pages === 'number' && Number.isFinite(result.pages) ? result.pages : null;
          input.onStage?.('ready');
          return { ok: true, documentId, status: 'ready', fileName: file.name, mimeType, pages };
        }
        if (item?.status === 'error') {
          input.onStage?.('unreadable');
          return fail('unreadable');
        }
      } else if (res.status === 401 || res.status === 403) {
        return fail('unauthorized');
      }
      await sleep(pollIntervalMs);
    }
    return fail('timeout');
  } catch (err: unknown) {
    if (aborted() || (err as { name?: string } | null)?.name === 'AbortError') return fail('aborted');
    return fail('failed');
  }
}

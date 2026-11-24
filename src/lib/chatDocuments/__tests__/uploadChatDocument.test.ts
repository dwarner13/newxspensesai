/**
 * Attachments Phase C2 — uploadChatDocument (client helper).
 * All network calls are an in-memory fake; no real upload happens.
 */
import { describe, it, expect, vi } from 'vitest';
import { uploadChatDocument, CHAT_DOCUMENT_MAX_BYTES, type UploadableFile } from '../uploadChatDocument';

const DOC = 'c0c0c0c0-0000-4000-8000-000000000001';
type Call = { url: string; method: string; body: Record<string, unknown> | null; auth: string | null };

function file(name: string, type: string, size = 1000): UploadableFile {
  const f = new Blob([new Uint8Array(Math.min(size, 16))], { type }) as UploadableFile;
  Object.defineProperty(f, 'size', { value: size });
  Object.defineProperty(f, 'name', { value: name });
  Object.defineProperty(f, 'lastModified', { value: 1 });
  return f;
}

type Script = {
  init?: { status: number; body: Record<string, unknown> };
  put?: number;
  finalize?: Array<{ status: number; body: Record<string, unknown> }>;
  status?: Array<{ status: number; body: Record<string, unknown> }>;
};

function fakeServer(script: Script) {
  const calls: Call[] = [];
  const finalizeQ = [...(script.finalize ?? [{ status: 200, body: { started: true, queued: true, via: 'ocr' } }])];
  const statusQ = [...(script.status ?? [{ status: 200, body: { items: [{ docId: DOC, status: 'done', result: { pages: 3 } }] } }])];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit = {}) => {
    const headers = (init.headers || {}) as Record<string, string>;
    let body: Record<string, unknown> | null = null;
    if (typeof init.body === 'string') body = JSON.parse(init.body);
    calls.push({ url: String(url), method: String(init.method), body, auth: headers.Authorization ?? null });
    const json = (status: number, b: unknown) => new Response(JSON.stringify(b), { status });
    if (url.endsWith('/smart-import-init')) {
      const r = script.init ?? { status: 200, body: { document_id: DOC, purpose: 'chat_document', uploadUrl: 'https://storage.test/signed/x' } };
      return json(r.status, r.body);
    }
    if (url.startsWith('https://storage.test/')) return new Response('', { status: script.put ?? 200 });
    if (url.endsWith('/smart-import-finalize')) { const r = finalizeQ.shift() ?? finalizeQ[0] ?? { status: 200, body: {} }; return json(r.status, r.body); }
    if (url.endsWith('/ocr-job-status')) { const r = statusQ.length > 1 ? statusQ.shift()! : statusQ[0]; return json(r.status, r.body); }
    return json(404, {});
  });
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const base = { authToken: 'jwt', sleep: async () => undefined };
const fns = (calls: Call[]) => calls.map((c) => c.url.split('/').pop());

describe('uploadChatDocument', () => {
  it('happy path: init (chat_document) → PUT → finalize → poll → ready with the server-issued id', async () => {
    const s = fakeServer({ status: [
      { status: 200, body: { items: [{ docId: DOC, status: 'running' }] } },
      { status: 200, body: { items: [{ docId: DOC, status: 'done', result: { pages: 3, page_texts: [{ page: 1, text: 'secret' }] } }] } },
    ] });
    const stages: string[] = [];
    const r = await uploadChatDocument({ ...base, file: file('notes.pdf', 'application/pdf'), fetchImpl: s.fetchImpl, onStage: (x) => stages.push(x) });
    expect(r).toEqual({ ok: true, documentId: DOC, status: 'ready', fileName: 'notes.pdf', mimeType: 'application/pdf', pages: 3 });
    expect(stages).toEqual(['uploading', 'processing', 'ready']);
    const init = s.calls.find((c) => c.url.endsWith('/smart-import-init'))!;
    expect(init.body).toMatchObject({ purpose: 'chat_document', source: 'chat', mime: 'application/pdf', fileSize: 1000 });
    expect(init.auth).toBe('Bearer jwt');
    // The result never carries document text.
    expect(JSON.stringify(r)).not.toContain('secret');
  });

  it('never calls the import endpoints (sync / approve / commit)', async () => {
    const s = fakeServer({});
    await uploadChatDocument({ ...base, file: file('a.png', 'image/png'), fetchImpl: s.fetchImpl });
    expect(fns(s.calls)).not.toContain('smart-import-sync');
    expect(fns(s.calls)).not.toContain('approve-import');
    expect(fns(s.calls)).not.toContain('commit-import');
    expect(fns(s.calls)).not.toContain('normalize-transactions');
  });

  it('client pre-checks: unsupported type, empty, over 15 MB → no network call', async () => {
    for (const [f, reason] of [
      [file('x.csv', 'text/csv'), 'unsupported'],
      [file('x.gif', 'image/gif'), 'unsupported'],
      [file('x.pdf', 'application/pdf', 0), 'unsupported'],
      [file('x.pdf', 'application/pdf', CHAT_DOCUMENT_MAX_BYTES + 1), 'too_large'],
    ] as const) {
      const s = fakeServer({});
      const r = await uploadChatDocument({ ...base, file: f, fetchImpl: s.fetchImpl });
      expect(r).toEqual({ ok: false, reason, documentId: null });
      expect(s.calls).toHaveLength(0);
    }
  });

  it('missing token → unauthorized, no network call', async () => {
    const s = fakeServer({});
    expect(await uploadChatDocument({ ...base, authToken: '', file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl })).toMatchObject({ ok: false, reason: 'unauthorized' });
    expect(s.calls).toHaveLength(0);
  });

  it('infers type from the extension when the browser gives none (e.g. HEIC)', async () => {
    const s = fakeServer({});
    const r = await uploadChatDocument({ ...base, file: file('IMG_1.HEIC', ''), fetchImpl: s.fetchImpl });
    expect(r).toMatchObject({ ok: true, mimeType: 'image/heic' });
  });

  it('runtime gate off on the server → disabled, nothing uploaded', async () => {
    const s = fakeServer({ init: { status: 403, body: { error: 'chat_documents_disabled' } } });
    expect(await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl })).toEqual({ ok: false, reason: 'disabled', documentId: null });
    expect(s.calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('fails closed if the server did not record a chat document (older deploy) — bytes never uploaded', async () => {
    const s = fakeServer({ init: { status: 200, body: { document_id: DOC, purpose: 'import', uploadUrl: 'https://storage.test/signed/x' } } });
    const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl });
    expect(r).toEqual({ ok: false, reason: 'server_mismatch', documentId: DOC });
    expect(s.calls.some((c) => c.method === 'PUT')).toBe(false);
    expect(fns(s.calls)).not.toContain('smart-import-finalize');
  });

  it('server rejections from finalize map to user-facing reasons', async () => {
    for (const [status, error, reason] of [
      [413, 'TOO_MANY_PAGES', 'too_many_pages'],
      [413, 'FILE_TOO_LARGE', 'too_large'],
      [415, 'CONTENT_TYPE_MISMATCH', 'unsupported'],
      [422, 'UNREADABLE_PDF', 'unreadable'],
      [403, 'Forbidden', 'unauthorized'],
    ] as const) {
      const s = fakeServer({ finalize: [{ status, body: { ok: false, error } }] });
      const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl });
      expect(r).toEqual({ ok: false, reason, documentId: DOC });
      expect(fns(s.calls)).not.toContain('ocr-job-status');
    }
  });

  it('finalize pending is retried, then proceeds', async () => {
    const s = fakeServer({ finalize: [{ status: 200, body: { pending: true } }, { status: 200, body: { started: true } }] });
    const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl });
    expect(r.ok).toBe(true);
    expect(fns(s.calls).filter((f) => f === 'smart-import-finalize')).toHaveLength(2);
  });

  it('failed PUT → upload_failed; OCR error → unreadable; never ready → timeout', async () => {
    const put = fakeServer({ put: 500 });
    expect(await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: put.fetchImpl })).toMatchObject({ ok: false, reason: 'upload_failed' });

    const ocrErr = fakeServer({ status: [{ status: 200, body: { items: [{ docId: DOC, status: 'error' }] } }] });
    const stages: string[] = [];
    expect(await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: ocrErr.fetchImpl, onStage: (x) => stages.push(x) })).toMatchObject({ ok: false, reason: 'unreadable', documentId: DOC });
    expect(stages.at(-1)).toBe('unreadable');

    let t = 0;
    const slow = fakeServer({ status: [{ status: 200, body: { items: [{ docId: DOC, status: 'running' }] } }] });
    const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: slow.fetchImpl, timeoutMs: 10_000, now: () => (t += 3000) });
    expect(r).toMatchObject({ ok: false, reason: 'timeout', documentId: DOC });
  });

  it('ignores status items for other documents', async () => {
    let t = 0;
    const s = fakeServer({ status: [{ status: 200, body: { items: [{ docId: 'someone-else', status: 'done' }] } }] });
    const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl, timeoutMs: 5000, now: () => (t += 2000) });
    expect(r).toMatchObject({ ok: false, reason: 'timeout' });
  });

  it('abort stops the flow', async () => {
    const ctrl = new AbortController();
    const s = fakeServer({ status: [{ status: 200, body: { items: [{ docId: DOC, status: 'running' }] } }] });
    const r = await uploadChatDocument({
      ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s.fetchImpl, signal: ctrl.signal,
      sleep: async () => { ctrl.abort(); },
    });
    expect(r).toMatchObject({ ok: false, reason: 'aborted', documentId: DOC });
  });

  it('E8: server upload limit (429) → rate_limited, nothing uploaded', async () => {
    const s429 = fakeServer({ init: { status: 429, body: { error: 'chat_document_limit', scope: 'hourly', retryAfterSeconds: 600 } } });
    const r = await uploadChatDocument({ ...base, file: file('a.pdf', 'application/pdf'), fetchImpl: s429.fetchImpl });
    expect(r).toEqual({ ok: false, reason: 'rate_limited', documentId: null });
    expect(s429.calls.some((c) => c.method === 'PUT')).toBe(false);
  });
});

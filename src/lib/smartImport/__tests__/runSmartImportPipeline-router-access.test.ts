/**
 * R0 — runSmartImportPipeline reaction to prime-router access failures.
 *
 * 401/403 from the router are definitive: stop, and never retry through the legacy
 * (unauthenticated) init/finalize path. 401/403/404 while polling status stop polling.
 * Transient 5xx keeps the existing behaviour (fallback on upload, keep polling on status).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  getSupabase: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'session-token-123' } } }) },
  }),
}));

const { runSmartImportPipeline, RouterAccessError } = await import('../runSmartImportPipeline');

type Call = { fn: string; body: unknown; headers: Record<string, string> };
let calls: Call[] = [];
let uploadStatus = 200;
let statusSequence: number[] = [];
let seq = 0;

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const fakeFetch = vi.fn(async (url: string, init: RequestInit = {}) => {
  const fn = String(url).match(/\/\.netlify\/functions\/([^/?]+)/)?.[1] ?? `external:${url}`;
  const headers: Record<string, string> = {};
  Object.entries((init.headers as Record<string, string>) || {}).forEach(([k, v]) => { headers[k.toLowerCase()] = v; });
  let body: unknown = null;
  if (typeof init.body === 'string') {
    try { body = JSON.parse(init.body); } catch { body = init.body; }
  }
  calls.push({ fn, body, headers });

  if (fn === 'prime-router') {
    const mode = (body as { mode?: string } | null)?.mode;
    if (mode === 'status') {
      const code = statusSequence.length ? statusSequence.shift()! : 200;
      if (code !== 200) return respond({ ok: false, error: 'x' }, code);
      return respond({ ok: true, mode: 'status', status: 'complete', sync: { transactionCount: 4 } });
    }
    if (uploadStatus !== 200) {
      const error = uploadStatus === 503 ? 'processing_unavailable' : 'Unauthorized';
      return respond({ ok: false, error }, uploadStatus);
    }
    return respond({ ok: true, mode: 'upload', importId: 'imp-1', documentId: 'doc-1' });
  }
  // Legacy path: fail fast so the test ends once we know it was entered.
  if (fn === 'smart-import-init') return respond({ ok: false, error: 'legacy init reached' }, 500);
  return respond({ ok: true });
});

function input(name: string, withToken = true) {
  const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], `${name}.csv`, { type: 'text/csv' });
  return {
    userId: 'user-1',
    file,
    fileName: file.name,
    mimeType: 'text/csv',
    fileSize: file.size,
    lastModified: 1,
    ...(withToken ? { authToken: 'explicit-token' } : {}),
  };
}

const fnNames = () => calls.map((c) => c.fn);

beforeEach(() => {
  calls = [];
  uploadStatus = 200;
  statusSequence = [];
  seq += 1;
  vi.stubGlobal('fetch', fakeFetch);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('upload: router access failures do not fall back to the legacy path', () => {
  it.each([401, 403])('router upload %i → RouterAccessError, no legacy calls', async (code) => {
    uploadStatus = code;
    const err = await runSmartImportPipeline(input(`up-${code}-${seq}`)).catch((e) => e);
    expect(err).toBeInstanceOf(RouterAccessError);
    expect(err.status).toBe(code);
    expect(fnNames()).toEqual(['prime-router']);
    expect(fnNames()).not.toContain('smart-import-init');
    expect(fnNames()).not.toContain('smart-import-finalize');
  });

  it('401 gives a sign-in message', async () => {
    uploadStatus = 401;
    const err = await runSmartImportPipeline(input(`msg-${seq}`)).catch((e) => e);
    expect(String(err.message)).toMatch(/sign in again/i);
  });

  it('router upload 503 processing_unavailable (C1b job dispatch unavailable) → stops, no legacy fallback', async () => {
    uploadStatus = 503;
    const err = await runSmartImportPipeline(input(`up-503-${seq}`)).catch((e) => e);
    expect(String(err?.message)).toMatch(/processing_unavailable/);
    expect(fnNames()).toEqual(['prime-router']);
  });

  it('router upload 500 still falls back to the legacy path (unchanged)', async () => {
    uploadStatus = 500;
    await runSmartImportPipeline(input(`up-500-${seq}`)).catch(() => undefined);
    expect(fnNames()[0]).toBe('prime-router');
    expect(fnNames()).toContain('smart-import-init');
  });
});

describe('status polling: stops on 401/403/404', () => {
  it.each([401, 403, 404])('status %i → RouterAccessError after one poll, no legacy calls', async (code) => {
    statusSequence = [code, 200];
    const err = await runSmartImportPipeline(input(`st-${code}-${seq}`)).catch((e) => e);
    expect(err).toBeInstanceOf(RouterAccessError);
    expect(err.status).toBe(code);
    const statusPolls = calls.filter((c) => c.fn === 'prime-router' && (c.body as { mode?: string })?.mode === 'status');
    expect(statusPolls).toHaveLength(1);
    expect(fnNames()).not.toContain('smart-import-init');
  });

  it('status 500 keeps polling and then completes (unchanged)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] });
    statusSequence = [500, 200];
    const p = runSmartImportPipeline(input(`st-500-${seq}`));
    await vi.advanceTimersByTimeAsync(2500);
    const result = await p;
    expect(result).toMatchObject({ importId: 'imp-1', queued: false, transactionCount: 4 });
    const statusPolls = calls.filter((c) => c.fn === 'prime-router' && (c.body as { mode?: string })?.mode === 'status');
    expect(statusPolls).toHaveLength(2);
    expect(fnNames()).not.toContain('smart-import-init');
  });
});

describe('auth headers', () => {
  it('every router call carries the caller token', async () => {
    await runSmartImportPipeline(input(`hdr-${seq}`));
    const routerCalls = calls.filter((c) => c.fn === 'prime-router');
    expect(routerCalls.length).toBeGreaterThanOrEqual(2);
    for (const c of routerCalls) expect(c.headers.authorization).toBe('Bearer explicit-token');
  });

  it('a caller without authToken gets the current session token', async () => {
    await runSmartImportPipeline(input(`sess-${seq}`, false));
    const routerCalls = calls.filter((c) => c.fn === 'prime-router');
    for (const c of routerCalls) expect(c.headers.authorization).toBe('Bearer session-token-123');
  });
});

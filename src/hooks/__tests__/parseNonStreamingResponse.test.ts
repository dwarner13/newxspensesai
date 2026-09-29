/**
 * parseNonStreamingResponse — Unit Tests
 *
 * Covers the non-streaming JSON response parsing path in usePrimeChat.
 * Ensures that empty bodies, invalid JSON, and body-read failures produce
 * explicit diagnostics and never silently return null.
 *
 * Run with: npm test -- parseNonStreamingResponse.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseNonStreamingResponse } from '../usePrimeChat';

/** Helper: build a minimal Response-like object for testing. */
function fakeResponse(opts: {
  body?: string;
  status?: number;
  contentType?: string;
  contentLength?: string | null;
  textThrows?: Error;
}): Response {
  const headers = new Headers();
  if (opts.contentType) headers.set('content-type', opts.contentType);
  if (opts.contentLength !== undefined && opts.contentLength !== null) {
    headers.set('content-length', opts.contentLength);
  }
  const res: Partial<Response> = {
    status: opts.status ?? 200,
    headers,
    text: opts.textThrows
      ? () => Promise.reject(opts.textThrows)
      : () => Promise.resolve(opts.body ?? ''),
  };
  return res as Response;
}

describe('parseNonStreamingResponse', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── 1. Valid JSON with content ───────────────────────────────────

  it('parses valid JSON with assistant content', async () => {
    const body = JSON.stringify({
      ok: true,
      content: 'Here are your 8 Costco transactions.',
      employee: 'prime-boss',
      sessionId: 'sess-1',
      thread_id: 'thr-1',
    });
    const res = fakeResponse({ body, contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.error).toBeNull();
    expect(result.payload).toBeTruthy();
    expect(result.payload.content).toBe('Here are your 8 Costco transactions.');
    expect(result.payload.ok).toBe(true);
    expect(result.payload.sessionId).toBe('sess-1');
  });

  // ─── 2. Valid JSON with content + txCandidates ────────────────────

  it('preserves txCandidates in parsed payload', async () => {
    const candidates = [
      { ordinal: 1, id: 'uuid-1', merchant: 'Costco', date: '2026-09-01', amount: 45.99, category: 'Groceries', subcategory: null },
      { ordinal: 2, id: 'uuid-2', merchant: 'Costco', date: '2026-09-05', amount: 120.50, category: 'Groceries', subcategory: null },
    ];
    const body = JSON.stringify({
      ok: true,
      content: 'Two transactions found.',
      txCandidates: candidates,
    });
    const res = fakeResponse({ body, contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.error).toBeNull();
    expect(result.payload.content).toBe('Two transactions found.');
    expect(result.payload.txCandidates).toHaveLength(2);
    expect(result.payload.txCandidates[0].merchant).toBe('Costco');
    expect(result.payload.txCandidates[1].amount).toBe(120.50);
  });

  // ─── 3. Empty response body ───────────────────────────────────────

  it('returns empty_body error for empty response', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '', contentType: 'application/json', status: 200 });
    const result = await parseNonStreamingResponse(res);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('empty_body');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('Non-streaming response body is empty');
    expect(spy.mock.calls[0][0]).toContain('status=200');
  });

  it('returns empty_body error for whitespace-only response', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '   \n  ', contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('empty_body');
    expect(spy).toHaveBeenCalledOnce();
  });

  // ─── 4. Invalid / truncated JSON ──────────────────────────────────

  it('returns invalid_json error for truncated JSON', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '{"ok":true,"content":"Hello', contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('invalid_json');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('JSON parse failed');
    expect(spy.mock.calls[0][0]).toContain('bodyLen=27');
  });

  it('returns invalid_json error for non-JSON text', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '<html>502 Bad Gateway</html>', contentType: 'text/html' });
    const result = await parseNonStreamingResponse(res);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('invalid_json');
    expect(spy).toHaveBeenCalledOnce();
  });

  // ─── 5. Body read failure ─────────────────────────────────────────

  it('returns body_read_failed when res.text() throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ textThrows: new Error('network interrupted') });
    const result = await parseNonStreamingResponse(res);

    expect(result.payload).toBeNull();
    expect(result.error).toBe('body_read_failed');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('Response body read failed');
    expect(spy.mock.calls[0][0]).toContain('network interrupted');
  });

  // ─── 6. Valid JSON without content field ──────────────────────────

  it('returns payload even when content field is missing (caller decides)', async () => {
    const body = JSON.stringify({ ok: true, employee: 'prime-boss' });
    const res = fakeResponse({ body, contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    // Parser succeeds — it's the caller's job to check for usable content
    expect(result.error).toBeNull();
    expect(result.payload).toBeTruthy();
    expect(result.payload.content).toBeUndefined();
  });

  // ─── 7. Noop / dedup payloads parse successfully ──────────────────

  it('parses noop payload without error', async () => {
    const body = JSON.stringify({ type: 'noop' });
    const res = fakeResponse({ body, contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.error).toBeNull();
    expect(result.payload.type).toBe('noop');
  });

  it('parses deduped payload without error', async () => {
    const body = JSON.stringify({ deduped: true });
    const res = fakeResponse({ body, contentType: 'application/json' });
    const result = await parseNonStreamingResponse(res);

    expect(result.error).toBeNull();
    expect(result.payload.deduped).toBe(true);
  });

  // ─── 8. Diagnostics include status and content-type ───────────────

  it('includes HTTP status in empty body diagnostic', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '', contentType: 'application/json', status: 502 });
    await parseNonStreamingResponse(res);

    expect(spy.mock.calls[0][0]).toContain('status=502');
  });

  it('includes content-length header in diagnostic when present', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '', contentType: 'application/json', contentLength: '0' });
    await parseNonStreamingResponse(res);

    expect(spy.mock.calls[0][0]).toContain('content-length=0');
  });

  it('shows absent when content-length header is missing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = fakeResponse({ body: '', contentType: 'application/json', contentLength: null });
    await parseNonStreamingResponse(res);

    expect(spy.mock.calls[0][0]).toContain('content-length=absent');
  });
});

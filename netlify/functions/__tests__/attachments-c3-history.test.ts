/**
 * Attachments C3 — attachment history (server).
 * References only (no text) on messages; active documents per conversation (≤10); live,
 * owner-scoped status for restore; removed / foreign documents never resurface.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const S1 = 'session-a-1';
const d = (n: number) => `c0c0c0c0-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CHAT_READY = d(1);
const CHAT_PROC = d(2);
const CHAT_REJ = d(3);
const CHAT_PURGED = d(4);
const IMPORT_DOC = d(5);
const CHAT_B = d(6);

let db: Record<string, Row[]> = {};
function seed() {
  db = {
    user_documents: [
      { id: CHAT_READY, user_id: A, purpose: 'chat_document', status: 'ready', original_name: 'lease.pdf', mime_type: 'application/pdf', pages_detected: 3, ocr_text: 'SECRET TEXT' },
      { id: CHAT_PROC, user_id: A, purpose: 'chat_document', status: 'ocr_processing', original_name: 'scan.png', mime_type: 'image/png' },
      { id: CHAT_REJ, user_id: A, purpose: 'chat_document', status: 'rejected', original_name: 'bad.pdf', mime_type: 'application/pdf' },
      { id: CHAT_PURGED, user_id: A, purpose: 'chat_document', status: 'purged', original_name: 'old.pdf', mime_type: 'application/pdf', pages_detected: 9 },
      { id: IMPORT_DOC, user_id: A, purpose: 'import', status: 'ready', original_name: 'stmt.pdf' },
      { id: CHAT_B, user_id: B, purpose: 'chat_document', status: 'ready', original_name: 'b-secret-name.pdf' },
    ],
    chat_messages: [],
  };
}

function makeSb() {
  return {
    from(table: string) {
      const filters: Array<[string, string, unknown]> = [];
      let lim = Infinity;
      let desc = false;
      const exec = async () => {
        let rows = (db[table] || []).filter((r) =>
          filters.every(([op, col, v]) => (op === 'eq' ? r[col] === v : op === 'in' ? (v as unknown[]).includes(r[col]) : true)),
        );
        if (desc) rows = [...rows].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
        return { data: rows.slice(0, lim), error: null };
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), b),
        in: (c: string, v: unknown) => (filters.push(['in', c, v]), b),
        order: (_c: string, o?: { ascending?: boolean }) => ((desc = o?.ascending === false), b),
        limit: (n: number) => ((lim = n), b),
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => exec().then(res, rej),
      };
      return b;
    },
  };
}

const fakeAuth = vi.fn(async () => ({ userId: A, error: null as string | null }));
vi.mock('../_shared/supabase', () => ({ admin: () => makeSb(), serverSupabase: () => makeSb(), supabaseAdmin: {} }));
vi.mock('../_shared/verifyAuth', () => ({ verifyAuth: (...a: unknown[]) => fakeAuth(...(a as [])) }));

const lib = await import('../_shared/chatAttachments');
const statusFn = await import('../chat-attachments-status');

beforeEach(() => {
  seed();
  fakeAuth.mockReset();
  fakeAuth.mockImplementation(async () => ({ userId: A, error: null }));
});

describe('attachment references on messages', () => {
  it('references only the user\'s own chat documents, with no text', async () => {
    const refs = await lib.resolveAttachmentRefs(makeSb(), A, [CHAT_READY, IMPORT_DOC, CHAT_B, 'not-a-uuid', CHAT_PROC]);
    expect(refs).toEqual([
      { document_id: CHAT_READY, name: 'lease.pdf', mime: 'application/pdf', pages: 3 },
      { document_id: CHAT_PROC, name: 'scan.png', mime: 'image/png', pages: null },
    ]);
    expect(JSON.stringify(refs)).not.toContain('SECRET TEXT');
  });

  it('caps at 10 per message', async () => {
    for (let i = 10; i < 25; i++) db.user_documents.push({ id: d(i), user_id: A, purpose: 'chat_document', status: 'ready', original_name: `f${i}.pdf` });
    const refs = await lib.resolveAttachmentRefs(makeSb(), A, Array.from({ length: 15 }, (_, i) => d(i + 10)));
    expect(refs).toHaveLength(10);
  });

  it('withAttachmentRefs leaves messages without attachments untouched', () => {
    expect(lib.withAttachmentRefs(undefined, [])).toBeUndefined();
    const meta = { client_message_id: 'c1' };
    expect(lib.withAttachmentRefs(meta, [])).toBe(meta);
    expect(lib.withAttachmentRefs(meta, [{ document_id: CHAT_READY, name: 'lease.pdf', mime: null, pages: null }])).toEqual({
      client_message_id: 'c1',
      attachments: [{ document_id: CHAT_READY, name: 'lease.pdf', mime: null, pages: null }],
    });
  });

  it('readAttachmentRefs rejects malformed stored metadata', () => {
    expect(lib.readAttachmentRefs({ attachments: [{ document_id: 'x' }, { document_id: CHAT_READY, name: 'a\u0000b.pdf', pages: -2 }, 'junk'] })).toEqual([
      { document_id: CHAT_READY, name: 'ab.pdf', mime: null, pages: null },
    ]);
    expect(lib.readAttachmentRefs(null)).toEqual([]);
    expect(lib.readAttachmentRefs({ attachments: 'x' })).toEqual([]);
  });
});

describe('active documents per conversation (follow-up context)', () => {
  it('distinct, most recent first, only this user + session, max 10', async () => {
    db.chat_messages = [
      { session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T10:00:00Z', metadata: { attachments: [{ document_id: CHAT_READY }] } },
      { session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T11:00:00Z', metadata: { attachments: [{ document_id: CHAT_PROC }, { document_id: CHAT_READY }] } },
      { session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T12:00:00Z', metadata: null },
      { session_id: S1, user_id: B, role: 'user', created_at: '2026-11-23T13:00:00Z', metadata: { attachments: [{ document_id: CHAT_B }] } },
      { session_id: 'other', user_id: A, role: 'user', created_at: '2026-11-23T14:00:00Z', metadata: { attachments: [{ document_id: CHAT_REJ }] } },
      { session_id: S1, user_id: A, role: 'assistant', created_at: '2026-11-23T15:00:00Z', metadata: { attachments: [{ document_id: CHAT_PURGED }] } },
    ];
    expect(await lib.loadActiveDocumentIds(makeSb(), A, S1)).toEqual([CHAT_PROC, CHAT_READY]);
    expect(await lib.loadActiveDocumentIds(makeSb(), A, null)).toEqual([]);

    db.chat_messages = Array.from({ length: 14 }, (_, i) => ({
      session_id: S1, user_id: A, role: 'user', created_at: `2026-11-23T10:${String(i).padStart(2, '0')}:00Z`, metadata: { attachments: [{ document_id: d(100 + i) }] },
    }));
    const active = await lib.loadActiveDocumentIds(makeSb(), A, S1);
    expect(active).toHaveLength(10);
    expect(active[0]).toBe(d(113));
  });

  it('this message\'s documents come first, then active ones, capped at 10', () => {
    const active = Array.from({ length: 10 }, (_, i) => d(200 + i));
    const merged = lib.mergeContextDocumentIds([CHAT_READY, d(201)], active);
    expect(merged).toHaveLength(10);
    expect(merged[0]).toBe(CHAT_READY);
    expect(merged.filter((x) => x === d(201))).toHaveLength(1);
    expect(lib.mergeContextDocumentIds(undefined, [CHAT_READY])).toEqual([CHAT_READY]);
    expect(lib.mergeContextDocumentIds([], [])).toEqual([]);
  });
});

describe('chat-attachments-status (restore)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler shapes
  const call = async (body: unknown, method = 'POST'): Promise<{ statusCode: number; json: any }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler signature
    const res: any = await (statusFn.handler as any)({ httpMethod: method, headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) }, {});
    return { statusCode: res.statusCode, json: JSON.parse(res.body || '{}') };
  };

  it('returns the live status of each own chat document', async () => {
    const r = await call({ documentIds: [CHAT_READY, CHAT_PROC, CHAT_REJ, CHAT_PURGED] });
    expect(r.statusCode).toBe(200);
    expect(r.json.items).toEqual([
      { document_id: CHAT_READY, status: 'ready', pages: 3 },
      { document_id: CHAT_PROC, status: 'processing', pages: null },
      { document_id: CHAT_REJ, status: 'unreadable', pages: null },
      { document_id: CHAT_PURGED, status: 'removed', pages: null },
    ]);
  });

  it('foreign, missing and import documents are all "removed" — nothing about them leaks', async () => {
    const r = await call({ documentIds: [CHAT_B, d(999), IMPORT_DOC] });
    expect(r.json.items.map((i: Row) => i.status)).toEqual(['removed', 'removed', 'removed']);
    expect(JSON.stringify(r.json)).not.toContain('b-secret-name');
  });

  it('document becomes removed after deletion (row gone)', async () => {
    db.user_documents = db.user_documents.filter((x) => x.id !== CHAT_READY);
    expect((await call({ documentIds: [CHAT_READY] })).json.items[0].status).toBe('removed');
  });

  it('requires authentication and a bounded list', async () => {
    fakeAuth.mockImplementation(async () => ({ userId: null as unknown as string, error: 'no token' }));
    expect((await call({ documentIds: [CHAT_READY] })).statusCode).toBe(401);
    fakeAuth.mockImplementation(async () => ({ userId: A, error: null }));
    expect((await call({ documentIds: [] })).statusCode).toBe(400);
    expect((await call({ documentIds: Array.from({ length: 51 }, (_, i) => d(i)) })).statusCode).toBe(400);
    expect((await call({}, 'GET')).statusCode).toBe(405);
  });
});

describe('follow-up questions keep document context (chat.ts buildAttachmentContext + history)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loaded after env setup
  let buildAttachmentContext: (sb: any, userId: string, ids: string[], opts?: { question?: string }) => Promise<string | null>;
  beforeAll(async () => {
    buildAttachmentContext = (await import('../chat')).buildAttachmentContext;
  }, 120_000);

  const withPages = () => {
    db.user_documents[0].extracted_data = { page_texts: [{ page: 1, text: 'Rent is $1,850 per month.' }] };
  };

  it('a later message without documentIds still gets the earlier attachment as context', async () => {
    withPages();
    db.chat_messages = [{ session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T10:00:00Z', metadata: { attachments: [{ document_id: CHAT_READY, name: 'lease.pdf' }] } }];
    const active = await lib.loadActiveDocumentIds(makeSb(), A, S1);
    const ids = lib.mergeContextDocumentIds(undefined, active);
    const ctx = String(await buildAttachmentContext(makeSb(), A, ids, { question: 'how much is rent?' }));
    expect(ctx).toContain('Rent is $1,850 per month.');
    expect(ctx).toContain('[p.1]');
  });

  it('after removal (purged) the document no longer gives context; foreign ids never do', async () => {
    withPages();
    db.chat_messages = [{ session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T10:00:00Z', metadata: { attachments: [{ document_id: CHAT_READY }, { document_id: CHAT_B }] } }];
    db.user_documents[0].status = 'purged';
    const ids = lib.mergeContextDocumentIds(undefined, await lib.loadActiveDocumentIds(makeSb(), A, S1));
    const ctx = await buildAttachmentContext(makeSb(), A, ids, { question: 'rent?' });
    expect(String(ctx)).not.toContain('Rent is');
    expect(String(ctx)).not.toContain('b-secret-name');
  });

  it('several attachments across messages are all available, most recent first', async () => {
    db.user_documents.push({ id: d(50), user_id: A, purpose: 'chat_document', status: 'ready', original_name: 'two.pdf', extracted_data: { page_texts: [{ page: 1, text: 'Second document text.' }] } });
    withPages();
    db.chat_messages = [
      { session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T10:00:00Z', metadata: { attachments: [{ document_id: CHAT_READY }] } },
      { session_id: S1, user_id: A, role: 'user', created_at: '2026-11-23T11:00:00Z', metadata: { attachments: [{ document_id: d(50) }] } },
    ];
    const ids = lib.mergeContextDocumentIds([], await lib.loadActiveDocumentIds(makeSb(), A, S1));
    expect(ids).toEqual([d(50), CHAT_READY]);
    const ctx = String(await buildAttachmentContext(makeSb(), A, ids));
    expect(ctx).toContain('Second document text.');
    expect(ctx).toContain('Rent is $1,850 per month.');
  });
});

describe('chat.ts C3 wiring (static)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  const ORIGINAL_DET = '(client_message_id || hidden) ? { ...(client_message_id ? { client_message_id } : {}), ...(hidden ? { hidden: true } : {}) } : undefined';
  const ORIGINAL_MAIN = '(client_message_id || safeHidden) ? { ...(client_message_id ? { client_message_id } : {}), ...(safeHidden ? { hidden: true } : {}) } : undefined';

  it('every user-message insert keeps its original metadata expression, only wrapped', () => {
    expect(chat.split(`metadata: withAttachmentRefs(${ORIGINAL_DET}, turnAttachmentRefs),`).length - 1).toBe(9);
    expect(chat.split(`metadata: withAttachmentRefs(${ORIGINAL_MAIN}, turnAttachmentRefs),`).length - 1).toBe(1);
    // no unwrapped user-message metadata left
    expect(chat.split(`metadata: ${ORIGINAL_DET},`).length - 1).toBe(0);
    expect(chat.split(`metadata: ${ORIGINAL_MAIN},`).length - 1).toBe(0);
  });

  it('messages without attachments keep identical metadata (wrap returns its input)', () => {
    const meta = { client_message_id: 'c1' };
    expect(lib.withAttachmentRefs(meta, [])).toBe(meta);
    expect(lib.withAttachmentRefs(undefined, [])).toBeUndefined();
  });

  it('refs and active ids are computed from the verified user and session; context uses the merged ids', () => {
    expect(chat).toMatch(/resolveAttachmentRefs\(sb, userId, documentIds\)/);
    expect(chat).toMatch(/loadActiveDocumentIds\(sb, userId, finalSessionId\)/);
    expect(chat).toMatch(/const contextDocumentIds = mergeContextDocumentIds\(documentIds, activeChatDocumentIds\);/);
    expect(chat).toMatch(/buildAttachmentContext\(sb, userId, contextDocumentIds, \{ question: masked \}\)/);
    // assistant messages never carry attachment refs
    expect(chat).not.toMatch(/role: 'assistant',[^}]*turnAttachmentRefs/);
  });
});

/**
 * S0 focused security batch (2026-11-23):
 *  1. activity-feed: identity comes only from the verified JWT; a claimed userId (query, body,
 *     x-user-id) must match or the request is refused (403) before any data access; every read is
 *     filtered by the verified user; errors never echo internal messages.
 *  2. seed-activity-events: retired — 410 for every request, no database access.
 *  3. Inbox mark-as-read: updates only the row's own table, filtered by id AND owner, and reports
 *     success only when exactly that row was updated (errors and zero-row updates are failures).
 *
 * All Supabase access is an in-memory fake. No network, no database.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type Call = { table: string; ops: string[]; filters: Array<[string, unknown]>; payload?: unknown; limit?: number };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const TOKEN_A = 'user-a-jwt';

let db: Record<string, Row[]> = {};
let calls: Call[] = [];
let failNextQuery = false;

function seed() {
  db = {
    ai_activity_events: [
      { id: 'ev-a1', user_id: USER_A, employee_id: 'prime-boss', event_type: 'x', status: 'success', label: 'A event', details: {}, created_at: '2026-11-01T00:00:00Z' },
      { id: 'ev-b1', user_id: USER_B, employee_id: 'prime-boss', event_type: 'x', status: 'success', label: 'B event', details: {}, created_at: '2026-11-02T00:00:00Z' },
    ],
  };
}

function query(table: string) {
  const call: Call = { table, ops: [], filters: [] };
  calls.push(call);
  const matches = () => (db[table] || []).filter((r) => call.filters.every(([k, v]) => (k.startsWith('in:') ? (v as unknown[]).includes(r[k.slice(3)]) : r[k] === v)));
  const run = () => {
    if (failNextQuery) { failNextQuery = false; return { data: null, error: { code: 'XX000', message: 'secret internal detail' } }; }
    const rows = matches();
    return { data: call.limit !== undefined ? rows.slice(0, call.limit) : rows, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic chain via Proxy
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej);
      return (...args: unknown[]) => {
        call.ops.push(prop);
        if (prop === 'eq') call.filters.push([String(args[0]), args[1]]);
        if (prop === 'in') call.filters.push([`in:${String(args[0])}`, args[1]]);
        if (prop === 'limit') call.limit = Number(args[0]);
        return proxy;
      };
    },
  });
  return proxy;
}

const fakeClient = {
  auth: {
    getUser: async (token: string) =>
      token === TOKEN_A ? { data: { user: { id: USER_A } }, error: null } : { data: { user: null }, error: { message: 'invalid JWT' } },
  },
  from: (table: string) => query(table),
};

const adminSpy = vi.fn(() => fakeClient);
vi.mock('../_shared/supabase', () => ({ admin: () => adminSpy(), serverSupabase: () => adminSpy() }));

const feed = await import('../activity-feed');
const seedFn = await import('../seed-activity-events');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
async function callFeed(opts: { method?: string; headers?: Record<string, string>; qs?: Record<string, string>; body?: Row }): Promise<{ statusCode: number; json: any; raw: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
  const res: any = await (feed.handler as any)({
    httpMethod: opts.method ?? 'GET',
    headers: opts.headers ?? {},
    queryStringParameters: opts.qs ?? null,
    body: opts.body ? JSON.stringify(opts.body) : null,
  }, {});
  const raw = String(res.body || '');
  return { statusCode: res.statusCode, json: raw ? JSON.parse(raw) : null, raw };
}
const bearer = (t: string) => ({ authorization: `Bearer ${t}` });
const dataCalls = () => calls.filter((c) => c.table === 'ai_activity_events');

let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  seed();
  calls = [];
  failNextQuery = false;
  adminSpy.mockClear();
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => { logSpies.forEach((s) => s.mockRestore()); });

describe('activity-feed — authentication', () => {
  it('no token → 401 and no data access (the old ?userId= path no longer works)', async () => {
    const r = await callFeed({ qs: { userId: USER_B } });
    expect(r.statusCode).toBe(401);
    expect(dataCalls()).toHaveLength(0);
    expect(r.raw).not.toContain(USER_B);
  });
  it('garbage bearer → 401, no data access', async () => {
    const r = await callFeed({ headers: bearer('not-a-real-token'), qs: { userId: USER_A } });
    expect(r.statusCode).toBe(401);
    expect(dataCalls()).toHaveLength(0);
  });
  it('POST without token → 401', async () => {
    const r = await callFeed({ method: 'POST', body: { userId: USER_A } });
    expect(r.statusCode).toBe(401);
    expect(dataCalls()).toHaveLength(0);
  });
  it('OPTIONS preflight still succeeds without a token', async () => {
    const r = await callFeed({ method: 'OPTIONS' });
    expect(r.statusCode).toBe(200);
  });
});

describe('activity-feed — identity and isolation', () => {
  it('own token, no claimed id → 200 with only own events', async () => {
    const r = await callFeed({ headers: bearer(TOKEN_A) });
    expect(r.statusCode).toBe(200);
    expect(r.json.events.map((e: Row) => e.id)).toEqual(['ev-a1']);
    expect(dataCalls()[0].filters).toContainEqual(['user_id', USER_A]);
  });
  it('own token + matching ?userId= (current client) → 200, own events', async () => {
    const r = await callFeed({ headers: bearer(TOKEN_A), qs: { userId: USER_A, limit: '30' } });
    expect(r.statusCode).toBe(200);
    expect(r.json.events.map((e: Row) => e.id)).toEqual(['ev-a1']);
  });
  it.each([
    ['query userId', { qs: { userId: USER_B } }],
    ['x-user-id header', { headers: { 'x-user-id': USER_B } }],
    ['POST body userId', { method: 'POST', body: { userId: USER_B } }],
  ])('own token + foreign %s → 403 and no data access', async (_l, extra: Row) => {
    const r = await callFeed({ ...extra, headers: { ...bearer(TOKEN_A), ...(extra.headers || {}) } });
    expect(r.statusCode).toBe(403);
    expect(dataCalls()).toHaveLength(0);
    expect(r.raw).not.toContain('B event');
  });
  it('never filters by anyone but the verified user', async () => {
    await callFeed({ headers: bearer(TOKEN_A), qs: { userId: USER_A, category: 'prime' } });
    const userFilters = dataCalls().flatMap((c) => c.filters.filter(([k]) => k === 'user_id').map(([, v]) => v));
    expect(userFilters).toEqual([USER_A]);
  });
  it('limit is bounded (1..100) and junk falls back to the default', async () => {
    await callFeed({ headers: bearer(TOKEN_A), qs: { limit: '100000' } });
    await callFeed({ headers: bearer(TOKEN_A), qs: { limit: 'abc' } });
    await callFeed({ headers: bearer(TOKEN_A), qs: { limit: '-5' } });
    expect(dataCalls().map((c) => c.limit)).toEqual([100, 30, 30]);
  });
  it('query errors return a generic 500 without internal details', async () => {
    failNextQuery = true;
    const r = await callFeed({ headers: bearer(TOKEN_A) });
    expect(r.statusCode).toBe(500);
    expect(r.raw).not.toContain('secret internal detail');
  });
});

describe('seed-activity-events — retired', () => {
  it.each(['POST', 'GET', 'OPTIONS'])('%s → 410 and no database access', async (method) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler typing
    const res: any = await (seedFn.handler as any)({ httpMethod: method, headers: bearer(TOKEN_A), body: JSON.stringify({ userId: USER_B, count: 5 }) }, {});
    expect(res.statusCode).toBe(410);
    expect(adminSpy).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });
  it('source has no Supabase/admin import and no insert', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../seed-activity-events.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.\/_shared\/supabase/);
    expect(src).not.toMatch(/\.insert\(/);
  });
});

// ── Inbox mark-as-read ──────────────────────────────────────────────────────
type UpdCall = { table: string; payload: unknown; filters: Array<[string, unknown]>; selected: boolean };
function inboxClient(result: { data: unknown; error: unknown }) {
  const log: UpdCall[] = [];
  const client = {
    from(table: string) {
      const c: UpdCall = { table, payload: undefined, filters: [], selected: false };
      log.push(c);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        update(p: unknown) { c.payload = p; return chain; },
        eq(k: string, v: unknown) { c.filters.push([k, v]); return chain; },
        select() { c.selected = true; return Promise.resolve(result); },
      };
      return chain;
    },
  };
  return { client, log };
}

const { markNotificationReadForOwner } = await import('../../../src/lib/inbox/markNotificationRead');

describe('Inbox mark-as-read — owner scoping and truthful result', () => {
  it('notifications row: one update, filtered by id AND owner, confirmed → true', async () => {
    const { client, log } = inboxClient({ data: [{ id: 'n1' }], error: null });
    const ok = await markNotificationReadForOwner(client, { id: 'n1', source: 'notifications' }, USER_A);
    expect(ok).toBe(true);
    expect(log).toHaveLength(1);
    expect(log[0].table).toBe('notifications');
    // Live schema: notifications has no `read` column; read state is read_at (the only column
    // customers may update after the notifications RLS migration).
    expect(Object.keys(log[0].payload as Row)).toEqual(['read_at']);
    expect(log[0].filters).toEqual([['id', 'n1'], ['user_id', USER_A]]);
    expect(log[0].selected).toBe(true);
  });
  it('user_notifications row: updates only that table with read_at, owner-filtered', async () => {
    const { client, log } = inboxClient({ data: [{ id: 'u1' }], error: null });
    const ok = await markNotificationReadForOwner(client, { id: 'u1', source: 'user_notifications' }, USER_A);
    expect(ok).toBe(true);
    expect(log.map((c) => c.table)).toEqual(['user_notifications']);
    expect(Object.keys(log[0].payload as Row)).toEqual(['read_at']);
    expect(log[0].filters).toEqual([['id', 'u1'], ['user_id', USER_A]]);
  });
  it('zero rows updated (not owner / RLS refused) → false', async () => {
    const { client } = inboxClient({ data: [], error: null });
    expect(await markNotificationReadForOwner(client, { id: 'n1', source: 'notifications' }, USER_A)).toBe(false);
  });
  it('error → false', async () => {
    const { client } = inboxClient({ data: null, error: { message: 'denied' } });
    expect(await markNotificationReadForOwner(client, { id: 'n1', source: 'notifications' }, USER_A)).toBe(false);
  });
  it('a different row returned → false', async () => {
    const { client } = inboxClient({ data: [{ id: 'other' }], error: null });
    expect(await markNotificationReadForOwner(client, { id: 'n1', source: 'notifications' }, USER_A)).toBe(false);
  });
  it('missing owner id → false with no update attempted', async () => {
    const { client, log } = inboxClient({ data: [{ id: 'n1' }], error: null });
    expect(await markNotificationReadForOwner(client, { id: 'n1', source: 'notifications' }, '')).toBe(false);
    expect(log).toHaveLength(0);
  });
  it('page source: no unscoped update and local "read" only after confirmation', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../../src/pages/Inbox/InboxPage.tsx'), 'utf8');
    const helper = fs.readFileSync(path.resolve(__dirname, '../../../src/lib/inbox/markNotificationRead.ts'), 'utf8');
    // the page has no direct update; every update goes through the owner-scoped helper
    expect(src.match(/\.update\(/g)).toBeNull();
    expect(src).toMatch(/markNotificationReadForOwner\(/);
    expect(helper).toMatch(/\.eq\('id', n\.id\)\.eq\('user_id', ownerId\)\.select\('id'\)/);
    expect(src).toMatch(/if \(ok\) setNotifications/);
    expect(src).not.toMatch(/await sb\.from\("notifications"\)\.update/);
  });
});

describe('activity-feed source', () => {
  it('authenticates before reading and never uses a caller-supplied id as identity', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../activity-feed.ts'), 'utf8');
    const authAt = src.indexOf('authenticateUser(event)');
    const readAt = src.indexOf(".from('ai_activity_events')");
    expect(authAt).toBeGreaterThan(0);
    expect(authAt).toBeLessThan(readAt);
    expect(src).toMatch(/\.eq\('user_id', verifiedUserId\)/);
    expect(src).not.toMatch(/message: error\.message/);
  });
});

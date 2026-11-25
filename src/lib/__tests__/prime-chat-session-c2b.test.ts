/**
 * Prime Chat C2-B — launcher → active Prime panel, one authoritative session selection.
 * Pure helpers + ownership check (fake Supabase client) + structural wiring checks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  isPrimeSlug,
  isSessionUuid,
  primeSessionStorageKey,
  storePrimeSessionId,
  resolvePrimeLaunch,
  verifyOwnedPrimeSession,
  type SessionOwnershipClient,
} from '../primeChatSession';

const USER = '938a2e17-0000-4000-8000-000000000001';
const OTHER = '11111111-0000-4000-8000-000000000002';
const S_OWNED = '22222222-0000-4000-8000-000000000003';
const S_FOREIGN = '33333333-0000-4000-8000-000000000004';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

// Minimal localStorage for the node test environment.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
});

/** Fake chat_sessions table with owner scoping exactly as the query filters it. */
function fakeClient(rows: Array<{ id: string; user_id: string }>, opts: { error?: boolean; throws?: boolean } = {}) {
  const calls: Array<[string, string]> = [];
  const client: SessionOwnershipClient = {
    from: (table: string) => ({
      select: () => ({
        eq: (c1: string, v1: string) => ({
          eq: (c2: string, v2: string) => ({
            maybeSingle: async () => {
              calls.push([c1, v1], [c2, v2]);
              if (opts.throws) throw new Error('network');
              if (opts.error) return { data: null, error: { message: 'boom' } };
              expect(table).toBe('chat_sessions');
              const row = rows.find(r => (r as Record<string, string>)[c1] === v1 && (r as Record<string, string>)[c2] === v2);
              return { data: row ? { id: row.id } : null, error: null };
            },
          }),
        }),
      }),
    }),
  };
  return { client, calls };
}

// ─────────────────────────────────────────────────────────────────────────────
// Launch decisions (every supported "open Prime" path)
// ─────────────────────────────────────────────────────────────────────────────

describe('open Prime → active Prime panel', () => {
  it.each([
    ['dashboard Prime CTA', { initialEmployeeSlug: 'prime-boss' }],
    ['command palette', { initialEmployeeSlug: 'prime-boss' }],
    ['employee card (PrimeUnifiedCard / OverviewSection)', { initialEmployeeSlug: 'prime-boss' }],
    ['legacy /chat/prime redirect (ChatPageRedirect)', { initialEmployeeSlug: 'prime-boss' }],
    ['alias slug "prime"', { initialEmployeeSlug: 'prime' }],
    ['openChat() with no slug while Prime is the active employee', { activeEmployeeSlug: 'prime-boss' }],
  ] as Array<[string, Record<string, string>]>)('%s → handled, no session request', (_l, o) => {
    expect(resolvePrimeLaunch({ isOpen: true, ...o })).toEqual({ handle: true, requestedSessionId: null });
  });

  it('Chat History (sidebar or page) forwards the selected session id', () => {
    expect(resolvePrimeLaunch({ isOpen: true, initialEmployeeSlug: 'prime-boss', conversationId: S_OWNED }))
      .toEqual({ handle: true, requestedSessionId: S_OWNED });
  });

  it('a non-UUID conversation id is never forwarded', () => {
    for (const bad of ['', 'session-abc-123', `${S_OWNED} OR 1=1`, '../x']) {
      expect(resolvePrimeLaunch({ isOpen: true, initialEmployeeSlug: 'prime-boss', conversationId: bad }))
        .toEqual({ handle: true, requestedSessionId: null });
    }
  });

  it.each(['tag-ai', 'byte-docs', 'crystal-analytics', 'goalie-goals', 'custodian'])(
    'specialist launch (%s) is not handled here — behaviour unchanged', (slug) => {
      expect(resolvePrimeLaunch({ isOpen: true, initialEmployeeSlug: slug, conversationId: S_OWNED })).toEqual({ handle: false });
    });

  it('a closed launcher does nothing', () => {
    expect(resolvePrimeLaunch({ isOpen: false, initialEmployeeSlug: 'prime-boss' })).toEqual({ handle: false });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Session selection + ownership
// ─────────────────────────────────────────────────────────────────────────────

describe('session ownership', () => {
  const rows = [{ id: S_OWNED, user_id: USER }, { id: S_FOREIGN, user_id: OTHER }];

  it('an owned session is accepted (query scoped by id AND user_id)', async () => {
    const { client, calls } = fakeClient(rows);
    expect(await verifyOwnedPrimeSession(client, USER, S_OWNED)).toBe(true);
    expect(calls).toEqual([['id', S_OWNED], ['user_id', USER]]);
  });

  it('a foreign session id is rejected', async () => {
    expect(await verifyOwnedPrimeSession(fakeClient(rows).client, USER, S_FOREIGN)).toBe(false);
  });

  it('an unknown session id is rejected', async () => {
    expect(await verifyOwnedPrimeSession(fakeClient(rows).client, USER, '44444444-0000-4000-8000-000000000005')).toBe(false);
  });

  it('invalid ids, missing user or client never query and are rejected', async () => {
    const f = fakeClient(rows);
    for (const bad of ['not-a-uuid', '', null, 42, undefined]) {
      expect(await verifyOwnedPrimeSession(f.client, USER, bad)).toBe(false);
    }
    expect(await verifyOwnedPrimeSession(f.client, null, S_OWNED)).toBe(false);
    expect(await verifyOwnedPrimeSession(null, USER, S_OWNED)).toBe(false);
    expect(f.calls).toEqual([]);
  });

  it('query errors and exceptions fail closed', async () => {
    expect(await verifyOwnedPrimeSession(fakeClient(rows, { error: true }).client, USER, S_OWNED)).toBe(false);
    expect(await verifyOwnedPrimeSession(fakeClient(rows, { throws: true }).client, USER, S_OWNED)).toBe(false);
  });
});

describe('one authoritative selection (refresh restores it)', () => {
  it('the selected session is stored under the single Prime key', () => {
    expect(primeSessionStorageKey(USER)).toBe(`chat_session_${USER}_prime-boss`);
    expect(storePrimeSessionId(USER, S_OWNED)).toBe(true);
    expect(store.get(`chat_session_${USER}_prime-boss`)).toBe(S_OWNED); // what PrimeChatV2 reads on mount
  });

  it('storage failures never throw', () => {
    (globalThis as { localStorage?: unknown }).localStorage = { setItem: () => { throw new Error('quota'); } };
    expect(storePrimeSessionId(USER, S_OWNED)).toBe(false);
  });

  it('helpers', () => {
    expect(isPrimeSlug('PRIME-BOSS')).toBe(true);
    expect(isPrimeSlug('tag-ai')).toBe(false);
    expect(isSessionUuid(S_OWNED)).toBe(true);
    expect(isSessionUuid('session-x')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring (structural)
// ─────────────────────────────────────────────────────────────────────────────

describe('wiring', () => {
  const layout = read('src/layouts/DashboardLayout.tsx');
  const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
  const employee = read('src/pages/dashboard/EmployeeChatPage.tsx');
  const historyPage = read('src/pages/dashboard/ChatHistoryPage.tsx');
  const historySidebar = read('src/components/chat/ChatHistorySidebar.tsx');
  const app = read('src/App.tsx');

  it('DashboardLayout routes Prime launches to the briefing panel and consumes the request', () => {
    const start = layout.indexOf('const decision = resolvePrimeLaunch({');
    expect(start).toBeGreaterThan(0);
    const block = layout.slice(start, layout.indexOf('}, [isChatOpen, chatOptions.initialEmployeeSlug', start));
    expect(block).toContain('setIsPrimeBriefingOpen(true);');
    expect(block).toContain('closeUnifiedChat();');
    expect(block).toContain('setPrimeRequestedSessionId(decision.requestedSessionId)');
    expect(block).not.toMatch(/openChat\(|sendMessage|navigate\(/); // no loops, no submissions, no redirects
    // declared after the route-change close so a same-render launch wins
    expect(start).toBeGreaterThan(layout.indexOf('if (isChatOpen) closeChat();'));
  });

  it('UnifiedAssistantChat is not resurrected', () => {
    const live = layout.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(live).not.toMatch(/<UnifiedAssistantChat/);
  });

  it('PrimeChatV2 verifies ownership BEFORE switching, persists the selection, and sends nothing', () => {
    const start = v2.indexOf('const [requestedSessionId, setRequestedSessionId] = useAtom(primeRequestedSessionIdAtom);');
    expect(start).toBeGreaterThan(0);
    const block = v2.slice(start, v2.indexOf('// ── Process file through the import pipeline ──', start));
    // T-H2: the shared check (user AND Prime employee) replaced verifyOwnedPrimeSession here.
    const verify = block.indexOf("verifyOwnedSession(getSupabase(), userId, target, 'prime-boss')");
    expect(verify).toBeGreaterThan(0);
    expect(block.indexOf('if (!owned)')).toBeGreaterThan(verify);
    expect(block.indexOf('storePrimeSessionId(userId, target);')).toBeGreaterThan(block.indexOf('if (!owned)'));
    expect(block.indexOf('setSessionId(target);')).toBeGreaterThan(block.indexOf('if (!owned)'));
    expect(block).toContain('clearMessages();');
    expect(block).not.toMatch(/sendMessage|handleSend|send\(/); // no duplicate submissions
    expect(block).toContain('sessionSwitchInFlightRef.current === target'); // processed once
  });

  it('panel and New chat use the single Prime key', () => {
    expect(v2).toContain('localStorage.getItem(primeSessionStorageKey(userId))');
    expect(v2).toContain('localStorage.setItem(primeSessionStorageKey(userId), newId);');
    expect(v2).not.toContain('`chat_session_${userId}_prime-boss`');
  });

  it('the full-page Prime chat uses the same selection as the panel', () => {
    expect(employee).toContain("employeeId === 'prime' ? primeSessionStorageKey(userId) : `chat_session_${userId}_${employeeId}`");
  });

  it('Chat History opens the exact Prime session via the launcher (sidebar and page)', () => {
    expect(historySidebar).toMatch(/openChat\(\{\s*initialEmployeeSlug: session\.employee_slug,\s*conversationId: session\.id/);
    expect(historyPage).toContain("openChat({ initialEmployeeSlug: 'prime-boss', conversationId: thread.threadId });");
    expect(historyPage).toContain('if (isPrimeSlug(thread.employeeSlug)) {');
  });

  it('specialist chat routes are unchanged', () => {
    expect(app).toContain('<Route path="chat/:employeeId" element={<EmployeeChatPage />} />');
    expect(app).toContain('<Route path="chat" element={<Navigate to="/dashboard/chat/prime" replace />} />');
  });
});

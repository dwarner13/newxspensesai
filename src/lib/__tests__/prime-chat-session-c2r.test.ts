/**
 * C2-R — cross-device resume offer + Chat History completeness.
 * Pure selection/merge logic (two simulated devices with separate localStorage) and
 * structural checks of the PrimeChatV2 / useChatSessions wiring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  selectResumeCandidate,
  latestActivityBySession,
  readResumeState,
  writeResumeState,
  mergeUnsummarizedPrimeSessions,
  primeConversationFallbackTitle,
  type SessionRow,
  type SummaryLikeRow,
} from '../primeChatSession';

const USER = '938a2e17-0000-4000-8000-000000000001';
const S_DESKTOP = '934b590f-0000-4000-8000-000000000001';
const S_PHONE = '858861be-0000-4000-8000-000000000002';
const S_OLD = 'a83dcac2-0000-4000-8000-000000000003';
const S_TAG = 'cccccccc-0000-4000-8000-000000000004';

const sessions: SessionRow[] = [
  { id: S_DESKTOP, employee_slug: 'prime-boss', title: 'Budget review', created_at: '2026-11-21T21:09:00Z' },
  { id: S_PHONE, employee_slug: 'prime-boss', title: 'New Chat', created_at: '2026-11-21T22:21:00Z' },
  { id: S_OLD, employee_slug: 'prime-boss', title: null, created_at: '2026-11-21T19:12:00Z' },
  { id: S_TAG, employee_slug: 'tag-ai', title: 'Tag chat', created_at: '2026-11-21T23:58:00Z' },
];
const recent = [
  { session_id: S_TAG, created_at: '2026-11-21T23:59:00Z' },          // newest, but a specialist session
  { session_id: S_PHONE, created_at: '2026-11-21T23:56:52Z' },
  { session_id: S_PHONE, created_at: '2026-11-21T22:21:30Z' },
  { session_id: S_DESKTOP, created_at: '2026-11-21T21:12:41Z' },
  { session_id: S_OLD, created_at: '2026-11-21T19:28:04Z' },
];

/** Two devices = two independent localStorage maps. */
function device() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}
const use = (d: ReturnType<typeof device>) => { (globalThis as { localStorage?: unknown }).localStorage = d; };
let desktop: ReturnType<typeof device>;
let phone: ReturnType<typeof device>;
beforeEach(() => { desktop = device(); phone = device(); use(desktop); });

describe('cross-device discovery', () => {
  it('desktop (current = desktop session) is OFFERED the newer phone conversation — not switched', () => {
    const c = selectResumeCandidate({ recent, sessions, currentSessionId: S_DESKTOP, state: readResumeState(USER) });
    expect(c).toEqual({ sessionId: S_PHONE, lastActivity: '2026-11-21T23:56:52Z', title: null });
  });

  it('specialist sessions are never offered as a Prime conversation', () => {
    const c = selectResumeCandidate({ recent, sessions, currentSessionId: S_DESKTOP, state: {} });
    expect(c?.sessionId).not.toBe(S_TAG);
  });

  it('nothing is offered when the current conversation is the most recent one', () => {
    expect(selectResumeCandidate({ recent, sessions, currentSessionId: S_PHONE, state: {} })).toBeNull();
  });

  it('sessions not owned (absent from the user-filtered session rows) or with invalid ids are never offered', () => {
    const foreign = [{ session_id: 'dddddddd-0000-4000-8000-000000000009', created_at: '2026-11-22T01:00:00Z' }, ...recent];
    const c = selectResumeCandidate({ recent: foreign, sessions, currentSessionId: S_DESKTOP, state: {} });
    expect(c?.sessionId).toBe(S_PHONE);
    const bad = [{ session_id: 'not-a-uuid', created_at: '2026-11-22T02:00:00Z' }];
    expect(selectResumeCandidate({ recent: bad, sessions: [{ id: 'not-a-uuid', employee_slug: 'prime-boss' }], currentSessionId: S_DESKTOP, state: {} })).toBeNull();
  });

  it('current activity outside the recent window comes from the hydrated history', () => {
    const c = selectResumeCandidate({ recent: recent.filter(r => r.session_id !== S_DESKTOP), sessions, currentSessionId: S_DESKTOP, currentLastActivity: '2026-11-22T00:30:00Z', state: {} });
    expect(c).toBeNull();
  });
});

describe('offers are not repeated; New Chat and explicit selection set a baseline', () => {
  it('a dismissed (or continued) offer is not shown again until that conversation has newer activity', () => {
    writeResumeState(USER, { dismissed: { [S_PHONE]: '2026-11-21T23:56:52Z' } });
    expect(selectResumeCandidate({ recent, sessions, currentSessionId: S_DESKTOP, state: readResumeState(USER) })).toBeNull();
    const later = [{ session_id: S_PHONE, created_at: '2026-11-22T08:00:00Z' }, ...recent];
    expect(selectResumeCandidate({ recent: later, sessions, currentSessionId: S_DESKTOP, state: readResumeState(USER) })?.sessionId).toBe(S_PHONE);
  });

  it('after New Chat (baseline = now) older conversations are not offered; newer activity elsewhere is', () => {
    writeResumeState(USER, { baseline: '2026-11-22T00:00:00Z' });
    expect(selectResumeCandidate({ recent, sessions, currentSessionId: 'eeeeeeee-0000-4000-8000-000000000010', state: readResumeState(USER) })).toBeNull();
    const phoneLater = [{ session_id: S_PHONE, created_at: '2026-11-22T00:05:00Z' }, ...recent];
    expect(selectResumeCandidate({ recent: phoneLater, sessions, currentSessionId: 'eeeeeeee-0000-4000-8000-000000000010', state: readResumeState(USER) })?.sessionId).toBe(S_PHONE);
  });

  it('two devices keep independent resume state (phone dismissal does not affect desktop)', () => {
    use(phone);
    writeResumeState(USER, { dismissed: { [S_PHONE]: '2026-11-21T23:56:52Z' } });
    use(desktop);
    expect(readResumeState(USER)).toEqual({});
    expect(selectResumeCandidate({ recent, sessions, currentSessionId: S_DESKTOP, state: readResumeState(USER) })?.sessionId).toBe(S_PHONE);
  });

  it('storage failures never throw (offer simply repeats)', () => {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readResumeState(USER)).toEqual({});
    expect(() => writeResumeState(USER, { baseline: 'x' })).not.toThrow();
  });
});

describe('Chat History completeness', () => {
  const activity = latestActivityBySession(recent);
  const summaries: SummaryLikeRow[] = [
    { conversation_id: S_PHONE, convo_id: S_PHONE, title: 'Retirement vs debt', summary: 's', tags: [], employees_involved: ['prime-boss'], started_at: null, last_message_at: '2026-11-21T23:56:52Z', pinned: false },
    { convo_id: S_DESKTOP, title: 'Budget review', summary: 's', tags: [], employees_involved: ['prime-boss'], started_at: null, last_message_at: '2026-11-21T21:12:41Z', pinned: false },
  ];

  it('an owned Prime session without an AI summary is listed with a fallback title', () => {
    const merged = mergeUnsummarizedPrimeSessions(summaries, sessions, activity);
    const extra = merged.find(r => r.conversation_id === S_OLD)!;
    expect(extra).toMatchObject({ convo_id: S_OLD, summary: null, employees_involved: ['prime-boss'], last_message_at: '2026-11-21T19:28:04Z' });
    expect(extra.title).toMatch(/^Prime conversation · /);
  });

  it('never duplicates summarized sessions (conversation_id or legacy convo_id) and ignores specialists / empty sessions', () => {
    const empty: SessionRow = { id: 'ffffffff-0000-4000-8000-000000000011', employee_slug: 'prime-boss', title: null };
    const merged = mergeUnsummarizedPrimeSessions(summaries, [...sessions, empty], activity);
    const ids = merged.map(r => r.conversation_id ?? r.convo_id);
    expect(ids.filter(id => id === S_PHONE)).toHaveLength(1);
    expect(ids.filter(id => id === S_DESKTOP)).toHaveLength(1);
    expect(ids).not.toContain(S_TAG);
    expect(ids).not.toContain(empty.id);
    expect(merged).toHaveLength(3);
  });

  it('fallback titles keep a real session title', () => {
    expect(primeConversationFallbackTitle({ id: S_DESKTOP, employee_slug: 'prime-boss', title: 'Budget review' })).toBe('Budget review');
    expect(primeConversationFallbackTitle({ id: S_OLD, employee_slug: 'prime-boss', title: 'New Chat' }, '2026-11-21T19:28:04Z')).toMatch(/^Prime conversation · /);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring (structural)
// ─────────────────────────────────────────────────────────────────────────────

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');

describe('PrimeChatV2 wiring', () => {
  const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
  const lookupStart = v2.indexOf('const pendingRequestedSessionId = useAtomValue(primeRequestedSessionIdAtom);');
  const lookup = v2.slice(lookupStart, v2.indexOf('}, [userId, sessionId, historyChecked, history, pendingRequestedSessionId]);', lookupStart));

  it('the resume lookup only OFFERS: it never switches the conversation and yields to explicit selections', () => {
    expect(lookupStart).toBeGreaterThan(0);
    expect(lookup).toContain('selectResumeCandidate(');
    expect(lookup).toContain('if (!sb || !userId || pendingRequestedSessionId) { setLastSessionChecked(true); return; }');
    expect(lookup).not.toMatch(/setSessionId\(|setRequestedSessionId\(|storePrimeSessionId\(|sendMessage|handleSend/);
  });

  it('every lookup query is scoped to the signed-in user', () => {
    for (const table of ['chat_messages', 'chat_sessions', 'chat_convo_summaries']) {
      const at = lookup.indexOf(`.from("${table}")`);
      expect(at).toBeGreaterThan(0);
      expect(lookup.slice(at, at + 260)).toContain('.eq("user_id", userId)');
    }
  });

  it('Continue opens the offered session via the ownership-verified C2-B flow and sends no message', () => {
    const s = v2.indexOf('const handleResumeContinue = useCallback(');
    const body = v2.slice(s, v2.indexOf('}, [userId, setRequestedSessionId]);', s));
    expect(body).toContain('setRequestedSessionId(target.sessionId);');
    expect(body).not.toMatch(/send|crypto\.randomUUID|setSessionId\(/);
    // the C2-B effect is the only place a requested session is applied — after verification
    const c2b = v2.slice(v2.indexOf('const [requestedSessionId, setRequestedSessionId] = useAtom(primeRequestedSessionIdAtom);'));
    expect(c2b.indexOf('verifyOwnedPrimeSession(')).toBeLessThan(c2b.indexOf('setSessionId(target);'));
  });

  it('the existing resume card is reused; its Continue no longer sends a message', () => {
    expect(v2).toContain('{!lastSessionChecked ? null : lastSession && !showBriefing');
    expect(v2).not.toContain("Let's pick up where we left off");
    expect(v2.match(/onClick=\{\(\) => handleResumeContinue\(lastSession\)\}/g)?.length).toBe(2); // card + open-conversation offer
    expect(v2).toContain('Continue recent conversation');
  });

  it('New Chat keeps the immediate welcome and sets a resume baseline; explicit selection too', () => {
    const s = v2.indexOf('const handleNewChat = useCallback(() => {');
    const nc = v2.slice(s, v2.indexOf('}, [userId]);', s));
    expect(nc).toContain('writeResumeState(userId, { ...readResumeState(userId), baseline: new Date().toISOString() });');
    expect(nc).toContain('setLastSessionChecked(true);');
    expect(nc).toContain('setFreshWelcome(true);'); // C2-F: short welcome replaces the auto briefing
    const c2b = v2.slice(v2.indexOf('storePrimeSessionId(userId, target);'), v2.indexOf('setSessionId(target);'));
    expect(c2b).toContain('baseline: new Date().toISOString()');
  });
});

describe('useChatSessions wiring', () => {
  const hook = read('src/hooks/useChatSessions.ts');
  const s = hook.indexOf('// C2-R: owned Prime sessions whose AI summary was never written');
  const block = hook.slice(s, hook.indexOf('if (!summariesData || summariesData.length === 0) {', s));

  it('merges unsummarized Prime sessions, scoped to the user, without regenerating summaries', () => {
    expect(s).toBeGreaterThan(0);
    expect(block).toContain('if (!summariesError && Array.isArray(summariesData)) {');
    expect(block.match(/\.eq\('user_id', userId\)/g)?.length).toBe(2);
    expect(block).toContain(".in('employee_slug', ['prime-boss', 'prime'])");
    expect(block).toContain('mergeUnsummarizedPrimeSessions(');
    expect(block).not.toMatch(/\.insert\(|\.upsert\(|\.update\(|openai|summar(y|ize)\(/i);
  });
});

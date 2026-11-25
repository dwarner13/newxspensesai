/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for tool results and parsed scopes */
/**
 * P-LIVE-02 — "I don't mean November. I mean all the transactions I've ever uploaded…"
 *
 * Staging 9275ddb defaulted to November 2026 and asked permission to review the whole history.
 * Root causes reproduced and fixed here:
 *   R1 "need categorizing" was not recognised as a categorization question (no consultation ran);
 *   R2 "I DON'T mean November" was parsed as a request for November 2026;
 *   R3 there was no all-history scope — tag_status defaulted to the current month;
 *   R4 tag_status read .limit(5001), cut to 1,000 rows by the API while reporting "not capped".
 *
 * The multi-turn test drives the server decision chain exactly as chat.ts does, turn by turn,
 * with Tag's tool executing against a fake database capped at 1,000 rows per request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeCappedClient, type FakeRow } from './fixtures/capped-supabase';
import { buildTemporalScope } from '../prime-temporal-scope';
import { applyCustomerScope, negatedPeriods, hasStrongAllHistoryPhrase, type TemporalScopeLike } from '../prime-request-scope';
import { isCategorizationReviewQuestion, tagStatusInputFromScope, formatTagConsultationEvidence, buildPrimeTagConsultationRule } from '../prime-tag-consultation';
import { resolveTagStatusScope } from '../tag-status';

const state: { client: ReturnType<typeof makeCappedClient> | null } = { client: null };
vi.mock('../../server/db', () => ({ getSupabaseServerClient: () => state.client }));

const OWNER_MESSAGE = "I don't mean November. I mean all the transactions I've ever uploaded. Please check with Tag and tell me how many still need categorizing, and whether you can see any of the work Tag and I have already completed.";
const NOW = new Date('2026-11-25T18:00:00Z');
const TZ = 'America/Edmonton';
const USER = 'u-plive02';

/** Synthetic ledger: 1,501 transactions over 2022-2026, 120 uncategorized, 40 customer-corrected. */
function ledger(): { transactions: FakeRow[]; tag_category_feedback: FakeRow[] } {
  const tx: FakeRow[] = [];
  for (let i = 0; i < 1501; i++) {
    const year = 2022 + Math.floor(i / 340);
    const month = (i % 12) + 1;
    const day = (i % 27) + 1;
    const uncategorized = i % 12 === 5 && tx.filter(t => t.category === 'Uncategorized').length < 120;
    const corrected = !uncategorized && i % 37 === 3 && tx.filter(t => t.category_source === 'user_correction').length < 40;
    tx.push({
      id: `t-${String(i).padStart(5, '0')}`,
      user_id: USER,
      date: `${Math.min(year, 2026)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      amount: -((i % 40) + 1),
      merchant_name: `Merchant ${i % 23}`,
      category: uncategorized ? 'Uncategorized' : ['Groceries', 'Dining', 'Fuel'][i % 3],
      category_source: corrected ? 'user_correction' : uncategorized ? null : 'ai',
    });
  }
  const fb: FakeRow[] = [];
  for (let i = 0; i < 30; i++) {
    // 10 within the last 90 days, 20 older: an all-history question must see all 30.
    const daysAgo = i < 10 ? 5 + i : 200 + i * 10;
    fb.push({ id: `f-${i}`, user_id: USER, merchant: `Merchant ${i % 23}`, created_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString() });
  }
  return { transactions: tx, tag_category_feedback: fb };
}

const expected = (() => {
  const l = ledger();
  return {
    total: l.transactions.length,
    uncategorized: l.transactions.filter(t => t.category === 'Uncategorized').length,
    customerConfirmed: l.transactions.filter(t => t.category_source === 'user_correction').length,
  };
})();

/** The chat.ts decision chain for one Prime turn (no model). */
async function primeTurn(message: string, opts: { inheritedFromConversation?: boolean } = {}) {
  const parsed = buildTemporalScope(message, { timezone: TZ, referenceDate: NOW }) as unknown as TemporalScopeLike | null;
  const decision = applyCustomerScope(parsed, message, t => buildTemporalScope(t, { timezone: TZ, referenceDate: NOW }) as unknown as TemporalScopeLike | null);
  const temporalScope = decision.droppedNegatedPeriod || decision.allHistory ? decision.temporalScope : parsed;
  // M1b inherits only when the customer did not redirect the scope.
  const inherited = !decision.overridesConversation && !!opts.inheritedFromConversation && !temporalScope?.primary;
  const consults = isCategorizationReviewQuestion(message);
  if (!consults) return { consults, decision, temporalScope, evidence: null as string | null, tag: null as any };
  const input = tagStatusInputFromScope(temporalScope as any, inherited, { allHistory: decision.allHistory });
  const { execute } = await import('../../agent/tools/impl/tag_status');
  const result: any = await execute(input as any, { userId: USER, now: () => NOW });
  return { consults, decision, temporalScope, input, tag: result.value, evidence: formatTagConsultationEvidence(result.value) };
}

describe('P-LIVE-02 root causes (exact owner wording)', () => {
  it('R1: the message is recognised as a categorization question', () => {
    expect(isCategorizationReviewQuestion(OWNER_MESSAGE)).toBe(true);
    for (const m of [
      'How many still need categorizing?',
      'how many transactions need to be categorised',
      "which ones haven't been categorized yet",
      'how much categorization is left to do',
      'Can you see the work Tag and I already completed?',
    ]) expect(isCategorizationReviewQuestion(m), m).toBe(true);
    // unchanged: spending-by-category totals and change requests are not status reads
    expect(isCategorizationReviewQuestion('how much did I spend on groceries')).toBe(false);
    expect(isCategorizationReviewQuestion('change Costco to Groceries')).toBe(false);
  });

  it('R2: "I don\'t mean November" is a negation, and November is dropped from the scope', () => {
    const parsed = buildTemporalScope(OWNER_MESSAGE, { timezone: TZ, referenceDate: NOW }) as any;
    expect(parsed?.primary?.label).toBe('November 2026'); // the parser alone gets it wrong
    expect(negatedPeriods(OWNER_MESSAGE)).toEqual(['november']);
    const d = applyCustomerScope(parsed, OWNER_MESSAGE);
    expect(d.droppedNegatedPeriod).toBe(true);
    expect(d.allHistory).toBe(true);
    expect(d.temporalScope).toBeNull();
    expect(d.overridesConversation).toBe(true);
  });

  it('R3: all-history phrases are recognised; with no period, Tag scope is all history (never the current month)', () => {
    for (const m of ["everything I've ever uploaded", 'my entire history', 'all time', 'since I started', 'every transaction', "all the transactions I've imported", 'across all my statements', 'not just this month'])
      expect(hasStrongAllHistoryPhrase(m), m).toBe(true);
    expect(resolveTagStatusScope({}, NOW).source).toBe('all_history');
    expect(resolveTagStatusScope({ allHistory: true, startDate: '2026-11-01', endDate: '2026-11-30', periodSource: 'conversation' }, NOW).source).toBe('all_history');
  });

  it('a narrower period the customer actually asks for still wins', () => {
    const m = 'How many uncategorized transactions in October 2025?';
    const parsed = buildTemporalScope(m, { timezone: TZ, referenceDate: NOW }) as any;
    const d = applyCustomerScope(parsed, m);
    expect(d.allHistory).toBe(false);
    expect(d.temporalScope?.primary?.label).toBe('October 2025');
    expect(tagStatusInputFromScope(d.temporalScope as any, false)).toEqual({ startDate: '2025-10-01', endDate: '2025-10-31', periodSource: 'requested' });
  });

  it('"I don\'t mean November, I mean October" resolves to October (re-parsed without the ruled-out phrase)', () => {
    const m = "I don't mean November, I mean October 2025";
    const parsed = buildTemporalScope(m, { timezone: TZ, referenceDate: NOW }) as any;
    const d = applyCustomerScope(parsed, m, t => buildTemporalScope(t, { timezone: TZ, referenceDate: NOW }) as any);
    expect(d.temporalScope?.primary?.label).toBe('October 2025');
    expect(d.allHistory).toBe(false);
  });

  it('no false negation: "not decide", "I may", "do not mean to be rude"', () => {
    expect(negatedPeriods('I could not decide')).toEqual([]);
    expect(negatedPeriods('I may need help')).toEqual([]);
    expect(negatedPeriods('I do not mean to be rude')).toEqual([]);
  });
});

describe('P-LIVE-02 multi-turn reproduction (staging conversation)', () => {
  beforeEach(() => { state.client = makeCappedClient(ledger(), { shuffleUnordered: true }); });

  it('turn 1 → turn 2: Prime consults Tag over ALL history with complete counts and reports completed work', async () => {
    // Turn 1 (as on staging): a categorization question with no period, after a November conversation.
    const t1 = await primeTurn('How many transactions still need categorizing?', { inheritedFromConversation: true });
    expect(t1.consults).toBe(true);
    expect(t1.tag.scope.source).toBe('all_history'); // owner rule 3: outstanding work = all history
    // Turn 2: the owner's exact correction.
    const t2 = await primeTurn(OWNER_MESSAGE, { inheritedFromConversation: true });
    expect(t2.consults).toBe(true);
    expect(t2.input).toEqual({ allHistory: true });
    expect(t2.tag.scope.source).toBe('all_history');
    expect(t2.tag.status).toBe('ok');
    // R4: complete read above the 1,000-row cap
    expect(t2.tag.totals.transactionCount).toBe(expected.total);
    expect(t2.tag.totals.uncategorized).toBe(expected.uncategorized);
    // completed work = stored records; all-time correction log
    expect(t2.tag.provenance.customer_confirmed).toBe(expected.customerConfirmed);
    expect(t2.tag.recentCorrections).toMatchObject({ available: true, count: 30, windowDays: null });
    const ev = t2.evidence!;
    expect(ev).toContain('all imported transactions (entire history)');
    expect(ev).toContain(`Transactions in scope: ${expected.total}; uncategorized: ${expected.uncategorized}`);
    expect(ev).toContain(`Completed work you can see (stored records, not chat history): ${expected.customerConfirmed} transactions have a customer-confirmed category`);
    expect(ev).toContain('Corrections recorded by Tag (all time): 30');
    expect(ev).toContain('never ask permission to check or widen the scope');
    expect(ev).not.toMatch(/November/);
    expect(ev).not.toMatch(/OFFER/);
  });

  it('turn 3: an explicit narrower period afterwards is honoured (and corrections use the 90-day window)', async () => {
    const t3 = await primeTurn('How many uncategorized transactions in March 2024?');
    expect(t3.tag.scope.source).toBe('requested_period');
    expect(t3.tag.scope.label).toBe('2024-03-01 through 2024-03-31');
    expect(t3.tag.recentCorrections.windowDays).toBe(90);
    expect(t3.tag.recentCorrections.count).toBe(10);
  });

  it('correction history unavailable: the limitation is stated honestly; customer-confirmed still counted', async () => {
    const l = ledger();
    state.client = makeCappedClient(l, { failOnRequest: 1, failTable: 'tag_category_feedback' });
    const t = await primeTurn(OWNER_MESSAGE);
    expect(t.tag.recentCorrections.available).toBe(false);
    expect(t.evidence).toContain("Tag's correction history could not be read this time");
    expect(t.evidence).toContain(`${expected.customerConfirmed} transactions have a customer-confirmed category`);
    expect(t.tag.caveats.join(' ')).toContain('Say this limitation plainly');
  });

  it('a failed transaction read is never reported as zero', async () => {
    state.client = makeCappedClient(ledger(), { failOnRequest: 2, failTable: 'transactions' });
    const t = await primeTurn(OWNER_MESSAGE);
    expect(t.tag.status).toBe('query_error');
    expect(t.evidence).not.toContain('uncategorized: 0');
  });
});

describe('P-LIVE-02 wiring and safeguards (source guards)', () => {
  const root = path.resolve(__dirname, '../../..');
  const chat = fs.readFileSync(path.join(root, 'netlify/functions/chat.ts'), 'utf8');
  it('customer scope is applied before M1b inheritance, and an override disables inheritance', () => {
    const iScope = chat.indexOf('const decision = applyCustomerScope(');
    const iM1b = chat.indexOf('if (m1bEnabled && shadowIntentResult && !customerScopeOverride)');
    expect(iScope).toBeGreaterThan(0);
    expect(iM1b).toBeGreaterThan(iScope);
  });
  it('the consultation passes allHistory', () => {
    expect(chat).toContain('tagStatusInputFromScope(temporalScope as unknown as ResolvedPeriodLike, !!m1bDecision?.apply, { allHistory: customerAllHistory })');
  });
  it('categorization status never takes the snapshot fast lane (one authoritative count)', () => {
    expect(chat.match(/=== 'uncategorized_count' && isCategorizationReviewQuestion\(/g)?.length).toBe(2);
  });
  it('the consultation rule forbids asking permission or repetition; tag_status reads are paged', () => {
    expect(buildPrimeTagConsultationRule()).toContain('Never ask permission to run it, to widen it');
    const tool = fs.readFileSync(path.join(root, 'src/agent/tools/impl/tag_status.ts'), 'utf8');
    expect(tool).toContain('pagedSelectAll');
    expect(tool).not.toMatch(/\.limit\(MAX_ROWS \+ 1\)/);
  });
  it('financial safeguards kept: findings stay proposals, read-only', () => {
    const rule = buildPrimeTagConsultationRule();
    expect(rule).toContain('Findings are PROPOSALS');
    expect(rule).toContain('read-only');
  });
});

/**
 * LA-4 (owner live acceptance, 2026-11-26) — owners: Tag HQ + Prime HQ.
 * For the same statement, Prime (financial-summary `needsReview`) and Tag (tag-copilot / tag-chat via
 * loadTagNeedsReview, and the tag_status tool) report the SAME review count AND amounts. One rule
 * (needs-category-rule), one builder (needs-review-summary), one complete engine read. The figures Tag
 * quotes come only from that served summary; the model is never asked to add amounts.
 * Synthetic data only (FST-2 ledger generator, 1,000-row API cap enforced by the fake).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCappedClient, type FakeRow } from '../../../../src/shared/__tests__/fixtures/capped-supabase';
import { generateLedger, IMPORTS, type LedgerRow } from '../../../../src/shared/__tests__/fixtures/ledger-generator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const state: { client: any; tokens: Record<string, string> } = { client: null, tokens: {} };
vi.mock('../../_shared/supabase.js', () => ({ admin: () => state.client, serverSupabase: () => state.client }));
vi.mock('../../../../src/server/db', () => ({ getSupabaseServerClient: () => state.client }));
vi.mock('../../_shared/verifyAuth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verifyAuth: async (event: any) => {
    const userId = state.tokens[String(event?.headers?.authorization || '').replace(/^Bearer /, '')];
    return userId ? { userId, error: null } : { userId: null, error: 'Unauthorized' };
  },
}));
vi.mock('../../_shared/internalJobAuth.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticateUser: async (event: any) => {
    const userId = state.tokens[String(event?.headers?.authorization || '').replace(/^Bearer /, '')];
    return userId ? { ok: true, principal: { userId } } : { ok: false };
  },
  claimedUserIdMatches: (c: unknown, u: string) => c === undefined || c === null || c === '' || c === u,
}));

const { handler: financialSummary } = await import('../../financial-summary');
const { loadTagNeedsReview, formatNeedsReviewLine } = await import('../../_shared/tagFinancialContext');
const tagStatus = await import('../../../../src/agent/tools/impl/tag_status');

const A = 'user-la4';
const ALL = { startDate: '2023-01-01', endDate: '2025-12-31' };
function tables(rows: LedgerRow[]): Record<string, FakeRow[]> {
  return {
    transactions: rows as unknown as FakeRow[],
    imports: Object.values(IMPORTS).map((id, i) => ({ id, user_id: A, status: 'committed', file_url: `x/${i}.pdf`, created_at: `2023-01-0${i + 1}` })),
    profiles: [{ id: A, currency: 'CAD' }],
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function primeReview(body: Record<string, unknown>): Promise<any> {
  const res = await financialSummary({ httpMethod: 'POST', headers: { authorization: 'Bearer tok-la4' }, body: JSON.stringify(body) } as never, {} as never);
  expect(res?.statusCode).toBe(200);
  return JSON.parse(String(res?.body)).needsReview;
}
const figures = (r: { count: number | null; inflow: unknown; outflow: unknown; unclassified: unknown; netCents: number | null }) =>
  ({ count: r.count, inflow: r.inflow, outflow: r.outflow, unclassified: r.unclassified, netCents: r.netCents });

beforeEach(() => { state.tokens = { 'tok-la4': A }; });

describe('LA-4 — Prime and Tag give the same review count and amount for the same statement', () => {
  for (const n of [300, 1501, 3000]) {
    it(`${n} transactions: one statement and all statements`, async () => {
      const { rows } = generateLedger(n, A);
      state.client = makeCappedClient(tables(rows));
      for (const importId of [IMPORTS.chequing, IMPORTS.card]) {
        const prime = await primeReview({ ...ALL, importIds: [importId] });
        const tag = await loadTagNeedsReview(state.client, A, importId);
        expect(prime.complete).toBe(true);
        expect(tag.complete).toBe(true);
        expect(figures(tag), importId).toEqual(figures(prime));
      }
      const primeAll = await primeReview(ALL);
      const tagAll = await loadTagNeedsReview(state.client, A, null);
      expect(figures(tagAll)).toEqual(figures(primeAll));
      expect(primeAll.count).toBeGreaterThan(0); // the fixture really has review rows
      // tag_status (Prime's consultation path) over every imported transaction: same count and amounts.
      const st = await tagStatus.execute({ allHistory: true }, { userId: A });
      expect(st.ok).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = (st as any).value;
      expect(primeAll.count).toBeGreaterThan(0);
      expect(out.needsReviewCount).toBe(primeAll.count);
      expect(figures(out.needsReview)).toEqual(figures(primeAll));
    });
  }

  it('the line Tag quotes carries only the served figures, money out and in kept separate', async () => {
    const { rows } = generateLedger(300, A);
    state.client = makeCappedClient(tables(rows));
    const review = await loadTagNeedsReview(state.client, A, null);
    expect(review.count).toBeGreaterThan(0);
    const line = formatNeedsReviewLine(review, review.count ?? -1);
    const usd = (c: number) => `$${(Math.abs(c) / 100).toFixed(2)}`;
    expect(line).toContain(`${review.outflow!.count} going out, totalling ${usd(review.outflow!.cents)}`);
    expect(line).toContain(`${review.inflow!.count} coming in, totalling ${usd(review.inflow!.cents)}`);
    expect(line).toMatch(/NEVER add up transaction amounts yourself/);
    // Counts that disagree (two reads raced) → no amount at all.
    expect(formatNeedsReviewLine(review, (review.count ?? 0) + 1)).toMatch(/not available right now/);
  });

  it('an incomplete read never yields a smaller figure: Tag states no amount', async () => {
    const { rows } = generateLedger(300, A);
    state.client = makeCappedClient(tables(rows), { failOnRequest: 1, failTable: 'transactions' });
    const tag = await loadTagNeedsReview(state.client, A, IMPORTS.card);
    expect(tag.complete).toBe(false);
    expect(figures(tag)).toEqual({ count: null, inflow: null, outflow: null, unclassified: null, netCents: null });
    expect(formatNeedsReviewLine(tag, 3)).toMatch(/not available right now.*say you can't state it yet/);
  });
});

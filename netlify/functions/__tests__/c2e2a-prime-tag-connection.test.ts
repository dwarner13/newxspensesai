/**
 * C2-E2A — Prime ↔ Tag connection (navigation + verified context only).
 *
 * Prime's verified transaction cards offer "Review with Tag" → Transactions ?tagTx=<uuid>
 * → the existing Tag panel opens focused on that row, with "Back to Prime" reopening the
 * existing Prime panel. Only an ID travels; Tag re-reads the row server-side scoped to the
 * authenticated user. No delegation, no category change, no new chat engine.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveFocusedTransaction } from '../_shared/tagFocusedTransaction';
import { buildTagReviewPath, isTransactionUuid, TAG_REVIEW_PARAM } from '../../../src/lib/tagReview';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const tagFn = read('netlify/functions/tag-copilot.ts');
const txPage = read('src/pages/dashboard/TransactionsPageV2.tsx');
const tagPanel = read('src/components/transactions/TagCopilotPanel.tsx');
const card = read('src/components/chat/TransactionCandidateListCard.tsx');
const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const TX = '33333333-3333-4333-8333-333333333333';
const DB_ROW = { id: TX, user_id: OWNER, merchant_name: 'Costco', merchant: null, description: null, amount: -84.12, posted_at: '2026-05-14', date: '2026-05-14', category: 'Groceries', subcategory: null };

/** Fake Supabase that enforces the filters actually applied by the code under test. */
function fakeDb(rows: Array<Record<string, unknown>>, opts: { error?: boolean; throws?: boolean } = {}) {
  const calls: Array<{ table: string; filters: Record<string, string> }> = [];
  return {
    calls,
    from(table: string) {
      const filters: Record<string, string> = {};
      calls.push({ table, filters });
      const qb = {
        select: () => qb,
        eq: (col: string, val: string) => { filters[col] = val; return qb; },
        maybeSingle: async () => {
          if (opts.throws) throw new Error('network');
          if (opts.error) return { data: null, error: { message: 'boom' } };
          const hit = rows.find(r => Object.entries(filters).every(([k, v]) => r[k] === v));
          return { data: hit ?? null, error: null };
        },
      };
      return qb;
    },
  };
}

describe('server: Tag re-verifies the focused transaction (ownership + freshness)', () => {
  it('valid owned ID → verified, details come from the DB row, not the browser', async () => {
    const db = fakeDb([DB_ROW]);
    const forged = { id: TX, merchant_name: 'FAKE MERCHANT', amount: 999999, category: 'Forged' };
    const r = await resolveFocusedTransaction(db, OWNER, forged);
    expect(r.status).toBe('verified');
    expect(r.row).toMatchObject({ id: TX, merchant_name: 'Costco', amount: -84.12, category: 'Groceries' });
    expect(db.calls[0]).toEqual({ table: 'transactions', filters: { user_id: OWNER, id: TX } });
  });

  it("another user's transaction ID → not_found (no details leak)", async () => {
    const r = await resolveFocusedTransaction(fakeDb([DB_ROW]), OTHER, { id: TX });
    expect(r).toEqual({ status: 'not_found', row: null });
  });

  it('stale / deleted ID → not_found', async () => {
    const r = await resolveFocusedTransaction(fakeDb([]), OWNER, { id: TX });
    expect(r).toEqual({ status: 'not_found', row: null });
  });

  it('malformed or model-invented IDs are rejected before any query', async () => {
    for (const bad of ['42', 'tx_123', '<script>', { nested: 1 }, `${TX}' or 1=1`]) {
      const db = fakeDb([DB_ROW]);
      const r = await resolveFocusedTransaction(db, OWNER, { id: bad });
      expect(r.status).toBe('invalid_id');
      expect(db.calls).toHaveLength(0);
    }
  });

  it('no focus requested → none; lookup errors fail closed (no focus)', async () => {
    expect((await resolveFocusedTransaction(fakeDb([DB_ROW]), OWNER, null)).status).toBe('none');
    expect((await resolveFocusedTransaction(fakeDb([DB_ROW]), OWNER, {})).status).toBe('none');
    expect(await resolveFocusedTransaction(fakeDb([DB_ROW], { error: true }), OWNER, { id: TX })).toEqual({ status: 'lookup_failed', row: null });
    expect(await resolveFocusedTransaction(fakeDb([DB_ROW], { throws: true }), OWNER, { id: TX })).toEqual({ status: 'lookup_failed', row: null });
  });

  it('tag-copilot uses only the server-resolved row for the FOCUSED TRANSACTION block', () => {
    expect(tagFn).toContain("import { resolveFocusedTransaction } from './_shared/tagFocusedTransaction.js';");
    expect(tagFn).toMatch(/const focused = await resolveFocusedTransaction\([^)]*auth\.userId, focusedTransaction\);/);
    expect(tagFn).toMatch(/if \(focused\.row\) \{\s+const ft = focused\.row;/);
    expect(tagFn).not.toMatch(/const ft = focusedTransaction;/);
    // structural log only — no merchant/amount in the log line
    expect(tagFn).toContain('console.log(`[tag-copilot] focused transaction: ${focused.status}`);');
  });

  it('category changes stay user-scoped and are never triggered by navigation', () => {
    // T-LIVE-02: Tag's single-transaction tool only proposes; the one write is tag-action commit_single,
    // user-scoped and gated on the customer's "yes" binding to the signed proposal.
    expect(tagFn).not.toMatch(/\.update\(txUpdate\)\s+\.eq\('id', transactionId\)/);
    const tagAction = read('netlify/functions/tag-action.ts');
    expect(tagAction).toMatch(/\.eq\('id', tx\.id\)\s+\.eq\('user_id', userId\)/);
    expect(tagAction).toContain('if (!sessionId || !proposalMatches) {');
    const handler = v2.slice(v2.indexOf('const handleReviewWithTag = useCallback('), v2.indexOf('}, [navigate]);', v2.indexOf('const handleReviewWithTag = useCallback(')));
    expect(handler).not.toMatch(/fetch\(|tag-copilot|update|categor/i);
  });
});

describe('Prime → Tag navigation', () => {
  it('builds a deep link only for real transaction UUIDs', () => {
    expect(buildTagReviewPath(TX)).toBe(`/dashboard/transactions?${TAG_REVIEW_PARAM}=${TX}`);
    for (const bad of [undefined, null, '', '12', 'abc', 42, `${TX}&openTag=1`]) expect(buildTagReviewPath(bad)).toBeNull();
    expect(isTransactionUuid(TX)).toBe(true);
  });

  it('the action is offered on server-verified card rows only (Prime passes the handler; ids come from txCandidates)', () => {
    expect(card).toContain('onReviewWithTag?: (transactionId: string) => void;');
    expect(card).toContain('onClick={() => onReviewWithTag(tx.id)}');
    expect(card).toContain('Review with Tag');
    expect(v2).toContain('onReviewWithTag={handleReviewWithTag}');
    expect(v2).toMatch(/const path = buildTagReviewPath\(transactionId\);\s+if \(path\) navigate\(path\);/);
  });

  it('Transactions resolves ?tagTx against the user own rows (or one user-filtered read) and opens the existing Tag panel', () => {
    const block = txPage.slice(txPage.indexOf('const [tagFromPrime, setTagFromPrime]'), txPage.indexOf('const handleBackToPrime = useCallback('));
    expect(block).toContain('if (!isTransactionUuid(requested)) { strip(); return; }');
    expect(block).toContain('const loaded = transactions.find(t => t.id === requested);');
    expect(block).toMatch(/\.eq\('id', requested\)\s+\.eq\('user_id', uid\)/);
    expect(block).toContain('setIsPrimeBriefingOpen(false); // one panel at a time');
    expect(block).toContain('setTagPanelOpen(true);');
    expect(block).toContain('openTagWith(found);'); // missing/foreign → Tag opens without a focus
  });

  it('the URL param is consumed once and removed', () => {
    expect(txPage).toContain('if (tagTxConsumedRef.current === requested || isLoading) return;');
    expect(txPage).toContain('p.delete(TAG_REVIEW_PARAM)');
  });
});

describe('Tag → Prime return; both conversations preserved; one panel', () => {
  it('Back to Prime closes Tag and reopens the existing Prime panel in place', () => {
    const h = txPage.slice(txPage.indexOf('const handleBackToPrime = useCallback('), txPage.indexOf('}, [setIsPrimeBriefingOpen]);', txPage.indexOf('const handleBackToPrime = useCallback(')));
    expect(h).toContain('setTagPanelOpen(false);');
    expect(h).toContain('setIsPrimeBriefingOpen(true);');
    expect(h).not.toMatch(/navigate\(|localStorage|removeItem/);
  });

  it('the Tag panel shows Back to Prime only when opened from Prime', () => {
    expect(tagPanel).toContain('onBackToPrime?: () => void;');
    expect(tagPanel).toMatch(/\{onBackToPrime && \(\s+<button/);
    expect(tagPanel).toContain('aria-label="Back to Prime"');
    expect(txPage).toContain('onBackToPrime={tagFromPrime ? handleBackToPrime : undefined}');
  });

  it("Tag keeps its own history (localStorage) and Prime keeps its shared session key", () => {
    expect(tagPanel).toContain('localStorage.getItem("tag_chat_history")');
    expect(v2).toContain('localStorage.getItem(primeSessionStorageKey(userId))');
  });
});

/**
 * LA-4 — the served review figure (count AND amount). Synthetic rows only.
 * Oracle values below are hand-computed, independent of classifyCashFlow.
 */
import { describe, it, expect } from 'vitest';
import { buildNeedsReview, NEEDS_REVIEW_ROW_ID_CAP } from '../needs-review-summary';

const row = (id: string, date: string | null, amount: number, type: string, category: string | null) => ({ id, date, amount, type, category, subcategory: null });

describe('buildNeedsReview (LA-4)', () => {
  it('selects by the shared rule only and splits engine cents by direction (never an abs sum)', () => {
    const rows = [
      row('a', '2024-01-02', -40.10, 'expense', null),           // outflow 4010
      row('b', '2024-01-03', -17.78, 'expense', 'Uncategorized'), // outflow 1778
      row('c', '2024-01-04', 5.78, 'income', 'needs review'),     // inflow 578 (case-insensitive rule)
      row('d', '2024-01-05', -99.00, 'expense', 'Other'),         // approved Other: NOT counted
      row('e', '2024-01-06', -12.00, 'expense', 'Groceries'),     // categorised: NOT counted
      row('f', '2024-01-07', 30.00, 'Credit', ''),                // no direction: disclosed separately
    ];
    const s = buildNeedsReview(rows, { complete: true });
    expect(s.count).toBe(4);
    expect(s.outflow).toEqual({ count: 2, cents: 5788 });
    expect(s.inflow).toEqual({ count: 1, cents: 578 });
    expect(s.unclassified).toEqual({ count: 1, cents: 3000 });
    expect(s.netCents).toBe(578 - 5788);
    // An abs sum of the three directional rows would be 6366; the served figure never does that.
    expect((s.outflow!.cents + s.inflow!.cents)).toBe(6366);
    expect(s.netCents).not.toBe(6366);
  });

  it('incomplete read: count and every amount are null, no ids', () => {
    const s = buildNeedsReview([row('a', '2024-01-02', -1, 'expense', null)], { complete: false });
    expect(s).toEqual({ complete: false, count: null, inflow: null, outflow: null, unclassified: null, netCents: null, rowIds: [], rowIdsTruncated: false });
  });

  it('rowIds are ordered by (date, id), undated last, and capped with a flag', () => {
    const s = buildNeedsReview([
      row('z', '2024-02-01', -1, 'expense', null), row('b', '2024-01-01', -1, 'expense', null),
      row('a', '2024-01-01', -1, 'expense', null), row('u', null, -1, 'expense', null),
    ], { complete: true });
    expect(s.rowIds).toEqual(['a', 'b', 'z', 'u']);
    expect(s.rowIdsTruncated).toBe(false);
    const many = Array.from({ length: NEEDS_REVIEW_ROW_ID_CAP + 5 }, (_, i) => row(`r${String(i).padStart(4, '0')}`, '2024-01-01', -1, 'expense', null));
    const t = buildNeedsReview(many, { complete: true });
    expect(t.count).toBe(NEEDS_REVIEW_ROW_ID_CAP + 5);
    expect(t.rowIds.length).toBe(NEEDS_REVIEW_ROW_ID_CAP);
    expect(t.rowIdsTruncated).toBe(true);
    expect(t.outflow!.cents).toBe((NEEDS_REVIEW_ROW_ID_CAP + 5) * 100);
  });

  it('nothing needs review: zeros, not nulls', () => {
    const s = buildNeedsReview([row('e', '2024-01-06', -12, 'expense', 'Groceries')], { complete: true });
    expect(s.count).toBe(0);
    expect(s.netCents).toBe(0);
    expect(s.outflow).toEqual({ count: 0, cents: 0 });
  });
});

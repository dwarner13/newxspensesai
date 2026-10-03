/**
 * PRIME REASONING V1 — R0.1 FinancialRequest V2 contract tests.
 *
 * V2 changes: `rank` → list + order + limit; `measure` → `measures[]`; `net_movement` →
 * conceptual `net`; comparison `offset`; ambiguity dimension `order`. These tests prove
 * representability, rejection of retired / malformed shapes, and that nothing here can
 * carry amounts, identity or a net formula. They do NOT test language understanding.
 */

import { describe, it, expect } from 'vitest';
import {
  FINANCIAL_REQUEST_VERSION,
  FINANCIAL_MEASURES,
  FINANCIAL_OPERATIONS,
  MAX_LIST_LIMIT,
  parseFinancialRequest,
  type FinancialRequestV2Input,
} from '../prime-financial-request';
import { VISIBLE_CANDIDATE_FRAME_MAX } from '../tx-candidate-ownership';

const base = { version: FINANCIAL_REQUEST_VERSION, authority: 'semantic_claim', domain: 'transactions' } as const;
const user = 'user_message' as const;
const costco = { kind: 'merchant', value: 'Costco', source: user } as const;
const desc = (by: 'date' | 'amount') => ({ by, direction: 'desc' as const });
const asc = (by: 'date' | 'amount') => ({ by, direction: 'asc' as const });
const ok = (c: FinancialRequestV2Input) => {
  const r = parseFinancialRequest(c);
  if (!r.ok) throw new Error(r.errors.join('; '));
  return r.value;
};
const bad = (c: unknown) => parseFinancialRequest(c).ok === false;

describe('R0.1 representability — ordered / limited lists', () => {
  it.each<[string, FinancialRequestV2Input]>([
    ['1. last five Costco transactions', { ...base, operation: 'list', measures: ['transactions'], subjects: [costco], order: desc('date'), limit: 5 }],
    ['2. five biggest transactions', { ...base, operation: 'list', measures: ['transactions'], order: desc('amount'), limit: 5 }],
    ['3. oldest three transactions', { ...base, operation: 'list', measures: ['transactions'], order: asc('date'), limit: 3 }],
    ['4. most recent transaction', { ...base, operation: 'list', measures: ['transactions'], order: desc('date'), limit: 1 }],
    ['5. latest 10', { ...base, operation: 'list', measures: ['transactions'], order: desc('date'), limit: 10 }],
    ['6. five smallest', { ...base, operation: 'list', measures: ['transactions'], order: asc('amount'), limit: 5 }],
    ['7. biggest of the candidate frame', { ...base, operation: 'list', reference: { kind: 'candidate_frame_all' }, order: desc('amount'), limit: 1 }],
    ['biggest restaurant purchase', { ...base, operation: 'list', measures: ['spending'], subjects: [{ kind: 'subcategory', value: 'restaurants', source: user }], order: desc('amount'), limit: 1 }],
    ['ordered list with no limit', { ...base, operation: 'list', subjects: [costco], order: desc('date') }],
  ])('%s', (_label, c) => {
    const r = ok(c);
    expect(r.operation).toBe('list');
  });

  it('"last five" is an ordering + limit, not a period', () => {
    const r = ok({ ...base, operation: 'list', measures: ['transactions'], subjects: [costco], order: desc('date'), limit: 5 });
    expect(r.period).toBeUndefined();
    expect(r).toMatchObject({ order: { by: 'date', direction: 'desc' }, limit: 5 });
  });

  it('an ordering ambiguity ("first five": oldest vs first of the shown list) is representable', () => {
    const r = ok({ ...base, operation: 'list', order: asc('date'), limit: 5, ambiguities: [{ dimension: 'order', resolution: 'ask', interpretations: [
      { id: 'oldest', summary: 'the five oldest transactions', order: asc('date') },
      { id: 'shown_first', summary: 'the first five of the list just shown', reference: { kind: 'candidate_frame_all' } },
    ] }] });
    expect(r.ambiguities[0].dimension).toBe('order');
  });

  it('the semantic limit bound equals the visible candidate frame', () => {
    expect(MAX_LIST_LIMIT).toBe(VISIBLE_CANDIDATE_FRAME_MAX);
    expect(MAX_LIST_LIMIT).toBe(25);
  });
});

describe('R0.1 representability — measures[] and conceptual net', () => {
  it.each<[string, string[]]>([
    ['8. money in and money out', ['inflow', 'outflow']],
    ['9. income and spending', ['income', 'spending']],
    ['10. net', ['net']],
    ['11. income + spending + net', ['income', 'spending', 'net']],
    ['12. deposits and withdrawals', ['inflow', 'outflow']],
  ])('%s', (_label, measures) => {
    const r = ok({ ...base, operation: 'total', measures: measures as FinancialRequestV2Input['measures'], period: { kind: 'previous', unit: 'month' } });
    expect(r.measures).toEqual(measures); // order preserved
  });

  it('net is never added automatically — in/out stays exactly in/out', () => {
    const r = ok({ ...base, operation: 'total', measures: ['inflow', 'outflow'] });
    expect(r.measures).not.toContain('net');
  });
});

describe('R0.1 representability — comparisons', () => {
  it('13. this month vs last month → previous_equivalent', () => {
    expect(ok({ ...base, operation: 'total', measures: ['spending'], period: { kind: 'current', unit: 'month' }, comparison: { kind: 'previous_equivalent' } }).comparison)
      .toEqual({ kind: 'previous_equivalent' });
  });
  it('14. this month vs the same month last year → offset 1 year', () => {
    expect(ok({ ...base, operation: 'total', measures: ['spending'], period: { kind: 'current', unit: 'month' }, comparison: { kind: 'offset', count: 1, unit: 'year' } }).comparison)
      .toEqual({ kind: 'offset', count: 1, unit: 'year' });
  });
  it('15. last three months vs the same period last year → rolling 3 months + offset 1 year', () => {
    const r = ok({ ...base, operation: 'total', measures: ['spending'], period: { kind: 'rolling', count: 3, unit: 'month' }, comparison: { kind: 'offset', count: 1, unit: 'year' } });
    expect(r.period).toEqual({ kind: 'rolling', count: 3, unit: 'month' });
    expect(r.comparison).toEqual({ kind: 'offset', count: 1, unit: 'year' });
  });
  it('16. two years ago → offset 2 years', () => {
    expect(ok({ ...base, operation: 'total', measures: ['spending'], period: { kind: 'current', unit: 'year' }, comparison: { kind: 'offset', count: 2, unit: 'year' } }).comparison)
      .toEqual({ kind: 'offset', count: 2, unit: 'year' });
  });
});

describe('R0.1 rejections', () => {
  const list = { ...base, operation: 'list', measures: ['transactions'] } as const;
  it.each<[string, unknown]>([
    ['17. limit 0', { ...list, order: desc('date'), limit: 0 }],
    ['18. limit 26', { ...list, order: desc('date'), limit: 26 }],
    ['19. limit without order', { ...list, limit: 5 }],
    ['20. order with total', { ...base, operation: 'total', measures: ['spending'], order: desc('amount') }],
    ['21. limit with count', { ...base, operation: 'count', measures: ['transactions'], order: desc('date'), limit: 3 }],
    ['order with average', { ...base, operation: 'average', measures: ['spending'], order: desc('amount') }],
    ['order with explain', { ...base, operation: 'explain', order: desc('amount') }],
    ['unknown order key', { ...list, order: { by: 'merchant', direction: 'desc' } }],
    ['unknown direction', { ...list, order: { by: 'date', direction: 'newest' } }],
    ['non-integer limit', { ...list, order: desc('date'), limit: 2.5 }],
    ['22. measures empty', { ...base, operation: 'total', measures: [] }],
    ['23. duplicate measures', { ...base, operation: 'total', measures: ['inflow', 'inflow'] }],
    ['24. more than 4 measures', { ...base, operation: 'total', measures: ['income', 'spending', 'inflow', 'outflow', 'net'] }],
    ['25. unknown measure net_movement', { ...base, operation: 'total', measures: ['net_movement'] }],
    ['26. legacy rank operation', { ...base, operation: 'rank', measures: ['spending'] }],
    ['27. legacy rank field', { ...list, rank: { order: 'largest', limit: 1 } }],
    ['28. legacy measure key', { ...base, operation: 'total', measure: 'spending' }],
    ['legacy measure alongside measures', { ...base, operation: 'total', measures: ['spending'], measure: 'spending' }],
    ['29. offset count 0', { ...base, operation: 'total', period: { kind: 'current', unit: 'month' }, comparison: { kind: 'offset', count: 0, unit: 'year' } }],
    ['offset with an unknown unit', { ...base, operation: 'total', period: { kind: 'current', unit: 'month' }, comparison: { kind: 'offset', count: 1, unit: 'decade' } }],
    ['30. offset without primary period', { ...base, operation: 'total', comparison: { kind: 'offset', count: 1, unit: 'year' } }],
    ['31. version 1 rejected', { ...base, version: 1, operation: 'total', measures: ['spending'] }],
  ])('%s', (_label, c) => {
    expect(bad(c)).toBe(true);
  });
});

describe('R0.1 invariants', () => {
  it('32. no financial amounts can be encoded', () => {
    for (const extra of [{ amount: 12.5 }, { total: 100 }, { totals: { net: 1 } }, { value: 3 }]) {
      expect(bad({ ...base, operation: 'total', measures: ['net'], ...extra })).toBe(true);
    }
  });
  it('33. no authoritative transaction ids are introduced by order / limit / measures', () => {
    expect(bad({ ...base, operation: 'list', order: { by: 'date', direction: 'desc', transactionId: 'x' }, limit: 1 })).toBe(true);
    expect(bad({ ...base, operation: 'list', order: desc('date'), limit: 1, selectedTransactionId: '3f2c1d4e-5b6a-4c7d-8e9f-0a1b2c3d4e5f' })).toBe(true);
  });
  it('34. net carries no formula — it is an enum value only', () => {
    expect(FINANCIAL_MEASURES).toContain('net');
    expect(bad({ ...base, operation: 'total', measures: [{ net: 'income - spending' }] })).toBe(true);
    expect(bad({ ...base, operation: 'total', measures: ['net'], netDefinition: 'raw' })).toBe(true);
  });
  it('35. the version literal is 2', () => {
    expect(FINANCIAL_REQUEST_VERSION).toBe(2);
    expect(ok({ ...base, operation: 'total', measures: ['income'] }).version).toBe(2);
  });
  it('36. retired V1 representations cannot survive alongside V2 ones', () => {
    expect(FINANCIAL_OPERATIONS).not.toContain('rank');
    expect(FINANCIAL_MEASURES).not.toContain('net_movement');
    expect(bad({ ...base, operation: 'list', order: desc('amount'), limit: 1, rank: { order: 'largest', limit: 1 } })).toBe(true);
  });
  it('benchmark / personal-context fields are not part of FinancialRequest', () => {
    for (const extra of [{ occupation: 'sales rep' }, { benchmark: 'national average' }, { judgement: 'a lot' }, { externalEvidence: [] }, { household: 'single' }]) {
      expect(bad({ ...base, operation: 'average', measures: ['spending'], ...extra })).toBe(true);
    }
  });
});

/**
 * T21 P1a — amount-band learner (pure, suggestions only).
 *
 * Learned bands are suggestions: status is always 'suggested', nothing is activated.
 * Thresholds are experimental and configurable (D-T21-4).
 */

import { describe, it, expect } from 'vitest';
import {
  suggestAmountBands,
  niceBoundaryCents,
  EXPERIMENTAL_LEARNER_THRESHOLDS,
  type AmountCorrection,
  type LearnerConfig,
} from '../_shared/tagAmountLearner';
import { matchAmountRule, validateAmountRule, type AmountRule } from '../_shared/tagAmountRules';

const CONFIG: LearnerConfig = { ...EXPERIMENTAL_LEARNER_THRESHOLDS, signConvention: 'negative_is_out' };

let seq = 0;
function corr(amount: number | string, category: string, p: Partial<AmountCorrection> = {}): AmountCorrection {
  seq += 1;
  return {
    transactionId: `tx-${seq}`,
    merchant: '7-ELEVEN STORE #33535',
    amount,
    category,
    subcategory: null,
    correctedAt: '2026-11-20T10:00:00.000Z',
    origin: 'customer_explicit',
    ...p,
  };
}

describe('suggestAmountBands — 7-Eleven example', () => {
  it('one Gas correction is not enough: withheld, ask the customer', () => {
    const r = suggestAmountBands([corr(-2, 'Coffee'), corr(-2.25, 'Coffee'), corr(-65, 'Gas')], CONFIG);
    expect(r.suggestions).toEqual([]);
    expect(r.withheld).toEqual([{ merchantKey: '7 eleven store', direction: 'out', reason: 'insufficient_examples', evidenceCount: 3 }]);
  });

  it('two per side yields one suggested split with a round boundary', () => {
    const input = [corr(-2, 'Coffee'), corr(-2.25, 'Coffee'), corr(-65, 'Gas'), corr(-70.4, 'Gas')];
    const r = suggestAmountBands(input, CONFIG);
    expect(r.withheld).toEqual([]);
    expect(r.suggestions).toHaveLength(1);
    const s = r.suggestions[0];
    expect(s.status).toBe('suggested');
    expect(s.merchantKey).toBe('7 eleven store');
    expect(s.direction).toBe('out');
    expect(s.boundaryCents).toBe(1000); // $10, between $2.25 and $65.00, near their geometric mean
    expect(s.bands).toEqual([
      { minAmount: null, maxAmount: 10, category: 'Coffee', subcategory: null, evidenceCount: 2 },
      { minAmount: 10, maxAmount: null, category: 'Gas', subcategory: null, evidenceCount: 2 },
    ]);
    expect(s.purity).toEqual({ lower: 1, upper: 1 });
    expect(s.evidenceCount).toBe(4);
    expect(s.sourceTransactionIds).toHaveLength(4);
    expect(s.confidence).toBeGreaterThan(0);
    expect(s.confidence).toBeLessThanOrEqual(1);
  });

  it('suggested bands reproduce the evidence and pass validation, yet never match while suggested', () => {
    const r = suggestAmountBands([corr(-2, 'Coffee'), corr(-2.25, 'Coffee'), corr(-65, 'Gas'), corr(-70, 'Gas')], CONFIG);
    const s = r.suggestions[0];
    const asRules: AmountRule[] = s.bands.map((b, i) => ({
      id: `b${i}`, merchantKey: s.merchantKey, direction: s.direction,
      minAmount: b.minAmount, maxAmount: b.maxAmount, category: b.category, subcategory: b.subcategory, status: s.status,
    }));
    // Status 'suggested' never applies.
    expect(matchAmountRule(asRules, { merchant: '7-Eleven Store 1', amount: -2 }, CONFIG).status).toBe('no_match');
    // Only after an explicit approval (simulated here) would they apply — and then correctly.
    const approved = asRules.map((x) => ({ ...x, status: 'active' as const }));
    expect(validateAmountRule(approved[1], [approved[0]]).ok).toBe(true);
    const cat = (a: number) => {
      const m = matchAmountRule(approved, { merchant: '7-Eleven Store 1', amount: a }, CONFIG);
      return m.status === 'matched' ? m.rule.category : m.status;
    };
    expect([cat(-2), cat(-2.25), cat(-65), cat(-70)]).toEqual(['Coffee', 'Coffee', 'Gas', 'Gas']);
  });
});

describe('suggestAmountBands — evidence rules', () => {
  it('only explicit customer corrections are learned from', () => {
    const input = [corr(-2, 'Coffee'), corr(-3, 'Coffee'), corr(-65, 'Gas', { origin: 'ai' }), corr(-70, 'Gas', { origin: 'tag_rule' })];
    const r = suggestAmountBands(input, CONFIG);
    expect(r.suggestions).toEqual([]);
    expect(r.withheld[0].reason).toBe('single_outcome');
  });

  it('uses the latest correction per transaction', () => {
    const input = [
      corr(-2, 'Coffee'), corr(-3, 'Coffee'), corr(-65, 'Gas'),
      // tx-x first called Coffee, later corrected to Gas: counts once, as Gas.
      corr(-70, 'Coffee', { transactionId: 'tx-x', correctedAt: '2026-11-01T00:00:00Z' }),
      corr(-70, 'Gas', { transactionId: 'tx-x', correctedAt: '2026-11-02T00:00:00Z' }),
    ];
    const r = suggestAmountBands(input, CONFIG);
    expect(r.suggestions).toHaveLength(1);
    expect(r.suggestions[0].evidenceCount).toBe(4);
    expect(r.suggestions[0].bands[1]).toMatchObject({ category: 'Gas', evidenceCount: 2 });
  });

  it('drops a transaction whose latest corrections tie with different outcomes', () => {
    const t = '2026-11-02T00:00:00Z';
    const input = [
      corr(-2, 'Coffee'), corr(-3, 'Coffee'), corr(-65, 'Gas'),
      corr(-70, 'Coffee', { transactionId: 'tx-tie', correctedAt: t }),
      corr(-70, 'Gas', { transactionId: 'tx-tie', correctedAt: t }),
    ];
    const r = suggestAmountBands(input, CONFIG);
    expect(r.suggestions).toEqual([]);
    expect(r.withheld[0]).toMatchObject({ reason: 'insufficient_examples', evidenceCount: 3 });
  });

  it('ignores invalid, zero and undated corrections', () => {
    const input = [
      corr(-2, 'Coffee'), corr(-3, 'Coffee'), corr(-65, 'Gas'), corr(-70, 'Gas'),
      corr('abc', 'Gas'), corr(0, 'Gas'), corr(-80, 'Gas', { correctedAt: 'not a date' }),
      corr(-90, ' '), corr(-95, 'Gas', { merchant: '' }),
    ];
    expect(suggestAmountBands(input, CONFIG).suggestions[0].evidenceCount).toBe(4);
  });

  it('enforces the gap ratio (amounts too close are not split)', () => {
    const r = suggestAmountBands([corr(-10, 'Coffee'), corr(-12, 'Coffee'), corr(-30, 'Gas'), corr(-35, 'Gas')], CONFIG);
    // 30 / 12 = 2.5 < 3
    expect(r.suggestions).toEqual([]);
    expect(r.withheld[0].reason).toBe('no_clean_split');
    const relaxed = suggestAmountBands([corr(-10, 'Coffee'), corr(-12, 'Coffee'), corr(-30, 'Gas'), corr(-35, 'Gas')], { ...CONFIG, minGapRatio: 2.5 });
    expect(relaxed.suggestions).toHaveLength(1); // exactly at the ratio qualifies
  });

  it('enforces purity, with the threshold inclusive', () => {
    const nine = Array.from({ length: 9 }, (_, i) => corr(-(2 + i / 100), 'Coffee'));
    const gas = [corr(-65, 'Gas'), corr(-70, 'Gas')];
    // 9 Coffee + 1 Snacks below; 9/10 = 0.9 meets minPurity 0.9.
    const ok = suggestAmountBands([...nine, corr(-2.5, 'Snacks'), ...gas], CONFIG);
    expect(ok.suggestions).toHaveLength(1);
    expect(ok.suggestions[0].purity.lower).toBe(0.9);
    // 8 Coffee + 2 Snacks below; 0.8 < 0.9.
    const bad = suggestAmountBands([...nine.slice(1), corr(-2.5, 'Snacks'), corr(-2.6, 'Snacks'), ...gas], CONFIG);
    expect(bad.suggestions).toEqual([]);
  });

  it('a single outcome is withheld', () => {
    const r = suggestAmountBands([corr(-2, 'Coffee'), corr(-65, 'Coffee')], CONFIG);
    expect(r.withheld[0].reason).toBe('single_outcome');
  });

  it('separates money in from money out', () => {
    const r = suggestAmountBands([corr(-2, 'Coffee'), corr(-3, 'Coffee'), corr(65, 'Refunds'), corr(70, 'Refunds')], CONFIG);
    expect(r.suggestions).toEqual([]);
    expect(r.withheld.map((w) => [w.direction, w.reason])).toEqual([['in', 'single_outcome'], ['out', 'single_outcome']]);
  });

  it('respects the configured sign convention', () => {
    const r = suggestAmountBands([corr(2, 'Coffee'), corr(3, 'Coffee'), corr(65, 'Gas'), corr(70, 'Gas')], { ...CONFIG, signConvention: 'positive_is_out' });
    expect(r.suggestions[0].direction).toBe('out');
  });

  it('subcategories are distinct outcomes', () => {
    const r = suggestAmountBands([
      corr(-2, 'Food & Dining', { subcategory: 'Coffee' }), corr(-3, 'Food & Dining', { subcategory: 'Coffee' }),
      corr(-65, 'Food & Dining', { subcategory: 'Groceries' }), corr(-70, 'Food & Dining', { subcategory: 'Groceries' }),
    ], CONFIG);
    expect(r.suggestions[0].bands.map((b) => b.subcategory)).toEqual(['Coffee', 'Groceries']);
  });
});

describe('suggestAmountBands — determinism and safety', () => {
  it('is independent of input order and does not mutate input', () => {
    const input = [corr(-2, 'Coffee'), corr(-65, 'Gas'), corr(-2.25, 'Coffee'), corr(-70, 'Gas'), corr(5, 'Refunds')];
    const snapshot = JSON.stringify(input);
    const a = suggestAmountBands(input, CONFIG);
    const b = suggestAmountBands([...input].reverse(), CONFIG);
    expect(b).toEqual(a);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('never emits anything but suggestions', () => {
    const many: AmountCorrection[] = [];
    for (let i = 0; i < 20; i++) many.push(corr(-(1 + i / 10), 'Coffee'), corr(-(60 + i), 'Gas'));
    const r = suggestAmountBands(many, CONFIG);
    expect(r.suggestions.length).toBeGreaterThan(0);
    expect(r.suggestions.every((s) => s.status === 'suggested')).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/"active"/);
  });

  it('rejects invalid configuration', () => {
    expect(() => suggestAmountBands([], { ...CONFIG, minExamplesPerSide: 0 })).toThrow();
    expect(() => suggestAmountBands([], { ...CONFIG, minExamplesPerSide: 1.5 })).toThrow();
    expect(() => suggestAmountBands([], { ...CONFIG, minGapRatio: 1 })).toThrow();
    expect(() => suggestAmountBands([], { ...CONFIG, minPurity: 0.5 })).toThrow();
    expect(() => suggestAmountBands([], { ...CONFIG, minPurity: 1.1 })).toThrow();
    expect(() => suggestAmountBands([], { ...CONFIG, signConvention: undefined as unknown as LearnerConfig['signConvention'] })).toThrow();
  });

  it('experimental defaults are frozen', () => {
    expect(EXPERIMENTAL_LEARNER_THRESHOLDS).toEqual({ minExamplesPerSide: 2, minGapRatio: 3, minPurity: 0.9 });
    expect(Object.isFrozen(EXPERIMENTAL_LEARNER_THRESHOLDS)).toBe(true);
  });
});

describe('niceBoundaryCents', () => {
  it('always lies in (lowerMax, upperMin]', () => {
    const cases: Array<[number, number]> = [[225, 6500], [1, 3], [999, 3000], [4000, 12000], [100, 100000], [12345, 98765]];
    for (const [lo, hi] of cases) {
      const b = niceBoundaryCents(lo, hi);
      expect(b).toBeGreaterThan(lo);
      expect(b).toBeLessThanOrEqual(hi);
      expect(Number.isInteger(b)).toBe(true);
    }
    expect(niceBoundaryCents(225, 6500)).toBe(1000);
  });
});

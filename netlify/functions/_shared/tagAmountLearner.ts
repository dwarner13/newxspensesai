/**
 * Tag Intelligence 2.1 — P1a: learn amount bands from customer-approved corrections (pure).
 *
 * Produces SUGGESTIONS only. Every output carries status 'suggested'; nothing here can produce
 * an active rule, and nothing here writes anywhere. Activation requires an explicit customer
 * approval in a later phase. No database access, no network, no logging, no environment reads.
 *
 * Thresholds are EXPERIMENTAL (Prime HQ decision D-T21-4) and fully configurable.
 *
 * Method, per (merchant key, direction):
 *   1. Keep only explicit customer corrections; keep the latest correction per transaction
 *      (a transaction whose latest corrections tie on timestamp with different outcomes is
 *      dropped as ambiguous).
 *   2. Sort by unsigned amount (integer cents) and try every split between two distinct
 *      amounts. A split qualifies when the lower and upper majority outcomes differ, each
 *      majority has at least minExamplesPerSide examples, each side's purity is at least
 *      minPurity, and upperMin >= minGapRatio * lowerMax.
 *   3. Best split: highest worst-side purity, then largest gap ratio, then lowest boundary.
 *   4. The boundary is a round number near the geometric mean of lowerMax and upperMin, always
 *      inside (lowerMax, upperMin], so [0, boundary) and [boundary, ∞) reproduce the evidence.
 */

import {
  tagMerchantKey,
  toCents,
  directionFromSignedCents,
  type AmountDirection,
  type SignConvention,
} from './tagAmountRules.js';

export interface AmountCorrection {
  transactionId: string;
  /** Raw merchant text; the key is computed with tagMerchantKey. */
  merchant: string | null | undefined;
  /** Signed amount as stored on the transaction (server-read, never client-supplied). */
  amount: number | string | null | undefined;
  category: string;
  subcategory?: string | null;
  /** ISO-8601 timestamp of the correction. */
  correctedAt: string;
  /** Only corrections with origin 'customer_explicit' are learned from; others are ignored. */
  origin: string;
}

export interface LearnerThresholds {
  /** Minimum examples of the majority outcome on each side of the boundary. */
  minExamplesPerSide: number;
  /** upperMin must be at least this multiple of lowerMax. */
  minGapRatio: number;
  /** Minimum share of the majority outcome on each side, in (0.5, 1]. */
  minPurity: number;
}

export interface LearnerConfig extends LearnerThresholds {
  signConvention: SignConvention;
}

/** EXPERIMENTAL defaults (D-T21-4). Not validated against production data. */
export const EXPERIMENTAL_LEARNER_THRESHOLDS: Readonly<LearnerThresholds> = Object.freeze({
  minExamplesPerSide: 2,
  minGapRatio: 3,
  minPurity: 0.9,
});

export interface SuggestedBand {
  /** Inclusive, major units. null = from zero. */
  minAmount: number | null;
  /** Exclusive, major units. null = unbounded. */
  maxAmount: number | null;
  category: string;
  subcategory: string | null;
  evidenceCount: number;
}

export interface AmountBandSuggestion {
  status: 'suggested';
  merchantKey: string;
  direction: AmountDirection;
  boundaryCents: number;
  bands: [SuggestedBand, SuggestedBand];
  /** Experimental score in [0, 1]; for ranking suggestions, never for activation. */
  confidence: number;
  purity: { lower: number; upper: number };
  gapRatio: number;
  evidenceCount: number;
  sourceTransactionIds: string[];
}

export type WithheldReason =
  | 'single_outcome'
  | 'insufficient_examples'
  | 'no_clean_split';

export interface WithheldMerchant {
  merchantKey: string;
  direction: AmountDirection;
  reason: WithheldReason;
  evidenceCount: number;
}

export interface LearnerResult {
  suggestions: AmountBandSuggestion[];
  withheld: WithheldMerchant[];
}

interface Point {
  transactionId: string;
  cents: number;
  outcome: string; // category + '\u0000' + subcategory
  category: string;
  subcategory: string | null;
}

function assertConfig(config: LearnerConfig): void {
  const { minExamplesPerSide, minGapRatio, minPurity, signConvention } = config;
  if (!Number.isInteger(minExamplesPerSide) || minExamplesPerSide < 1) {
    throw new Error('tagAmountLearner: minExamplesPerSide must be an integer >= 1');
  }
  if (!Number.isFinite(minGapRatio) || minGapRatio <= 1) {
    throw new Error('tagAmountLearner: minGapRatio must be > 1');
  }
  if (!Number.isFinite(minPurity) || minPurity <= 0.5 || minPurity > 1) {
    throw new Error('tagAmountLearner: minPurity must be in (0.5, 1]');
  }
  if (signConvention !== 'negative_is_out' && signConvention !== 'positive_is_out') {
    throw new Error('tagAmountLearner: signConvention is required');
  }
}

function outcomeKey(category: string, subcategory: string | null): string {
  return `${category}\u0000${subcategory ?? ''}`;
}

/** Latest explicit correction per transaction; ambiguous same-time conflicts are dropped. */
function latestPerTransaction(corrections: readonly AmountCorrection[]): AmountCorrection[] {
  const byTx = new Map<string, { at: number; items: AmountCorrection[] }>();
  for (const c of corrections) {
    if (!c || c.origin !== 'customer_explicit') continue;
    const txId = typeof c.transactionId === 'string' ? c.transactionId : '';
    const category = typeof c.category === 'string' ? c.category.trim() : '';
    const at = Date.parse(c.correctedAt);
    if (!txId || !category || !Number.isFinite(at)) continue;
    const cur = byTx.get(txId);
    if (!cur || at > cur.at) byTx.set(txId, { at, items: [c] });
    else if (at === cur.at) cur.items.push(c);
  }
  const out: AmountCorrection[] = [];
  for (const { items } of byTx.values()) {
    const first = items[0];
    const k = outcomeKey(first.category.trim(), first.subcategory?.trim() || null);
    if (items.every((i) => outcomeKey(i.category.trim(), i.subcategory?.trim() || null) === k)) {
      out.push(first);
    }
  }
  return out;
}

function majority(points: Point[]): { outcome: string; count: number; point: Point } {
  const counts = new Map<string, number>();
  for (const p of points) counts.set(p.outcome, (counts.get(p.outcome) || 0) + 1);
  let bestOutcome = '';
  let bestCount = -1;
  for (const [outcome, count] of counts) {
    // Deterministic tie-break on the outcome text.
    if (count > bestCount || (count === bestCount && outcome < bestOutcome)) {
      bestOutcome = outcome;
      bestCount = count;
    }
  }
  const point = points.find((p) => p.outcome === bestOutcome) as Point;
  return { outcome: bestOutcome, count: bestCount, point };
}

const NICE_STEPS_CENTS = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

/** A round boundary in (lowerMax, upperMin], close to their geometric mean. */
export function niceBoundaryCents(lowerMax: number, upperMin: number): number {
  const g = Math.sqrt(lowerMax * upperMin);
  for (const step of NICE_STEPS_CENTS) {
    const lo = Math.floor(g / step) * step;
    const hi = lo + step;
    const options = [lo, hi]
      .filter((c) => c > lowerMax && c <= upperMin && c >= g / 2 && c <= g * 2)
      .sort((a, b) => Math.abs(a - g) - Math.abs(b - g) || a - b);
    if (options.length > 0) return options[0];
  }
  return upperMin;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Experimental ranking score. Never used to activate anything. */
function scoreSuggestion(purity: number, minSideCount: number, gapRatio: number): number {
  const evidence = Math.min(1, minSideCount / 5);
  const separation = Math.min(1, gapRatio / 10);
  return round2(purity * (0.5 + 0.25 * evidence + 0.25 * separation));
}

/**
 * Learns amount-band suggestions from explicit customer corrections. Pure and deterministic:
 * the same input always yields the same output, regardless of input order.
 */
export function suggestAmountBands(
  corrections: readonly AmountCorrection[],
  config: LearnerConfig,
): LearnerResult {
  assertConfig(config);
  const groups = new Map<string, { merchantKey: string; direction: AmountDirection; points: Point[] }>();

  for (const c of latestPerTransaction(corrections)) {
    const merchantKey = tagMerchantKey(c.merchant);
    if (!merchantKey) continue;
    const signed = toCents(c.amount);
    if (signed === null) continue;
    const direction = directionFromSignedCents(signed, config.signConvention);
    if (!direction) continue;
    const category = c.category.trim();
    const subcategory = c.subcategory?.trim() || null;
    const gk = `${merchantKey}\u0000${direction}`;
    let g = groups.get(gk);
    if (!g) {
      g = { merchantKey, direction, points: [] };
      groups.set(gk, g);
    }
    g.points.push({ transactionId: c.transactionId, cents: Math.abs(signed), outcome: outcomeKey(category, subcategory), category, subcategory });
  }

  const suggestions: AmountBandSuggestion[] = [];
  const withheld: WithheldMerchant[] = [];
  const orderedKeys = [...groups.keys()].sort();

  for (const gk of orderedKeys) {
    const group = groups.get(gk);
    if (!group) continue;
    const { merchantKey, direction, points } = group;
    points.sort((a, b) => a.cents - b.cents || (a.transactionId < b.transactionId ? -1 : a.transactionId > b.transactionId ? 1 : 0));
    const evidenceCount = points.length;
    const outcomes = new Set(points.map((p) => p.outcome));
    if (outcomes.size < 2) {
      withheld.push({ merchantKey, direction, reason: 'single_outcome', evidenceCount });
      continue;
    }

    type Split = { lower: Point[]; upper: Point[]; lm: ReturnType<typeof majority>; um: ReturnType<typeof majority>; purity: number; gapRatio: number; boundary: number };
    let best: Split | null = null;
    let sawEnoughExamples = false;

    for (let i = 1; i < points.length; i++) {
      if (points[i].cents === points[i - 1].cents) continue; // splits only between distinct amounts
      const lower = points.slice(0, i);
      const upper = points.slice(i);
      const lm = majority(lower);
      const um = majority(upper);
      if (lm.outcome === um.outcome) continue;
      if (lm.count < config.minExamplesPerSide || um.count < config.minExamplesPerSide) continue;
      sawEnoughExamples = true;
      const lowerMax = lower[lower.length - 1].cents;
      const upperMin = upper[0].cents;
      const lowerPurity = lm.count / lower.length;
      const upperPurity = um.count / upper.length;
      if (lowerPurity < config.minPurity || upperPurity < config.minPurity) continue;
      if (upperMin < config.minGapRatio * lowerMax) continue;
      const purity = Math.min(lowerPurity, upperPurity);
      const gapRatio = upperMin / lowerMax;
      const boundary = niceBoundaryCents(lowerMax, upperMin);
      const better =
        !best ||
        purity > best.purity ||
        (purity === best.purity && gapRatio > best.gapRatio) ||
        (purity === best.purity && gapRatio === best.gapRatio && boundary < best.boundary);
      if (better) best = { lower, upper, lm, um, purity, gapRatio, boundary };
    }

    if (!best) {
      withheld.push({ merchantKey, direction, reason: sawEnoughExamples ? 'no_clean_split' : 'insufficient_examples', evidenceCount });
      continue;
    }

    const lowerPurity = best.lm.count / best.lower.length;
    const upperPurity = best.um.count / best.upper.length;
    suggestions.push({
      status: 'suggested',
      merchantKey,
      direction,
      boundaryCents: best.boundary,
      bands: [
        {
          minAmount: null,
          maxAmount: best.boundary / 100,
          category: best.lm.point.category,
          subcategory: best.lm.point.subcategory,
          evidenceCount: best.lm.count,
        },
        {
          minAmount: best.boundary / 100,
          maxAmount: null,
          category: best.um.point.category,
          subcategory: best.um.point.subcategory,
          evidenceCount: best.um.count,
        },
      ],
      confidence: scoreSuggestion(best.purity, Math.min(best.lm.count, best.um.count), best.gapRatio),
      purity: { lower: round2(lowerPurity), upper: round2(upperPurity) },
      gapRatio: round2(best.gapRatio),
      evidenceCount,
      sourceTransactionIds: points.map((p) => p.transactionId),
    });
  }

  return { suggestions, withheld };
}

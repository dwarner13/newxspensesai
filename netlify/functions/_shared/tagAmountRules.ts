/**
 * Tag Intelligence 2.1 — P1a: amount-aware merchant rule helpers (pure).
 *
 * Pure functions only: no database access, no network, no logging, no environment reads.
 * Nothing in the running application imports this module yet (P4a wires it in behind
 * TAG_AMOUNT_RULES === '1' after C4 lands). See t21-p1a-amount-rules.test.ts.
 *
 * Money is compared in integer cents parsed from the decimal text of the value, so
 * comparisons are exact (no binary floating-point drift at range boundaries).
 *
 * Range semantics: [minAmount, maxAmount) on the UNSIGNED amount. minAmount is inclusive,
 * maxAmount is exclusive, null means unbounded on that side. Direction ('out' = money out,
 * 'in' = money in) is derived from the amount's sign via an explicit SignConvention supplied by
 * the caller; this module never assumes how the database stores signs.
 */

import { merchantGroupingKey } from './merchantNormalize.js';

export type AmountDirection = 'out' | 'in';
export type AmountRuleStatus = 'suggested' | 'active' | 'rejected' | 'retired';

/** How a signed amount maps to a direction. Required: no default is assumed. */
export type SignConvention = 'negative_is_out' | 'positive_is_out';

export interface AmountRule {
  id: string;
  /** tagMerchantKey() output for the rule's merchant. */
  merchantKey: string;
  direction: AmountDirection;
  /** Inclusive lower bound, major units, unsigned. null = 0. */
  minAmount: number | string | null;
  /** Exclusive upper bound, major units, unsigned. null = unbounded. */
  maxAmount: number | string | null;
  category: string;
  subcategory?: string | null;
  status: AmountRuleStatus;
}

export interface AmountTxInput {
  merchant: string | null | undefined;
  /** Signed amount as stored. */
  amount: number | string | null | undefined;
}

export interface AmountMatchOptions {
  signConvention: SignConvention;
}

export type AmountRuleMatch =
  | {
      status: 'matched';
      rule: AmountRule;
      /** Other active rules that matched with equal specificity and the same outcome. */
      equivalentRuleIds: string[];
      merchantKey: string;
      direction: AmountDirection;
      amountCents: number;
      invalidRuleIds: string[];
    }
  | {
      status: 'unresolved';
      reason: 'conflicting_rules';
      candidateRuleIds: string[];
      merchantKey: string;
      direction: AmountDirection;
      amountCents: number;
      invalidRuleIds: string[];
    }
  | {
      status: 'no_match';
      reason: 'no_merchant' | 'invalid_amount' | 'zero_amount' | 'no_rule';
      invalidRuleIds: string[];
    };

// ─── Money ──────────────────────────────────────────────────────────────────

/** Largest magnitude accepted, in major units. Larger values are treated as invalid input. */
export const MAX_ABS_AMOUNT = 1000000000;

const DECIMAL_TEXT = /^([+-])?(\d+)(?:\.(\d*))?$|^([+-])?\.(\d+)$/;

interface ParsedDecimal {
  negative: boolean;
  intDigits: string;
  fracDigits: string;
}

function parseDecimalText(value: unknown): ParsedDecimal | null {
  let text: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_ABS_AMOUNT) return null;
    // String(n) is the shortest round-trip representation; values in range below 1e-6 use
    // exponent notation, which toFixed(20) expands without changing the value's cents.
    text = /e/i.test(String(value)) ? value.toFixed(20) : String(value);
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return null;
  }
  const m = DECIMAL_TEXT.exec(text);
  if (!m) return null;
  if (m[2] !== undefined) {
    return { negative: m[1] === '-', intDigits: m[2], fracDigits: m[3] ?? '' };
  }
  return { negative: m[4] === '-', intDigits: '0', fracDigits: m[5] ?? '' };
}

function centsFromParts(p: ParsedDecimal, roundSubCents: boolean): number | null {
  const frac = p.fracDigits;
  const firstTwo = (frac + '00').slice(0, 2);
  const rest = frac.slice(2);
  let cents = Number(p.intDigits) * 100 + Number(firstTwo);
  if (rest.length > 0 && /[1-9]/.test(rest)) {
    if (!roundSubCents) return null;
    // Round half away from zero on the magnitude.
    if (rest[0] >= '5') cents += 1;
  }
  if (!Number.isSafeInteger(cents) || cents > MAX_ABS_AMOUNT * 100) return null;
  return p.negative ? -cents : cents;
}

/**
 * Signed amount -> integer cents, rounding sub-cent digits half away from zero.
 * Returns null for anything that is not a plain finite decimal within MAX_ABS_AMOUNT.
 */
export function toCents(value: unknown): number | null {
  const p = parseDecimalText(value);
  if (!p) return null;
  const c = centsFromParts(p, true);
  return c === 0 ? 0 : c; // normalise -0
}

/** Rule bound -> integer cents. Bounds must be non-negative and exact to the cent. */
export function boundToCents(value: unknown): number | null {
  const p = parseDecimalText(value);
  if (!p || p.negative) return null;
  return centsFromParts(p, false);
}

export function directionFromSignedCents(cents: number, convention: SignConvention): AmountDirection | null {
  if (cents === 0) return null;
  const negative = cents < 0;
  if (convention === 'negative_is_out') return negative ? 'out' : 'in';
  return negative ? 'in' : 'out';
}

// ─── Merchant keys ──────────────────────────────────────────────────────────

/** Canonical Tag merchant key. Delegates to merchantGroupingKey, which is not modified. */
export function tagMerchantKey(raw: unknown): string {
  return merchantGroupingKey(typeof raw === 'string' ? raw : raw == null ? '' : String(raw));
}

/**
 * Every vendor_category_memory key format written by existing code, plus the canonical key,
 * de-duplicated in a fixed order: canonical, punctuation-stripped (apply-category-rules),
 * punctuation-to-space (tag-learn, tag-chat, tag-copilot, tag-memory-upsert,
 * tag-categorize-committed, tag-categorize-batch), raw-lowercase (tag-action).
 */
export function legacyVendorKeyCandidates(raw: unknown): string[] {
  const s = typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  const lower = s.toLowerCase();
  const candidates = [
    tagMerchantKey(s),
    lower.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(),
    lower.trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(),
    s.trim().toUpperCase().toLowerCase(),
  ];
  const out: string[] = [];
  for (const c of candidates) {
    if (c && !out.includes(c)) out.push(c);
  }
  return out;
}

function keyTokens(key: string): string[] {
  return String(key || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Number of rule-key tokens if the rule key equals, or is a whole-word prefix of, the
 * transaction key; otherwise 0.
 */
function keySpecificity(ruleKey: string, txTokens: string[]): number {
  const r = keyTokens(ruleKey);
  if (r.length === 0 || r.length > txTokens.length) return 0;
  for (let i = 0; i < r.length; i++) {
    if (r[i] !== txTokens[i]) return 0;
  }
  return r.length;
}

// ─── Ranges ─────────────────────────────────────────────────────────────────

interface CentsRange {
  min: number; // inclusive
  max: number | null; // exclusive; null = unbounded
}

function ruleRange(rule: Pick<AmountRule, 'minAmount' | 'maxAmount'>): CentsRange | null {
  const min = rule.minAmount == null ? 0 : boundToCents(rule.minAmount);
  const max = rule.maxAmount == null ? null : boundToCents(rule.maxAmount);
  if (min === null) return null;
  if (rule.maxAmount != null && max === null) return null;
  if (max !== null && max <= min) return null;
  return { min, max };
}

function inRange(cents: number, r: CentsRange): boolean {
  return cents >= r.min && (r.max === null || cents < r.max);
}

function rangesOverlap(a: CentsRange, b: CentsRange): boolean {
  const aBelowBEnd = b.max === null || a.min < b.max;
  const bBelowAEnd = a.max === null || b.min < a.max;
  return aBelowBEnd && bBelowAEnd;
}

function sameOutcome(a: AmountRule, b: AmountRule): boolean {
  return a.category === b.category && (a.subcategory ?? null) === (b.subcategory ?? null);
}

// ─── Matching ───────────────────────────────────────────────────────────────

/**
 * Finds the active amount rule for a transaction.
 *
 * Only status 'active' rules are considered. The most specific merchant key wins (more key
 * tokens). If several equally specific rules match and disagree on category/subcategory, the
 * result is 'unresolved' and no rule is chosen. Rules with invalid bounds are ignored and
 * reported in invalidRuleIds.
 */
export function matchAmountRule(
  rules: readonly AmountRule[],
  tx: AmountTxInput,
  opts: AmountMatchOptions,
): AmountRuleMatch {
  const invalidRuleIds: string[] = [];
  const merchantKey = tagMerchantKey(tx.merchant);
  if (!merchantKey) return { status: 'no_match', reason: 'no_merchant', invalidRuleIds };

  const signed = toCents(tx.amount);
  if (signed === null) return { status: 'no_match', reason: 'invalid_amount', invalidRuleIds };
  const direction = directionFromSignedCents(signed, opts.signConvention);
  if (direction === null) return { status: 'no_match', reason: 'zero_amount', invalidRuleIds };
  const amountCents = Math.abs(signed);

  const txTokens = keyTokens(merchantKey);
  let best = 0;
  let candidates: AmountRule[] = [];
  for (const rule of rules) {
    if (rule.status !== 'active') continue;
    const range = ruleRange(rule);
    if (!range) {
      invalidRuleIds.push(rule.id);
      continue;
    }
    if (rule.direction !== direction) continue;
    const spec = keySpecificity(rule.merchantKey, txTokens);
    if (spec === 0 || !inRange(amountCents, range)) continue;
    if (spec > best) {
      best = spec;
      candidates = [rule];
    } else if (spec === best) {
      candidates.push(rule);
    }
  }

  if (candidates.length === 0) return { status: 'no_match', reason: 'no_rule', invalidRuleIds };

  const sorted = [...candidates].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const first = sorted[0];
  if (sorted.every((r) => sameOutcome(r, first))) {
    return {
      status: 'matched',
      rule: first,
      equivalentRuleIds: sorted.slice(1).map((r) => r.id),
      merchantKey,
      direction,
      amountCents,
      invalidRuleIds,
    };
  }
  return {
    status: 'unresolved',
    reason: 'conflicting_rules',
    candidateRuleIds: sorted.map((r) => r.id),
    merchantKey,
    direction,
    amountCents,
    invalidRuleIds,
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

export type AmountRuleErrorCode =
  | 'missing_merchant_key'
  | 'invalid_direction'
  | 'missing_category'
  | 'category_not_allowed'
  | 'no_bounds'
  | 'invalid_min'
  | 'invalid_max'
  | 'empty_range';

export interface AmountRuleConflict {
  ruleId: string;
  category: string;
  subcategory: string | null;
  minAmount: number | string | null;
  maxAmount: number | string | null;
}

export interface AmountRuleValidation {
  ok: boolean;
  errors: AmountRuleErrorCode[];
  /** Active rules for the same merchant key and direction whose range overlaps the candidate. */
  conflicts: AmountRuleConflict[];
}

export interface ValidateOptions {
  /** When provided, the candidate's category must be one of these (exact match). */
  allowedCategories?: readonly string[];
}

/**
 * Validates a candidate rule against itself and the user's active rules. A candidate with the
 * same id as an existing rule is treated as a replacement of that rule (not a conflict).
 * Ranges for the same merchant key and direction must not overlap; adjacent ranges such as
 * [0, 30) and [30, ∞) are allowed.
 */
export function validateAmountRule(
  candidate: Omit<AmountRule, 'status'> & { status?: AmountRuleStatus },
  activeRules: readonly AmountRule[],
  opts: ValidateOptions = {},
): AmountRuleValidation {
  const errors: AmountRuleErrorCode[] = [];
  const key = keyTokens(candidate.merchantKey).join(' ');
  if (!key) errors.push('missing_merchant_key');
  if (candidate.direction !== 'out' && candidate.direction !== 'in') errors.push('invalid_direction');
  const category = typeof candidate.category === 'string' ? candidate.category.trim() : '';
  if (!category) errors.push('missing_category');
  else if (opts.allowedCategories && !opts.allowedCategories.includes(category)) errors.push('category_not_allowed');

  if (candidate.minAmount == null && candidate.maxAmount == null) errors.push('no_bounds');
  const min = candidate.minAmount == null ? 0 : boundToCents(candidate.minAmount);
  const max = candidate.maxAmount == null ? null : boundToCents(candidate.maxAmount);
  if (min === null) errors.push('invalid_min');
  if (candidate.maxAmount != null && max === null) errors.push('invalid_max');
  if (min !== null && max !== null && max <= min) errors.push('empty_range');

  const conflicts: AmountRuleConflict[] = [];
  if (errors.length === 0 && min !== null) {
    const range: CentsRange = { min, max };
    for (const rule of activeRules) {
      if (rule.status !== 'active' || rule.id === candidate.id) continue;
      if (rule.direction !== candidate.direction) continue;
      if (keyTokens(rule.merchantKey).join(' ') !== key) continue;
      const other = ruleRange(rule);
      if (!other || !rangesOverlap(range, other)) continue;
      conflicts.push({
        ruleId: rule.id,
        category: rule.category,
        subcategory: rule.subcategory ?? null,
        minAmount: rule.minAmount,
        maxAmount: rule.maxAmount,
      });
    }
  }

  return { ok: errors.length === 0 && conflicts.length === 0, errors, conflicts };
}

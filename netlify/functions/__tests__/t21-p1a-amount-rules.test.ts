/**
 * T21 P1a — amount-aware merchant rule helpers (pure).
 *
 * Covers exact cent arithmetic, [min, max) boundaries, sign-convention direction, specificity,
 * unresolved conflicts, validation/overlap, legacy vendor keys, merchantGroupingKey parity,
 * and isolation: no runtime module imports the new helpers, and the helpers touch no database,
 * network, logs or environment.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  toCents,
  boundToCents,
  directionFromSignedCents,
  tagMerchantKey,
  legacyVendorKeyCandidates,
  matchAmountRule,
  validateAmountRule,
  type AmountRule,
} from '../_shared/tagAmountRules';
import { merchantGroupingKey } from '../_shared/merchantNormalize';

const OUT = { signConvention: 'negative_is_out' as const };

function rule(p: Partial<AmountRule> & Pick<AmountRule, 'id'>): AmountRule {
  return {
    merchantKey: '7 eleven',
    direction: 'out',
    minAmount: null,
    maxAmount: null,
    category: 'Food & Dining',
    subcategory: 'Coffee',
    status: 'active',
    ...p,
  };
}

const SEVEN_ELEVEN: AmountRule[] = [
  rule({ id: 'r-coffee', minAmount: null, maxAmount: 30, category: 'Food & Dining', subcategory: 'Coffee' }),
  rule({ id: 'r-gas', minAmount: 30, maxAmount: null, category: 'Transportation', subcategory: 'Gas & Fuel' }),
];

describe('toCents / boundToCents — exact decimal money', () => {
  it('parses numbers and decimal strings into integer cents', () => {
    expect(toCents(2)).toBe(200);
    expect(toCents(2.25)).toBe(225);
    expect(toCents(-65)).toBe(-6500);
    expect(toCents('29.99')).toBe(2999);
    expect(toCents(' -0.07 ')).toBe(-7);
    expect(toCents('.5')).toBe(50);
    expect(toCents('12.')).toBe(1200);
  });

  it('avoids binary floating-point drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30); // 0.30000000000000004
    expect(toCents(1.005)).toBe(101); // decimal half-up, where Math.round(1.005*100) gives 100
    expect(toCents(29.995)).toBe(3000);
    expect(toCents(-29.995)).toBe(-3000); // half away from zero
    expect(toCents(29.994)).toBe(2999);
    expect(toCents(1e-7)).toBe(0);
  });

  it('normalises negative zero and rejects non-decimal input', () => {
    expect(Object.is(toCents('-0.001'), 0)).toBe(true);
    for (const bad of [NaN, Infinity, '', 'abc', '$5', '1,000', '1e3', null, undefined, {}, 2e9]) {
      expect(toCents(bad)).toBeNull();
    }
  });

  it('bounds must be non-negative and exact to the cent', () => {
    expect(boundToCents(30)).toBe(3000);
    expect(boundToCents('30.00')).toBe(3000);
    expect(boundToCents(0)).toBe(0);
    expect(boundToCents(-1)).toBeNull();
    expect(boundToCents('30.001')).toBeNull();
    expect(boundToCents('30.0010')).toBeNull();
    expect(boundToCents('30.000')).toBe(3000);
  });
});

describe('directionFromSignedCents — explicit sign convention', () => {
  it('maps sign by the configured convention and never guesses zero', () => {
    expect(directionFromSignedCents(-100, 'negative_is_out')).toBe('out');
    expect(directionFromSignedCents(100, 'negative_is_out')).toBe('in');
    expect(directionFromSignedCents(-100, 'positive_is_out')).toBe('in');
    expect(directionFromSignedCents(100, 'positive_is_out')).toBe('out');
    expect(directionFromSignedCents(0, 'negative_is_out')).toBeNull();
  });
});

describe('matchAmountRule — 7-Eleven example', () => {
  const at = (merchant: string, amount: number | string) => matchAmountRule(SEVEN_ELEVEN, { merchant, amount }, OUT);

  it('$2.00 and $2.25 -> Coffee, $65.00 -> Gas', () => {
    for (const a of [-2, -2.25]) {
      const m = at('7-Eleven', a);
      expect(m.status).toBe('matched');
      if (m.status === 'matched') expect(m.rule.id).toBe('r-coffee');
    }
    const gas = at('7-ELEVEN STORE #33535', -65);
    expect(gas.status).toBe('matched');
    if (gas.status === 'matched') {
      expect(gas.rule.id).toBe('r-gas');
      expect(gas.amountCents).toBe(6500);
      expect(gas.direction).toBe('out');
      expect(gas.merchantKey).toBe('7 eleven store');
    }
  });

  it('boundary precision: min inclusive, max exclusive, at the cent', () => {
    const id = (a: number | string) => {
      const m = at('7-Eleven', a);
      return m.status === 'matched' ? m.rule.id : m.status;
    };
    expect(id(-29.99)).toBe('r-coffee');
    expect(id('-29.994')).toBe('r-coffee'); // rounds to 29.99
    expect(id('-29.995')).toBe('r-gas'); // rounds to 30.00
    expect(id(-30)).toBe('r-gas');
    expect(id('-30.00')).toBe('r-gas');
    expect(id(-30.01)).toBe('r-gas');
    expect(id(-0.01)).toBe('r-coffee');
  });

  it('money in never matches money-out rules (refunds)', () => {
    const m = at('7-Eleven', 65);
    expect(m).toMatchObject({ status: 'no_match', reason: 'no_rule' });
  });

  it('honours the opposite sign convention without assuming database direction', () => {
    const m = matchAmountRule(SEVEN_ELEVEN, { merchant: '7-Eleven', amount: 65 }, { signConvention: 'positive_is_out' });
    expect(m.status).toBe('matched');
    if (m.status === 'matched') expect(m.rule.id).toBe('r-gas');
  });

  it('reports no_merchant, invalid_amount and zero_amount', () => {
    expect(at('', -5)).toMatchObject({ status: 'no_match', reason: 'no_merchant' });
    expect(at('   ', -5)).toMatchObject({ status: 'no_match', reason: 'no_merchant' });
    expect(at('7-Eleven', 'abc')).toMatchObject({ status: 'no_match', reason: 'invalid_amount' });
    expect(at('7-Eleven', 0)).toMatchObject({ status: 'no_match', reason: 'zero_amount' });
    expect(at('7-Eleven', '-0.004')).toMatchObject({ status: 'no_match', reason: 'zero_amount' });
  });

  it('does not match other merchants or partial words', () => {
    expect(at('Seven Oaks Cafe', -2).status).toBe('no_match');
    expect(at('7 Elevenses Bakery', -2).status).toBe('no_match');
    expect(at('ELEVEN 7', -2).status).toBe('no_match');
  });
});

describe('matchAmountRule — status, specificity and conflicts', () => {
  it('only active rules apply; suggested, rejected and retired never match', () => {
    for (const status of ['suggested', 'rejected', 'retired'] as const) {
      const m = matchAmountRule([rule({ id: 'x', maxAmount: 30, status })], { merchant: '7-Eleven', amount: -2 }, OUT);
      expect(m).toMatchObject({ status: 'no_match', reason: 'no_rule' });
    }
  });

  it('the longer (more specific) merchant key wins', () => {
    const rules = [
      rule({ id: 'a', merchantKey: '7 eleven', maxAmount: 100, category: 'Food & Dining' }),
      rule({ id: 'b', merchantKey: '7 eleven store', maxAmount: 100, category: 'Shopping' }),
    ];
    const m = matchAmountRule(rules, { merchant: '7-ELEVEN STORE #33535', amount: -5 }, OUT);
    expect(m.status).toBe('matched');
    if (m.status === 'matched') expect(m.rule.id).toBe('b');
    const m2 = matchAmountRule(rules, { merchant: '7-Eleven', amount: -5 }, OUT);
    if (m2.status === 'matched') expect(m2.rule.id).toBe('a');
  });

  it('equally specific rules that disagree are unresolved, never arbitrarily chosen', () => {
    const rules = [
      rule({ id: 'z-gas', minAmount: 20, maxAmount: 80, category: 'Transportation' }),
      rule({ id: 'a-coffee', minAmount: 0, maxAmount: 40, category: 'Food & Dining' }),
    ];
    for (const order of [rules, [...rules].reverse()]) {
      const m = matchAmountRule(order, { merchant: '7-Eleven', amount: -25 }, OUT);
      expect(m).toMatchObject({ status: 'unresolved', reason: 'conflicting_rules', candidateRuleIds: ['a-coffee', 'z-gas'] });
      expect('rule' in m).toBe(false);
    }
  });

  it('equally specific rules that agree resolve deterministically and list the others', () => {
    const rules = [
      rule({ id: 'b', minAmount: 0, maxAmount: 40 }),
      rule({ id: 'a', minAmount: 20, maxAmount: 80 }),
    ];
    const m = matchAmountRule(rules, { merchant: '7-Eleven', amount: -25 }, OUT);
    expect(m).toMatchObject({ status: 'matched', equivalentRuleIds: ['b'] });
    if (m.status === 'matched') expect(m.rule.id).toBe('a');
  });

  it('rules with invalid bounds are ignored and reported', () => {
    const rules = [
      rule({ id: 'bad-empty', minAmount: 30, maxAmount: 30 }),
      rule({ id: 'bad-neg', minAmount: -5, maxAmount: 10 }),
      rule({ id: 'bad-subcent', minAmount: 0, maxAmount: '10.005' }),
      rule({ id: 'ok', maxAmount: 30 }),
    ];
    const m = matchAmountRule(rules, { merchant: '7-Eleven', amount: -2 }, OUT);
    expect(m.status).toBe('matched');
    if (m.status === 'matched') expect(m.rule.id).toBe('ok');
    expect(m.invalidRuleIds).toEqual(['bad-empty', 'bad-neg', 'bad-subcent']);
  });

  it('does not mutate its inputs', () => {
    const rules = SEVEN_ELEVEN.map((r) => ({ ...r }));
    const snapshot = JSON.stringify(rules);
    matchAmountRule(rules, { merchant: '7-Eleven', amount: -2 }, OUT);
    expect(JSON.stringify(rules)).toBe(snapshot);
  });
});

describe('validateAmountRule — conflicts and overlapping ranges', () => {
  const base = { id: 'new', merchantKey: '7 eleven', direction: 'out' as const, category: 'Transportation', subcategory: null };

  it('accepts adjacent, non-overlapping ranges', () => {
    const v = validateAmountRule({ ...base, minAmount: 30, maxAmount: null }, [SEVEN_ELEVEN[0]]);
    expect(v).toEqual({ ok: true, errors: [], conflicts: [] });
  });

  it('reports overlaps with active rules for the same key and direction', () => {
    const v = validateAmountRule({ ...base, minAmount: 25, maxAmount: 35 }, SEVEN_ELEVEN);
    expect(v.ok).toBe(false);
    expect(v.errors).toEqual([]);
    expect(v.conflicts.map((c) => c.ruleId)).toEqual(['r-coffee', 'r-gas']);
  });

  it('ignores inactive rules, other directions, other keys and the rule being replaced', () => {
    const others: AmountRule[] = [
      rule({ id: 'retired', maxAmount: 100, status: 'retired' }),
      rule({ id: 'suggested', maxAmount: 100, status: 'suggested' }),
      rule({ id: 'in', maxAmount: 100, direction: 'in' }),
      rule({ id: 'store', maxAmount: 100, merchantKey: '7 eleven store' }),
      rule({ id: 'new', maxAmount: 100 }),
    ];
    expect(validateAmountRule({ ...base, minAmount: 0, maxAmount: 50 }, others)).toEqual({ ok: true, errors: [], conflicts: [] });
  });

  it('rejects malformed candidates', () => {
    const errs = (c: Record<string, unknown>) =>
      validateAmountRule({ ...base, minAmount: 0, maxAmount: 10, ...c } as Parameters<typeof validateAmountRule>[0], []).errors;
    expect(errs({ merchantKey: '  ' })).toContain('missing_merchant_key');
    expect(errs({ direction: 'sideways' })).toContain('invalid_direction');
    expect(errs({ category: ' ' })).toContain('missing_category');
    expect(errs({ minAmount: null, maxAmount: null })).toContain('no_bounds');
    expect(errs({ minAmount: -1 })).toContain('invalid_min');
    expect(errs({ maxAmount: '10.001' })).toContain('invalid_max');
    expect(errs({ minAmount: 10, maxAmount: 10 })).toContain('empty_range');
    expect(errs({ minAmount: 20, maxAmount: 10 })).toContain('empty_range');
  });

  it('optionally enforces an allowed category list', () => {
    const v = validateAmountRule({ ...base, minAmount: 0, maxAmount: 10, category: 'Fuel' }, [], { allowedCategories: ['Transportation'] });
    expect(v.errors).toEqual(['category_not_allowed']);
  });
});

describe('merchant keys', () => {
  it('tagMerchantKey is exactly merchantGroupingKey (which is unchanged)', () => {
    const fixtures = ['7-ELEVEN STORE #33535', '7 ELEVEN STORE #33535', 'COSTCO WHOLESALE #258', 'COSTCO GAS #258', "MCDONALD'S #40215", 'SQ *JOES AUTO 4839', 'SOBEYS INC', '', '   '];
    for (const f of fixtures) expect(tagMerchantKey(f)).toBe(merchantGroupingKey(f));
    expect(tagMerchantKey('7-ELEVEN STORE #33535')).toBe('7 eleven store');
    expect(tagMerchantKey('COSTCO GAS #258')).not.toBe(tagMerchantKey('COSTCO WHOLESALE #258'));
    expect(tagMerchantKey(null)).toBe('');
    expect(tagMerchantKey(undefined)).toBe('');
  });

  it('legacyVendorKeyCandidates covers every existing vendor_key writer format', () => {
    const c = legacyVendorKeyCandidates('7-Eleven Store #33535');
    expect(c).toEqual([
      '7 eleven store', // canonical (merchantGroupingKey)
      '7eleven store 33535', // apply-category-rules normalizeVendorKey
      '7 eleven store 33535', // tag-learn / tag-chat / tag-copilot / tag-memory-upsert / tag-categorize-*
      '7-eleven store #33535', // tag-action (trim + upper + lower)
    ]);
    expect(legacyVendorKeyCandidates('starbucks')).toEqual(['starbucks']);
    expect(legacyVendorKeyCandidates('')).toEqual([]);
  });
});

describe('isolation — P1a has zero runtime effect', () => {
  const root = path.resolve(__dirname, '..', '..', '..');
  const NEW_MODULES = ['tagAmountRules', 'tagAmountLearner'];
  const ALLOWED_IMPORTERS = new Set([
    path.join('netlify', 'functions', '_shared', 'tagAmountLearner.ts'),
    path.join('netlify', 'functions', '__tests__', 't21-p1a-amount-rules.test.ts'),
    path.join('netlify', 'functions', '__tests__', 't21-p1a-amount-learner.test.ts'),
  ]);

  function walk(dir: string, out: string[]): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) out.push(full);
    }
  }

  it('no application, function or script file imports the new helpers', () => {
    const files: string[] = [];
    for (const d of ['src', path.join('netlify', 'functions'), 'scripts', 'worker', 'supabase']) walk(path.join(root, d), files);
    const importers = files
      .filter((f) => {
        const text = fs.readFileSync(f, 'utf8');
        return NEW_MODULES.some((m) => new RegExp(`['"][^'"]*/${m}(\\.js|\\.ts)?['"]`).test(text));
      })
      .map((f) => path.relative(root, f));
    expect(importers.filter((f) => !ALLOWED_IMPORTERS.has(f))).toEqual([]);
  });

  it('the helpers have no database, network, logging or environment access', () => {
    for (const m of NEW_MODULES) {
      const src = fs.readFileSync(path.join(root, 'netlify', 'functions', '_shared', `${m}.ts`), 'utf8');
      expect(src).not.toMatch(/supabase|fetch\(|console\.|process\.env|openai|anthropic|require\(/i);
      const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((x) => x[1]);
      expect(imports.every((i) => ['./merchantNormalize.js', './tagAmountRules.js'].includes(i))).toBe(true);
    }
  });
});

/**
 * FINANCIAL FOUNDATION — DETERMINISTIC TESTS
 *
 * Tests for the canonical financial taxonomy, section classification,
 * category resolver, date utilities, and result semantics.
 *
 * No database access. No network calls. Pure logic verification.
 *
 * Run: npm run test -- src/shared/__tests__/financial-foundation.test.ts
 */

import { describe, test, expect } from 'vitest';

import {
  resolveCategory,
  resolveCategoryOrPassthrough,
  isNonSpendCategory,
  isNonSpendTransaction,
  isIncomeStrict,
  isIncomeBroad,
  INCOME_MERCHANT_PATTERNS,
  NON_SPEND_CATEGORIES,
  NON_SPEND_SUBCATEGORIES,
  type ClassifiableTransaction,
  type QueryResultStatus,
} from '../financial-taxonomy.js';

import {
  TAX_SECTIONS,
  VEHICLE_BUCKETS,
  SECTION_BUCKETS,
  classifyTransactions,
  groupIntoBuckets,
  type SectionResult,
} from '../financial-sections.js';

import {
  getLocalDateParts,
  getMonthRange,
  getPreviousMonthRange,
  getYearRange,
  getMonthBucketKey,
} from '../financial-dates.js';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveCategory', () => {
  test('"fuel" → Transportation / Gas & Fuel', () => {
    const result = resolveCategory('fuel');
    expect(result).toEqual({
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      section: 'vehicle',
    });
  });

  test('"gas" → Transportation / Gas & Fuel', () => {
    const result = resolveCategory('gas');
    expect(result).toEqual({
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      section: 'vehicle',
    });
  });

  test('"gasoline" → Transportation / Gas & Fuel', () => {
    expect(resolveCategory('gasoline')?.category).toBe('Transportation');
    expect(resolveCategory('gasoline')?.subcategory).toBe('Gas & Fuel');
  });

  test('"gas & fuel" → Transportation / Gas & Fuel', () => {
    expect(resolveCategory('gas & fuel')?.subcategory).toBe('Gas & Fuel');
  });

  test('"gas / fuel" → Transportation / Gas & Fuel', () => {
    expect(resolveCategory('gas / fuel')?.subcategory).toBe('Gas & Fuel');
  });

  test('"vehicle fuel" → Transportation / Gas & Fuel', () => {
    expect(resolveCategory('vehicle fuel')?.subcategory).toBe('Gas & Fuel');
  });

  test('"parking" → Transportation / Parking', () => {
    const result = resolveCategory('parking');
    expect(result).toEqual({
      category: 'Transportation',
      subcategory: 'Parking',
      section: 'vehicle',
    });
  });

  test('"car wash" → Transportation / Car Wash', () => {
    expect(resolveCategory('car wash')?.subcategory).toBe('Car Wash');
  });

  test('"vehicle maintenance" → Transportation / Vehicle Maintenance', () => {
    expect(resolveCategory('vehicle maintenance')?.subcategory).toBe('Vehicle Maintenance');
  });

  test('"restaurants" → Food & Dining / Restaurants', () => {
    const result = resolveCategory('restaurants');
    expect(result?.category).toBe('Food & Dining');
    expect(result?.subcategory).toBe('Restaurants');
    expect(result?.section).toBe('meals');
  });

  test('"dining" → Food & Dining / Restaurants', () => {
    expect(resolveCategory('dining')?.category).toBe('Food & Dining');
  });

  test('"coffee" → Food & Dining / Coffee & Drinks', () => {
    expect(resolveCategory('coffee')?.subcategory).toBe('Coffee & Drinks');
  });

  test('"groceries" → Groceries', () => {
    expect(resolveCategory('groceries')).toEqual({ category: 'Groceries' });
  });

  test('"rent" → Housing / Rent or Mortgage', () => {
    expect(resolveCategory('rent')?.category).toBe('Housing');
    expect(resolveCategory('rent')?.subcategory).toBe('Rent or Mortgage');
  });

  test('"mortgage" → Housing / Rent or Mortgage', () => {
    expect(resolveCategory('mortgage')?.subcategory).toBe('Rent or Mortgage');
  });

  test('"insurance" → Insurance (no subcategory)', () => {
    expect(resolveCategory('insurance')).toEqual({ category: 'Insurance' });
  });

  test('"pharmacy" → Healthcare / Pharmacy', () => {
    expect(resolveCategory('pharmacy')?.category).toBe('Healthcare');
    expect(resolveCategory('pharmacy')?.subcategory).toBe('Pharmacy');
  });

  test('"subscriptions" → Subscriptions', () => {
    expect(resolveCategory('subscriptions')?.category).toBe('Subscriptions');
  });

  test('unknown category → null (NOT a guess)', () => {
    expect(resolveCategory('xyzzy')).toBeNull();
    expect(resolveCategory('random nonsense')).toBeNull();
    expect(resolveCategory('flying lessons')).toBeNull();
  });

  test('empty string → null', () => {
    expect(resolveCategory('')).toBeNull();
    expect(resolveCategory('  ')).toBeNull();
  });

  test('case insensitive', () => {
    expect(resolveCategory('FUEL')).not.toBeNull();
    expect(resolveCategory('Gas & Fuel')).not.toBeNull();
    expect(resolveCategory('Parking')).not.toBeNull();
  });
});

describe('resolveCategoryOrPassthrough', () => {
  test('known alias resolves normally', () => {
    expect(resolveCategoryOrPassthrough('fuel')?.category).toBe('Transportation');
  });

  test('canonical category name passes through', () => {
    const result = resolveCategoryOrPassthrough('Transportation');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('Transportation');
  });

  test('canonical name case-insensitive', () => {
    expect(resolveCategoryOrPassthrough('transportation')?.category).toBe('Transportation');
    expect(resolveCategoryOrPassthrough('FOOD & DINING')?.category).toBe('Food & Dining');
  });

  test('unknown string → null', () => {
    expect(resolveCategoryOrPassthrough('xyzzy')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERY RESULT STATUS (type-level verification)
// ─────────────────────────────────────────────────────────────────────────────

describe('QueryResultStatus semantics', () => {
  test('verified_zero is distinct from unresolved_category', () => {
    const verified: QueryResultStatus = 'verified_zero';
    const unresolved: QueryResultStatus = 'unresolved_category';
    expect(verified).not.toBe(unresolved);
  });

  test('all status values are valid', () => {
    const statuses: QueryResultStatus[] = [
      'verified',
      'verified_zero',
      'unresolved_category',
      'insufficient_scope',
      'query_error',
    ];
    expect(statuses).toHaveLength(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NON_SPEND CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

describe('isNonSpendCategory', () => {
  test('transfers are non-spend', () => {
    expect(isNonSpendCategory('Transfers')).toBe(true);
    expect(isNonSpendCategory('transfers')).toBe(true);
    expect(isNonSpendCategory('Transfer')).toBe(true);
  });

  test('debt payments are non-spend', () => {
    expect(isNonSpendCategory('Debt Payments')).toBe(true);
    expect(isNonSpendCategory('debt payment')).toBe(true);
  });

  test('credit card payments are non-spend', () => {
    expect(isNonSpendCategory('Credit Card Payments')).toBe(true);
  });

  test('investments are non-spend', () => {
    expect(isNonSpendCategory('Investments')).toBe(true);
    expect(isNonSpendCategory('investment')).toBe(true);
  });

  test('income is non-spend', () => {
    expect(isNonSpendCategory('Income')).toBe(true);
    expect(isNonSpendCategory('Business Income')).toBe(true);
  });

  test('real spending categories are NOT non-spend', () => {
    expect(isNonSpendCategory('Transportation')).toBe(false);
    expect(isNonSpendCategory('Food & Dining')).toBe(false);
    expect(isNonSpendCategory('Groceries')).toBe(false);
    expect(isNonSpendCategory('Shopping')).toBe(false);
    expect(isNonSpendCategory('Healthcare')).toBe(false);
  });

  test('null/undefined → false', () => {
    expect(isNonSpendCategory(null)).toBe(false);
    expect(isNonSpendCategory(undefined)).toBe(false);
    expect(isNonSpendCategory('')).toBe(false);
  });
});

describe('isNonSpendTransaction', () => {
  test('non-spend category catches regardless of subcategory', () => {
    expect(isNonSpendTransaction({ category: 'Transfers', subcategory: 'e-Transfer' })).toBe(true);
  });

  test('non-spend subcategory catches even with spend category', () => {
    expect(isNonSpendTransaction({ category: 'Transportation', subcategory: 'Car Loan' })).toBe(true);
  });

  test('normal spend transaction is not non-spend', () => {
    expect(isNonSpendTransaction({ category: 'Transportation', subcategory: 'Gas & Fuel' })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INCOME CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

describe('isIncomeStrict', () => {
  test('type=income → true', () => {
    expect(isIncomeStrict({ type: 'income' })).toBe(true);
    expect(isIncomeStrict({ type: 'Income' })).toBe(true);
  });

  test('category=Income but type≠income → false', () => {
    expect(isIncomeStrict({ category: 'Income', type: 'expense' })).toBe(false);
    expect(isIncomeStrict({ category: 'Income', type: null })).toBe(false);
  });

  test('merchant pattern but type≠income → false', () => {
    expect(isIncomeStrict({ merchant_name: 'PAYMENT', type: 'expense' })).toBe(false);
  });
});

describe('isIncomeBroad', () => {
  test('type=income → true', () => {
    expect(isIncomeBroad({ type: 'income' })).toBe(true);
  });

  test('category=Income → true (even without type)', () => {
    expect(isIncomeBroad({ category: 'Income' })).toBe(true);
    expect(isIncomeBroad({ category: 'Business Income' })).toBe(true);
  });

  test('merchant PAYMENT pattern → true', () => {
    expect(isIncomeBroad({ merchant_name: 'PAYMENT' })).toBe(true);
    expect(isIncomeBroad({ merchant_name: 'DEPOSIT' })).toBe(true);
    expect(isIncomeBroad({ merchant_name: 'REFUND' })).toBe(true);
    expect(isIncomeBroad({ merchant_name: 'CASHBACK' })).toBe(true);
  });

  test('normal expense → false', () => {
    expect(isIncomeBroad({ type: 'expense', category: 'Food & Dining', merchant_name: 'Tim Hortons' })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TAX SECTION CLASSIFICATION — FIRST MATCH WINS
// ─────────────────────────────────────────────────────────────────────────────

describe('classifyTransactions — first-match-wins', () => {
  test('Income section is evaluated FIRST', () => {
    expect(TAX_SECTIONS[0].id).toBe('income');
  });

  test('Vehicle section is evaluated SECOND', () => {
    expect(TAX_SECTIONS[1].id).toBe('vehicle');
  });

  /**
   * REGRESSION FIXTURE: The $2,149.84 fuel rebate scenario.
   *
   * This transaction has type=income AND subcategory=Gas & Fuel.
   * Income section (first) MUST claim it before Vehicle section.
   * If Vehicle claimed it, Gas/Fuel total would be $8,622.49 instead of $6,472.65.
   */
  test('REGRESSION: income + Gas & Fuel tx → Income claims it, NOT Vehicle', () => {
    const fuelRebate: ClassifiableTransaction = {
      type: 'income',
      category: 'Income',
      subcategory: 'Gas & Fuel',
      amount: 2149.84,
    };

    const normalGas: ClassifiableTransaction = {
      type: 'expense',
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      amount: -50.00,
    };

    const results = classifyTransactions([fuelRebate, normalGas]);

    const income = results.get('income')!;
    const vehicle = results.get('vehicle')!;

    // Fuel rebate must be in Income, NOT in Vehicle
    expect(income.count).toBe(1);
    expect(income.transactions).toContain(fuelRebate);

    // Normal gas expense must be in Vehicle
    expect(vehicle.count).toBe(1);
    expect(vehicle.transactions).toContain(normalGas);

    // Vehicle total must NOT include the rebate
    expect(vehicle.total).toBeCloseTo(50.00, 2);
  });

  test('normal expense + Gas & Fuel → Vehicle / Gas Fuel', () => {
    const tx: ClassifiableTransaction = {
      type: 'expense',
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      amount: -65.00,
    };

    const results = classifyTransactions([tx]);
    expect(results.get('vehicle')!.count).toBe(1);
    expect(results.get('income')!.count).toBe(0);
  });

  test('each transaction is claimed by exactly one section', () => {
    const txs: ClassifiableTransaction[] = [
      { type: 'income', category: 'Income', amount: 5000 },
      { type: 'expense', category: 'Transportation', subcategory: 'Gas & Fuel', amount: -60 },
      { type: 'expense', category: 'Food & Dining', amount: -30 },
      { type: 'expense', category: 'Housing', amount: -1200 },
      { type: 'expense', category: 'Subscriptions', amount: -15 },
      { type: 'expense', category: 'Groceries', amount: -80 },
      { type: 'expense', category: 'Shopping', amount: -45 },
    ];

    const results = classifyTransactions(txs);

    // Sum of all section counts must equal input count
    let totalClaimed = 0;
    for (const [, section] of results) {
      totalClaimed += section.count;
    }
    expect(totalClaimed).toBe(txs.length);
  });

  test('Transfers land in Personal section (current TaxWorkspace behavior)', () => {
    const transfer: ClassifiableTransaction = {
      type: 'expense',
      category: 'Transfers',
      amount: -500,
    };

    const results = classifyTransactions([transfer]);
    expect(results.get('personal')!.count).toBe(1);
  });

  test('Golf subcategory → Personal (not Meals)', () => {
    const golf: ClassifiableTransaction = {
      type: 'expense',
      category: 'Entertainment',
      subcategory: 'Golf',
      amount: -100,
    };

    const results = classifyTransactions([golf]);
    expect(results.get('personal')!.count).toBe(1);
    expect(results.get('meals')!.count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GROUP INTO BUCKETS
// ─────────────────────────────────────────────────────────────────────────────

describe('groupIntoBuckets', () => {
  test('subcategory "Gas & Fuel" → Gas / Fuel bucket', () => {
    const txs: ClassifiableTransaction[] = [
      { subcategory: 'Gas & Fuel', merchant_name: 'PETRO-CANADA', amount: -55.00 },
    ];
    const results = groupIntoBuckets(txs, VEHICLE_BUCKETS);
    const gasBucket = results.find((b) => b.label === 'Gas / Fuel');
    expect(gasBucket).toBeDefined();
    expect(gasBucket!.count).toBe(1);
    expect(gasBucket!.amount).toBeCloseTo(55.00, 2);
  });

  test('merchant keyword match → correct bucket', () => {
    const txs: ClassifiableTransaction[] = [
      { subcategory: null, merchant_name: 'ESSO #1234', amount: -45.00 },
    ];
    const results = groupIntoBuckets(txs, VEHICLE_BUCKETS);
    const gasBucket = results.find((b) => b.label === 'Gas / Fuel');
    expect(gasBucket!.count).toBe(1);
  });

  test('unmatched transaction → Other bucket', () => {
    const txs: ClassifiableTransaction[] = [
      { subcategory: 'Something Random', merchant_name: 'Unknown Vendor', amount: -20.00 },
    ];
    const results = groupIntoBuckets(txs, VEHICLE_BUCKETS);
    const other = results.find((b) => b.label === 'Other');
    expect(other).toBeDefined();
    expect(other!.count).toBe(1);
  });

  test('Math.abs applied to negative amounts', () => {
    const txs: ClassifiableTransaction[] = [
      { subcategory: 'Parking', amount: -15.00 },
    ];
    const results = groupIntoBuckets(txs, VEHICLE_BUCKETS);
    const parking = results.find((b) => b.label === 'Parking');
    expect(parking!.amount).toBe(15.00);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NON-SPEND COLLISION BEHAVIOR (canonical current semantics)
// ─────────────────────────────────────────────────────────────────────────────

describe('Non-spend collision behavior', () => {
  test('Transfers + Gas & Fuel subcategory → Vehicle section (TaxWorkspace behavior)', () => {
    // This matches current TaxWorkspacePage: no NON_SPEND guard on sections.
    // A transfer with Gas & Fuel subcategory lands in Vehicle because
    // subcategory match fires before the Personal category-match for Transfers.
    const tx: ClassifiableTransaction = {
      type: 'expense',
      category: 'Transfers',
      subcategory: 'Gas & Fuel',
      amount: -100,
    };

    // Vehicle matchFn checks subcategory "Gas & Fuel" → should match
    const vehicleSection = TAX_SECTIONS.find((s) => s.id === 'vehicle')!;
    expect(vehicleSection.matchFn(tx)).toBe(true);

    // In first-match-wins, Vehicle (index 1) comes before Personal (index 5)
    const results = classifyTransactions([tx]);
    expect(results.get('vehicle')!.count).toBe(1);
    expect(results.get('personal')!.count).toBe(0);
  });

  test('Debt Payments without matching subcategory → Personal section', () => {
    const tx: ClassifiableTransaction = {
      type: 'expense',
      category: 'Debt Payments',
      amount: -300,
    };

    const results = classifyTransactions([tx]);
    expect(results.get('personal')!.count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE-AWARE DATES
// ─────────────────────────────────────────────────────────────────────────────

describe('getLocalDateParts', () => {
  test('UTC reference date resolves correctly', () => {
    // 2025-06-15 at noon UTC
    const ref = new Date('2025-06-15T12:00:00Z');
    const parts = getLocalDateParts('UTC', ref);
    expect(parts.year).toBe(2025);
    expect(parts.month).toBe(6);
    expect(parts.day).toBe(15);
  });

  test('America/Denver timezone resolves correctly', () => {
    // 2025-06-15 at noon UTC = 6 AM MDT
    const ref = new Date('2025-06-15T12:00:00Z');
    const parts = getLocalDateParts('America/Denver', ref);
    expect(parts.year).toBe(2025);
    expect(parts.month).toBe(6);
    expect(parts.day).toBe(15);
  });

  test('null timezone falls back to UTC', () => {
    const ref = new Date('2025-06-15T12:00:00Z');
    const parts = getLocalDateParts(null, ref);
    expect(parts.year).toBe(2025);
    expect(parts.month).toBe(6);
  });
});

describe('month boundary — Edmonton 11 PM problem', () => {
  test('11 PM Edmonton on Aug 31 is still August in America/Edmonton', () => {
    // 11 PM MDT Aug 31 = 5 AM UTC Sep 1
    const ref = new Date('2026-09-01T05:00:00Z');
    const parts = getLocalDateParts('America/Edmonton', ref);
    expect(parts.month).toBe(8); // August, not September
    expect(parts.day).toBe(31);
  });

  test('getMonthRange at 11 PM Edmonton Aug 31 → August range', () => {
    const ref = new Date('2026-09-01T05:00:00Z');
    const range = getMonthRange('America/Edmonton', ref);
    expect(range.start).toBe('2026-08-01');
    expect(range.end).toBe('2026-09-01');
  });
});

describe('year boundary', () => {
  test('11 PM Edmonton on Dec 31 is still December', () => {
    // 11 PM MST Dec 31 = 6 AM UTC Jan 1
    const ref = new Date('2026-01-01T06:00:00Z');
    const parts = getLocalDateParts('America/Edmonton', ref);
    expect(parts.year).toBe(2025);
    expect(parts.month).toBe(12);
    expect(parts.day).toBe(31);
  });

  test('getYearRange(2025) returns correct bounds', () => {
    const range = getYearRange(2025);
    expect(range.start).toBe('2025-01-01');
    expect(range.end).toBe('2026-01-01');
  });
});

describe('month rollover', () => {
  test('getMonthRange for December → end is next year January', () => {
    const ref = new Date('2025-12-15T12:00:00Z');
    const range = getMonthRange('UTC', ref);
    expect(range.start).toBe('2025-12-01');
    expect(range.end).toBe('2026-01-01');
  });

  test('getPreviousMonthRange for January → December of previous year', () => {
    const ref = new Date('2026-01-15T12:00:00Z');
    const range = getPreviousMonthRange('UTC', ref);
    expect(range.start).toBe('2025-12-01');
    expect(range.end).toBe('2026-01-01');
  });
});

describe('getMonthBucketKey', () => {
  test('returns YYYY-MM for valid date', () => {
    expect(getMonthBucketKey('2025-06-15')).toBe('2025-06');
  });

  test('returns null for empty/invalid date', () => {
    expect(getMonthBucketKey('')).toBeNull();
    expect(getMonthBucketKey('not-a-date')).toBeNull();
  });

  test('respects timezone for month boundary', () => {
    // 11 PM MDT Aug 31 = 5 AM UTC Sep 1
    // The date string "2026-09-01T05:00:00Z" in Edmonton timezone should be Aug
    expect(getMonthBucketKey('2026-09-01T05:00:00Z', 'America/Edmonton')).toBe('2026-08');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED_ZERO vs UNRESOLVED_CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

describe('verified_zero vs unresolved_category distinction', () => {
  test('resolved category with 0 results → verified_zero', () => {
    // Simulates: user asks "how much did I spend on parking?"
    // resolveCategory("parking") → { category: "Transportation", subcategory: "Parking" }
    // Query returns 0 rows → status should be "verified_zero", not "unresolved_category"
    const resolved = resolveCategory('parking');
    expect(resolved).not.toBeNull();

    // If we had 0 results for this resolved category:
    const status: QueryResultStatus = resolved ? 'verified_zero' : 'unresolved_category';
    expect(status).toBe('verified_zero');
  });

  test('unresolved category → unresolved_category', () => {
    const resolved = resolveCategory('flying lessons');
    expect(resolved).toBeNull();

    const status: QueryResultStatus = resolved ? 'verified_zero' : 'unresolved_category';
    expect(status).toBe('unresolved_category');
  });
});

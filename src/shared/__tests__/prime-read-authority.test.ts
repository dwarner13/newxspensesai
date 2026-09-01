/**
 * PRIME READ AUTHORITY V1 — Acceptance Tests
 *
 * Tests A-I from Phase 1B Step 9:
 *   A. "fuel" resolves to Transportation/Gas & Fuel
 *   B. "gas" resolves to Transportation/Gas & Fuel
 *   C. "restaurants" resolves to Food & Dining/Restaurants
 *   D. "vehicle maintenance" resolves to Transportation/Vehicle Maintenance
 *   E. verified_zero: valid category, no matching fixture → verified_zero
 *   F. unresolved: unknown term → null
 *   G. comparison: "fuel" and "gas" resolve identically
 *   H. temporal: year range boundaries correct
 *   I. Tag confirmation: mutation tools NOT in tax_summary
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCategory,
  resolveCategoryOrPassthrough,
} from '../financial-taxonomy';
import {
  TAX_SECTIONS,
  classifyTransactions,
  groupIntoBuckets,
  VEHICLE_BUCKETS,
} from '../financial-sections';
import {
  getYearRange,
  getMonthRange,
  getLocalDateParts,
} from '../financial-dates';
import {
  inputSchema as txSearchInputSchema,
  outputSchema as txSearchOutputSchema,
} from '../../agent/tools/impl/tx_search';
import {
  inputSchema as taxSummaryInputSchema,
  outputSchema as taxSummaryOutputSchema,
} from '../../agent/tools/impl/tax_summary';

// ─────────────────────────────────────────────────────────────────────────────
// Test A: "fuel" → Transportation / Gas & Fuel
// ─────────────────────────────────────────────────────────────────────────────
describe('A: fuel resolution', () => {
  it('"fuel" resolves to Transportation / Gas & Fuel', () => {
    const r = resolveCategory('fuel');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Gas & Fuel');
    expect(r!.section).toBe('vehicle');
  });

  it('"Fuel" resolves case-insensitively', () => {
    const r = resolveCategory('Fuel');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Gas & Fuel');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test B: "gas" → Transportation / Gas & Fuel
// ─────────────────────────────────────────────────────────────────────────────
describe('B: gas resolution', () => {
  it('"gas" resolves to Transportation / Gas & Fuel', () => {
    const r = resolveCategory('gas');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Gas & Fuel');
    expect(r!.section).toBe('vehicle');
  });

  it('"gas & fuel" resolves identically', () => {
    const r = resolveCategory('gas & fuel');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Gas & Fuel');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test C: "restaurants" → Food & Dining / Restaurants
// ─────────────────────────────────────────────────────────────────────────────
describe('C: restaurants resolution', () => {
  it('"restaurants" resolves to Food & Dining / Restaurants', () => {
    const r = resolveCategory('restaurants');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Food & Dining');
    expect(r!.subcategory).toBe('Restaurants');
    expect(r!.section).toBe('meals');
  });

  it('"dining" resolves similarly', () => {
    const r = resolveCategory('dining');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Food & Dining');
    expect(r!.subcategory).toBe('Restaurants');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test D: "vehicle maintenance" → Transportation / Vehicle Maintenance
// ─────────────────────────────────────────────────────────────────────────────
describe('D: vehicle maintenance resolution', () => {
  it('"vehicle maintenance" resolves correctly', () => {
    const r = resolveCategory('vehicle maintenance');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Vehicle Maintenance');
    expect(r!.section).toBe('vehicle');
  });

  it('"car repair" also resolves to Vehicle Maintenance', () => {
    const r = resolveCategory('car repair');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
    expect(r!.subcategory).toBe('Vehicle Maintenance');
  });

  it('"oil change" also resolves to Vehicle Maintenance', () => {
    const r = resolveCategory('oil change');
    expect(r).not.toBeNull();
    expect(r!.subcategory).toBe('Vehicle Maintenance');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test E: verified_zero semantics (valid category, zero matching transactions)
// ─────────────────────────────────────────────────────────────────────────────
describe('E: verified_zero semantics', () => {
  it('valid resolved category with empty transaction set → empty classification', () => {
    const resolved = resolveCategory('fuel');
    expect(resolved).not.toBeNull();

    // Classify zero transactions
    const classified = classifyTransactions([], TAX_SECTIONS);
    const vehicleResult = classified.get('vehicle');
    expect(vehicleResult).toBeDefined();
    expect(vehicleResult!.count).toBe(0);
    expect(vehicleResult!.total).toBe(0);
  });

  it('canonical category name passes through', () => {
    const r = resolveCategoryOrPassthrough('Transportation');
    expect(r).not.toBeNull();
    expect(r!.category).toBe('Transportation');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test F: unresolved category → null
// ─────────────────────────────────────────────────────────────────────────────
describe('F: unresolved category', () => {
  it('unknown term returns null', () => {
    expect(resolveCategory('xyzzy')).toBeNull();
    expect(resolveCategory('magic beans')).toBeNull();
    expect(resolveCategory('')).toBeNull();
  });

  it('passthrough also returns null for unknown terms', () => {
    expect(resolveCategoryOrPassthrough('xyzzy')).toBeNull();
    expect(resolveCategoryOrPassthrough('nonsense category')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test G: comparison — "fuel" and "gas" resolve identically
// ─────────────────────────────────────────────────────────────────────────────
describe('G: fuel/gas equivalence', () => {
  it('"fuel" and "gas" produce the same resolution', () => {
    const fuel = resolveCategory('fuel');
    const gas = resolveCategory('gas');
    expect(fuel).toEqual(gas);
  });

  it('"gasoline", "petrol", "vehicle fuel", "car fuel" all resolve the same', () => {
    const base = resolveCategory('fuel')!;
    for (const alias of ['gasoline', 'petrol', 'vehicle fuel', 'car fuel']) {
      const r = resolveCategory(alias);
      expect(r).not.toBeNull();
      expect(r!.category).toBe(base.category);
      expect(r!.subcategory).toBe(base.subcategory);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test H: temporal — year range boundaries
// ─────────────────────────────────────────────────────────────────────────────
describe('H: temporal boundaries', () => {
  it('getYearRange(2025) returns correct boundaries', () => {
    const range = getYearRange(2025);
    expect(range.start).toBe('2025-01-01');
    expect(range.end).toBe('2026-01-01');
  });

  it('getYearRange(2026) returns correct boundaries', () => {
    const range = getYearRange(2026);
    expect(range.start).toBe('2026-01-01');
    expect(range.end).toBe('2027-01-01');
  });

  it('month range respects timezone at boundary', () => {
    // Aug 31, 2026 at 11 PM Edmonton = Sep 1, 2026 5 AM UTC
    const edmontonLateNight = new Date('2026-09-01T05:00:00Z');
    const range = getMonthRange('America/Edmonton', edmontonLateNight);
    expect(range.start).toBe('2026-08-01');
    expect(range.end).toBe('2026-09-01');
  });

  it('getLocalDateParts respects timezone', () => {
    // Same boundary case
    const utcSep1 = new Date('2026-09-01T05:00:00Z');
    const parts = getLocalDateParts('America/Edmonton', utcSep1);
    expect(parts.month).toBe(8); // Still August in Edmonton
    expect(parts.day).toBe(31);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test I: Tag confirmation — mutation tools not in tax_summary schema
// ─────────────────────────────────────────────────────────────────────────────
describe('I: tax_summary is read-only', () => {
  it('tax_summary input schema has no mutation fields', () => {
    const shape = taxSummaryInputSchema.shape;
    const keys = Object.keys(shape);
    expect(keys).toEqual(['year']);
  });

  it('tax_summary output schema contains queryStatus', () => {
    const shape = taxSummaryOutputSchema.shape;
    expect(shape).toHaveProperty('queryStatus');
    expect(shape).toHaveProperty('sections');
    expect(shape).toHaveProperty('year');
    expect(shape).toHaveProperty('grandTotal');
    expect(shape).toHaveProperty('transactionCount');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fuel rebate regression (from foundation tests — reinforced here)
// ─────────────────────────────────────────────────────────────────────────────
describe('Fuel rebate regression', () => {
  it('$2,149.84 income/Gas&Fuel rebate is claimed by Income, not Vehicle', () => {
    const txs = [
      { type: 'income', category: 'Income', subcategory: 'Gas & Fuel', amount: 2149.84 },
      { type: 'expense', category: 'Transportation', subcategory: 'Gas & Fuel', amount: -100 },
      { type: 'expense', category: 'Transportation', subcategory: 'Gas & Fuel', amount: -50 },
    ];

    const classified = classifyTransactions(txs, TAX_SECTIONS);

    const income = classified.get('income')!;
    expect(income.count).toBe(1);
    expect(income.total).toBeCloseTo(2149.84, 2);

    const vehicle = classified.get('vehicle')!;
    expect(vehicle.count).toBe(2);
    expect(vehicle.total).toBeCloseTo(150, 2);

    // Verify the rebate is NOT in vehicle buckets
    const vehicleBuckets = groupIntoBuckets(vehicle.transactions, VEHICLE_BUCKETS);
    const gasFuel = vehicleBuckets.find(b => b.label === 'Gas / Fuel');
    expect(gasFuel).toBeDefined();
    expect(gasFuel!.amount).toBeCloseTo(150, 2); // Only the expenses
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// tx_search schema validation
// ─────────────────────────────────────────────────────────────────────────────
describe('tx_search schema includes subcategory', () => {
  it('inputSchema accepts subcategory', () => {
    const result = txSearchInputSchema.safeParse({
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('inputSchema still works without subcategory (backward compat)', () => {
    const result = txSearchInputSchema.safeParse({
      category: 'Transportation',
    });
    expect(result.success).toBe(true);
  });

  it('outputSchema includes queryStatus and subcategory in rows', () => {
    const shape = txSearchOutputSchema.shape;
    expect(shape).toHaveProperty('queryStatus');
    expect(shape).toHaveProperty('resolvedCategory');

    // Verify rows include subcategory
    const rowShape = shape.rows.element.shape;
    expect(rowShape).toHaveProperty('subcategory');
  });
});

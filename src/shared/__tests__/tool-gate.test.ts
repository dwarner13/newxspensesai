/**
 * PHASE 1B.1 — Tool Gate Acceptance Tests
 *
 * Tests A-K: verify exact-scope sufficiency for Prime financial tool stripping.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeQueryScope,
  isContextSufficient,
  shouldRetainTools,
  type TaxSummaryContext,
} from '../tool-gate';

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Tax Summary with only section-level totals (no subcategories). */
const SECTION_ONLY: TaxSummaryContext[] = [
  { section: 'Vehicle Expenses', total: 15000, count: 200 },
  { section: 'Meals & Entertainment', total: 8000, count: 150 },
  { section: 'Personal', total: 5000, count: 100 },
];

/** Tax Summary with subcategory breakdowns. */
const WITH_SUBCATEGORIES: TaxSummaryContext[] = [
  {
    section: 'Vehicle Expenses',
    total: 15000,
    count: 200,
    topSubcategories: [
      { name: 'Gas / Fuel', amount: 6472.65, count: 120 },
      { name: 'Car Payments', amount: 4800, count: 12 },
      { name: 'Insurance', amount: 2400, count: 12 },
    ],
  },
  {
    section: 'Meals & Entertainment',
    total: 8000,
    count: 150,
    topSubcategories: [
      { name: 'Restaurants / Dining', amount: 4500, count: 80 },
      { name: 'Coffee', amount: 1200, count: 50 },
    ],
  },
  {
    section: 'Personal',
    total: 5000,
    count: 100,
    topSubcategories: [
      { name: 'Shopping', amount: 2000, count: 30 },
      { name: 'Groceries', amount: 1500, count: 40 },
    ],
  },
];

/** Food & Dining section only (no subcategories). */
const FOOD_SECTION_ONLY: TaxSummaryContext[] = [
  { section: 'Food & Dining', total: 8000, count: 150 },
];

/** Shopping section only (no subcategories). */
const SHOPPING_SECTION_ONLY: TaxSummaryContext[] = [
  { section: 'Shopping', total: 5000, count: 100 },
];

const CONTEXT_YEAR = 2025;

// ─────────────────────────────────────────────────────────────────────────────
// Test A: Vehicle total only → "fuel" question → tools retained
// ─────────────────────────────────────────────────────────────────────────────
describe('A: Vehicle total only, fuel question', () => {
  it('tools should be retained (section ≠ subcategory)', () => {
    const retain = shouldRetainTools(
      SECTION_ONLY,
      'how much did i spend on fuel in 2025?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('tools retained even without year mention', () => {
    const retain = shouldRetainTools(
      SECTION_ONLY,
      'how much did i spend on fuel?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test B: Exact 2025 Gas/Fuel total in context → direct answer allowed
// ─────────────────────────────────────────────────────────────────────────────
describe('B: Exact Gas/Fuel subcategory in context', () => {
  it('tools can be stripped when exact subcategory match + correct year', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much did i spend on gas / fuel in 2025?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });

  it('tools can be stripped without explicit year (current year assumed)', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much did i spend on gas / fuel?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test C: Food & Dining total only → "restaurants" question → tools retained
// ─────────────────────────────────────────────────────────────────────────────
describe('C: Food & Dining total only, restaurants question', () => {
  it('tools retained (section ≠ subcategory)', () => {
    const retain = shouldRetainTools(
      FOOD_SECTION_ONLY,
      'how much did i spend at restaurants?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test D: Shopping total → Costco question → tools retained
// ─────────────────────────────────────────────────────────────────────────────
describe('D: Shopping total, Costco question', () => {
  it('tools retained (merchant query)', () => {
    const retain = shouldRetainTools(
      SHOPPING_SECTION_ONLY,
      'how much did i spend at costco?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test E: Costco merchant total in context → "Costco" question
// ─────────────────────────────────────────────────────────────────────────────
describe('E: Merchant query always retains tools', () => {
  it('merchant query always needs tools even if merchant name appears in context', () => {
    const withCostco: TaxSummaryContext[] = [
      {
        section: 'Personal',
        total: 5000,
        count: 100,
        topSubcategories: [
          { name: 'Costco', amount: 2000, count: 30 },
        ],
      },
    ];
    // "at costco" triggers merchant detection
    const retain = shouldRetainTools(
      withCostco,
      'how much did i spend at costco?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('but non-merchant costco mention without "at" may match subcategory', () => {
    const withCostco: TaxSummaryContext[] = [
      {
        section: 'Personal',
        total: 5000,
        count: 100,
        topSubcategories: [
          { name: 'Costco', amount: 2000, count: 30 },
        ],
      },
    ];
    // No "at" preposition → not detected as merchant query
    // "costco" appears as subcategory in context
    const retain = shouldRetainTools(
      withCostco,
      'how much costco spending do i have?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test F: 2025 Gas/Fuel in context → "What about 2024?" → tools retained
// ─────────────────────────────────────────────────────────────────────────────
describe('F: Year mismatch', () => {
  it('tools retained when user asks about different year', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'what about 2024?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('tools retained for explicit non-context year', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much did i spend on gas / fuel in 2024?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test G: Both 2024 and 2025 values authoritative → comparison allowed
// ─────────────────────────────────────────────────────────────────────────────
describe('G: Comparison with both values', () => {
  it('comparison always retains tools (context only covers one year)', () => {
    // Even if the message mentions only years we "have", comparison intent → tools
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'compare 2024 with 2025 gas spending',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test H: Only 2025 value → comparison question → tools retained
// ─────────────────────────────────────────────────────────────────────────────
describe('H: Comparison with only one year', () => {
  it('tools retained for year comparison', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'compare 2024 with 2025',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test I: Unknown category → resolver safety preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('I: Unknown category', () => {
  it('tools retained for unknown terms (no context match)', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much did i spend on purple elephants?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test J: Prime → Tag confirmation flow preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('J: Mutation intent preserves tools', () => {
  it('category change intent retains tools', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'change the gas / fuel transaction to entertainment',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('recategorize intent retains tools', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'recategorize my restaurants to business expenses',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test K: Temporal/date flow preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('K: Date/time query patterns', () => {
  it('"when did I" retains tools (detail query)', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'when did i last buy gas?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('"last time" retains tools', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'last time i went to a restaurant?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('Edge cases', () => {
  it('empty context always retains tools', () => {
    const retain = shouldRetainTools([], 'how much on fuel?', CONTEXT_YEAR);
    expect(retain).toBe(true);
  });

  it('"which" detail query retains tools even with exact match', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'which gas / fuel transactions are the biggest?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('"top merchants" retains tools', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'top merchants for gas / fuel',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('"list my" retains tools', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'list my gas / fuel transactions',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });

  it('exact section title match without subcategory — strips tools', () => {
    // User asks about the exact section title
    const retain = shouldRetainTools(
      SECTION_ONLY,
      'how much are my vehicle expenses?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });

  it('exact subcategory match — coffee in context', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much on coffee?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });

  it('"restaurants / dining" exact subcategory match', () => {
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much did i spend on restaurants / dining?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(false);
  });

  it('"restaurants" partial does NOT match "restaurants / dining" — tools retained', () => {
    // "restaurants" alone is NOT enough to match "restaurants / dining" in context.
    // The exact label "restaurants / dining" must appear in the user message.
    // This prevents over-matching: user might mean a different scope than the full label.
    const retain = shouldRetainTools(
      WITH_SUBCATEGORIES,
      'how much on restaurants?',
      CONTEXT_YEAR,
    );
    expect(retain).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeQueryScope unit tests
// ─────────────────────────────────────────────────────────────────────────────
describe('analyzeQueryScope', () => {
  it('detects merchant query', () => {
    const scope = analyzeQueryScope('how much did i spend at costco?');
    expect(scope.hasMerchantQuery).toBe(true);
  });

  it('detects comparison', () => {
    const scope = analyzeQueryScope('compare 2024 with 2025');
    expect(scope.isComparison).toBe(true);
  });

  it('extracts years', () => {
    const scope = analyzeQueryScope('how much in 2024 vs 2025?');
    expect(scope.mentionedYears).toContain(2024);
    expect(scope.mentionedYears).toContain(2025);
  });

  it('detects detail needs', () => {
    const scope = analyzeQueryScope('which gas stations did I use?');
    expect(scope.needsDetail).toBe(true);
  });

  it('detects mutation', () => {
    const scope = analyzeQueryScope('change this to entertainment');
    expect(scope.isMutation).toBe(true);
  });

  it('simple amount question has no special flags', () => {
    const scope = analyzeQueryScope('how much on fuel?');
    expect(scope.hasMerchantQuery).toBe(false);
    expect(scope.isComparison).toBe(false);
    expect(scope.needsDetail).toBe(false);
    expect(scope.isMutation).toBe(false);
    expect(scope.mentionedYears).toEqual([]);
  });
});

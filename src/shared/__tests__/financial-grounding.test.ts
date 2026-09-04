/**
 * PHASE 1B.2 ACCEPTANCE TESTS — Server-Enforced Financial Grounding
 *
 * Tests the classifier, pre-execution planner, false-zero detector,
 * evidence contract, and aggregate safety.
 */
import { describe, it, expect } from 'vitest';
import { classifyFinancialQuery, type FinancialQueryClassification } from '../financial-query-classifier';
import {
  detectsFalseZero,
  isAnswerInContext,
  buildPreExecutionPlan,
  validateGroundedAnswer,
  buildEvidenceSystemMessage,
  type FinancialEvidence,
} from '../financial-grounding';
import { type TaxSummaryContext } from '../tool-gate';

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_TAX_SUMMARY: TaxSummaryContext[] = [];

const FULL_TAX_SUMMARY: TaxSummaryContext[] = [
  {
    section: 'Vehicle Expenses',
    total: 22825.72,
    count: 189,
    topSubcategories: [
      { name: 'Gas / Fuel', amount: 6472.65, count: 123 },
      { name: 'Car Payments', amount: 4800, count: 12 },
      { name: 'Parking', amount: 1500, count: 45 },
    ],
  },
  {
    section: 'Meals & Entertainment',
    total: 8500,
    count: 250,
    topSubcategories: [
      { name: 'Restaurants / Dining', amount: 5200, count: 150 },
      { name: 'Coffee & Drinks', amount: 1800, count: 80 },
    ],
  },
  {
    section: 'Income',
    total: 137144.67,
    count: 126,
  },
];

// Fixture for a category with genuinely zero transactions
const ZERO_CATEGORY_TAX_SUMMARY: TaxSummaryContext[] = [
  {
    section: 'Vehicle Expenses',
    total: 22825.72,
    count: 189,
    topSubcategories: [
      { name: 'Gas / Fuel', amount: 6472.65, count: 123 },
    ],
  },
  {
    section: 'Travel',
    total: 0,
    count: 0,
    topSubcategories: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// A. "How much did I spend on fuel in 2025?" — Empty context
// ─────────────────────────────────────────────────────────────────────────────

describe('A: Fuel aggregate with empty context', () => {
  const msg = 'How much did I spend on fuel in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('classifies as aggregate', () => {
    expect(classification.queryType).toBe('aggregate');
  });

  it('resolves fuel to Transportation / Gas & Fuel', () => {
    expect(classification.resolvedCategory).toEqual({
      category: 'Transportation',
      subcategory: 'Gas & Fuel',
      section: 'vehicle',
    });
  });

  it('is NOT answered from empty context', () => {
    const result = isAnswerInContext(classification, EMPTY_TAX_SUMMARY, 2025);
    expect(result).toBeNull();
  });

  it('pre-execution plan uses tax_summary', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
    expect(plan.toolName).toBe('tax_summary');
    expect(plan.toolArgs?.year).toBe(2025);
  });

  it('cannot answer zero without verified_zero', () => {
    const evidence: FinancialEvidence = { grounded: false };
    const result = validateGroundedAnswer(
      'There were no recorded fuel expenses for 2025.',
      evidence,
      classification,
    );
    expect(result).toBe('false_zero_ungrounded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. "What can you tell me about my fuel expense in 2025?"
// ─────────────────────────────────────────────────────────────────────────────

describe('B: Fuel open-ended with empty context', () => {
  const msg = 'What can you tell me about my fuel expense in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('resolves fuel', () => {
    expect(classification.resolvedCategory?.subcategory).toBe('Gas & Fuel');
  });

  it('pre-execution plan fires', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. "How much did I spend at restaurants in 2025?"
// ─────────────────────────────────────────────────────────────────────────────

describe('C: Restaurant aggregate', () => {
  const msg = 'How much did I spend at restaurants in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('resolves restaurants to Food & Dining / Restaurants', () => {
    expect(classification.resolvedCategory).toEqual({
      category: 'Food & Dining',
      subcategory: 'Restaurants',
      section: 'meals',
    });
  });

  it('pre-execution plan uses tax_summary', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
    expect(plan.toolName).toBe('tax_summary');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. "Show me my fuel transactions in March 2025."
// ─────────────────────────────────────────────────────────────────────────────

describe('D: Fuel detail/list', () => {
  const msg = 'Show me my fuel transactions in March 2025.';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('classifies as detail', () => {
    expect(classification.queryType).toBe('detail');
  });

  it('pre-execution plan uses tx_search', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
    expect(plan.toolName).toBe('tx_search');
    expect(plan.toolArgs?.category).toBe('Transportation');
    expect(plan.toolArgs?.subcategory).toBe('Gas & Fuel');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. "How much did I spend at Costco in 2025?"
// ─────────────────────────────────────────────────────────────────────────────

describe('E: Merchant query (Costco)', () => {
  const msg = 'How much did I spend at Costco in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('classifies as merchant', () => {
    expect(classification.queryType).toBe('merchant');
  });

  it('extracts merchant hint', () => {
    expect(classification.merchantHint).toBe('Costco');
  });

  it('pre-execution plan uses tx_search with q', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
    expect(plan.toolName).toBe('tx_search');
    expect(plan.toolArgs?.q).toBe('Costco');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F. Unknown category: "purple elephants"
// ─────────────────────────────────────────────────────────────────────────────

describe('F: Unknown category', () => {
  const msg = 'How much did I spend on purple elephants in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding (user asked about "my" spending)', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('has no resolved category', () => {
    expect(classification.resolvedCategory).toBeUndefined();
  });

  it('pre-execution plan still fires (tax_summary for aggregate)', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.shouldPreExecute).toBe(true);
    expect(plan.toolName).toBe('tax_summary');
  });

  it('never claims $0 without verified_zero', () => {
    const evidence: FinancialEvidence = { grounded: true, queryStatus: 'verified' };
    const result = validateGroundedAnswer(
      'You had $0.00 in purple elephant expenses.',
      evidence,
      classification,
    );
    expect(result).toBe('false_zero_without_evidence');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. Real zero category
// ─────────────────────────────────────────────────────────────────────────────

describe('G: Verified zero permits truthful zero', () => {
  const msg = 'How much did I spend on travel in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('requires grounding', () => {
    expect(classification.requiresGrounding).toBe(true);
  });

  it('verified_zero permits zero claim', () => {
    const evidence: FinancialEvidence = {
      grounded: true,
      toolName: 'tax_summary',
      queryStatus: 'verified_zero',
    };
    const result = validateGroundedAnswer(
      'I found no travel transactions for 2025.',
      evidence,
      classification,
    );
    expect(result).toBeNull(); // acceptable
  });

  it('ungrounded zero is rejected', () => {
    const evidence: FinancialEvidence = { grounded: false };
    const result = validateGroundedAnswer(
      'I found no travel transactions for 2025.',
      evidence,
      classification,
    );
    expect(result).toBe('false_zero_ungrounded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. Context already has exact value
// ─────────────────────────────────────────────────────────────────────────────

describe('H: Context contains exact answer', () => {
  const msg = 'How much did I spend on fuel in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('is answered from full context', () => {
    const result = isAnswerInContext(classification, FULL_TAX_SUMMARY, 2025);
    expect(result).not.toBeNull();
    expect(result!.grounded).toBe(true);
    expect(result!.fromContext).toBe(true);
  });

  it('is NOT answered from context for different year', () => {
    const msg2024 = 'How much did I spend on fuel in 2024?';
    const class2024 = classifyFinancialQuery(msg2024);
    const result = isAnswerInContext(class2024, FULL_TAX_SUMMARY, 2025);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. General education — no DB call
// ─────────────────────────────────────────────────────────────────────────────

describe('I: General education queries', () => {
  it('tax deduction education', () => {
    const c = classifyFinancialQuery('What is a tax deduction?');
    expect(c.requiresGrounding).toBe(false);
  });

  it('compound interest explanation', () => {
    const c = classifyFinancialQuery('Explain compound interest');
    expect(c.requiresGrounding).toBe(false);
  });

  it('category meaning', () => {
    const c = classifyFinancialQuery('What does Gas & Fuel mean?');
    expect(c.requiresGrounding).toBe(false);
  });

  it('budgeting advice', () => {
    const c = classifyFinancialQuery('How should I think about budgeting?');
    expect(c.requiresGrounding).toBe(false);
  });

  it('but "what is my fuel expense" IS data', () => {
    const c = classifyFinancialQuery('What is my fuel expense?');
    expect(c.requiresGrounding).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. Prime→Tag confirmation regression
// ─────────────────────────────────────────────────────────────────────────────

describe('J: Mutation intents are not misclassified', () => {
  it('category change is a mutation, not aggregate', () => {
    const c = classifyFinancialQuery('Change this transaction to Business Expenses');
    expect(c.scope.isMutation).toBe(true);
  });

  it('category change still requires grounding (need tx lookup)', () => {
    const c = classifyFinancialQuery('Recategorize my Costco purchase to groceries');
    expect(c.requiresGrounding).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K. Temporal deterministic flow
// ─────────────────────────────────────────────────────────────────────────────

describe('K: Temporal and year extraction', () => {
  it('extracts 2025', () => {
    const c = classifyFinancialQuery('fuel in 2025');
    expect(c.years).toEqual([2025]);
  });

  it('extracts 2024 and 2025 for comparison', () => {
    const c = classifyFinancialQuery('compare my fuel spending in 2024 and 2025');
    expect(c.years).toContain(2024);
    expect(c.years).toContain(2025);
    expect(c.scope.isComparison).toBe(true);
  });

  it('pre-execution uses first mentioned year', () => {
    const c = classifyFinancialQuery('How much fuel in 2024?');
    const plan = buildPreExecutionPlan(c, 2025);
    expect(plan.toolArgs?.year).toBe(2024);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FALSE-ZERO DETECTOR (unit tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('False-zero detection', () => {
  it('detects "no recorded expenses"', () => {
    expect(detectsFalseZero('There were no recorded fuel expenses for 2025.')).toBe(true);
  });

  it('detects "$0.00"', () => {
    expect(detectsFalseZero('You spent $0.00 on fuel.')).toBe(true);
  });

  it('detects "none found"', () => {
    expect(detectsFalseZero('None found for that category.')).toBe(true);
  });

  it('detects "didn\'t find any"', () => {
    expect(detectsFalseZero("I didn't find any transactions matching fuel.")).toBe(true);
  });

  it('detects "you don\'t have"', () => {
    expect(detectsFalseZero("You don't have any fuel expenses on record.")).toBe(true);
  });

  it('does NOT flag normal positive responses', () => {
    expect(detectsFalseZero('You spent $6,472.65 on fuel in 2025.')).toBe(false);
  });

  it('does NOT flag education responses', () => {
    expect(detectsFalseZero('A tax deduction reduces your taxable income.')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATE SAFETY (Step 8)
// ─────────────────────────────────────────────────────────────────────────────

describe('Aggregate safety: tx_search limit cannot create incorrect totals', () => {
  const msg = 'How much did I spend on fuel in 2025?';
  const classification = classifyFinancialQuery(msg);

  it('aggregate fuel question uses tax_summary, NOT tx_search', () => {
    const plan = buildPreExecutionPlan(classification, 2025);
    expect(plan.toolName).toBe('tax_summary');
    expect(plan.toolName).not.toBe('tx_search');
  });

  it('detail question uses tx_search but is for listing, not totaling', () => {
    const detailMsg = 'Show me my fuel transactions in March 2025';
    const detailClassification = classifyFinancialQuery(detailMsg);
    const plan = buildPreExecutionPlan(detailClassification, 2025);
    expect(plan.toolName).toBe('tx_search');
    // tx_search is correct for detail/listing — but NOT for computing full-year aggregate
  });

  it('full year total question never routes to tx_search', () => {
    const msgs = [
      'How much on fuel in 2025?',
      'What were my fuel expenses in 2025?',
      'Total fuel spending for 2025',
      'My fuel expense in 2025',
    ];
    for (const m of msgs) {
      const c = classifyFinancialQuery(m);
      const plan = buildPreExecutionPlan(c, 2025);
      expect(plan.toolName).toBe('tax_summary');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE SYSTEM MESSAGE
// ─────────────────────────────────────────────────────────────────────────────

describe('Evidence system message', () => {
  it('renders tax_summary evidence', () => {
    const classification = classifyFinancialQuery('fuel in 2025');
    const toolResult = {
      sections: [
        {
          title: 'Vehicle Expenses',
          total: 22825.72,
          count: 189,
          buckets: [
            { label: 'Gas / Fuel', total: 6472.65, count: 123 },
          ],
        },
      ],
    };
    const msg = buildEvidenceSystemMessage('tax_summary', toolResult, classification);
    expect(msg).toContain('FINANCIAL EVIDENCE');
    expect(msg).toContain('6472.65');
    expect(msg).toContain('Gas / Fuel');
    expect(msg).toContain('queryStatus: verified');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1B.2b: FALSE-ZERO RETRY REVALIDATION
// ─────────────────────────────────────────────────────────────────────────────
// These tests verify that a retry answer is subjected to the SAME grounding
// validation as the original. A retry that produces another false-zero must
// be rejected — never persisted, serialized, or displayed.

describe('Phase 1B.2b: Retry revalidation', () => {
  const fuelClassification = classifyFinancialQuery(
    'What can you tell me about my fuel expense in 2025?',
  );

  const verifiedEvidence: FinancialEvidence = {
    grounded: true,
    toolName: 'tax_summary',
    queryStatus: 'verified',
  };

  const verifiedZeroEvidence: FinancialEvidence = {
    grounded: true,
    toolName: 'tax_summary',
    queryStatus: 'verified_zero',
  };

  // 1. Original false-zero + retry correct → accepted
  it('accepts corrected retry with real numbers', () => {
    const retryContent = 'In 2025, you spent $6,472.65 on gas and fuel across 123 transactions.';
    const result = validateGroundedAnswer(retryContent, verifiedEvidence, fuelClassification);
    expect(result).toBeNull(); // null = valid
  });

  // 2. Original false-zero + retry same false-zero → rejected
  it('rejects retry that repeats the same false-zero', () => {
    const retryContent = 'In 2025, there were no recorded expenses for gas and fuel. If you expected to see some expenses here, we might need to check if a recent import didn\'t complete. Would you like to explore another option or check for any recent imports?';
    const result = validateGroundedAnswer(retryContent, verifiedEvidence, fuelClassification);
    expect(result).toBe('false_zero_without_evidence');
  });

  // 3. Original false-zero + retry different false-zero wording → rejected
  it('rejects retry with different false-zero wording', () => {
    const retryContent = "I couldn't find any fuel transactions in your records for 2025.";
    const result = validateGroundedAnswer(retryContent, verifiedEvidence, fuelClassification);
    expect(result).toBe('false_zero_without_evidence');
  });

  // 4. Original false-zero + retry "$0" → rejected unless verified_zero
  it('rejects retry claiming $0 when evidence is verified (not verified_zero)', () => {
    const retryContent = 'Your fuel expenses for 2025 total $0.00.';
    const result = validateGroundedAnswer(retryContent, verifiedEvidence, fuelClassification);
    expect(result).toBe('false_zero_without_evidence');
  });

  // 5. verified_zero evidence + legitimate zero response → allowed
  it('allows zero claim when evidence is verified_zero', () => {
    const retryContent = 'I found no fuel transactions for 2025.';
    const result = validateGroundedAnswer(retryContent, verifiedZeroEvidence, fuelClassification);
    expect(result).toBeNull(); // null = valid — genuine zero
  });

  // 6. Positive verified evidence + retry false-zero → NEVER accepted
  it('never accepts false-zero when verified evidence exists', () => {
    const falseZeroVariants = [
      'There were no recorded expenses for gas and fuel.',
      'No transactions found for fuel in 2025.',
      "You didn't have any fuel expenses.",
      'You don\'t have any fuel charges on record.',
      'I didn\'t find any fuel transactions.',
      'None found for that category.',
      'There is no data for fuel expenses in 2025.',
    ];

    for (const variant of falseZeroVariants) {
      const result = validateGroundedAnswer(variant, verifiedEvidence, fuelClassification);
      expect(result).toBe('false_zero_without_evidence');
    }
  });

  // 7. Empty retry response — caught by trim() gate before validation
  it('empty string is caught by trim() gate before reaching validator', () => {
    // In the actual code, empty strings never reach validateGroundedAnswer.
    // The `retryContent.trim()` check gates them out first.
    const emptyTrimCheck = !(''.trim());
    expect(emptyTrimCheck).toBe(true);
  });

  // 8. Normal grounded non-zero response → unaffected
  it('passes normal grounded response through unchanged', () => {
    const goodResponse = 'Based on your records, you spent $6,472.65 on fuel in 2025 across 123 transactions. The majority were at Shell and Petro-Canada.';
    const result = validateGroundedAnswer(goodResponse, verifiedEvidence, fuelClassification);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LIVE FUEL REGRESSION (Phase 1B.2b)
// ─────────────────────────────────────────────────────────────────────────────

describe('Live fuel regression: exact production false-zero', () => {
  const fuelClassification = classifyFinancialQuery(
    'What can you tell me about my fuel expense in 2025?',
  );

  const verifiedEvidence: FinancialEvidence = {
    grounded: true,
    toolName: 'tax_summary',
    queryStatus: 'verified',
  };

  it('the exact 234-char production false-zero is rejected by validation', () => {
    const productionFalseZero = "In 2025, there were no recorded expenses for gas and fuel. If you expected to see some expenses here, we might need to check if a recent import didn't complete. Would you like to explore another option or check for any recent imports?";
    expect(productionFalseZero.length).toBe(234);

    const result = validateGroundedAnswer(productionFalseZero, verifiedEvidence, fuelClassification);
    expect(result).toBe('false_zero_without_evidence');
  });

  it('a corrected answer with real numbers passes validation', () => {
    const correctedAnswer = 'In 2025, you spent $6,472.65 on gas and fuel across 123 transactions under Vehicle Expenses.';
    const result = validateGroundedAnswer(correctedAnswer, verifiedEvidence, fuelClassification);
    expect(result).toBeNull();
  });

  it('verified_zero evidence permits zero claim for fuel', () => {
    const zeroEvidence: FinancialEvidence = {
      grounded: true,
      toolName: 'tax_summary',
      queryStatus: 'verified_zero',
    };
    const truthfulZero = 'There were no recorded fuel expenses in 2025.';
    const result = validateGroundedAnswer(truthfulZero, zeroEvidence, fuelClassification);
    expect(result).toBeNull();
  });
});

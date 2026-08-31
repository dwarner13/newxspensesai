import { describe, it, expect } from 'vitest';
import { GLOBAL_BRAIN_RULES } from '../../lib/ai/systemPrompts';
import { buildEmployeeBrainSystemPrompt } from '../../lib/ai/brains/registry';

/**
 * Financial Boundary Runtime Integration Tests
 *
 * Validates that RULE 8 (Financial Boundary) is present in the global prompt
 * and that all employees inherit it at inference time.
 */

// ─── Employee Coverage ───────────────────────────────────────────────
// Production slugs from employee_profiles (e.g. "tag-ai", "crystal-ai").
// At runtime, chat.ts resolves these to employee_key via
// getEmployeeKeyFromSlug() → DB lookup or fallback slug.split('-')[0].
// buildEmployeeBrainSystemPrompt() receives the resolved employee_key.
// Both the production slug (pre-resolution) and the resolved key are tested.

/** Exact production slugs from employee_profiles / runtime routing */
const PRODUCTION_SLUGS = [
  'prime-boss',
  'tag-ai',
  'crystal-ai',
  'goalie-ai',
  'byte-docs',
  'finley-ai',
  'liberty-ai',
  'ledger-tax',
  'blitz-debt',
  'chime-ai',
] as const;

/** Resolved employee_keys that reach buildEmployeeBrainSystemPrompt() */
const RESOLVED_EMPLOYEE_KEYS = [
  'prime-boss', // registry direct match
  'prime',      // registry direct match
  'byte-docs',  // registry direct match
  'byte',       // registry direct match
  'crystal',    // registry direct match (resolved from crystal-ai)
  'crystal-analytics', // registry direct match
  'goalie',     // registry direct match (resolved from goalie-ai)
  'goalie-goals', // registry direct match
  'goalie-ai',  // registry direct match
  'tag',        // fallback brain (resolved from tag-ai)
  'finley',     // fallback brain (resolved from finley-ai)
  'liberty',    // fallback brain (resolved from liberty-ai)
  'ledger',     // fallback brain (resolved from ledger-tax)
  'blitz',      // fallback brain (resolved from blitz-debt)
  'chime',      // fallback brain (resolved from chime-ai)
];

describe('Financial Boundary — Global Injection', () => {
  it('GLOBAL_BRAIN_RULES contains RULE 8 - FINANCIAL BOUNDARY', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('RULE 8 - FINANCIAL BOUNDARY');
  });

  it('contains the ALLOWED section with key permitted behaviors', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('ALLOWED:');
    expect(GLOBAL_BRAIN_RULES).toContain('Calculate totals, averages, trends, deltas, and comparisons across periods');
    expect(GLOBAL_BRAIN_RULES).toContain('Model scenarios and calculate payoff timelines');
    expect(GLOBAL_BRAIN_RULES).toContain('Produce estimates and projections with stated assumptions');
  });

  it('contains the NOT ALLOWED section with key prohibited behaviors', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('NOT ALLOWED:');
    expect(GLOBAL_BRAIN_RULES).toContain('Claim to be a licensed Financial Advisor');
    expect(GLOBAL_BRAIN_RULES).toContain('Provide personalized securities or investment recommendations');
    expect(GLOBAL_BRAIN_RULES).toContain('Guarantee returns, savings, or payoff dates');
  });

  it('contains PROJECTION LANGUAGE guidance', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('PROJECTION LANGUAGE:');
    expect(GLOBAL_BRAIN_RULES).toContain('state the assumptions used and frame results as estimates');
  });

  it('contains TAX BOUNDARY guidance', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('TAX BOUNDARY:');
    expect(GLOBAL_BRAIN_RULES).toContain('must not advise on tax filing');
  });

  it('contains BOUNDARY RESPONSE protocol', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('BOUNDARY RESPONSE:');
    expect(GLOBAL_BRAIN_RULES).toContain('Do not refuse questions, lecture the user, or become timid');
  });
});

describe('Financial Boundary — Resolved Employee Key Coverage', () => {
  it.each(RESOLVED_EMPLOYEE_KEYS)(
    'resolved key "%s" system prompt includes RULE 8',
    (key) => {
      const prompt = buildEmployeeBrainSystemPrompt({
        employee_key: key,
        ai_fluency_level: 'Explorer',
        preferredName: 'TestUser',
        currency: 'USD',
      });
      expect(prompt).toContain('RULE 8 - FINANCIAL BOUNDARY');
      expect(prompt).toContain('NOT ALLOWED:');
      expect(prompt).toContain('PROJECTION LANGUAGE:');
    },
  );

  it('fallback brain (null key) still includes RULE 8', () => {
    const prompt = buildEmployeeBrainSystemPrompt({
      employee_key: null,
    });
    expect(prompt).toContain('RULE 8 - FINANCIAL BOUNDARY');
  });
});

describe('Financial Boundary — Production Slug Resolution', () => {
  // Production slugs like "tag-ai" resolve to "tag" via slug.split('-')[0].
  // This test verifies that the resolved keys still receive RULE 8.
  it.each(PRODUCTION_SLUGS)(
    'production slug "%s" resolves to a key that receives RULE 8',
    (slug) => {
      // Simulate the fallback resolution: slug.split('-')[0]
      // (DB resolution returns employee_key which is the same or simpler)
      const resolvedKey = slug === 'prime-boss' || slug === 'byte-docs'
        ? slug // These are direct registry entries
        : slug.split('-')[0]; // All others resolve via split
      const prompt = buildEmployeeBrainSystemPrompt({
        employee_key: resolvedKey,
        ai_fluency_level: 'Explorer',
        preferredName: 'TestUser',
        currency: 'USD',
      });
      expect(prompt).toContain('RULE 8 - FINANCIAL BOUNDARY');
      expect(prompt).toContain('NOT ALLOWED:');
    },
  );
});

// ─── Scenario Tests A–I ─────────────────────────────────────────────
// These verify the prompt INSTRUCTS the correct behavior for each scenario.
// They are deterministic prompt-content tests, not LLM-output tests.

describe('Financial Boundary — Scenario Coverage (A–I)', () => {
  const primePrompt = buildEmployeeBrainSystemPrompt({
    employee_key: 'prime-boss',
    preferredName: 'TestUser',
    currency: 'CAD',
  });

  // A. "How much did I spend on restaurants last month?" → allowed analysis
  it('A: spending query is covered by ALLOWED rules (retrieve, summarize, calculate)', () => {
    expect(primePrompt).toContain('Organize, retrieve, and summarize historical financial data');
    expect(primePrompt).toContain('Calculate totals, averages, trends, deltas, and comparisons across periods');
  });

  // B. "Compare this month to last month." → allowed analysis
  it('B: period comparison is covered by ALLOWED rules (comparisons across periods)', () => {
    expect(primePrompt).toContain('comparisons across periods');
  });

  // C. "If I pay an extra $300 monthly, when is the estimated payoff?" → allowed projection with assumptions
  it('C: payoff projection is covered by ALLOWED rules (model scenarios, projections)', () => {
    expect(primePrompt).toContain('Model scenarios and calculate payoff timelines, cash-flow differences, and projections');
    expect(primePrompt).toContain('Produce estimates and projections with stated assumptions');
  });

  // D. "Show me three mathematical payoff scenarios." → allowed
  it('D: multiple scenarios are covered by ALLOWED rules (model scenarios)', () => {
    expect(primePrompt).toContain('Model scenarios');
    expect(primePrompt).toContain('Present factual options for the user to evaluate');
  });

  // E. "Which scenario results in the lowest total interest?" → allowed deterministic comparison
  it('E: deterministic comparison is covered by ALLOWED rules (explain mathematical results)', () => {
    expect(primePrompt).toContain('Explain mathematical results');
  });

  // F. "Guarantee that I'll be debt free in two years." → no guarantee
  it('F: guarantee request is blocked by NOT ALLOWED rules', () => {
    expect(primePrompt).toContain('Guarantee returns, savings, or payoff dates');
    expect(primePrompt).toContain('Promise future financial outcomes or present projections as certain facts');
  });

  // G. "Tell me which stock I should buy." → must not provide security recommendation
  it('G: stock recommendation is blocked by NOT ALLOWED rules', () => {
    expect(primePrompt).toContain('Provide personalized securities or investment recommendations');
    expect(primePrompt).toContain('do not tell users to buy, sell, or hold a specific security');
  });

  // H. "Tell me exactly what to claim on my tax return." → tax boundary
  it('H: tax filing advice is blocked by TAX BOUNDARY', () => {
    expect(primePrompt).toContain('TAX BOUNDARY:');
    expect(primePrompt).toContain('must not advise on tax filing');
    expect(primePrompt).toContain('state whether a specific expense is deductible');
    expect(primePrompt).toContain('tax professional can provide filing guidance');
  });

  // I. "Change this transaction to Shopping." → boundary does NOT interfere with normal operations
  it('I: category change is covered by ALLOWED rules (categorize transactions)', () => {
    expect(primePrompt).toContain('Categorize transactions');
    // Boundary should NOT block normal tool operations
    expect(primePrompt).not.toContain('Do not categorize');
  });
});

// ─── Forecast Tool Schema Tests ─────────────────────────────────────

describe('Financial Boundary — Forecast Tool Assumptions', () => {
  it('debt payoff forecast output schema includes assumptions field', async () => {
    const { outputSchema } = await import('../../agent/tools/impl/finley_debt_payoff_forecast');
    const shape = outputSchema.shape;
    expect(shape.assumptions).toBeDefined();
    // Validate it accepts string arrays
    const parsed = outputSchema.parse({
      monthsToPayoff: 12,
      totalInterestPaid: 200,
      totalPaid: 2200,
      projectionTimeline: [{ monthIndex: 1, remainingBalance: 1900 }],
      isPayoffPossible: true,
      assumptions: ['Rate constant at 20%', 'Estimate only'],
    });
    expect(parsed.assumptions).toHaveLength(2);
  });

  it('savings forecast output schema includes assumptions field', async () => {
    const { outputSchema } = await import('../../agent/tools/impl/finley_savings_forecast');
    const shape = outputSchema.shape;
    expect(shape.assumptions).toBeDefined();
  });

  it('analytics forecast output schema includes assumptions field', async () => {
    const { outputSchema } = await import('../../agent/tools/impl/analytics_forecast');
    const shape = outputSchema.shape;
    expect(shape.assumptions).toBeDefined();
  });

  it('debt payoff forecast returns assumptions in output', async () => {
    const { execute } = await import('../../agent/tools/impl/finley_debt_payoff_forecast');
    const result = await execute(
      { balance: 2000, monthlyPayment: 200, annualInterestRate: 0.2 },
      { userId: 'test-user' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assumptions).toBeDefined();
      expect(result.value.assumptions.length).toBeGreaterThan(0);
      expect(result.value.assumptions.some((a: string) => a.toLowerCase().includes('estimate'))).toBe(true);
    }
  });

  it('debt payoff forecast uses safe language for max-months case', async () => {
    const { execute } = await import('../../agent/tools/impl/finley_debt_payoff_forecast');
    // Use a very small payment that barely exceeds interest, so it takes > 120 months
    const result = await execute(
      { balance: 50000, monthlyPayment: 850, annualInterestRate: 0.2 },
      { userId: 'test-user' },
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.value.errorMessage) {
      expect(result.value.errorMessage).toContain('estimated payoff period exceeds');
      expect(result.value.errorMessage).not.toContain('Consider');
    }
  });

  it('debt payoff metadata uses safe language', async () => {
    const { metadata } = await import('../../agent/tools/impl/finley_debt_payoff_forecast');
    expect(metadata.description).toContain('Estimate');
    expect(metadata.description).toContain('estimates');
    expect(metadata.description).not.toMatch(/\bcalculate how long it will take\b/i);
  });
});

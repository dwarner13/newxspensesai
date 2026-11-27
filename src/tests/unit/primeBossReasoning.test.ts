import { describe, it, expect } from 'vitest';
import { buildEmployeeBrainSystemPrompt } from '../../lib/ai/brains/registry';
import { GLOBAL_BRAIN_RULES } from '../../lib/ai/systemPrompts';
import { buildPrimePersonalityMessage } from '../../../netlify/functions/_shared/primePersonality';

/**
 * Prime Boss Reasoning V1 — Acceptance Tests
 *
 * Validates the Prime brain contract, delegation rules, temporal context format,
 * and that financial boundary RULE 8 is preserved.
 */

const primePrompt = buildEmployeeBrainSystemPrompt({
  employee_key: 'prime-boss',
  preferredName: 'Darrell',
  currency: 'CAD',
  ai_fluency_level: 'Operator',
});

// ─── Prime Boss Contract ─────────────────────────────────────────────

describe('Prime Boss Contract', () => {
  it('identifies Prime as the boss / strongest general reasoning employee', () => {
    expect(primePrompt).toContain('PRIME BOSS CONTRACT');
    expect(primePrompt).toContain('strongest general financial reasoning employee');
  });

  it('defines PRIME OWNS section with broad reasoning scope', () => {
    expect(primePrompt).toContain('PRIME OWNS:');
    expect(primePrompt).toContain('Broad financial reasoning and cross-domain synthesis');
    expect(primePrompt).toContain('Financial-data investigation using tools');
    expect(primePrompt).toContain('Historical comparisons and cash-flow reasoning');
    expect(primePrompt).toContain('Spending analysis');
    expect(primePrompt).toContain('Mathematical comparisons and deterministic calculations');
    expect(primePrompt).toContain('Temporal interpretation');
  });

  it('defines SPECIALISTS OWN section with write/mutation scope', () => {
    expect(primePrompt).toContain('SPECIALISTS OWN');
    expect(primePrompt).toContain('Tag: transaction category MUTATIONS');
    expect(primePrompt).toContain('Byte: document parsing, OCR');
    expect(primePrompt).toContain('Goalie: goal creation and modification');
  });

  it('category mutation remains Tag-owned', () => {
    expect(primePrompt).toContain('Category mutation remains Tag-owned');
    expect(primePrompt).toContain('must NOT mutate transaction categories directly');
  });
});

// ─── Removed Receptionist Behavior ───────────────────────────────────

describe('Removed Receptionist Behavior', () => {
  it('does NOT have automatic delegation rules for spending/trends/comparisons', () => {
    // Old brain: "route these immediately, don't answer yourself"
    expect(primePrompt).not.toContain('route these immediately');
    expect(primePrompt).not.toContain("don't answer yourself");
    // Old brain: specific questions → Crystal
    expect(primePrompt).not.toContain('"What\'s my spending trend?" / "How did last month compare?" → Crystal');
  });

  it('does NOT have restrictive max-sentence or forced-question rules', () => {
    expect(primePrompt).not.toContain('Max 3 sentences');
    expect(primePrompt).not.toContain('ALWAYS end every response with exactly ONE');
    expect(primePrompt).not.toContain('never zero, never two');
  });

  it('instructs Prime to NOT auto-delegate for spending/comparison questions', () => {
    expect(primePrompt).toContain('Do NOT automatically delegate merely because a question concerns');
    expect(primePrompt).toContain('spending, comparisons, trends, anomalies');
  });
});

// ─── Reasoning Approach ──────────────────────────────────────────────

describe('Prime Reasoning Approach', () => {
  it('defines multi-step reasoning approach', () => {
    expect(primePrompt).toContain('REASONING APPROACH:');
    expect(primePrompt).toContain('Ground the question in time');
    expect(primePrompt).toContain('Inspect available financial context');
    expect(primePrompt).toContain('Determine what information is missing');
    expect(primePrompt).toContain('Search / read / calculate');
    expect(primePrompt).toContain('Synthesize findings');
  });

  it('defines tool result synthesis instructions', () => {
    expect(primePrompt).toContain('TOOL RESULT SYNTHESIS:');
    expect(primePrompt).toContain('do not dump raw JSON');
  });
});

// ─── Financial Boundary Preservation ─────────────────────────────────

describe('Financial Boundary Preservation (RULE 8)', () => {
  it('GLOBAL_BRAIN_RULES still contains RULE 8', () => {
    expect(GLOBAL_BRAIN_RULES).toContain('RULE 8 - FINANCIAL BOUNDARY');
  });

  // Prime receives PRIME_SAFETY_RULES (registry.ts), where the same financial boundary is RULE 2;
  // financialBoundary.test.ts "Prime boundary parity" asserts every global RULE 8 line is present.
  it('Prime prompt includes the financial boundary via PRIME_SAFETY_RULES', () => {
    expect(primePrompt).toContain('RULE 2 - FINANCIAL BOUNDARY');
    expect(primePrompt).toContain('NOT ALLOWED:');
    expect(primePrompt).toContain('Guarantee returns, savings, or payoff dates');
    expect(primePrompt).toContain('PROJECTION LANGUAGE:');
  });

  // Scenario K: "Guarantee I'll be debt free in two years."
  it('K: guarantee request is blocked', () => {
    expect(primePrompt).toContain('Guarantee returns, savings, or payoff dates');
  });

  // Scenario L: "Tell me exactly which stock I should buy."
  it('L: stock recommendation is blocked', () => {
    expect(primePrompt).toContain('Provide personalized securities or investment recommendations');
  });

  // Scenario M: "Tell me exactly what I should claim on my tax return."
  it('M: tax filing advice is blocked', () => {
    expect(primePrompt).toContain('TAX BOUNDARY:');
    expect(primePrompt).toContain('must not advise on tax filing');
    expect(primePrompt).toContain('state whether a specific expense is deductible');
    expect(primePrompt).toContain('Possible business expense — requires review by your accountant.');
  });
});

// ─── Team Awareness (PRIME_WATCHER_INTELLIGENCE_MODE) ────────────────

describe('Prime Team Awareness', () => {
  it('includes team awareness instructions', () => {
    expect(primePrompt).toContain('PRIME TEAM AWARENESS');
  });

  it('includes deterministic calculation principle', () => {
    expect(primePrompt).toContain('DETERMINISTIC CALCULATION PRINCIPLE');
    expect(primePrompt).toContain('LLMs explain');
    expect(primePrompt).toContain('Deterministic code calculates');
  });

  it('does NOT include old restrictive watcher rules', () => {
    expect(primePrompt).not.toContain('Your primary role is NOT to do every task');
    expect(primePrompt).not.toContain('DELEGATION INTELLIGENCE');
    expect(primePrompt).not.toContain('Never appear uncertain');
  });
});

// ─── Personality Preserved ───────────────────────────────────────────

describe('Prime Personality Preserved', () => {
  // The owner-approved personality (P-1, 2026-11-23) moved out of the brain pack in 00493b32 into the
  // ONE personality contract (netlify/functions/_shared/primePersonality.ts, sent by chat.ts as the last
  // system block). Each old trait ("Intelligent, confident, conversational / Calm and capable / Direct
  // with numbers") is asserted against the approved wording that carries it.
  it('maintains personality traits (approved P-1 personality contract)', () => {
    const personality = buildPrimePersonalityMessage({ preferredName: 'TestUser' });
    expect(personality).toContain('PRIME PERSONALITY:');
    expect(personality).toContain('Warm, expressive, knowledgeable and engaged');   // intelligent, conversational
    expect(personality).toContain('Confident when the evidence supports it');        // confident
    expect(personality).toContain('be calm and steady when the user is worried');    // calm and capable
    expect(personality).toContain('Factual lookup: lead with the number');           // direct with numbers
    expect(personality).toContain('Use only figures from verified evidence');
    // The brain pack must not carry a second, competing personality block.
    expect(primePrompt).not.toContain('PERSONALITY:\n- Intelligent');
  });

  it('does NOT contain Fortune-500 or artificial claims', () => {
    expect(primePrompt).not.toContain('Fortune');
    expect(primePrompt).not.toContain('30+ employees');
  });
});

/**
 * PB-03 — intent-aware transaction cards (owner live test, 2026-11-23).
 *
 * "How many transactions do I have, what date range do they cover, and which accounts are they
 * from?" was answered correctly but also rendered 25 unrelated transaction cards: the question was
 * not an explicit list, "many" was mistaken for a merchant, and a DATED model search still
 * established the candidate frame (C2-F only demoted UNDATED searches).
 *
 * Fixed (server-side; the card component and PrimeChatV2 are unchanged):
 *  - summary (aggregate) and inventory/coverage questions never establish cards, dated or not;
 *  - quantity words are never merchant hints;
 *  - inventory questions get server-verified coverage (count + date range) instead of sample rows;
 *  - explicit list requests and existing-frame follow-ups keep their cards.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyFinancialQuery, isInventoryQuestion } from '../../../src/shared/financial-query-classifier';
import { resolveModelSearchOwnership } from '../../../src/shared/tx-candidate-ownership';

const OWNER_Q = 'How many transactions do I have, what date range do they cover, and which accounts are they from?';
const DATED = { q: '', startDate: '2026-01-01', endDate: '2026-06-30', limit: 25 };
const UNDATED = { q: '', limit: 25 };

function own(over: Partial<Parameters<typeof resolveModelSearchOwnership>[0]> = {}) {
  return resolveModelSearchOwnership({
    purpose: 'candidate_establishment',
    hasExistingCandidates: false,
    aggregateEvidenceSatisfied: false,
    args: DATED,
    ...over,
  });
}

describe('PB-03 inventory detection', () => {
  it.each([
    OWNER_Q,
    'what period does my data cover',
    'how far back does my history go',
    'which accounts do you have for me',
    'What date range do my transactions span?',
    'what accounts are my statements from?',
    'How many transactions do I have?',
  ])('inventory: %s', (q) => { expect(isInventoryQuestion(q)).toBe(true); });

  it.each([
    'Show me my Costco transactions in May',
    'Costco transactions in May',
    'what did I buy at Costco in May',
    'how many transactions at Costco in May',
    'which account did I pay Netflix from',
    'list my transactions from May 15',
    'how much did I spend in May',
  ])('not inventory: %s', (q) => { expect(isInventoryQuestion(q)).toBe(false); });

  it('"how many" is never a merchant hint', () => {
    const fc = classifyFinancialQuery(OWNER_Q);
    expect(fc.merchantHint).toBeUndefined();
    expect(fc.queryType).not.toBe('merchant');
    expect(classifyFinancialQuery('how much did I spend in May').merchantHint).toBeUndefined();
  });

  it('real merchant and list phrasings are unchanged', () => {
    expect(classifyFinancialQuery('Show me my Costco transactions in May')).toMatchObject({ requestShape: 'list', merchantHint: 'Costco' });
    expect(classifyFinancialQuery('list my transactions from May 15').requestShape).toBe('list');
  });
});

describe('PB-03 card ownership rule', () => {
  it('summary/inventory request: a DATED model search is evidence only (the owner case)', () => {
    expect(own({ explicitListRequest: false, summaryOrInventoryRequest: true })).toBe('analytical_evidence');
  });
  it('summary/inventory request: an UNDATED model search is evidence only', () => {
    expect(own({ explicitListRequest: false, summaryOrInventoryRequest: true, args: UNDATED })).toBe('analytical_evidence');
  });
  it('explicit list request keeps its cards', () => {
    expect(own({ explicitListRequest: true, summaryOrInventoryRequest: false })).toBe('candidate_establishment');
  });
  it('an unclassified dated request (e.g. "Costco transactions in May") keeps its cards', () => {
    expect(own({ explicitListRequest: false, summaryOrInventoryRequest: false })).toBe('candidate_establishment');
  });
  it('existing-frame follow-ups are unaffected (the existing frame is preserved)', () => {
    expect(own({ hasExistingCandidates: true, explicitListRequest: false, summaryOrInventoryRequest: false }))
      .toBe(own({ hasExistingCandidates: true, explicitListRequest: false }));
  });
  it('flag absent → previous behaviour (C2-F undated demotion still applies)', () => {
    expect(own({ explicitListRequest: false })).toBe('candidate_establishment');
    expect(own({ explicitListRequest: false, args: UNDATED })).toBe('analytical_evidence');
  });
});

describe('PB-03 chat.ts wiring', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  it('computes the summary/inventory flag (never for explicit lists)', () => {
    expect(src).toMatch(/const primeInventoryQuestion: boolean = isPrime && isInventoryQuestion\(String\(masked \|\| ''\)\);/);
    expect(src).toMatch(/primeSummaryOrInventory: boolean = isPrime && primeExplicitListShape !== true/);
  });
  it('passes it to every model-search ownership decision (4 sites)', () => {
    expect(src.match(/summaryOrInventoryRequest: primeSummaryOrInventory/g)?.length).toBe(4);
    expect(src.match(/resolveModelSearchOwnership\(\{/g)?.length).toBe(4);
  });
  it('legacy grounding pre-run never establishes cards for summary/inventory requests', () => {
    expect(src).toMatch(/groundingOwnership: CandidateOwnershipIntent = hasExistingCandidates \|\| primeSummaryOrInventory \? 'analytical_evidence'/);
  });
  it('inventory questions receive the server-verified coverage note', () => {
    expect(src).toMatch(/if \(isPrime && \(p31cResult \|\| primeInventoryQuestion\)\)/);
    expect(src).toMatch(/if \(emptyPeriod \|\| primeInventoryQuestion\)/);
  });
});

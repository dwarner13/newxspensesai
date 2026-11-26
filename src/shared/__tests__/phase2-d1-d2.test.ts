/**
 * Phase 2 D1 + D2 (owner GO 2026-11-25), acceptance from AI Architecture HQ plan §4.
 *  D1: "last 3 months" is a period, not "show 3 rows"; "last 3 transactions" still counts.
 *  D2: ordinary words after "at/from" are never a merchant hint; real merchants unchanged.
 */
import { describe, it, expect } from 'vitest';
import { classifyFinancialQuery, extractMerchantHint, extractMerchantHintWithSource } from '../financial-query-classifier';

describe('D1: period units are not row counts', () => {
  it.each([
    'How much did I spend in the last 3 months?',
    'Show me spending for the past 2 weeks',
    'What did I spend the last 6 mos',
    'Top 2 quarters for spending',
    'my last 2 years of income',
    'last 12 months total',
  ])('%s → no requestedCount', (m) => {
    expect(classifyFinancialQuery(m).requestedCount).toBeUndefined();
  });
  it.each([
    ['Show my last 3 transactions', 3],
    ['show me 5 transactions at Costco', 5],
    ['top 10 merchants', 10],
    ['latest 4 charges', 4],
  ])('%s → requestedCount %s (unchanged)', (m, n) => {
    expect(classifyFinancialQuery(m).requestedCount).toBe(n);
  });
  it('a dollar amount is still not a count', () => {
    expect(classifyFinancialQuery('show me $3 transactions').requestedCount).toBeUndefined();
  });
});

describe('D2: stopwords after at/from are never merchant hints', () => {
  it.each([
    'What is my spending from the beginning?',
    'How much did I spend from last month?',
    'Show transactions at least $50',
    'spending from all my accounts',
    'income from the past year',
    'charges from my card',
  ])('%s → no merchant hint', (m) => {
    expect(extractMerchantHint(m)).toBeUndefined();
  });
  it.each([
    ['How much did I spend at costco?', 'costco'],
    ['How much at Costco last month', 'Costco'],
    ['payments from Peace Hills', 'Peace Hills'],
    ['what did I buy at Walmart in June', 'Walmart'],
  ])('%s → %s (real merchants unchanged)', (m, want) => {
    expect(extractMerchantHint(m)).toBe(want);
  });
  it('a stopword capture falls through to the secondary patterns ("from the Costco charge")', () => {
    const r = extractMerchantHintWithSource('what was from the Costco charge');
    expect(r?.hint?.toLowerCase()).toContain('costco');
    expect(r?.source).not.toBe('preposition');
  });
});

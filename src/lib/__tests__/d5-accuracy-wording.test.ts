/**
 * D-5 — owner-approved accuracy wording (2026-11-23): no unsupported confidence
 * percentages, approximate merchant history, and no definitive tax claims.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  describeCategorySource, describeMerchantHistory, isPotentiallyTaxRelevant, TAX_NOTE, MERCHANT_HISTORY_CAP,
} from '../tagExplanation';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const drawer = read('src/components/transactions/TransactionInsightDrawer.tsx');
const tag = read('src/components/transactions/TagCopilotPanel.tsx');

describe('describeMerchantHistory', () => {
  it('is approximate and caps at 100+', () => {
    expect(describeMerchantHistory(0)).toBeNull();
    expect(describeMerchantHistory(1)).toBe('About 1 similar transaction');
    expect(describeMerchantHistory(37)).toBe('About 37 similar transactions');
    expect(describeMerchantHistory(MERCHANT_HISTORY_CAP)).toBe('100+ similar transactions');
    expect(describeMerchantHistory(250)).toBe('100+ similar transactions');
  });
});

describe('describeCategorySource', () => {
  it('explains known sources in plain words and hides unknown or raw codes', () => {
    expect(describeCategorySource('manual')).toBe('You set this category');
    expect(describeCategorySource('rule')).toBe('Matches a categorization rule');
    expect(describeCategorySource('learned')).toMatch(/categorized before/);
    expect(describeCategorySource('ai')).toBe('Suggested by Tag');
    expect(describeCategorySource('unknown')).toBeNull();
    expect(describeCategorySource('user_type_fix')).toBeNull();
    expect(describeCategorySource(null)).toBeNull();
  });
});

describe('tax note', () => {
  it('uses the exact owner-approved wording and no definitive claims', () => {
    expect(TAX_NOTE).toBe('Potentially tax-relevant — confirm with a tax professional.');
    expect(isPotentiallyTaxRelevant('Food & Dining')).toBe(true);
    expect(isPotentiallyTaxRelevant('Transfers')).toBe(false);
    expect(isPotentiallyTaxRelevant('Savings')).toBe(false);
    expect(isPotentiallyTaxRelevant(null)).toBe(false);
  });
});

describe('drawer', () => {
  it('shows no confidence percentage and no hardcoded deductibility claims', () => {
    expect(drawer).not.toMatch(/% confidence/);
    expect(drawer).not.toMatch(/Math\.round\(tagInsight\.confidence \* 100\)/);
    expect(drawer).not.toMatch(/TAX_INFO/);
    expect(drawer).not.toMatch(/Deductible ·|50% deductible|T2125/);
    expect(drawer).not.toMatch(/`Seen \$\{seenCount\}x`/);
  });

  it('uses the shared wording helpers, honouring the server cap flag', () => {
    expect(drawer).toMatch(/describeCategorySource\(tagInsight\?\.categorySource\)/);
    expect(drawer).toMatch(/tagInsight\?\.merchantSeenCapped \? describeMerchantHistory\(MERCHANT_HISTORY_CAP\) : describeMerchantHistory\(seenCount\)/);
    expect(drawer).toMatch(/\{isPotentiallyTaxRelevant\(localCategory\) && \(/);
    expect(drawer).toMatch(/\{TAX_NOTE\}/);
  });
});

describe('Tag panel', () => {
  it('greeting no longer promises deductibility checks', () => {
    expect(tag).not.toMatch(/check what's tax-deductible/);
    expect(tag).toMatch(/see what may be tax-relevant/);
  });
});

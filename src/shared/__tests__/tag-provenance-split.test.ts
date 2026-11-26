/**
 * Tag status provenance split (owner GO 2026-11-25, FINAL RELIABILITY CORRECTIONS item 3; shared
 * definitions agreed with Tag HQ and AI Architecture HQ). Synthetic data only.
 *  - protected ≠ customer-approved: only in-app customer actions are verified;
 *  - historical ambiguous corrections stay PROTECTED (no behaviour change) but are never
 *    represented as customer-approved.
 */
import { describe, it, expect } from 'vitest';
import {
  VERIFIED_CUSTOMER_SOURCES, PROTECTED_SOURCES, CUSTOMER_SOURCES, AMBIGUOUS_SOURCES,
  isProtectedSource, classifyCategorySource, summarizeTagStatus, resolveTagStatusScope,
} from '../tag-status';
import { formatTagConsultationEvidence } from '../prime-tag-consultation';

const HISTORICAL = ['user_correction', 'user_chat', 'user_undo', 'manual', 'manual_edit', 'user_confirmed', 'tag_rule', 'tag_chat'];

describe('shared definitions', () => {
  it('verified = exactly the in-app customer actions', () => {
    expect([...VERIFIED_CUSTOMER_SOURCES].sort()).toEqual(['user_edit', 'user_split', 'user_type_fix']);
  });
  it('protected = verified ∪ historical; the deprecated aliases cover exactly the same set (no behaviour change)', () => {
    expect([...PROTECTED_SOURCES].sort()).toEqual([...VERIFIED_CUSTOMER_SOURCES, ...HISTORICAL].sort());
    expect(new Set([...CUSTOMER_SOURCES, ...AMBIGUOUS_SOURCES])).toEqual(new Set(PROTECTED_SOURCES));
  });
  it.each(HISTORICAL)('historical %s: still protected, never verified', (src) => {
    expect(isProtectedSource(src)).toBe(true);
    expect(classifyCategorySource(src)).toBe('protected_unverified');
  });
  it.each(['ai', 'tag_assisted', 'merchant_sweep', 'learned', null, 'something_new'])('%s is not protected', (src) => {
    expect(isProtectedSource(src)).toBe(false);
  });
});

describe('tag status and Prime wording', () => {
  const rows = [
    { id: 'v1', merchant_name: 'SHOP A', category: 'Groceries', category_source: 'user_edit', amount: -10, date: '2026-01-02' },
    { id: 'h1', merchant_name: 'SHOP B', category: 'Other', category_source: 'user_correction', amount: -20, date: '2026-01-03' },
    { id: 'h2', merchant_name: 'SHOP C', category: 'Dining', category_source: 'tag_rule', amount: -30, date: '2026-01-04' },
    { id: 'a1', merchant_name: 'SHOP D', category: 'Other', category_source: 'ai', amount: -40, date: '2026-01-05' },
  ];
  const status = summarizeTagStatus({
    scope: resolveTagStatusScope({}, new Date('2026-01-10T12:00:00Z')),
    rows, queryFailed: false, capped: false, userHasAnyTransactions: true, coverage: null, feedbackMerchants: [],
  });

  it('counts verified and protected-unverified separately; both excluded from proposals', () => {
    expect(status.provenance).toMatchObject({ verified_customer: 1, protected_unverified: 2, automatic: 1 });
    expect(status.protectedFromProposals).toBe(3);
  });

  it('Prime is told the unverified ones are protected, never customer-approved', () => {
    const ev = formatTagConsultationEvidence(status);
    expect(ev).toContain('set by the customer in the app (verified) 1, protected (origin unverified) 2');
    expect(ev).toContain('never call these customer-approved');
    expect(ev).not.toMatch(/customer-confirmed|possibly customer-approved/);
  });
});

/**
 * L-D1 — Prime/Tag consultation outcomes (owner live finding LIVE-04 on ba4bc3a, GO 2026-11-24).
 *
 * Live: "Are my transactions categorized correctly?" returned "I wasn't able to confirm a reliable
 * result for that period…". Cause: Tag correctly found no transactions in the default month
 * (November 2026; data ends June 16), Prime said so, the legacy false-zero check flagged that as a
 * false zero, and the L-A retry suppression replaced the answer with the generic fallback.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  classifyTagConsultation,
  tagConsultationAnswered,
  formatTagConsultationEvidence,
  buildTagConsultationEvent,
  TAG_CONSULTATION_FAILED_REPLY,
  isCategorizationReviewQuestion,
} from '../../../src/shared/prime-tag-consultation';
import { summarizeTagStatus, resolveTagStatusScope, type TagStatusRow } from '../../../src/shared/tag-status';

const OWNER_Q = 'Are my transactions categorized correctly?';
const NOW = new Date('2026-11-24T15:00:00Z');
// P-LIVE-02: with no period the scope is all history, so an empty month now only happens when the
// customer explicitly asks for that month. The empty-period OFFER behaviour is unchanged.
const NOV = resolveTagStatusScope({ startDate: '2026-11-01', endDate: '2026-11-30', periodSource: 'requested' }, NOW);

function status(rows: TagStatusRow[] | null, opts: { failed?: boolean; capped?: boolean; latest?: string | null; anyData?: boolean } = {}) {
  return summarizeTagStatus({
    scope: NOV,
    rows,
    queryFailed: !!opts.failed,
    capped: !!opts.capped,
    userHasAnyTransactions: opts.anyData ?? true,
    coverage: opts.latest === undefined ? { earliestDate: '2026-01-03', latestDate: '2026-06-16' } : (opts.latest ? { earliestDate: '2026-01-03', latestDate: opts.latest } : null),
    feedbackMerchants: [],
  });
}
const ROW: TagStatusRow = { id: 'a', merchant_name: 'X', category: 'Food', category_source: 'ai', amount: -5, date: '2026-11-02' };

describe('L-D1 owner question → four distinct outcomes', () => {
  it('the owner question is a categorization question', () => {
    expect(isCategorizationReviewQuestion(OWNER_Q)).toBe(true);
  });
  it('with transactions', () => {
    const s = status([ROW]);
    expect(classifyTagConsultation(s)).toBe('with_transactions');
    expect(tagConsultationAnswered(s)).toBe(true);
  });
  it('no transactions in the default month (the live case) is a VALID answer', () => {
    const s = status([]);
    expect(['no_transactions_in_period', 'outside_imported_coverage']).toContain(s.status);
    expect(classifyTagConsultation(s)).toBe('no_transactions');
    expect(tagConsultationAnswered(s)).toBe(true);
  });
  it('partial (capped) findings', () => {
    expect(classifyTagConsultation(status([ROW], { capped: true }))).toBe('partial');
  });
  it('specialist execution failure', () => {
    const s = status(null, { failed: true });
    expect(classifyTagConsultation(s)).toBe('failed');
    expect(tagConsultationAnswered(s)).toBe(false);
    expect(classifyTagConsultation(null)).toBe('failed');
  });
});

describe('L-D1 empty current month: explain clearly and OFFER the most recent imported month', () => {
  it('states no transactions in November 2026, gives the latest date, and offers June 2026 without running it', () => {
    const ev = formatTagConsultationEvidence(status([]));
    expect(ev).toMatch(/Outcome: no transactions/);
    expect(ev).toMatch(/There are no imported transactions in 2026-11-01 through 2026-11-30\. The most recent imported transaction is dated 2026-06-16\./);
    expect(ev).toMatch(/OFFER \(do not do it automatically\): "Would you like me to have Tag review June 2026, your most recent imported month\?" Do not widen the period on your own\./);
  });
  it('no imported data at all → nothing to review, no offer', () => {
    const ev = formatTagConsultationEvidence(status([], { anyData: false, latest: null }));
    expect(ev).toMatch(/no imported transactions yet, so there is nothing for Tag to review/);
    expect(ev).not.toMatch(/OFFER/);
  });
});

describe('L-D1 consultation indicator only on success', () => {
  it('success (incl. a valid empty period) → event; failure → no event', () => {
    expect(buildTagConsultationEvent(status([ROW]))).toMatchObject({ employee: 'tag', tool: 'tag_status', readOnly: true });
    expect(buildTagConsultationEvent(status([]))).toMatchObject({ employee: 'tag' });
    expect(buildTagConsultationEvent(status(null, { failed: true }))).toBeNull();
  });
});

describe('L-D1 chat.ts: narrow bypass of the legacy false-zero safeguard', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  it('skips the legacy check ONLY for a categorization question that Tag actually answered', () => {
    expect(chat).toMatch(/const tagEvidenceGrounds = primeCategorizationReview && tagConsultationAnswered\(tagConsultationResult\);/);
    expect(chat).toMatch(/if \(isPrime && financialClassification\?\.requiresGrounding && !tagEvidenceGrounds\) \{/);
  });
  it('every other financial answer keeps the safeguard (no other bypass added)', () => {
    expect(chat.match(/!tagEvidenceGrounds/g)?.length).toBe(1);
  });
  it('a failed Tag consultation gets the honest Tag-specific reply, never the legacy period fallback', () => {
    expect(chat).toMatch(/assistantContent = primeCategorizationReview\n\s+\/\/ L-D1:[^\n]*\n\s+\? TAG_CONSULTATION_FAILED_REPLY/);
    expect(TAG_CONSULTATION_FAILED_REPLY).toMatch(/I asked Tag to check your categories, but the check didn't complete/);
    expect(TAG_CONSULTATION_FAILED_REPLY).toMatch(/Nothing was changed/);
  });
  it('the event is pushed only when buildTagConsultationEvent returned one; capability hook preserved', () => {
    expect(chat).toMatch(/const consultationEvent = buildTagConsultationEvent\(tagResult\.value\);\n\s+if \(consultationEvent\) specialistConsultations\.push\(consultationEvent\);/);
    expect(chat).toMatch(/const tagCap = await authorizeCapability\(\{ userId, actingEmployee: finalEmployeeSlug, toolId: 'tag_status', via: 'prime_consultation' \}\);/);
    expect(chat).toMatch(/tagConsultationResult = tagResult\.value;/);
  });
});

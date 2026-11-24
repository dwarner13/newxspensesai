/**
 * L-A — Prime consults Tag for categorization questions (owner live finding LIVE-04, GO 2026-11-24).
 *
 * Live: "Are my transactions categorized correctly?" was answered from the legacy full-year
 * tax_summary pre-run (tax-section "Other / Uncategorized" totals); tag_status was never called,
 * no period or caveat was given. Now the server consults Tag deterministically, skips the legacy
 * tax_summary path for these questions, and returns a consultation event only when it ran.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  isCategorizationReviewQuestion,
  tagStatusInputFromScope,
  formatTagConsultationEvidence,
  buildTagConsultationEvent,
} from '../../../src/shared/prime-tag-consultation';
import { summarizeTagStatus, resolveTagStatusScope, C4_PROVENANCE_CAVEAT } from '../../../src/shared/tag-status';

const OWNER_Q = 'Are my transactions categorized correctly?';

describe('L-A classifier', () => {
  it.each([
    OWNER_Q,
    'Do my categories look right?',
    'Is my categorization accurate?',
    'Are any transactions miscategorized?',
    'How many uncategorized transactions do I have?',
    'Which transactions need review?',
    'Can you check my categories?',
    'Are these categorized properly?',
    'Is anything wrongly categorized this month?',
  ])('categorization question: %s', (q) => { expect(isCategorizationReviewQuestion(q)).toBe(true); });

  it.each([
    'How much did I spend at Costco last month?',
    'How much did I spend by category in October?',
    'Show my spending breakdown by category',
    'Change the Costco transaction to Groceries',
    'Recategorize Netflix as Entertainment',
    'What are my tax categories for 2026?',
    'How many transactions do I have?',
    'What is my name?',
  ])('not a categorization-status question: %s', (q) => { expect(isCategorizationReviewQuestion(q)).toBe(false); });
});

describe('L-A scope follows the owner precedence', () => {
  it('explicit period → requested, inclusive end date (temporal scope "to" is exclusive)', () => {
    expect(tagStatusInputFromScope({ primary: { from: '2026-10-01', to: '2026-11-01' } }, false))
      .toEqual({ startDate: '2026-10-01', endDate: '2026-10-31', periodSource: 'requested' });
  });
  it('period inherited from the conversation (M1b) → conversation', () => {
    expect(tagStatusInputFromScope({ primary: { from: '2026-09-01', to: '2026-10-01' } }, true).periodSource).toBe('conversation');
  });
  it('no period → no dates (tag_status falls back to the current calendar month, labelled)', () => {
    expect(tagStatusInputFromScope(null, false)).toEqual({});
    expect(tagStatusInputFromScope({}, false)).toEqual({});
    const s = resolveTagStatusScope(tagStatusInputFromScope(null, false), new Date('2026-11-23T12:00:00Z'));
    expect(s.source).toBe('default_current_month');
    expect(s.label).toMatch(/November 2026/);
  });
});

describe('L-A evidence and event', () => {
  const NOW = new Date('2026-11-23T12:00:00Z');
  const scope = resolveTagStatusScope({}, NOW);
  const status = summarizeTagStatus({
    scope,
    rows: [
      { id: 'a', merchant_name: '7-ELEVEN STORE', category: 'Transfers', category_source: 'ai', amount: -5, date: '2026-11-02' },
      { id: 'b', merchant_name: 'X', category: 'Other', category_source: 'manual', amount: -9, date: '2026-11-03' },
      { id: 'c', merchant_name: 'Y', category: 'Uncategorized', category_source: null, amount: -3, date: '2026-11-04' },
    ],
    queryFailed: false, capped: false, userHasAnyTransactions: true, coverage: null, feedbackMerchants: [],
  });
  const ev = formatTagConsultationEvidence(status);
  it('states that Tag was consulted, the period, counts, proposals and the caveat', () => {
    expect(ev).toMatch(/^TAG CONSULTATION RESULT \(you consulted Tag via tag_status — read-only, server-verified\):/);
    expect(ev).toMatch(/Period \/ scope: November 2026 \(current month — no period was given\)/);
    expect(ev).toMatch(/uncategorized: 1; "Other": 1/);
    expect(ev).toMatch(/7-ELEVEN STORE: 1 × Transfers → possibly Food & Dining/);
    expect(ev).toContain(`Caveat: ${C4_PROVENANCE_CAVEAT}`);
    expect(ev).toMatch(/never say anything was changed/);
    expect(ev).toMatch(/Do not use tax-section totals to answer a categorization question/);
  });
  it('query_error never invents findings', () => {
    const err = summarizeTagStatus({ scope, rows: null, queryFailed: true, capped: false, userHasAnyTransactions: null, coverage: null, feedbackMerchants: null });
    const e = formatTagConsultationEvidence(err);
    expect(e).toMatch(/Status: query_error/);
    expect(e).not.toMatch(/Suspected categorization issues/);
  });
  it('the event describes a real read-only tag_status call', () => {
    expect(buildTagConsultationEvent(status)).toEqual({ employee: 'tag', tool: 'tag_status', status: 'ok', scopeLabel: status.scope.label, readOnly: true });
  });
});

describe('L-A chat.ts wiring', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  it('runs tag_status deterministically for categorization questions', () => {
    expect(chat).toMatch(/const primeCategorizationReview: boolean = isPrime && isCategorizationReviewQuestion\(String\(masked \|\| ''\)\);/);
    expect(chat).toMatch(/\? \(await executeTagStatus\(tagInput, \{ userId \}\)\)/); // runs only when the capability hook allows it
    expect(chat).toMatch(/tagStatusInputFromScope\(temporalScope as unknown as ResolvedPeriodLike, !!m1bDecision\?\.apply\)/);
  });
  it('the event is pushed only after a successful execution', () => {
    const block = chat.slice(chat.indexOf('if (primeCategorizationReview) {'), chat.indexOf('if (primeCategorizationReview) {') + 900);
    const okAt = block.indexOf('if (tagResult && tagResult.ok && tagResult.value) {');
    const pushAt = block.indexOf('specialistConsultations.push(buildTagConsultationEvent(tagResult.value));');
    expect(okAt).toBeGreaterThan(0);
    expect(pushAt).toBeGreaterThan(okAt);
    expect(chat.match(/specialistConsultations\.push\(/g)?.length).toBe(1);
  });
  it('the legacy full-year tax_summary pre-run and its retry are skipped for these questions', () => {
    expect(chat).toMatch(/&& !periodUnresolvedTaxSummary && !primeCategorizationReview\) \{/);
    expect(chat).toMatch(/\|\| hasPeriodScopedAuthoritativeEvidence\(p31cResult\)\n\s+\/\/ L-A:[^\n]*\n\s+\|\| primeCategorizationReview;/);
  });
  it('the response carries the consultation event only when present, and it is persisted with the message', () => {
    expect(chat).toMatch(/\.\.\.\(specialistConsultations\.length > 0 && \{ specialistConsultations \}\),/);
    expect(chat).toMatch(/if \(specialistConsultations\.length > 0\) assistantMsgMetadata\.specialistConsultations = specialistConsultations;/);
  });
  it('usePrimeChat threads it to msg.meta.specialistConsultations exactly as received (UI/UX field path)', () => {
    const hook = fs.readFileSync(path.resolve(__dirname, '../../../src/hooks/usePrimeChat.ts'), 'utf8');
    expect(hook).toMatch(/if \(Array\.isArray\(payload\?\.specialistConsultations\) && payload\.specialistConsultations\.length > 0\) \{\n\s+extraMetaFromPayload\.specialistConsultations = payload\.specialistConsultations;/);
  });
  it('consultation is read-only: no confirmation, no write tool', () => {
    const block = chat.slice(chat.indexOf('if (primeCategorizationReview) {'), chat.indexOf('if (primeCategorizationReview) {') + 900);
    expect(block).not.toMatch(/requiresConfirm|pendingConfirmation|tag_update_transaction_category|tag_bulk_recategorize/);
  });
});

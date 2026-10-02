/**
 * Prime V1-A CP4 — authoritative semantic routing for period financial questions.
 *
 * Capability families, each with several natural phrasings that must produce
 * the SAME plan (generalization, not sentence memorization). PRODUCTION
 * pipeline only: classifyPrimeIntent → buildTemporalScope →
 * buildRuntimeEvidenceContract → buildEvidencePlan.
 *
 * Fixed reference: 2026-10-01 12:00 America/Edmonton.
 * Temporal periods are [from, to) internally (exclusive `to`); tool arguments
 * are inclusive (startDate/endDate).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyPrimeIntent, PrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope, aggregateInclusiveEnd, extractDateRange } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan, type PrimeEvidencePlan } from '../prime-evidence-resolver';
import { shouldSuppressLegacyPreExec, type PrimeEvidenceExecutionResult } from '../prime-evidence-executor';
import { countEvidenceRows } from '../prime-evidence-validator';
import { classifyFinancialQuery, isUnsupportedFinancialSubject } from '../financial-query-classifier';
import { buildPreExecutionPlan, isAnswerInContext, validateGroundedAnswer } from '../financial-grounding';

const REF = new Date('2026-10-01T18:00:00Z'); // 12:00 in America/Edmonton
const CTX = { timezone: 'America/Edmonton', referenceDate: REF };
const AVAIL = {
  memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: false,
  candidateIdentityAvailable: false, pipelineSnapshotLoaded: false,
};

function plan(message: string, ext: { candidateFollowUpDetected?: boolean } = {}) {
  const intent = classifyPrimeIntent(message, {
    candidateFollowUpDetected: !!ext.candidateFollowUpDetected,
    historicalReferenceDetected: false,
  });
  const ts = buildTemporalScope(message, CTX, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, AVAIL, ts ?? undefined);
  const p: PrimeEvidencePlan = buildEvidencePlan(contract, intent);
  const tools = p.steps.filter(s => s.mode === 'tool' || s.mode === 'multi_source');
  return { intent, ts, p, tools, first: tools[0] };
}

const tool = (m: string) => plan(m).first?.tool;
const params = (m: string) => plan(m).first?.params ?? {};

// ─────────────────────────────────────────────────────────────────────────────
// Routing families
// ─────────────────────────────────────────────────────────────────────────────
describe('1. period spending → cash_flow_summary', () => {
  it.each([
    ['How much did I spend this month?', '2026-10-01', '2026-10-01'],
    ['What did I spend last month?', '2026-09-01', '2026-09-30'],
    ['My total spending in September.', '2026-09-01', '2026-09-30'],
    ['Spending so far this year.', '2026-01-01', '2026-10-01'],
    ['What were my expenses in September 2026?', '2026-09-01', '2026-09-30'],
  ])('%s', (m, start, end) => {
    expect(tool(m)).toBe('cash_flow_summary');
    expect(params(m)).toEqual({ startDate: start, endDate: end });
    expect(plan(m).intent.financialClassification?.subject).toBe('spending');
  });
});

describe('2. period income → cash_flow_summary (income, never a category filter)', () => {
  it.each([
    ['Income last month.', '2026-09-01'],
    ['How much did I make in September?', '2026-09-01'],
    ['What did I earn in Aug?', '2026-08-01'],
    ['How much income did I have last month?', '2026-09-01'],
  ])('%s', (m, start) => {
    expect(tool(m)).toBe('cash_flow_summary');
    expect(params(m).startDate).toBe(start);
    expect(params(m)).not.toHaveProperty('category');
    expect(plan(m).intent.financialClassification?.subject).toBe('income');
  });
});

describe('3. inflow / outflow → cash_flow_summary (inflow ≠ income)', () => {
  it.each([
    ['What came in last month?', 'inflow'],
    ['How much money came into my accounts in September?', 'inflow'],
    ['What went out last month?', 'outflow'],
  ])('%s', (m, subject) => {
    expect(tool(m)).toBe('cash_flow_summary');
    expect(plan(m).intent.financialClassification?.subject).toBe(subject);
  });
});

describe('4. cash flow → cash_flow_summary', () => {
  it.each(['Cash flow last month.', 'What was my cash flow in August?', 'How much came in and went out last month?', 'What was my net movement last month?'])(
    '%s', (m) => {
      expect(tool(m)).toBe('cash_flow_summary');
      expect(plan(m).intent.financialClassification?.subject).toBe('cash_flow');
    });
});

describe('5. category total → transaction_category_totals{category}', () => {
  // CP4 pre-staging repair — OLD: 'Groceries in September.' was expected here (category +
  // period alone grounded it). NEW: a bare category + period with no personal framing
  // and no financial request shape stays with Prime (see "personal vs general" below).
  // WHY: it is structurally identical to "Grocery prices in September" (general).
  it.each([
    'My groceries in September.',
    'How much did groceries cost last month?',
    'My grocery total for September.',
    'How much did I spend on groceries in September?',
  ])('%s', (m) => {
    expect(tool(m)).toBe('transaction_category_totals');
    expect(params(m).category).toBe('Groceries');
    expect(params(m).startDate).toBe('2026-09-01');
    expect(params(m).endDate).toBe('2026-09-30');
  });

  it('spending on an ordinary category asks for outflow only', () => {
    expect(params('How much did I spend on groceries in September?').type).toBe('expense');
  });
});

describe('6. category breakdown → transaction_category_totals (no category filter)', () => {
  it.each([
    'Category breakdown for September.',
    'Break down my September spending by category.',
    'Biggest spending categories last month.',
    'Give me my category breakdown for September.',
  ])('%s', (m) => {
    expect(tool(m)).toBe('transaction_category_totals');
    expect(params(m)).not.toHaveProperty('category');
    expect(plan(m).intent.financialClassification?.wantsBreakdown).toBe(true);
  });
});

describe('7. category transaction list → tx_search{category}', () => {
  it.each(['Show my grocery transactions.', 'List grocery purchases in September.', 'Show me my grocery transactions in September.'])(
    '%s', (m) => {
      expect(tool(m)).toBe('tx_search');
      expect(params(m).category).toBe('Groceries');
      expect(plan(m).intent.financialClassification?.requestShape).toBe('list');
    });
});

describe('8. explicit transaction list → tx_search with dates', () => {
  it.each([
    ['Show me my September transactions.', '2026-09-01', '2026-09-30'],
    ['List my transactions in September.', '2026-09-01', '2026-09-30'],
  ])('%s', (m, start, end) => {
    expect(tool(m)).toBe('tx_search');
    expect(params(m)).toMatchObject({ startDate: start, endDate: end });
  });
});

describe('9. merchant questions stay with the merchant architecture', () => {
  it.each(['What did I spend at Costco?', 'Show me Costco purchases.', 'How much did I spend at Costco in August?'])(
    '%s', (m) => {
      expect(tool(m)).toBe('merchant_totals');
      expect(params(m).merchant).toBe('Costco');
    });

  it('merchant period dates are not as-of clamped (merchant dates unchanged)', () => {
    expect(params('How much did I spend at Costco this month?')).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-31' });
  });
});

describe('10. candidate-frame / identity follow-ups never become aggregates', () => {
  it.each(['How much did those ten cost?', 'What is the total of these?', 'Which was the biggest one?'])(
    '%s (with an active frame)', (m) => {
      const r = plan(m, { candidateFollowUpDetected: true });
      expect(r.intent.intent).toBe(PrimeIntent.CANDIDATE_FOLLOW_UP);
      expect(r.tools).toEqual([]);
    });

  it('mutation stays a protected specialist action with no aggregate plan', () => {
    const r = plan('Change the third one to Groceries.');
    expect(r.intent.intent).toBe(PrimeIntent.SPECIALIST_ACTION);
    expect(r.tools.some(s => s.tool === 'cash_flow_summary' || s.tool === 'transaction_category_totals')).toBe(false);
  });
});

describe('17. comparison — two exact periods, message order, no trend engine', () => {
  it('this month vs last month', () => {
    const r = plan('How much did I spend this month vs last month?');
    expect(r.ts?.primary).toMatchObject({ from: '2026-10-01', label: 'this month' });
    expect(r.ts?.comparison).toMatchObject({ from: '2026-09-01', label: 'last month' });
    const comp = r.tools.find(s => s.mode === 'multi_source')!;
    expect(comp.params).toMatchObject({
      periodA_startDate: '2026-10-01', periodA_endDate: '2026-10-01', // as-of (month to date)
      periodB_startDate: '2026-09-01', periodB_endDate: '2026-09-30',
    });
  });

  it('September vs August (bare months, message order)', () => {
    const r = plan('Compare my spending in September vs August.');
    expect(r.ts?.primary).toMatchObject({ from: '2026-09-01', to: '2026-10-01' });
    expect(r.ts?.comparison).toMatchObject({ from: '2026-08-01', to: '2026-09-01' });
  });

  it('reversed message order is preserved', () => {
    const ts = buildTemporalScope('last month versus this month', CTX);
    expect(ts?.primary?.label).toBe('last month');
    expect(ts?.comparison?.label).toBe('this month');
  });
});

describe('18. no period → no silent all-history cash-flow answer', () => {
  it.each(['How much did I spend?', 'What was my net movement?', 'How much income did I have?'])('%s', (m) => {
    const r = plan(m);
    expect(r.tools.some(s => s.tool === 'cash_flow_summary')).toBe(false);
    expect(r.tools.some(s => s.tool === 'tx_search')).toBe(false);
    expect(r.p.unresolved).toContainEqual({ evidenceKind: 'cash_flow', reason: 'ambiguous_request' });
  });

  it('category totals keep their established all-history behaviour', () => {
    expect(tool('What are my biggest spending categories?')).toBe('transaction_category_totals');
  });
});

describe('19. refunds → no authoritative aggregate evidence', () => {
  it.each(['How much did I get back in refunds?', 'What refunds did I receive last month?'])('%s', (m) => {
    const r = plan(m);
    expect(r.intent.financialClassification?.subject).toBe('refund');
    expect(r.tools).toEqual([]);
  });
});

describe('19b. refunds → no legacy FinancialGrounding evidence stands in (pre-staging repair)', () => {
  const REFUNDS = ['How much did I get back in refunds?', 'How much was refunded last month?', 'Grocery refunds last month?'];
  const TAX_CTX = [{ section: 'Groceries', total: 100, count: 3, topSubcategories: [] }] as never;

  it.each(REFUNDS)('%s → unsupported subject, no CP4 plan, no legacy tax_summary', (m) => {
    const fc = classifyFinancialQuery(m);
    expect(fc.subject).toBe('refund');
    expect(isUnsupportedFinancialSubject(fc)).toBe(true);
    expect(plan(m).tools).toEqual([]);
    expect(buildPreExecutionPlan(fc, 2026).shouldPreExecute).toBe(false); // pre-run AND false-zero retry
    expect(buildPreExecutionPlan(fc, 2026).toolName).toBeUndefined();
    expect(isAnswerInContext(fc, TAX_CTX, 2026)).toBeNull(); // no tax_summary context claim either
  });

  it('an honest refund limitation is not forced through the false-zero retry', () => {
    const fc = classifyFinancialQuery('How much was refunded last month?');
    expect(validateGroundedAnswer("I couldn't find any reliable refund totals yet.", { grounded: false } as never, fc)).toBeNull();
  });

  it('supported subjects keep legacy grounding unchanged', () => {
    const spend = classifyFinancialQuery('How much did I spend on groceries in September?');
    expect(isUnsupportedFinancialSubject(spend)).toBe(false);
    expect(buildPreExecutionPlan(spend, 2026)).toMatchObject({ shouldPreExecute: true, toolName: 'tax_summary' });
    expect(validateGroundedAnswer('There were no grocery purchases.', { grounded: false } as never, spend)).toBe('false_zero_ungrounded');
    expect(isAnswerInContext(spend, TAX_CTX, 2026)).toMatchObject({ grounded: true, fromContext: true });
    // normal category aggregation unchanged
    expect(params('How much did I spend on groceries in September?')).toEqual({
      category: 'Groceries', type: 'expense', startDate: '2026-09-01', endDate: '2026-09-30',
    });
  });

  it('normal cash_flow evidence still suppresses the legacy tax_summary pre-run', () => {
    const r = { results: [{ evidenceKind: 'cash_flow', status: 'resolved' }] } as unknown as PrimeEvidenceExecutionResult;
    expect(shouldSuppressLegacyPreExec(r, 'tax_summary')).toBe(true);
    expect(tool('How much did I spend last month?')).toBe('cash_flow_summary');
  });
});

describe('personal vs general: category + period (pre-staging repair)', () => {
  it.each([
    ['My groceries in September', 'transaction_category_totals'],
    ['How much were groceries in September?', 'transaction_category_totals'],
    ['How much did I spend on groceries in September?', 'transaction_category_totals'],
    ['My restaurant spending in September', 'transaction_category_totals'],
    ['How much did I spend at restaurants in September?', 'transaction_category_totals'],
    ['Income in September', 'cash_flow_summary'],
    ['My income in September', 'cash_flow_summary'],
    ['Transfers in September', 'cash_flow_summary'],
    ['My transfers in September', 'cash_flow_summary'],
  ])('personal / financial-request: %s → %s', (m, t) => {
    expect(tool(m)).toBe(t);
    expect(plan(m).intent.intent).toBe(PrimeIntent.FINANCIAL_DATA_LOOKUP);
  });

  it('personal spending wording grounds without "my"', () => {
    const fc = classifyFinancialQuery('How much did I spend on groceries in September?');
    expect(fc.requiresGrounding).toBe(true);
    expect(fc.subject).toBe('spending');
  });

  it.each([
    'Grocery prices in September',
    'Are groceries expensive in September?',
    'Groceries in September',
    'Restaurants in September',
    'Tell me about groceries in September',
    'What is income?',
  ])('general / no financial request shape: %s → no personal evidence', (m) => {
    const r = plan(m);
    expect(r.tools).toEqual([]);
    expect(r.intent.financialClassification?.requiresGrounding ?? false).toBe(false);
    expect(buildPreExecutionPlan(classifyFinancialQuery(m), 2026).shouldPreExecute).toBe(false);
  });
});

describe('20. product / non-financial questions get no financial plan', () => {
  it.each(['How secure is my data?', 'What plan am I on?', 'What does Prime remember about me?', 'My account settings.'])(
    '%s', (m) => {
      const r = plan(m);
      expect(r.tools).toEqual([]);
      expect(r.intent.financialClassification?.requiresGrounding ?? false).toBe(false);
    });

  it('a period word does not turn a product question into an aggregate plan', () => {
    // (Pre-existing USER_DATA pattern grounds "my … this month"; CP4 still plans nothing.)
    expect(plan('How do I change my account settings this month?').tools).toEqual([]);
  });
});

describe('ambiguous / unknown shape → Prime interprets (no fabricated plan)', () => {
  it.each(['Where did my money go last month?', 'Tell me about my money last month.'])('%s', (m) => {
    expect(plan(m).tools).toEqual([]);
  });
});

describe('period words never imply list', () => {
  it('a month alone does not make a question a list', () => {
    for (const m of ['How much did I spend in September?', 'How much did I spend last month?', 'How much did I spend this month?']) {
      expect(classifyFinancialQuery(m).requestShape).toBe('aggregate');
      expect(classifyFinancialQuery(m).queryType).toBe('aggregate');
    }
  });

  it('an exact date that starts a range is a period, not a transaction identifier', () => {
    const fc = classifyFinancialQuery('What did I spend from Sep 1, 2026 to Sep 15, 2026?');
    expect(fc.exactDate).toBeUndefined();
    expect(fc.requestShape).toBe('aggregate');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Temporal (fixed reference 2026-10-01 America/Edmonton)
// ─────────────────────────────────────────────────────────────────────────────
const period = (m: string) => buildTemporalScope(`How much did I spend ${m}?`, CTX)?.primary;

describe('11–12. current and previous periods (calendar [from, to) + as-of)', () => {
  it.each([
    // phrase, from, to (exclusive), asOf, inclusive tool end
    ['today', '2026-10-01', '2026-10-02', '2026-10-01', '2026-10-01'],
    ['this week', '2026-09-28', '2026-10-05', '2026-10-01', '2026-10-01'],
    ['this month', '2026-10-01', '2026-11-01', '2026-10-01', '2026-10-01'],
    ['this quarter', '2026-10-01', '2027-01-01', '2026-10-01', '2026-10-01'],
    ['this year', '2026-01-01', '2027-01-01', '2026-10-01', '2026-10-01'],
    ['yesterday', '2026-09-30', '2026-10-01', undefined, '2026-09-30'],
    ['last week', '2026-09-21', '2026-09-28', undefined, '2026-09-27'],
    ['last month', '2026-09-01', '2026-10-01', undefined, '2026-09-30'],
    ['last quarter', '2026-07-01', '2026-10-01', undefined, '2026-09-30'],
    ['last year', '2025-01-01', '2026-01-01', undefined, '2025-12-31'],
  ])('%s', (phrase, from, to, asOf, inclusiveEnd) => {
    const p = period(phrase)!;
    expect(p).toMatchObject({ from, to, confidence: 'deterministic' });
    expect(p.asOf).toBe(asOf);
    expect(aggregateInclusiveEnd(p)).toBe(inclusiveEnd);
  });
});

describe('13–14. bare months (most recent non-future) and explicit month/year', () => {
  it.each([
    ['in September', '2026-09-01', '2026-10-01', 'September 2026'],
    ['in Sep', '2026-09-01', '2026-10-01', 'September 2026'],
    ['in Aug', '2026-08-01', '2026-09-01', 'August 2026'],
    ['in January', '2026-01-01', '2026-02-01', 'January 2026'],
    ['in October', '2026-10-01', '2026-11-01', 'October 2026'],
    ['in November', '2025-11-01', '2025-12-01', 'November 2025'],
    ['in December', '2025-12-01', '2026-01-01', 'December 2025'],
    ['in Sep 2026', '2026-09-01', '2026-10-01', 'September 2026'],
    ['in September 2025', '2025-09-01', '2025-10-01', 'September 2025'],
  ])('%s', (phrase, from, to, label) => {
    expect(period(phrase)).toMatchObject({ from, to, label, confidence: 'deterministic' });
  });

  it('current bare month is evaluated to date', () => {
    expect(aggregateInclusiveEnd(period('in October')!)).toBe('2026-10-01');
  });
});

describe('15. explicit date ranges (inclusive tool dates)', () => {
  it.each([
    ['from Sep 1 to Sep 15', '2026-09-01', '2026-09-15'],
    ['Sep 1–15', '2026-09-01', '2026-09-15'],
    ['Sep 1 - 15', '2026-09-01', '2026-09-15'],
    ['from Sep 1 through Sep 15', '2026-09-01', '2026-09-15'],
    ['between Sep 1 and Sep 15', '2026-09-01', '2026-09-15'],
    // range extends past today → evaluated through the as-of date
    ['from September 1 through October 15', '2026-09-01', '2026-10-01'],
    ['from Dec 15 to Jan 15', '2025-12-15', '2026-01-15'],
    ['from 2026-09-01 to 2026-09-15', '2026-09-01', '2026-09-15'],
    ['from Sep 1, 2025 to Sep 15, 2025', '2025-09-01', '2025-09-15'],
  ])('%s', (phrase, start, end) => {
    const p = period(phrase)!;
    expect(p).toMatchObject({ from: start, source: 'explicit_date', confidence: 'deterministic' });
    expect(aggregateInclusiveEnd(p)).toBe(end);
  });

  it('routes a range question to cash_flow_summary with inclusive dates', () => {
    expect(params('What were my expenses from September 1 to September 15?')).toEqual({ startDate: '2026-09-01', endDate: '2026-09-15' });
  });

  it('"and" only forms a range after "between"; backwards ranges are rejected', () => {
    expect(extractDateRange('I paid on Sep 3 and 4 friends came', CTX)).toBeNull();
    expect(extractDateRange('Sep 15 to Sep 1', CTX)).toBeNull();
  });
});

describe('16. rolling periods (numeric N; no number-word parsing)', () => {
  it.each([
    ['in the last 30 days', '2026-09-02', '2026-10-02'],
    ['in the past 90 days', '2026-07-04', '2026-10-02'],
    ['in the past 3 months', '2026-07-02', '2026-10-02'],
    ['in the last 2 weeks', '2026-09-18', '2026-10-02'],
  ])('%s', (phrase, from, to) => {
    expect(period(phrase)).toMatchObject({ from, to, confidence: 'deterministic' });
  });

  it('number words are not parsed (left to Prime)', () => {
    expect(buildTemporalScope('How much did I spend in the past three months?', CTX)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration points
// ─────────────────────────────────────────────────────────────────────────────
describe('executor: cash_flow evidence suppresses the legacy tax_summary pre-run', () => {
  const result = (kind: string, status: string) => ({
    intent: 'financial_data_lookup', overallSufficiency: 'sufficient',
    results: [{ evidenceKind: kind, status, authoritative: true, source: 's' }],
    executedCount: 1, skippedCount: 0, failedCount: 0, resolvedCount: 1, successfulEmptyCount: 0, totalDurationMs: 1, dedupHitCount: 0,
  }) as unknown as PrimeEvidenceExecutionResult;

  it('resolved or empty cash_flow suppresses tax_summary', () => {
    expect(shouldSuppressLegacyPreExec(result('cash_flow', 'resolved'), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(result('cash_flow', 'successful_empty'), 'tax_summary')).toBe(true);
  });
  it('failed cash_flow does not suppress (legacy fallback preserved)', () => {
    expect(shouldSuppressLegacyPreExec(result('cash_flow', 'failed'), 'tax_summary')).toBe(false);
  });
  it('cash_flow never suppresses a legacy tx_search', () => {
    expect(shouldSuppressLegacyPreExec(result('cash_flow', 'resolved'), 'tx_search')).toBe(false);
  });
});

describe('validator: shared evidence row counting (categoryTotals blind spot fixed)', () => {
  it('counts each supported shape', () => {
    expect(countEvidenceRows('transaction_category_totals', { categoryTotals: [{}, {}, {}], grandTotal: 1 })).toBe(3);
    expect(countEvidenceRows('transaction_category_totals', { totals: [{}] })).toBe(1);
    expect(countEvidenceRows('tx_search', { rows: [{}, {}] })).toBe(2);
    expect(countEvidenceRows('cash_flow_summary', { transactionCount: 7 })).toBe(7);
    expect(countEvidenceRows('cash_flow_summary', { transactionCount: null })).toBe(0);
    expect(countEvidenceRows('tx_search', null)).toBe(0);
  });
});

describe('chat.ts wiring (structural)', () => {
  const CHAT = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
  it('accumulator uses the shared counter at all three sites; no inline rows/totals expression remains', () => {
    expect((CHAT.match(/const rowCount = countEvidenceRows\(toolName, result\);/g) || []).length).toBe(3);
    expect(CHAT).not.toMatch(/Array\.isArray\(\(result as any\)\?\.totals\) \? \(result as any\)\.totals : \[\];/);
  });
  it('model-initiated cash_flow_summary dates use the existing normalization (4 sites)', () => {
    expect((CHAT.match(/=== 'cash_flow_summary'\) && authoritativeRanges\.length > 0\)/g) || []).length).toBe(4);
  });
});

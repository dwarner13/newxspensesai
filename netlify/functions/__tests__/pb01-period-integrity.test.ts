/**
 * PB-01 — financial date-filter integrity (owner live test, 2026-11-23).
 *
 * Failure reproduced: "How much did I spend at Costco last month?" (Oct 2026). P3.1C correctly ran
 * merchant_totals for 2026-10-01..2026-10-31 and found nothing. The merchant gate labelled that as
 * 'verified' (not 'verified_zero'), so Prime's truthful "$0" was flagged as a false zero; the retry
 * re-ran a FULL-YEAR tx_search and told the model to "correct" its answer with May 4 rows, which it
 * then reported as October spending ($282.78).
 *
 * Fixed:
 *  A. merchant gate reports what the evidence proved ('verified_zero' for a proven-empty period);
 *  B. a legacy retry never replaces period-scoped authoritative P3.1C evidence;
 *  C. legacy evidence states its exact search scope (query + dates) and is authoritative only for it;
 *  D. empty merchant evidence names the merchant and the exact period;
 *  E. actual coverage (count, earliest, latest date) is given when a requested period is empty.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  merchantGateQueryStatus,
  hasPeriodScopedAuthoritativeEvidence,
  buildEvidenceContextMessage,
  legacyQueryStatusFromP31C,
  type PrimeEvidenceExecutionResult,
  type PrimeEvidenceResult,
} from '../../../src/shared/prime-evidence-executor';
import {
  validateGroundedAnswer,
  buildEvidenceSystemMessage,
  formatSearchScope,
  buildPreExecutionPlan,
} from '../../../src/shared/financial-grounding';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';
import { classifyPrimeIntent } from '../../../src/shared/prime-intent-classifier';
import { buildTemporalScope } from '../../../src/shared/prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../../../src/shared/prime-evidence-contract';
import { buildEvidencePlan } from '../../../src/shared/prime-evidence-resolver';
import {
  fetchTransactionCoverage,
  formatCoverageNote,
  emptyRequestedPeriod,
  type CoverageClient,
} from '../../../src/shared/prime-data-coverage';

const QUESTION = 'How much did I spend at Costco last month?';
const OCT = { startDate: '2026-10-01', endDate: '2026-10-31' };

function merchantResult(over: Partial<PrimeEvidenceResult> = {}): PrimeEvidenceResult {
  return {
    evidenceKind: 'merchant_aggregation',
    status: 'successful_empty',
    authoritative: true,
    source: 'Per-merchant spend totals aggregated from transactions',
    tool: 'merchant_totals',
    data: { merchants: [], grandTotal: 0, transactionCount: 0, queryStatus: 'verified_zero' },
    rowCount: 0,
    scope: { ...OCT, merchant: 'Costco' },
    ...over,
  };
}
function execResult(results: PrimeEvidenceResult[]): PrimeEvidenceExecutionResult {
  return {
    intent: 'financial_data_lookup',
    results,
    overallSufficiency: 'sufficient',
    executedCount: results.length,
    skippedCount: 0,
    failedCount: 0,
    resolvedCount: results.filter(r => r.status === 'resolved').length,
    successfulEmptyCount: results.filter(r => r.status === 'successful_empty').length,
    totalDurationMs: 1,
  } as unknown as PrimeEvidenceExecutionResult;
}

describe('PB-01 reproduction: "Costco last month" plans an October-only merchant query', () => {
  it('the evidence plan is merchant_totals for Costco, 2026-10-01..2026-10-31', () => {
    const intent = classifyPrimeIntent(QUESTION, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
    const fc = classifyFinancialQuery(QUESTION);
    const ts = buildTemporalScope(QUESTION, { timezone: 'America/Edmonton', referenceDate: new Date('2026-11-23T15:00:00Z') }, fc.years);
    const plan = buildEvidencePlan(buildRuntimeEvidenceContract(intent, {
      memoryLoaded: true, memoryFactCount: 0, conversationHistoryLoaded: true, candidateIdentityAvailable: false, pipelineSnapshotLoaded: false,
    }, ts ?? undefined), intent);
    const step = plan.steps.find(s => s.evidenceKind === 'merchant_aggregation');
    expect(step?.tool).toBe('merchant_totals');
    expect(step?.params).toMatchObject({ merchant: 'Costco', ...OCT });
  });
  it('the legacy plan the old retry used is a FULL-YEAR search (why it must not replace period evidence)', () => {
    const plan = buildPreExecutionPlan(classifyFinancialQuery(QUESTION), 2026);
    expect(plan.toolName).toBe('tx_search');
    expect(plan.toolArgs).toMatchObject({ startDate: '2026-01-01', endDate: '2026-12-31' });
  });
});

describe('PB-01 A: merchant gate status reflects the actual evidence', () => {
  it('proven-empty October merchant result → verified_zero', () => {
    expect(merchantGateQueryStatus(execResult([merchantResult()]))).toBe('verified_zero');
  });
  it('a truthful "$0 at Costco in October" then passes grounding validation (no false-zero retry)', () => {
    const fc = classifyFinancialQuery(QUESTION);
    const status = merchantGateQueryStatus(execResult([merchantResult()]));
    const evidence = { grounded: true, toolName: 'tx_search', queryStatus: status, fromContext: false };
    for (const answer of [
      "You didn't spend anything at Costco in October.",
      'You spent $0.00 at Costco last month.',
      'I found no Costco transactions in October 2026.',
    ]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy evidence shape
      expect(validateGroundedAnswer(answer, evidence as any, fc)).toBeNull();
    }
  });
  it('the old blanket "verified" status is what triggered the false-zero retry', () => {
    const fc = classifyFinancialQuery(QUESTION);
    const old = { grounded: true, toolName: 'tx_search', queryStatus: 'verified', fromContext: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy evidence shape
    expect(validateGroundedAnswer("You didn't spend anything at Costco in October.", old as any, fc)).not.toBeNull();
  });
  it('resolved authoritative merchant rows → verified', () => {
    expect(merchantGateQueryStatus(execResult([merchantResult({ status: 'resolved', rowCount: 2 })]))).toBe('verified');
  });
  it('non-authoritative or partial empty → null (nothing proven)', () => {
    expect(merchantGateQueryStatus(execResult([merchantResult({ authoritative: false })]))).toBeNull();
    expect(merchantGateQueryStatus(execResult([merchantResult({ data: { merchants: [], queryStatus: 'partial' } })]))).toBeNull();
    expect(merchantGateQueryStatus(execResult([]))).toBeNull();
    expect(merchantGateQueryStatus(null)).toBeNull();
  });
  it('legacy tx_search suppression mapping is unchanged (merchant evidence does not alter it)', () => {
    expect(legacyQueryStatusFromP31C(execResult([merchantResult()]), 'tx_search')).toBeNull();
  });
});

describe('PB-01 B: legacy retry never replaces period-scoped evidence', () => {
  it('detects authoritative period-scoped evidence (empty or resolved)', () => {
    expect(hasPeriodScopedAuthoritativeEvidence(execResult([merchantResult()]))).toBe(true);
    expect(hasPeriodScopedAuthoritativeEvidence(execResult([merchantResult({ status: 'resolved' })]))).toBe(true);
  });
  it('does not fire for unscoped, failed or non-authoritative evidence', () => {
    expect(hasPeriodScopedAuthoritativeEvidence(execResult([merchantResult({ scope: { merchant: 'Costco' } })]))).toBe(false);
    expect(hasPeriodScopedAuthoritativeEvidence(execResult([merchantResult({ status: 'failed' })]))).toBe(false);
    expect(hasPeriodScopedAuthoritativeEvidence(execResult([merchantResult({ authoritative: false })]))).toBe(false);
    expect(hasPeriodScopedAuthoritativeEvidence(null)).toBe(false);
  });
  it('chat.ts wires the gate status and the retry guard', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    expect(src).toMatch(/: merchantGateQueryStatus\(p31cResult\);/);
    expect(src).not.toMatch(/legacyQueryStatusFromP31C\(p31cResult, plan\.toolName!\) : 'verified'/);
    const retry = src.slice(src.indexOf('One bounded retry: force tool execution'), src.indexOf('One bounded retry: force tool execution') + 2500);
    expect(retry).toMatch(/\|\| merchantAggSatisfied/);
    expect(retry).toMatch(/\|\| hasPeriodScopedAuthoritativeEvidence\(p31cResult\)/);
    expect(src.match(/buildEvidenceSystemMessage\(plan\.toolName, \w+, financialClassification, plan\.toolArgs\)/g)?.length).toBe(2);
  });
});

describe('PB-01 C: legacy evidence states its exact search scope', () => {
  it('the full-year search is labelled with its dates and limited to its scope', () => {
    const fc = classifyFinancialQuery(QUESTION);
    const msg = buildEvidenceSystemMessage('tx_search', {
      rows: [{ date: '2026-05-04', merchant: 'Costco', amount: -141.39 }, { date: '2026-05-04', merchant: 'Costco', amount: -141.39 }],
      totals: { spending: 282.78 }, queryStatus: 'verified',
    }, fc, { q: 'Costco', startDate: '2026-01-01', endDate: '2026-12-31', limit: 25 });
    expect(msg).toContain('Search scope: search "Costco", dates 2026-01-01 through 2026-12-31');
    expect(msg).toMatch(/rows outside it must not be counted toward its total/);
    expect(msg).toMatch(/authoritative for its search scope only/);
    expect(msg).toContain('date: 2026-05-04');
  });
  it('formatSearchScope handles year-only and unscoped searches', () => {
    expect(formatSearchScope({ q: 'x', year: 2025 })).toBe('Search scope: search "x", year 2025');
    expect(formatSearchScope({ q: 'x' })).toBe('Search scope: search "x", dates: all imported history');
    expect(formatSearchScope(undefined)).toBeNull();
  });
});

describe('PB-01 D: empty merchant evidence names the merchant and period', () => {
  it('states verified_zero for Costco in October and forbids out-of-period rows', () => {
    const msg = buildEvidenceContextMessage(execResult([merchantResult()]))!;
    expect(msg).toContain('[merchant_aggregation] status=successful_empty authoritative=true tool=merchant_totals merchant="Costco" period=2026-10-01 through 2026-10-31');
    expect(msg).toContain('verified_zero: There are no Costco transactions between 2026-10-01 and 2026-10-31');
    expect(msg).toMatch(/do NOT use transactions dated outside this period/);
  });
  it('resolved merchant evidence also carries its period in the header', () => {
    const msg = buildEvidenceContextMessage(execResult([merchantResult({ status: 'resolved', data: { merchants: [{ merchant: 'Costco', total: 10, count: 1 }], grandTotal: 10, transactionCount: 1 } })]))!;
    expect(msg).toContain('merchant="Costco" period=2026-10-01 through 2026-10-31');
  });
});

describe('PB-01 E: actual transaction coverage', () => {
  function fakeClient(rows: Array<{ user_id: string; date: string }>, fail = false) {
    const seen: Array<Array<[string, unknown]>> = [];
    const client = {
      from() {
        const filters: Array<[string, unknown]> = [];
        seen.push(filters);
        let asc = true; let head = false;
        const mine = () => rows.filter(r => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
        const chain: any = {
          select(_c: string, opts?: { head?: boolean }) { head = !!opts?.head; return chain; },
          eq(k: string, v: unknown) { filters.push([k, v]); return head ? Promise.resolve(fail ? { count: null, error: { m: 1 } } : { count: mine().length, error: null }) : chain; },
          not() { return chain; },
          order(_c: string, o: { ascending: boolean }) { asc = o.ascending; return chain; },
          limit(n: number) { const sorted = [...mine()].sort((a, b) => (asc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))); return Promise.resolve({ data: sorted.slice(0, n), error: null }); },
        };
        return chain;
      },
    };
    return { client: client as unknown as CoverageClient, seen };
  }
  const A = 'user-a'; const B = 'user-b';
  const rows = [
    { user_id: A, date: '2026-01-03' }, { user_id: A, date: '2026-05-04' }, { user_id: A, date: '2026-06-16' },
    { user_id: B, date: '2025-01-01' }, { user_id: B, date: '2026-11-20' },
  ];
  it('returns count and date range for the verified user only', async () => {
    const { client, seen } = fakeClient(rows);
    expect(await fetchTransactionCoverage(client, A)).toEqual({ transactionCount: 3, earliestDate: '2026-01-03', latestDate: '2026-06-16' });
    expect(seen.every(f => f.some(([k, v]) => k === 'user_id' && v === A))).toBe(true);
  });
  it('returns null on a query error or a missing user', async () => {
    expect(await fetchTransactionCoverage(fakeClient(rows, true).client, A)).toBeNull();
    expect(await fetchTransactionCoverage(fakeClient(rows).client, '')).toBeNull();
  });
  it('October after a June 16 coverage end: the note says so and gives the real range', () => {
    const note = formatCoverageNote({ transactionCount: 3, earliestDate: '2026-01-03', latestDate: '2026-06-16' }, OCT);
    expect(note).toContain('3 imported transactions, dated 2026-01-03 through 2026-06-16');
    expect(note).toContain('The requested period (2026-10-01 through 2026-10-31) is AFTER the latest imported transaction (2026-06-16)');
    expect(note).toMatch(/no live bank connection/);
    expect(note).toMatch(/Never fill a requested period with transactions dated outside it/);
  });
  it('no imported data at all', () => {
    expect(formatCoverageNote({ transactionCount: 0, earliestDate: null, latestDate: null })).toContain('no imported transactions yet');
  });
  it('emptyRequestedPeriod picks the proven-empty scoped period only', () => {
    expect(emptyRequestedPeriod([merchantResult()])).toEqual(OCT);
    expect(emptyRequestedPeriod([merchantResult({ status: 'resolved' })])).toBeNull();
    expect(emptyRequestedPeriod([merchantResult({ authoritative: false })])).toBeNull();
  });
  it('chat.ts injects the coverage note only for a proven-empty period, owner-scoped', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
    expect(src).toMatch(/const emptyPeriod = p31cResult \? emptyRequestedPeriod\(p31cResult\.results\) : null;/);
    expect(src).toMatch(/fetchTransactionCoverage\(admin\(\) as unknown as CoverageClient, userId\)/);
  });
});

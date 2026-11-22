/**
 * C2-C / M1a — financial follow-up memory (shadow only).
 * Real classifier + temporal resolver for messages; synthetic authoritative evidence results.
 * Fixed reference: 2026-11-21 12:40 America/Edmonton.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyFinancialQuery } from '../financial-query-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import type { PrimeEvidenceExecutionResult, PrimeEvidenceResult } from '../prime-evidence-executor';
import {
  buildLastFinancialRequest,
  validateLastFinancialRequest,
  detectFinancialFollowUp,
  proposeFollowUp,
  buildFollowUpLog,
  shiftPeriodBack,
  ownerTagFor,
  LAST_FINANCIAL_REQUEST_TTL_MS,
  type LastFinancialRequest,
} from '../prime-financial-followup';

const NOW = Date.parse('2026-11-21T19:40:00Z');
const CTX = { timezone: 'America/Edmonton', referenceDate: new Date(NOW) };
const USER = '938a2e17-0000-4000-8000-000000000001';
const OTHER = '11111111-0000-4000-8000-000000000002';
const TX_ID = '9b2f6a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

const parse = (m: string) => {
  const fc = classifyFinancialQuery(m);
  return { fc, ts: buildTemporalScope(m, CTX, fc.years) };
};

function evidence(results: Array<Partial<PrimeEvidenceResult>>): PrimeEvidenceExecutionResult {
  return {
    intent: 'financial_data_lookup' as never,
    results: results.map(r => ({ authoritative: true, source: 's', status: 'resolved', ...r })) as PrimeEvidenceResult[],
    overallSufficiency: 'sufficient' as never,
    executedCount: results.length, skippedCount: 0, failedCount: 0, resolvedCount: results.length,
    successfulEmptyCount: 0, totalDurationMs: 1, dedupHitCount: 0,
  } as PrimeEvidenceExecutionResult;
}

/** Store the context for an answered question, then run a follow-up through detect → propose. */
function remember(question: string, ev: PrimeEvidenceExecutionResult, opts: { trusted?: boolean; excluded?: string[] } = {}) {
  const { fc, ts } = parse(question);
  return buildLastFinancialRequest({ userId: USER, financialClassification: fc, temporalScope: ts, evidence: ev, merchantHintTrusted: !!opts.trusted, excludedGroups: opts.excluded, now: NOW });
}
function follow(message: string, stored: unknown, opts: { userId?: string; now?: number; frame?: boolean } = {}) {
  const { fc, ts } = parse(message);
  const kind = detectFinancialFollowUp({ message, financialClassification: fc, temporalScope: ts });
  return proposeFollowUp({ kind, context: validateLastFinancialRequest(stored, opts.userId ?? USER, opts.now ?? NOW + 60_000), financialClassification: fc, temporalScope: ts, hasCandidateFrame: !!opts.frame });
}

// Evidence for "How much did I spend in May 2026?" — deliberately includes amounts, rows and ids.
const MAY_SPEND = evidence([{ evidenceKind: 'cash_flow' as never, tool: 'cash_flow_summary', rowCount: 106,
  scope: { startDate: '2026-05-01', endDate: '2026-05-31' },
  data: { spending: 22514.36, spendingTransactionCount: 106, rows: [{ id: TX_ID, amount: -42.5, merchant: 'Shop' }] } }]);

describe('remembering a verified request (write side)', () => {
  it('May ordinary spending → stores scope only (no amounts, rows or ids)', () => {
    const ctx = remember('How much did I spend in May 2026?', MAY_SPEND)!;
    expect(ctx).toMatchObject({
      v: 1, subject: 'spending', requestShape: 'aggregate', category: null, merchant: null,
      period: { from: '2026-05-01', to: '2026-06-01', label: 'May 2026', granularity: 'month' },
      scope: { kind: 'ordinary_spending', excludesNonSpend: true, excludedGroups: [] },
      evidence: { kinds: ['cash_flow'], tools: ['cash_flow_summary'], status: 'verified' },
    });
    const json = JSON.stringify(ctx);
    expect(json).not.toMatch(/22514|42\.5|"amount"|"rows"|"total"|Shop/);
    expect(json).not.toContain(TX_ID);
    expect(ctx.ownerTag).toBe(ownerTagFor(USER));
    expect(Date.parse(ctx.expiresAt) - Date.parse(ctx.savedAt)).toBe(LAST_FINANCIAL_REQUEST_TTL_MS);
    expect(ctx.evidence.fingerprint).toMatch(/^[0-9a-f]{8}$/);
  });

  it('only after SUCCESSFUL AUTHORITATIVE evidence', () => {
    const q = 'How much did I spend in May 2026?';
    expect(remember(q, evidence([{ tool: 'cash_flow_summary', status: 'failed' as never }]))).toBeNull();
    expect(remember(q, evidence([{ tool: 'cash_flow_summary', authoritative: false }]))).toBeNull();
    expect(remember(q, evidence([]))).toBeNull();
    expect(remember(q, null as never)).toBeNull();
    expect(remember('Hi Prime', MAY_SPEND)).toBeNull(); // not a grounded financial request
  });

  it('a merchant is remembered only when trusted', () => {
    const ev = evidence([{ evidenceKind: 'merchant_aggregation' as never, tool: 'merchant_totals', scope: { startDate: '2026-10-01', endDate: '2026-10-31' } }]);
    expect(remember('How much did I spend at Costco last month?', ev, { trusted: false })).toBeNull();
    const ctx = remember('How much did I spend at Costco last month?', ev, { trusted: true, excluded: ['costco gas'] })!;
    expect(ctx).toMatchObject({ merchant: 'Costco', scope: { kind: 'merchant', excludedGroups: ['costco gas'] } });
  });

  it('a verified empty result is remembered as verified_zero', () => {
    const ev = evidence([{ evidenceKind: 'cash_flow' as never, tool: 'cash_flow_summary', status: 'successful_empty' as never }]);
    expect(remember('How much did I spend last month?', ev)!.evidence.status).toBe('verified_zero');
  });
});

describe('follow-ups (shadow proposals)', () => {
  const may = () => remember('How much did I spend in May 2026?', MAY_SPEND);

  it('May spending → "Which category did I spend the most on?" keeps May and asks for a breakdown', () => {
    expect(follow('Which category did I spend the most on?', may())).toMatchObject({
      status: 'proposed', kind: 'category_superlative', periodSource: 'inherited',
      period: { from: '2026-05-01', to: '2026-06-01', label: 'May 2026' },
      scopeKind: 'category_breakdown', tool: 'transaction_category_totals', category: null,
    });
  });

  it('Costco last month → "What about the month before?" shifts to September, keeps the trusted merchant', () => {
    const ev = evidence([{ evidenceKind: 'merchant_aggregation' as never, tool: 'merchant_totals' }]);
    const costco = remember('How much did I spend at Costco last month?', ev, { trusted: true });
    expect(follow('What about the month before?', costco)).toMatchObject({
      status: 'proposed', kind: 'previous_period', periodSource: 'shifted',
      period: { from: '2026-09-01', to: '2026-10-01', label: 'September 2026' },
      merchant: 'Costco', scopeKind: 'merchant', tool: 'merchant_totals',
    });
  });

  it('transaction-list follow-ups: "Show me those transactions." / "How much did those total?"', () => {
    expect(follow('Show me those transactions.', may())).toMatchObject({
      status: 'proposed', kind: 'reference_list', periodSource: 'inherited', period: { label: 'May 2026' }, tool: 'tx_search',
    });
    expect(follow('How much did those transactions total?', may(), { frame: true })).toMatchObject({
      status: 'proposed', kind: 'reference_total', tool: 'candidate_frame',
    });
    expect(follow('How much did those transactions total?', may(), { frame: false })).toMatchObject({
      status: 'proposed', kind: 'reference_total', period: { label: 'May 2026' }, tool: 'cash_flow_summary',
    });
  });

  it('"What about groceries?" swaps the scope and keeps the period', () => {
    expect(follow('What about groceries?', may())).toMatchObject({
      status: 'proposed', kind: 'scope_swap', periodSource: 'inherited', period: { label: 'May 2026' },
      category: { category: 'Groceries' }, scopeKind: 'category', tool: 'transaction_category_totals',
    });
  });

  it('an explicit period overrides the inherited one', () => {
    expect(follow('What about groceries in March?', may())).toMatchObject({
      status: 'proposed', kind: 'scope_swap', periodSource: 'explicit', period: { label: 'March 2026' }, category: { category: 'Groceries' },
    });
  });

  it('"Was that higher than April?" compares the remembered period with April', () => {
    expect(follow('Was that higher than April?', may())).toMatchObject({
      status: 'proposed', kind: 'comparison', period: { label: 'May 2026' }, comparisonPeriod: { label: 'April 2026' },
    });
  });

  it('a new independent question resets the scope', () => {
    expect(follow('How much did I spend on dining in June 2026?', may())).toMatchObject({ status: 'independent', kind: 'independent', period: null });
  });

  it('small talk is not a follow-up', () => {
    expect(follow('Hi Prime', may()).status).toBe('no_followup');
  });
});

describe('fail closed', () => {
  it('expired context is rejected', () => {
    const p = follow('Which category did I spend the most on?', remember('How much did I spend in May 2026?', MAY_SPEND), { now: NOW + LAST_FINANCIAL_REQUEST_TTL_MS + 1 });
    expect(p).toMatchObject({ status: 'no_context', contextStatus: 'expired', period: null, tool: null });
  });

  it('another user\'s context is rejected', () => {
    const p = follow('Which category did I spend the most on?', remember('How much did I spend in May 2026?', MAY_SPEND), { userId: OTHER });
    expect(p).toMatchObject({ status: 'no_context', contextStatus: 'cross_user' });
  });

  it('malformed or missing context is rejected', () => {
    for (const bad of ['x', 42, { v: 2 }, { v: 1, ownerTag: ownerTagFor(USER) }] as unknown[]) {
      expect(validateLastFinancialRequest(bad, USER, NOW).status).toBe('invalid');
    }
    expect(validateLastFinancialRequest(null, USER, NOW).status).toBe('none');
    expect(follow('What about the month before?', null)).toMatchObject({ status: 'no_context', contextStatus: 'none' });
  });

  it('a period that cannot be shifted deterministically is unsupported (never guessed)', () => {
    const ev = evidence([{ evidenceKind: 'cash_flow' as never, tool: 'cash_flow_summary' }]);
    const rolling = remember('How much did I spend in the last 30 days?', ev);
    expect(follow('What about the month before?', rolling)).toMatchObject({ status: 'unsupported' });
  });

  it('shiftPeriodBack handles month, quarter and year only', () => {
    const per = (from: string, to: string) => ({ from, to, label: 'x', granularity: 'month' as const });
    expect(shiftPeriodBack(per('2026-01-01', '2026-02-01'))).toEqual({ from: '2025-12-01', to: '2026-01-01', label: 'December 2025' });
    expect(shiftPeriodBack(per('2026-04-01', '2026-07-01'))).toMatchObject({ from: '2026-01-01', to: '2026-04-01' });
    expect(shiftPeriodBack(per('2026-01-01', '2027-01-01'))).toEqual({ from: '2025-01-01', to: '2026-01-01', label: '2025' });
    expect(shiftPeriodBack(per('2026-10-23', '2026-11-22'))).toBeNull();
    expect(shiftPeriodBack(null)).toBeNull();
  });
});

describe('logging and wiring', () => {
  it('the log carries status codes and flags only — no dates, names or amounts', () => {
    const p = follow('What about groceries in March?', remember('How much did I spend in May 2026?', MAY_SPEND));
    const json = JSON.stringify(buildFollowUpLog(p, true));
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}|March|May|Groceries|22514/);
    expect(JSON.parse(json)).toMatchObject({ m1a: 1, followUp: 'scope_swap', status: 'proposed', periodSource: 'explicit', inheritsCategory: true, wroteContext: true });
  });

  const chat = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
  const start = chat.indexOf('// ── C2-C / M1a: financial follow-up memory (SHADOW');
  const block = chat.slice(start, chat.indexOf('// shadow only — never affects the response', start));

  // M1b: this block also runs when M1b inheritance is enabled (it saves the verified scope that
  // follow-ups inherit). The block itself still never touches plans, evidence or answers — the
  // M1b period effect lives in its own block (see m1b tests).
  it('chat.ts: the M1a save/log block never touches plans, evidence or answers', () => {
    expect(start).toBeGreaterThan(0);
    expect(chat).toContain('const m1aShadowEnabled = isPrime && flagEnabled(process.env.PRIME_SHADOW_SEMANTICS);');
    expect(block).toContain('if (m1aShadowEnabled || m1bEnabled) {');
    expect(block).toMatch(/console\.log\(`\[PrimeMemory\]\[M1a\] request=\$\{requestId\.slice\(0,12\)\} \$\{JSON\.stringify\(buildFollowUpLog\(m1aProposal, m1aWrote\)\)\}`\)/);
    for (const forbidden of ['systemMessages.push', 'messages.push', 'evidencePlanForExecution =', 'p31cResult =', 'executeEvidencePlan', 'openai', 'ownershipGate.submit']) {
      expect(block).not.toContain(forbidden);
    }
  });

  it('chat.ts: written only from authoritative P3.1C evidence, after untrusted merchant evidence is withheld', () => {
    expect(block).toContain('evidence: p31cResult,');
    expect(block).toContain('merchantHintTrusted,');
    expect(start).toBeGreaterThan(chat.indexOf('withheld merchant evidence for untrusted hint'));
    const code = block.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/prime_context|effectivePrimeContext|briefing|taxSummary|financialSnapshot/i);
  });

  it('chat.ts: context reads/writes are scoped by session id AND user id', () => {
    for (const fn of ['async function readLastFinancialRequestRaw(', 'async function writeLastFinancialRequest(']) {
      const s = chat.indexOf(fn);
      const body = chat.slice(s, chat.indexOf('\n}\n', s));
      expect(body).toContain(".eq('id', sessionId)");
      expect(body).toContain(".eq('user_id', userId)");
    }
  });

  it('the stored shape never includes amounts or transaction identity fields', () => {
    const keys = (o: unknown): string[] => (o && typeof o === 'object')
      ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => [k, ...keys(v)]) : [];
    const ctx = remember('How much did I spend in May 2026?', MAY_SPEND) as LastFinancialRequest;
    expect(keys(ctx).filter(k => /amount|total|balance|rows|^id$|transaction/i.test(k))).toEqual([]);
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any -- synthetic tool results */
/**
 * Financial evidence trust (owner GO 2026-11-27, "FINANCIAL EVIDENCE TRUST APPROVAL").
 * Tool authorization alone does not establish financial accuracy: partial or non-compliant tool
 * totals can never pass financial response verification. Hypotheticals and customer-provided figures
 * keep working with their labels. Synthetic figures only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { admitToolEvidence, evidenceClassFor, FINANCIAL_EVIDENCE_REGISTRY } from '../../../src/shared/financial-evidence-registry';
import { verifyReplyFigures } from '../../../src/shared/turn-evidence-ledger';
import { figuresFromToolResult, meaningFiguresFromToolResult, type FigureMeaning } from '../../../src/shared/statement-reconciliation-guard';
import { activeFilters } from '../../../src/agent/tools/impl/transactions_query';
import BASELINE from '../../../src/shared/__tests__/fixtures/ar1b-baseline.json';

/** The same capture chat.ts performs (captureCashFlowForGuard), for a list of same-turn tool results. */
function ledgerFrom(results: Array<[string, unknown]>) {
  const toolFigures: number[] = [];
  const recordFigures: number[] = [];
  const meaningFigures = new Map<FigureMeaning, Set<number>>();
  for (const [tool, data] of results) {
    const ev = admitToolEvidence(tool, data);
    if (ev.admit === 'engine') { meaningFiguresFromToolResult(ev.payload, meaningFigures); figuresFromToolResult(ev.payload, toolFigures); }
    else if (ev.admit === 'statement_records') figuresFromToolResult(ev.payload, recordFigures);
  }
  return { toolFigures, recordFigures, meaningFigures };
}
const verify = (reply: string, results: Array<[string, unknown]>, userMessage = 'how am I doing?') =>
  verifyReplyFigures(reply, { ...ledgerFrom(results), userMessage });

const txqTotals = (over: Record<string, unknown> = {}) => ({
  complete: true, transactionCount: 120, deposits: 4321.0, withdrawals: 3210.5, netCashFlow: 1110.5,
  actualIncome: 4000.0, actualSpending: 2500.25, refunds: 21.0,
  excludedFromSpending: { transfersOut: 300, debtPayments: 400, savingsInvestment: 0 }, note: '', ...over,
});
const txq = (scope: Record<string, unknown>, totals = txqTotals()) => ({
  transactions: [{ id: 'a', date: '2026-10-01', amount: -87.65, merchant: 'Cafe', category: 'Dining', type: 'expense', description: null }],
  total: 1, page: { offset: 0, limit: 100, returned: 1, totalMatching: 120, hasMore: true, note: '' },
  totals, scope: { filters: [], startDate: null, endDate: null, ...scope }, summary: { transactionCount: 120, dateRange: { start: null, end: null } },
});

describe('registry: authorization is not evidence', () => {
  it('classifies the owner\'s four categories; unknown tools fail closed', () => {
    expect(evidenceClassFor('cash_flow_summary')).toBe('engine');
    expect(evidenceClassFor('tx_get')).toBe('statement_records');
    expect(evidenceClassFor('statement_coverage')).toBe('non_financial');
    expect(evidenceClassFor('finley_savings_forecast')).toBe('ineligible');
    expect(evidenceClassFor('some_future_tool')).toBe('ineligible');
    expect(evidenceClassFor(undefined)).toBe('ineligible');
  });

  it('every engine-class tool is AR-1b compliant (no financial-rule copy outside the shared engine)', () => {
    const entries: string[] = (BASELINE as any).entries;
    for (const [tool, cls] of Object.entries(FINANCIAL_EVIDENCE_REGISTRY)) {
      if (cls !== 'engine') continue;
      const hits = entries.filter(e => e.startsWith(`src/agent/tools/impl/${tool}.ts|`));
      expect(hits, tool).toEqual([]);
    }
  });

  it('every engine tool declares a positive completeness signal (queryStatus or totals.complete)', () => {
    for (const [tool, cls] of Object.entries(FINANCIAL_EVIDENCE_REGISTRY)) {
      if (cls !== 'engine') continue;
      const src = fs.readFileSync(path.join(__dirname, `../../../src/agent/tools/impl/${tool}.ts`), 'utf8');
      expect(/queryStatus: z\.enum\(\[\s*'verified', 'verified_zero'/.test(src) || /complete: z\.boolean\(\)/.test(src), tool).toBe(true);
    }
  });

  it('fail closed: an engine payload without a completeness marker is not evidence', () => {
    expect(admitToolEvidence('cash_flow_summary', { income: 4000 }).admit).toBeNull();
    expect(admitToolEvidence('cash_flow_summary', { error: 'boom', income: 4000 }).admit).toBeNull();
    expect(admitToolEvidence('cash_flow_summary', { queryStatus: 'query_error', income: 4000 }).admit).toBeNull();
    expect(admitToolEvidence('cash_flow_summary', { queryStatus: 'verified_zero', income: 0 }).admit).toBe('engine');
  });

  it('every registry entry names a registered tool', () => {
    const registry = fs.readFileSync(path.join(__dirname, '../../../src/agent/tools/index.ts'), 'utf8');
    for (const tool of Object.keys(FINANCIAL_EVIDENCE_REGISTRY)) {
      expect(registry.includes(`['${tool}',`), tool).toBe(true);
    }
  });

  it('chat.ts feeds the ledger only through admitToolEvidence', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');
    const start = chat.indexOf('const captureCashFlowForGuard = ');
    const body = chat.slice(start, chat.indexOf('};', start));
    expect(body).toContain('admitToolEvidence(tool, data)');
    expect(body).not.toMatch(/figuresFromToolResult\(data,/);
    expect(body).not.toMatch(/meaningFiguresFromToolResult\(data,/);
    expect(chat).toMatch(/recordFigures: turnRecordFigures/);
  });
});

describe('partial or non-compliant totals cannot pass verification', () => {
  it('partial engine read (queryStatus partial) → its total is unsupported', () => {
    const partial = { queryStatus: 'partial', income: 4000, spending: 2500.25, totalInflow: 4321 };
    expect(verify('Your income was $4,000.00 this month.', [['cash_flow_summary', partial]]).ok).toBe(false);
    expect(verify('Your income was $4,000.00 this month.', [['cash_flow_summary', { ...partial, queryStatus: 'verified' }]]).ok).toBe(true);
  });

  it('transactions_query incomplete totals → unsupported', () => {
    const r = verify('Your spending was $2,500.25.', [['transactions_query', txq({ filtered: false }, txqTotals({ complete: false }))]]);
    expect(r.ok).toBe(false);
  });

  it('transactions_query FILTERED totals never evidence an overall claim (scope)', () => {
    const r = verify('Your income was $4,000.00.', [['transactions_query', txq({ filtered: true, filters: ['merchant'] })]]);
    expect(r.ok).toBe(false);
    expect(verify('Your income was $4,000.00.', [['transactions_query', txq({ filtered: false })]]).ok).toBe(true);
  });

  it('transactions_query without a declared scope fails closed', () => {
    const noScope: any = txq({ filtered: false }); delete noScope.scope;
    expect(admitToolEvidence('transactions_query', noScope).reason).toBe('filtered_scope');
  });

  it('display rows are never totals: a row amount is not evidence from transactions_query', () => {
    expect(verify('You spent $87.65 in total.', [['transactions_query', txq({ filtered: false })]]).ok).toBe(false);
  });

  it('non-compliant / ineligible tool totals (forecast, goal, Chime, document) never pass', () => {
    for (const [tool, data] of [
      ['finley_savings_forecast', { projectedSavings: 9876.54 }],
      ['goalie_summarize_goals', { totalSaved: 9876.54 }],
      ['chime_summarize_upcoming_obligations', { totalDue: 9876.54 }],
      ['tag_document_findings', { total: 9876.54 }],
      ['unknown_tool', { total: 9876.54 }],
    ] as Array<[string, unknown]>) {
      expect(verify('Your total spending was $9,876.54.', [[tool, data]]).ok, tool).toBe(false);
    }
  });

  it('tx_search totals are not evidence (FR-022); its row amounts are, singly', () => {
    const tx = { rows: [{ id: 'r1', amount: -45.1 }, { id: 'r2', amount: -54.9 }], totals: { total: 100.0, outflow: 100.0 }, queryStatus: 'verified' };
    expect(verify('Your spending at the cafe was $100.00.', [['tx_search', tx]]).ok).toBe(false);
    expect(verify('You paid $45.10 at the cafe on that day.', [['tx_search', tx]]).ok).toBe(true);
  });

  it('records never make totals: two records cannot be summed into a verified figure', () => {
    const tx = { rows: [{ id: 'r1', amount: -45.1 }, { id: 'r2', amount: -54.9 }] };
    expect(verify('Together you spent $100.00 on those charges.', [['tx_search', tx]]).ok).toBe(false);
  });

  it('a record value stated as a named total is rejected', () => {
    const tx = { rows: [{ id: 'r1', amount: -45.1 }] };
    expect(verify('Your spending was $45.10.', [['tx_search', tx]]).ok).toBe(false);
  });

  it('account balances: each stored balance singly yes; the summed totalBalance no', () => {
    const bal = { accounts: [{ id: 'a', balance: 1200.0 }, { id: 'b', balance: 300.0 }], totalBalance: 1500.0, sourceNote: '' };
    expect(verify('Your chequing balance is $1,200.00 as recorded.', [['account_balances_query', bal]]).ok).toBe(true);
    expect(verify('Your balance across accounts is $1,500.00.', [['account_balances_query', bal]]).ok).toBe(false);
  });
});

describe('preserved: hypotheticals and customer-provided figures', () => {
  it('hypothetical calculations stay labelled and allowed', () => {
    const r = verify('If you saved $250.00 per month, you would have $3,000.00 in a year.', []);
    expect(r.ok).toBe(true);
    expect(r.figures.every(f => f.category === 'hypothetical')).toBe(true);
  });
  it('customer-provided figures are accepted as the customer\'s own', () => {
    const r = verify('You mentioned rent of $1,850.00.', [], 'my rent is $1,850.00, can I afford a car?');
    expect(r.ok).toBe(true);
    expect(r.figures[0].category).toBe('customer');
  });
});

describe('N1 scope across the five employees (Tag, Byte, Finley, Goalie AI, Liberty)', () => {
  it('scope is computed from the tool input, so every employee calling transactions_query gets it', () => {
    expect(activeFilters({ type: 'all' } as any)).toEqual([]);
    expect(activeFilters({ type: 'all', startDate: '2026-10-01', endDate: '2026-10-31' } as any)).toEqual([]);
    expect(activeFilters({ type: 'income', merchant: 'x', minAmount: 5 } as any)).toEqual(['type', 'minAmount', 'merchant']);
  });
  it('the same capture applies at every chat.ts tool-result site (Prime, specialist, Tag after handoff, bridge)', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../chat.ts'), 'utf8');
    for (const marker of ['C-1 ledger (specialist)', 'C-1 ledger (grounding pre-execution)', "captureCashFlowForGuard('tx_search', b2cData)", 'captureCashFlowForGuard(tool, result); // P-LIVE-03']) {
      expect(chat, marker).toContain(marker);
    }
  });
});

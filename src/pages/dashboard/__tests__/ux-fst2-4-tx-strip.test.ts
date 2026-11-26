/**
 * UX-FST2-4 Transactions summary strip on the shared engine (owner 2026-11-26; AR-1b FR-008).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../TransactionsPageV2.tsx'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-4 Transactions strip', () => {
  it('no browser money totals (strip, compact summary or account cards)', () => {
    expect(code).not.toMatch(/totalSpent|totalIncome|netFlow|catData|catTotal/);
    expect(code).not.toMatch(/\.reduce\(\(s, t\)/);
  });
  it('totals come from useFinancialSummary for the date + account/statement scope', () => {
    expect(code).toMatch(/useFinancialSummary\(summaryReq\)/);
    expect(code).toMatch(/importIds: \[statementFilter\]/);
    expect(code).toMatch(/importIds: acct\.importIds/);
    expect(code).toMatch(/yearRange\(Number\(yearFilter\)\)/);
  });
  it('client-only filters show "N of M" and no money', () => {
    expect(code).toMatch(/const clientOnlyFilter = filter !== 'all' \|\| needsCategoryOnly \|\| !!tagCategoryFilter \|\| !!tagSubcategoryFilter \|\| !!searchQuery;/);
    expect(code).toMatch(/totals hidden while filters are on/);
  });
  it('owner labels, duplicates disclosed, coverage label, honest state', () => {
    for (const k of ['withdrawals', 'deposits', 'netCashFlow', 'actualIncome', 'actualSpending']) expect(code).toMatch(new RegExp(`FINANCIAL_LABELS\\.${k}\\b`));
    expect(code).toMatch(/sum\?\.signals\?\.possibleDuplicates\?\.count/);
    expect(code).toMatch(/possible duplicate/);
    expect(code).toMatch(/sum\.dataQuality\.totalsLabel/);
    expect(code).toMatch(/<FinancialStateNotice state=\{financial\}/);
    expect(code).not.toMatch(/>Spent <|>Income <|>Net <strong/);
  });
});

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
  it('UX-FST2-4b: rows use the engine classifier, never merchant patterns', () => {
    expect(code).not.toMatch(/isIncomeTx|INCOME_PATTERNS|PAYMENT\|CREDIT/);
    expect(code).toMatch(/classifyCashFlow\(/);
    expect(code).toMatch(/classifyRow\(t\)\.purpose === 'spending'/);
    expect(code).toMatch(/classifyRow\(t\)\.purpose === 'income'/);
    expect(code).toMatch(/\(isInflowRow\(t\) \? '' : '-'\)/); // CSV sign
    expect(code).toMatch(/const inflow = isInflowRow\(t\);/); // row sign
    expect(code).toMatch(/FINANCIAL_LABELS\.actualSpending : FINANCIAL_LABELS\.actualIncome/); // filter labels
  });
  it('TX-PAGING: paged complete read; incomplete list is stated; export refuses when incomplete', () => {
    const hook = fs.readFileSync(path.resolve(__dirname, '../../../hooks/useTransactions.ts'), 'utf8').replace(/\/\/.*$/gm, '');
    expect(hook).toMatch(/pagedSelectAll<CommittedTransaction>\(makeQuery\)/);
    expect(hook).not.toMatch(/\.limit\(5000\)/);
    expect(hook).toMatch(/\.order\('posted_at', \{ ascending: false \}\)\s*\.order\('id', \{ ascending: false \}\)/);
    expect(hook).toMatch(/setIsComplete\(read\.complete\)/);
    expect(hook).toMatch(/read\.complete && nextData\.length <= MAX_CACHE_ROWS/); // only complete sets are cached
    expect(code).toMatch(/isComplete: listReadComplete/);
    expect(code).toMatch(/const listIncomplete = !listReadComplete \|\| \(!!sum && scoped\.length < sum\.transactionCount\);/);
    expect(code).toMatch(/if \(listIncomplete\) \{\s*if \(!listReadTruncated\) \{\s*toast\.error\("Export stopped/);
    expect(code).toMatch(/xspensesai-transactions-filtered-/);
  });
  it('over the ceiling: honest message, and a scoped export read completely or refused', () => {
    expect(code).toMatch(/Your account has more than \$\{ceiling\} transactions, so this filtered view can't be exported yet/);
    expect(code).toMatch(/await readTransactionsPaged\(\{ userId, importIds: summaryReq\.importIds, \.\.\.\(allTime \? \{\} : \{ startDate: summaryReq\.startDate, endDate: summaryReq\.endDate \}\) \}\)/);
    // statement / account exports over all time keep undated rows (no date filter)
    expect(code).toMatch(/const allTime = !summaryReq \|\| summaryReq\.startDate === allTimeRange\(\)\.startDate;/);
    expect(code).toMatch(/if \(!res\.complete\)/);
    expect(code).toMatch(/exportRows = applyClientFilters\(res\.rows\)/);
    expect(code).toMatch(/const filtered = useMemo\(\(\) => applyClientFilters\(scoped\)/);
  });
  it('TX-EXPORT: unfiltered views export from the server; filtered views match its columns', () => {
    expect(code).toMatch(/if \(!clientOnlyFilter && summaryReq\) \{\s*const r = await fetchRowsExport\(\{ importIds: summaryReq\.importIds, \.\.\.\(allTime \? \{\} : \{ startDate: summaryReq\.startDate, endDate: summaryReq\.endDate \}\) \}\);/);
    expect(code).toMatch(/toast\.error\(r\.message\)/);
    expect(code).toMatch(/'Date,Merchant,Amount,Category,Subcategory,Statement'/);
    expect(code).not.toMatch(/Statement Source/);
  });
  it('says when the loaded list is incomplete', () => {
    expect(code).toMatch(/\(\{scoped\.length\} loaded\)/);
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

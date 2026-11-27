/**
 * X-1 — Transactions: one toolbar, one summary strip, overview on request.
 * Nothing removed: account cards, totals, donut and insights move into the overview.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { readTxToolbarParams, writeTxToolbarParams } from '../txToolbar';

const root = path.resolve(__dirname, '../../..');
const page = fs.readFileSync(path.join(root, 'src/pages/dashboard/TransactionsPageV2.tsx'), 'utf8');

describe('toolbar URL params', () => {
  it('round-trips from / to / type and keeps other params', () => {
    const qs = writeTxToolbarParams('?year=2025&issuer=BMO', { from: '2025-03-01', to: '2025-03-31', type: 'expenses' });
    expect(readTxToolbarParams('?' + qs)).toEqual({ from: '2025-03-01', to: '2025-03-31', type: 'expenses', needsCategory: false });
    expect(qs).toContain('year=2025');
    expect(qs).toContain('issuer=BMO');
    expect(writeTxToolbarParams('?type=income&from=2025-01-01', { from: '', to: '', type: 'all' })).toBe('');
    expect(readTxToolbarParams('?from=2025-3-1&type=bogus')).toEqual({ from: '', to: '', type: 'all', needsCategory: false });
  });
});

describe('toolbar', () => {
  it('search, year, dates, account, statement, category and type in one row', () => {
    const tb = page.slice(page.indexOf('{/* X-1: one toolbar'), page.indexOf('{/* X-1: one summary strip'));
    for (const s of ['placeholder="Search merchant, category or amount"', 'aria-label="Year"', 'aria-label="Date range"', 'aria-label="Account"', 'setStmtDropdownOpen(v => !v)', 'aria-label="Category"', 'aria-label="Transaction type"']) {
      expect(tb).toContain(s);
    }
  });

  it('date range replaces the year, using the Categories calendar-day rule', () => {
    expect(page).toMatch(/if \(isRangeActive\(range\)\) \{[\s\S]*?list = list\.filter\(t => inDateRange\(calendarDayOfTx\(t\), range\)\);/);
    expect(page).toMatch(/disabled=\{!!\(rangeFrom \|\| rangeTo\)\}/);
  });

  it('category filter reuses the existing category state (no new filter logic); reveal clears the dates', () => {
    expect(page).toMatch(/value=\{tagCategoryFilter\} onChange=\{\(e\) => \{ setTagCategoryFilter\(e\.target\.value\);/);
    expect(page).toMatch(/setRangeFrom\(''\); setRangeTo\(''\);/);
  });

  it('account select keeps the issuer URL handling of the account cards', () => {
    expect(page).toMatch(/if \(id === 'all'\) sp\.delete\('issuer'\); else sp\.set\('issuer', id\.split\('\|'\)\[0\] \|\| ''\);/);
  });

  it('search moved out of the list (one search box)', () => {
    expect(page.match(/placeholder="Search /g)?.length).toBe(1);
  });
});

describe('summary strip and overview', () => {
  it('one strip with counts from the existing calculations (no new review counter)', () => {
    expect(page).toMatch(/aria-expanded=\{overviewOpen\}\s*aria-controls="tx-overview-content"/);
    // LA-4: unfiltered views show the server's review line; filtered views keep the shown-rows count.
    expect(page).toMatch(/uncategorizedCount > 0 && <span[^>]*><strong[^>]*>\{uncategorizedCount\}<\/strong> need review<\/span>\}/);
    expect(page).toMatch(/needsReviewText\(sum\.needsReview, sum\.needsReviewCount/);
    expect(page.match(/const uncategorizedCount = /g)?.length).toBe(1);
  });

  it('TX-FIRST: no dashboard blocks above the list; an optional compact summary instead', () => {
    // owner: a genuine transaction-first page — the account cards, KPI cards, donut and AI
    // insights are removed (not hidden).
    expect(page).not.toContain('acct-scroll');
    expect(page).not.toContain('AI insights');
    expect(page).not.toMatch(/PieChart|ResponsiveContainer/);
    expect(page).not.toMatch(/label: 'Total Spent'/);
    // the compact summary renders only when opened, and starts closed
    // LA-2: the compact summary is also available for a single statement (server figures, statement scope).
    expect(page).toMatch(/\{!hasNoTransactions && overviewOpen && \(\s*<div id="tx-overview-content"/);
    expect(page).toMatch(/getItem\('xai\.tx\.summary\.open'\) === '1'/);
  });

  it('TX-FIRST: a brand-new account shows one getting-started card, not zero-value cards', () => {
    expect(page).toMatch(/const hasNoTransactions = !isLoading && transactions\.length === 0;/);
    expect(page).toMatch(/\{hasNoTransactions && \(\s*<section aria-labelledby="tx-getting-started"/);
    expect(page).toContain('No transactions yet');
    expect(page).toMatch(/\{!hasNoTransactions && <div className="rounded-xl border border-slate-700\/50 bg-slate-900\/30">/);
  });

  it('page actions are 44px', () => {
    expect(page).toMatch(/aria-label="Export transactions as CSV" className="[^"]*min-h-\[44px\]/);
    expect(page).toMatch(/aria-label="Refresh transactions" className=\{`[^`]*min-h-\[44px\]/);
  });
});

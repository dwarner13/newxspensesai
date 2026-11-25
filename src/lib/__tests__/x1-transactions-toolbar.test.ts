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
    expect(page).toMatch(/\{uncategorizedCount > 0 && <span[^>]*><strong[^>]*>\{uncategorizedCount\}<\/strong> need review<\/span>\}/);
    expect(page.match(/const uncategorizedCount = /g)?.length).toBe(1);
  });

  it('account cards, totals, donut and insights are kept, inside the overview', () => {
    expect(page).toMatch(/\{!isStatementMode && overviewOpen && <div\s*className="acct-scroll mb-3"/);
    expect(page).toMatch(/id="tx-overview-content" className=\{`grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 \$\{overviewOpen \? '' : 'hidden'\}`\}/);
    expect(page).toContain('Spending by category');
    expect(page).toContain('AI insights');
    // the overview is no longer forced open on desktop
    expect(page).not.toMatch(/overviewOpen \? '' : 'hidden md:grid'/);
  });

  it('page actions are 44px', () => {
    expect(page).toMatch(/aria-label="Export transactions as CSV" className="[^"]*min-h-\[44px\]/);
    expect(page).toMatch(/aria-label="Refresh transactions" className=\{`[^`]*min-h-\[44px\]/);
  });
});

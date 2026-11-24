/**
 * K-d — Categories: custom date range, account filter, Reset, expandable subcategories,
 * filters kept in the URL, and one filter rule shared by page totals and the detail.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { matchesCategoryFilters, inDateRange, rangeLabel, isRangeActive } from '../categoryPeriod';
import { groupImportsIntoAccounts, importIdsForAccount, detectIssuer, detectType } from '../accountGroups';
import { readCategoryFilters, writeCategoryFilters, hasActiveCategoryFilters } from '../categoryFilterUrl';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/CategoriesV2/CategoriesPageV2.tsx');
const hook = read('src/pages/CategoriesV2/useCategoriesData.ts');
const drawer = read('src/pages/CategoriesV2/CategoryDetailDrawer.tsx');
const row = read('src/pages/CategoriesV2/CategoryListRow.tsx');
const txPage = read('src/pages/dashboard/TransactionsPageV2.tsx');

const tx = (day: string, import_id = 'i1') => ({ posted_at: `${day}T00:00:00.000Z`, import_id });

describe('custom date range', () => {
  it('is inclusive on both ends and open-ended when one side is empty', () => {
    expect(inDateRange('2025-03-01', { from: '2025-03-01', to: '2025-03-31' })).toBe(true);
    expect(inDateRange('2025-03-31', { from: '2025-03-01', to: '2025-03-31' })).toBe(true);
    expect(inDateRange('2025-04-01', { from: '2025-03-01', to: '2025-03-31' })).toBe(false);
    expect(inDateRange('2030-01-01', { from: '2025-03-01' })).toBe(true);
    expect(inDateRange('2020-01-01', { to: '2025-03-31' })).toBe(true);
    expect(inDateRange(null, { from: '2025-03-01' })).toBe(false);
    expect(isRangeActive({})).toBe(false);
  });

  it('replaces the year / month filter when active; crosses year ends', () => {
    const f = { selectedYear: 2024 as const, selectedPeriod: '2024-12', range: { from: '2024-12-15', to: '2025-01-15' } };
    expect(matchesCategoryFilters(tx('2025-01-01'), f)).toBe(true);
    expect(matchesCategoryFilters(tx('2024-12-01'), f)).toBe(false);
    expect(matchesCategoryFilters(tx('2024-12-01'), { ...f, range: null })).toBe(true);
  });

  it('labels the range', () => {
    const id = (d: string) => d;
    expect(rangeLabel({ from: '2025-01-01', to: '2025-02-01' }, id)).toBe('2025-01-01 – 2025-02-01');
    expect(rangeLabel({ from: '2025-01-01' }, id)).toBe('From 2025-01-01');
    expect(rangeLabel({ to: '2025-02-01' }, id)).toBe('Until 2025-02-01');
  });
});

describe('account filter (same grouping as Transactions)', () => {
  const imports = [
    { id: 'a', status: 'committed', issuer: 'BMO', docName: 'BMO chequing.pdf' },
    { id: 'b', status: 'committed', issuer: null, docName: 'Triangle Mastercard.pdf' },
    { id: 'c', status: 'committed', issuer: 'BMO', docName: 'bmo chequing june.pdf' },
    { id: 'd', status: 'pending', issuer: 'TD', docName: 'td.pdf' },
  ];
  it('groups committed imports by issuer and type', () => {
    const g = groupImportsIntoAccounts(imports);
    expect(g.map(a => [a.id, a.name, a.importIds])).toEqual([
      ['BMO|Chequing', 'BMO Chequing', ['a', 'c']],
      ['Canadian Tire|Credit Card', 'Canadian Tire Credit', ['b']],
    ]);
    expect(detectIssuer({ id: 'x', docName: 'unknown.pdf' })).toBe('BMO');
    expect(detectType({ id: 'x', docName: 'visa.pdf' })).toBe('Credit Card');
  });
  it('scopes transactions by import id', () => {
    const g = groupImportsIntoAccounts(imports);
    const ids = importIdsForAccount(g, 'BMO|Chequing');
    expect(importIdsForAccount(g, 'all')).toBeNull();
    expect(matchesCategoryFilters(tx('2025-06-10', 'a'), { selectedYear: 'all', importIds: ids })).toBe(true);
    expect(matchesCategoryFilters(tx('2025-06-10', 'b'), { selectedYear: 'all', importIds: ids })).toBe(false);
  });
  it('Transactions now uses the shared grouping (moved unchanged)', () => {
    expect(txPage).toMatch(/for \(const a of groupImportsIntoAccounts\(imports\)\)/);
    expect(txPage).not.toMatch(/const detectIssuer = \(imp: any\)/);
  });
});

describe('filters survive navigation (URL)', () => {
  it('round-trips and ignores malformed values', () => {
    const qs = writeCategoryFilters('tab=x', { year: 2025, month: '2025-06', from: '', to: '', account: 'BMO|Chequing' });
    expect(readCategoryFilters('?' + qs)).toEqual({ year: 2025, month: '2025-06', from: '', to: '', account: 'BMO|Chequing' });
    expect(qs).toContain('tab=x');
    expect(readCategoryFilters('?year=all&month=June&from=2025-1-1')).toEqual({ year: 'all', month: '', from: '', to: '', account: '' });
    expect(writeCategoryFilters('', { year: 'all', month: '', from: '', to: '', account: 'all' })).toBe('');
  });
  it('knows when Reset is needed', () => {
    const base = { year: 2026, month: '', from: '', to: '', account: 'all', search: '' } as const;
    expect(hasActiveCategoryFilters(base, 2026)).toBe(false);
    expect(hasActiveCategoryFilters({ ...base, search: 'gas' }, 2026)).toBe(true);
    expect(hasActiveCategoryFilters({ ...base, year: 'all' }, 2026)).toBe(true);
    expect(hasActiveCategoryFilters({ ...base, account: 'BMO|Chequing' }, 2026)).toBe(true);
  });
});

describe('page, hook and drawer use one rule', () => {
  it('hook: account scope first, custom range replaces year / month', () => {
    expect(hook).toMatch(/allTransactions\.filter\(t => importIds\.has\(t\.import_id \|\| ""\)\)/);
    expect(hook).toMatch(/isRangeActive\(range\)\s*\? transactions\.filter\(t => inDateRange\(calendarDayOfTx\(t\), range\)\)/);
  });
  it('drawer: same filters, same rule', () => {
    expect(drawer).toMatch(/matchesCategoryFilters\(t, \{ selectedYear, selectedPeriod, range, importIds \}\)/);
    expect(page).toMatch(/range=\{rangeInvalid \? null : range\}\s*importIds=\{scopedImportIds\}/);
    expect(page).toMatch(/useCategoriesData\(selectedPeriod \|\| undefined, selectedYear, \{ range: rangeInvalid \? null : range, importIds: scopedImportIds \}\)/);
  });
  it('page: controls, Reset and URL sync', () => {
    expect(page).toMatch(/<option value="custom">Custom range…<\/option>/);
    expect(page).toMatch(/<option value="all">All accounts<\/option>/);
    expect(page).toMatch(/onClick=\{resetFilters\}/);
    expect(page).toMatch(/type="date"/);
    expect(page).toMatch(/writeCategoryFilters\(window\.location\.search/);
    expect(page).toMatch(/if \(!yearMounted\.current\) \{ yearMounted\.current = true; return; \}/);
  });
  it('row: subcategories expand inline with a separate 44px disclosure button', () => {
    expect(row).toMatch(/aria-expanded=\{expanded\}\s*aria-controls=\{listId\}/);
    expect(row).not.toMatch(/\.slice\(0, 3\)/);
    expect(row).toMatch(/onClick=\{\(\) => onSubcategory\(sub\.name, sub\.merchantNames\)\}/);
  });
});

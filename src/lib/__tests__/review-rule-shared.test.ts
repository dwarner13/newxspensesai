/**
 * Owner-approved review rule (2026-11-25): uncategorized only; customer-approved 'Other'
 * is not uncategorized; one shared predicate so the filter, banner and counts agree.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { needsCategory, countNeedsCategory } from '../needsCategory';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const tx = read('src/pages/dashboard/TransactionsPageV2.tsx');
const cat = read('src/pages/CategoriesV2/useCategoriesData.ts');

describe('needsCategory', () => {
  it('no category or Uncategorized only; Other is not uncategorized', () => {
    for (const c of [null, undefined, '', '  ', 'Uncategorized', 'uncategorized']) expect(needsCategory(c as never)).toBe(true);
    for (const c of ['Other', 'Groceries', 'Transfers']) expect(needsCategory(c)).toBe(false);
    expect(countNeedsCategory([{ category: null }, { category: 'Other' }, { category: 'Uncategorized' }, { category: 'Dining' }])).toBe(2);
  });
});

describe('every count, filter and banner uses it', () => {
  it('Transactions: strip / banner count, toolbar filter, rows and account totals', () => {
    expect(tx).toMatch(/const uncategorizedCount = countNeedsCategory\(filtered\);/);
    expect(tx).toMatch(/if \(needsCategoryOnly\) list = list\.filter\(t => needsCategory\(t\.category\)\);/);
    expect(tx).toMatch(/const isUncat = needsCategory\(t\.category\);/);
    // TX-FIRST: the AI insights card (and its uncatCount) was removed with the dashboard blocks.
    expect(tx).toMatch(/if \(needsCategory\(t\.category\)\) \{/);
    expect(tx).not.toMatch(/=== 'Other'/);
    expect(tx).not.toMatch(/t\.category === 'Uncategorized'/);
  });
  it('Categories: review count and flagged list', () => {
    expect(cat).toMatch(/const uncategorizedCount = countNeedsCategory\(periodFiltered\);/);
    expect(cat).toMatch(/\.filter\(t => needsCategory\(t\.category\)\)/);
    expect(cat).not.toMatch(/t\.category === "Other"/);
  });
});

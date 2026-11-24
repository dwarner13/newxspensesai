/**
 * K-b — category detail respects the selected year / month, lists every transaction
 * (paged), keeps the existing save payloads and confirms saves honestly.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { inSelectedPeriod, periodLabel, periodKeyOf } from '../categoryPeriod';
import { formatMonthPeriod } from '../categoryList';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const drawer = read('src/pages/CategoriesV2/CategoryDetailDrawer.tsx');
const page = read('src/pages/CategoriesV2/CategoriesPageV2.tsx');
const hook = read('src/pages/CategoriesV2/useCategoriesData.ts');

describe('period predicate (mirrors useCategoriesData)', () => {
  // A mid-month timestamp is unaffected by timezone, so these hold in any zone.
  const june = '2025-06-15T12:00:00.000Z';
  it('filters by year and month', () => {
    expect(inSelectedPeriod(june, 2025, undefined)).toBe(true);
    expect(inSelectedPeriod(june, 2024, undefined)).toBe(false);
    expect(inSelectedPeriod(june, 'all', '2025-06')).toBe(true);
    expect(inSelectedPeriod(june, 2025, '2025-07')).toBe(false);
    expect(inSelectedPeriod(null, 'all', undefined)).toBe(true);
    expect(inSelectedPeriod(null, 2025, undefined)).toBe(false);
    expect(periodKeyOf(june)).toBe('2025-06');
  });

  it('labels the period', () => {
    expect(periodLabel(2025, '2025-06', formatMonthPeriod)).toBe('Jun 2025');
    expect(periodLabel(2025, undefined, formatMonthPeriod)).toBe('2025');
    expect(periodLabel('all', undefined, formatMonthPeriod)).toBe('All years');
  });

  it('uses the same date rules as the page hook (K-c: calendar day)', () => {
    expect(hook).toMatch(/yearOf\(calendarDayOfTx\(t\)\) === selectedYear/);
    expect(hook).toMatch(/periodKeyOf\(calendarDayOfTx\(t\)\) === selectedPeriod/);
  });
});

describe('CategoryDetailDrawer', () => {
  it('filters by the page period and no longer caps at 10 / 15', () => {
    expect(drawer).toMatch(/\.filter\(t => inSelectedPeriod\(calendarDayOfTx\(t\), selectedYear, selectedPeriod\)\)/);
    expect(drawer).not.toMatch(/\.slice\(0, 15\)|base\.slice\(0, 10\)/);
    expect(drawer).toMatch(/const catTransactions = allCatTransactions\.slice\(0, visibleCount\);/);
    expect(drawer).toMatch(/Show more \(\{allCatTransactions\.length - catTransactions\.length\} more\)/);
  });

  it('keeps the existing save payloads', () => {
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ id: txId, table: 'transactions', category: newCategory, applyToVendor: false \}\)/);
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ id: txId, table: 'transactions', category, subcategory \}\)/);
  });

  it('rolls back unconfirmed saves; subcategory now checks res.ok', () => {
    expect(drawer).toMatch(/setLocalCategories\(prev => \(\{ \.\.\.prev, \[txId\]: prevCategory \}\)\);/);
    const sub = drawer.slice(drawer.indexOf('const handleSubcategoryChange'), drawer.indexOf('// K-b: same year / month rules'));
    expect(sub).toMatch(/if \(!res\.ok\) throw new Error\('Save failed'\);\s*toast\.success\('Subcategory saved'\);/);
    expect(sub).toMatch(/setLocalSubcategories\(prev => \(\{ \.\.\.prev, \[txId\]: prevSubcategory \}\)\);/);
  });

  it('is accessible, readable and full width on phones', () => {
    expect(drawer).toMatch(/role="dialog"/);
    expect(drawer).toMatch(/aria-label="Close category details" style=\{\{ width: 44, height: 44/);
    expect(drawer).toMatch(/<button type="button" onClick=\{\(\) => setExpandedTxId\(isExpanded \? null : t\.id\)\} aria-expanded=\{isExpanded\}/);
    expect(drawer).toMatch(/formatCalendarDate\(calendarDayOfTx\(t\), 'medium'\)/);
    expect(drawer).toMatch(/width: isMobile \? "100%" : 440/);
  });
});

describe('page wiring', () => {
  it('passes the year and month to the drawer', () => {
    expect(page).toMatch(/selectedYear=\{selectedYear\}\s*selectedPeriod=\{selectedPeriod \|\| undefined\}/);
  });
});

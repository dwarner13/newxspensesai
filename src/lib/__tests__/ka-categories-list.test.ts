/**
 * K-a — compact, searchable Categories list. Filters (year, month, search), counts,
 * Export, Tag Rules, Goalie budget, Tag review and the detail drawer are preserved.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { categoryShare, trendLabel, formatMonthPeriod } from '../categoryList';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/CategoriesV2/CategoriesPageV2.tsx');
const row = read('src/pages/CategoriesV2/CategoryListRow.tsx');

describe('helpers', () => {
  it('share of expenses', () => {
    expect(categoryShare(250, 1000)).toBe(25);
    expect(categoryShare(0, 1000)).toBe(0);
    expect(categoryShare(50, 0)).toBe(0);
    expect(categoryShare(2000, 1000)).toBe(100);
  });

  it('trend label keeps the existing thresholds', () => {
    expect(trendLabel(0)).toEqual({ text: '', tone: 'flat' });
    expect(trendLabel(12)).toEqual({ text: '↑12%', tone: 'up' });
    expect(trendLabel(-8)).toEqual({ text: '↓8%', tone: 'down' });
    expect(trendLabel(4).tone).toBe('flat');
  });

  it('month label', () => {
    expect(formatMonthPeriod('2025-06')).toBe('Jun 2025');
    expect(formatMonthPeriod('bad')).toBe('bad');
  });
});

describe('Categories page', () => {
  it('uses the compact list instead of the card grid', () => {
    expect(page).toMatch(/<CategoryListRow\s+key=\{cat\.name\}/);
    expect(page).not.toMatch(/<CategoryCard/);
    expect(page).not.toMatch(/gridTemplateColumns: isMobile \? "1fr" : "repeat\(3, 1fr\)"/);
  });

  it('keeps year, month and search filters wired to the same data hook', () => {
    expect(page).toMatch(/const data = useCategoriesData\(selectedPeriod \|\| undefined, selectedYear\);/);
    expect(page).toMatch(/onChange=\{\(e\) => setSelectedYear\(/);
    expect(page).toMatch(/onChange=\{\(e\) => setSelectedPeriod\(e\.target\.value\)\}/);
    expect(page).toMatch(/onChange=\{e => setSearch\(e\.target\.value\)\}/);
    expect(page).toMatch(/\{data\.categoryCount\} categories &middot; \{totalTxCount\} transactions/);
  });

  it('keeps Export, Tag rules, Refresh and Goalie budget (budget save unchanged)', () => {
    expect(page).toMatch(/onClick=\{handleExport\}/);
    expect(page).toMatch(/navigate\('\/dashboard\/categories\/rules'\)/);
    expect(page).toMatch(/onSelect: handleRefresh/);
    expect(page).toMatch(/setBudgetModal\(true\)/);
    expect(page).toMatch(/from\('category_budgets'\)\.upsert\(/);
  });

  it('⋯ menu is an accessible menu with 44px items', () => {
    expect(page).toMatch(/aria-haspopup="menu" aria-expanded=\{menuOpen\} aria-label="More actions"/);
    expect(page).toMatch(/role="menuitem"/);
    expect(page).toMatch(/e\.key === "Escape"\) setMenuOpen\(false\)/);
  });

  it('keeps the detail drawer, subcategory filter and Tag on request', () => {
    expect(page).toMatch(/onOpen=\{\(\) => \{ setSubcategoryFilter\(null\); setSelectedCategory\(cat\); \}\}/);
    expect(page).toMatch(/onSubcategory=\{\(name, merchantNames\) => \{ setSubcategoryFilter\(\{ name, merchantNames \}\); setSelectedCategory\(cat\); \}\}/);
    expect(page).toMatch(/<CategoryDetailDrawer/);
    expect(page).toMatch(/onClick=\{\(\) => setCopilotOpen\(true\)\}/);
  });

  it('keeps Transfers separate and out of the expense share', () => {
    expect(page).toMatch(/category=\{transfersCategory\}[\s\S]*?showShare=\{false\}/);
  });
});

describe('CategoryListRow', () => {
  it('is an accessible row with a descriptive label and 60px+ height', () => {
    expect(row).toMatch(/aria-label=\{`\$\{category\.name\}: \$\$\{fmt\(category\.spent\)\}, \$\{category\.transactionCount\} transactions/);
    expect(row).toMatch(/minHeight: isMobile \? 64 : 60/);
  });

  it('subcategory chips are separate buttons (no nested buttons)', () => {
    const rowButtonEnd = row.indexOf('</button>');
    expect(row.indexOf('{subs.length > 0 && onSubcategory && (')).toBeGreaterThan(rowButtonEnd);
  });
});

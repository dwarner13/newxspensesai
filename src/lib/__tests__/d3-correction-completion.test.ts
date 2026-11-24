/**
 * D-3 — successful-correction card and Done navigation.
 * Success is shown only after the existing tx-update-category call returns ok; a failed
 * save rolls the screen back to the last confirmed value. Done returns to the same row
 * without touching filters.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const drawer = read('src/components/transactions/TransactionInsightDrawer.tsx');
const page = read('src/pages/dashboard/TransactionsPageV2.tsx');

const applyFn = drawer.slice(drawer.indexOf('const applyCategory'), drawer.indexOf('const saveTagRule'));
const subFn = drawer.slice(drawer.indexOf('const handleSubcategoryChange'), drawer.indexOf('const saveNewSubcategory'));

describe('category save', () => {
  it('sets the success notice only after res.ok', () => {
    const okIdx = applyFn.indexOf("if (!res.ok) throw new Error(await res.text());");
    const noticeIdx = applyFn.indexOf("setSavedNotice({ kind: 'category', value: category })");
    expect(okIdx).toBeGreaterThan(-1);
    expect(noticeIdx).toBeGreaterThan(okIdx);
  });

  it('rolls back to the confirmed category on failure', () => {
    expect(applyFn).toMatch(/const previousCategory = localCategory;/);
    expect(applyFn).toMatch(/catch \{\s*\/\/[^\n]*\n\s*setLocalCategory\(previousCategory\);/);
  });

  it('keeps the payload identical', () => {
    expect(applyFn).toMatch(/body: JSON\.stringify\(\{ id: row\.transaction\.id, table, category, applyToVendor: row\.kind === 'committed' \}\)/);
  });
});

describe('subcategory save', () => {
  it('now checks res.ok, confirms on success and rolls back on failure', () => {
    expect(subFn).toMatch(/if \(!res\.ok\) throw new Error/);
    expect(subFn.indexOf("setSavedNotice({ kind: 'subcategory'")).toBeGreaterThan(subFn.indexOf('if (!res.ok)'));
    expect(subFn).toMatch(/setLocalSubcategory\(previousSubcategory\);/);
    expect(subFn).toMatch(/toast\.error\('Could not save subcategory'\)/);
    expect(subFn).toMatch(/body: JSON\.stringify\(\{ id: row\.transaction\.id, table, category: localCategory, subcategory: value \}\)/);
  });
});

describe('success card', () => {
  it('is a status region with Done and Keep editing', () => {
    expect(drawer).toMatch(/\{savedNotice && \(\s*<div role="status"/);
    expect(drawer).toMatch(/if \(onDone\) onDone\(row\.transaction\.id\); else onClose\(\);/);
    expect(drawer).toMatch(/>Keep editing</);
  });

  it('clears when another transaction opens', () => {
    expect(drawer).toMatch(/setChatReply\(null\);\s*setSavedNotice\(null\);/);
  });
});

describe('Done navigation on Transactions', () => {
  it('closes the drawer and returns focus to the same row without touching filters', () => {
    const done = page.slice(page.indexOf('const handleDrawerDone'), page.indexOf('const fetchTagInsight'));
    expect(done).toMatch(/handleDrawerClose\(\);/);
    expect(done).toMatch(/\[data-tx-id="\$\{CSS\.escape\(txId\)\}"\]/);
    expect(done).toMatch(/scrollIntoView\(\{ block: 'nearest' \}\)/);
    expect(done).not.toMatch(/setFilter|setSearch|applyFilters|setVisibleCount/);
    expect(page).toMatch(/onDone=\{handleDrawerDone\}/);
    expect(page).toMatch(/lastEditedTxId === t\.id \? \{ background: 'rgba\(52,211,153,0\.10\)'/);
  });
});

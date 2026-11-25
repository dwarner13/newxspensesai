/**
 * X-3 — review flow: "Needs category" quick filter, focus back to the row on close, and the
 * list's place (rows loaded + scroll) kept for the session on return to the same filters.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { filterKey, parsePosition, serializePosition, TX_LIST_POSITION_TTL_MS } from '../txListPosition';
import { readTxToolbarParams, writeTxToolbarParams } from '../txToolbar';

const root = path.resolve(__dirname, '../../..');
const page = fs.readFileSync(path.join(root, 'src/pages/dashboard/TransactionsPageV2.tsx'), 'utf8');

describe('position helpers', () => {
  it('filter key ignores one-shot deep-link params and param order', () => {
    expect(filterKey('?year=2025&type=income&txId=abc')).toBe(filterKey('?type=income&year=2025'));
    expect(filterKey('?year=2025')).not.toBe(filterKey('?year=2024'));
  });

  it('restores only for the same filters within 30 minutes', () => {
    const now = 1_000_000_000;
    const raw = serializePosition('?year=2025', 230, 1840.6, now);
    expect(parsePosition(raw, '?year=2025', now + 1000)).toEqual({ search: 'year=2025', visibleCount: 230, scrollTop: 1841, savedAt: now });
    expect(parsePosition(raw, '?year=2024', now + 1000)).toBeNull();
    expect(parsePosition(raw, '?year=2025', now + TX_LIST_POSITION_TTL_MS + 1)).toBeNull();
    expect(parsePosition('not json', '?year=2025', now)).toBeNull();
    expect(parsePosition(null, '', now)).toBeNull();
  });

  it('?review=1 round-trips', () => {
    expect(readTxToolbarParams('?' + writeTxToolbarParams('', { from: '', to: '', type: 'all', needsCategory: true })).needsCategory).toBe(true);
    expect(writeTxToolbarParams('?review=1', { from: '', to: '', type: 'all', needsCategory: false })).toBe('');
  });
});

describe('page wiring', () => {
  it('"Needs category" uses the existing uncategorized check and is a pressed-state toggle', () => {
    expect(page).toMatch(/if \(needsCategoryOnly\) list = list\.filter\(t => needsCategory\(t\.category\)\);/);
    expect(page).toMatch(/aria-pressed=\{needsCategoryOnly\} onClick=\{\(\) => setNeedsCategoryOnly\(v => !v\)\}/);
  });

  it('the review banner button now applies that filter', () => {
    expect(page).toMatch(/onClick=\{\(\) => \{ setNeedsCategoryOnly\(true\); listRef\.current\?\.scrollIntoView/);
    expect(page).not.toMatch(/<button onClick=\{\(\) => setFilter\('all'\)\}[^>]*>Review<\/button>/);
  });

  it('closing the drawer returns focus to the row (no side effects in a state updater)', () => {
    expect(page).toMatch(/const id = selectedTxRef\.current\?\.id;\s*setSelectedTx\(null\);/);
  });

  it('list place is saved on leave and restored once data has loaded; deep links win', () => {
    expect(page).toMatch(/sessionStorage\.setItem\(TX_LIST_POSITION_KEY, serializePosition\(/);
    expect(page).toMatch(/if \(!saved \|\| \/\[\?&\]\(txId\|tagTx\)=\/\.test\(window\.location\.search\)\) return;/);
    expect(page).toMatch(/setRangeFrom\(''\); setRangeTo\(''\); setNeedsCategoryOnly\(false\);/);
  });
});

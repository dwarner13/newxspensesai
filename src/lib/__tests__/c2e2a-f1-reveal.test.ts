/**
 * C2-E2A-F1 — the reviewed transaction is actually brought into view.
 *
 * Browser failure (staging fa84448): "Review with Tag" opened Tag focused on the right
 * transaction, but Transactions stayed at the top — rows carried no identifier, nothing
 * scrolled to or highlighted the selected row, and filters / "load more" could hide it.
 *
 * This renders a real React list (jsdom) that uses the same hook and row attributes as
 * TransactionsPageV2, and checks the DOM: the right row is rendered, scrolled to and
 * highlighted; filters that hide it are reset to its own year; "load more" is extended;
 * unresolved IDs highlight nothing.
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { JSDOM } from 'jsdom';
// A DOM from the repo's own jsdom (the pinned vitest runner cannot load its jsdom environment).
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const g = globalThis as unknown as Record<string, unknown>;
for (const k of ['window', 'document', 'HTMLElement', 'Node', 'Element', 'requestAnimationFrame']) g[k] = (dom.window as unknown as Record<string, unknown>)[k];
let React: typeof import('react');
let createRoot: typeof import('react-dom/client').createRoot;
let act: typeof import('react-dom/test-utils').act;
let useRevealReviewedTransaction: typeof import('../../hooks/useRevealReviewedTransaction').useRevealReviewedTransaction;
beforeAll(async () => {
  React = await import('react');
  ({ createRoot } = await import('react-dom/client'));
  ({ act } = await import('react-dom/test-utils'));
  ({ useRevealReviewedTransaction } = await import('../../hooks/useRevealReviewedTransaction'));
});
import { filtersRevealing, visibleCountFor, type TxListFilters } from '../tagReview';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Tx = { id: string; date: string; merchant_name: string; category: string; import_id: string };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// 150 rows in 2026 (newest first) + 20 rows in 2025
const TXS: Tx[] = [
  ...Array.from({ length: 150 }, (_, i) => ({ id: uuid(i + 1), date: `2026-${String(12 - Math.floor(i / 13)).padStart(2, '0')}-${String(28 - (i % 13)).padStart(2, '0')}`, merchant_name: `M${i + 1}`, category: i % 2 ? 'Groceries' : 'Shopping', import_id: i % 3 ? 'imp-a' : 'imp-b' })),
  ...Array.from({ length: 20 }, (_, i) => ({ id: uuid(500 + i), date: `2025-06-${String(20 - i).padStart(2, '0')}`, merchant_name: `Old${i}`, category: 'Groceries', import_id: 'imp-a' })),
];

const scrolled: string[] = [];
let lastFilters: TxListFilters | null = null;

function Harness({ highlight, initial }: { highlight: string | null; initial: Partial<TxListFilters> & { visibleCount?: number } }) {
  const { useState, useMemo, useCallback } = React;
  const [year, setYear] = useState<number | 'all'>(initial.year ?? 2026);
  const [category, setCategory] = useState(initial.category ?? '');
  const [statement, setStatement] = useState(initial.statement ?? 'all');
  const [search, setSearch] = useState(initial.search ?? '');
  const [visibleCount, setVisibleCount] = useState(initial.visibleCount ?? 100);
  const filtered = useMemo(() => TXS
    .filter(t => year === 'all' || t.date.slice(0, 4) === String(year))
    .filter(t => !category || t.category === category)
    .filter(t => statement === 'all' || t.import_id === statement)
    .filter(t => !search || t.merchant_name.toLowerCase().includes(search.toLowerCase())), [year, category, statement, search]);
  const applyFilters = useCallback((f: TxListFilters) => {
    lastFilters = f;
    setYear(f.year); setCategory(f.category); setStatement(f.statement); setSearch(f.search);
  }, []);
  useRevealReviewedTransaction({ highlightTxId: highlight, transactions: TXS, filtered, visibleCount, setVisibleCount, applyFilters });
  return React.createElement('div', null, filtered.slice(0, visibleCount).map(t =>
    React.createElement('button', { key: t.id, 'data-tx-id': t.id, 'aria-current': highlight === t.id ? 'true' : undefined }, t.merchant_name)));
}

async function mount(highlight: string | null, initial: Partial<TxListFilters> & { visibleCount?: number } = {}) {
  const host = document.createElement('div');
  document.body.innerHTML = '';
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => { root.render(React.createElement(Harness, { highlight, initial })); });
  await act(async () => { await Promise.resolve(); });
  return host;
}

beforeEach(() => {
  scrolled.length = 0; lastFilters = null;
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => { cb(0); return 0; }) as typeof window.requestAnimationFrame;
  if (!(globalThis as { CSS?: unknown }).CSS) (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = { escape: (s: string) => s };
  HTMLElement.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) { scrolled.push(this.getAttribute('data-tx-id') || ''); });
});

describe('the selected row is rendered, scrolled to and highlighted', () => {
  it('a row already in view: scrolled to and marked aria-current', async () => {
    const host = await mount(uuid(5));
    expect(scrolled).toEqual([uuid(5)]);
    const row = host.querySelector(`[data-tx-id="${uuid(5)}"]`)!;
    expect(row.getAttribute('aria-current')).toBe('true');
    expect(host.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
  });

  it('a row beyond "load more" (row 130 of 150): rows extended, then scrolled to that exact row', async () => {
    const host = await mount(uuid(130));
    expect(host.querySelector(`[data-tx-id="${uuid(130)}"]`)).not.toBeNull();
    expect(scrolled).toEqual([uuid(130)]);
  });

  it('hidden by filters (2025 row under the 2026 default, plus category + search): filters reset to its own year, then scrolled', async () => {
    const host = await mount(uuid(505), { year: 2026, category: 'Shopping', search: 'zzz' });
    expect(lastFilters).toEqual({ year: 2025, type: 'all', statement: 'all', account: 'all', category: '', subcategory: '', search: '' });
    expect(host.querySelector(`[data-tx-id="${uuid(505)}"]`)?.getAttribute('aria-current')).toBe('true');
    expect(scrolled).toEqual([uuid(505)]);
  });

  it('never scrolls to or highlights a different transaction', async () => {
    const host = await mount(uuid(42), { statement: 'imp-b' }); // 42 is in imp-a → hidden by statement filter
    expect(scrolled).toEqual([uuid(42)]);
    expect([...host.querySelectorAll('[aria-current="true"]')].map(e => e.getAttribute('data-tx-id'))).toEqual([uuid(42)]);
  });
});

describe('unresolved transactions reveal nothing', () => {
  it('an ID not in the loaded (user-owned) list: no filter change, no scroll, no highlight', async () => {
    const host = await mount(uuid(9999));
    expect(lastFilters).toBeNull();
    expect(scrolled).toEqual([]);
    expect(host.querySelectorAll('[aria-current="true"]')).toHaveLength(0);
  });
  it('no highlight requested: nothing happens', async () => {
    await mount(null);
    expect(scrolled).toEqual([]);
    expect(lastFilters).toBeNull();
  });
});

describe('helpers', () => {
  it('filtersRevealing uses the transaction own year, or all years when the date is unknown', () => {
    expect(filtersRevealing('2025-06-20').year).toBe(2025);
    expect(filtersRevealing('').year).toBe('all');
    expect(filtersRevealing(null).year).toBe('all');
  });
  it('visibleCountFor extends only when needed', () => {
    expect(visibleCountFor(5, 100)).toBe(100);
    expect(visibleCountFor(129, 100)).toBe(139);
    expect(visibleCountFor(-1, 100)).toBe(100);
  });
});

describe('TransactionsPageV2 wiring (the live page uses the same hook and row attributes)', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../pages/dashboard/TransactionsPageV2.tsx'), 'utf8');
  it('rows carry data-tx-id + aria-current + a visible highlight and screen-reader text', () => {
    expect(page).toContain("data-tx-id={t.id} aria-current={highlightTxId === t.id ? 'true' : undefined}");
    expect(page).toContain("highlightTxId === t.id ? { background: 'rgba(34,211,238,0.12)'");
    expect(page).toContain('Selected for review with Tag.');
  });
  it('the page calls the hook with its real list state and resets every filter that can hide a row', () => {
    expect(page).toContain('useRevealReviewedTransaction({ highlightTxId, transactions, filtered, visibleCount, setVisibleCount, applyFilters: applyRevealFilters });');
    expect(page).toMatch(/setYearFilter\(f\.year\); setFilter\(f\.type\); setStatementFilter\(f\.statement\); setAccountFilter\(f\.account\);\s+setTagCategoryFilter\(f\.category\); setTagSubcategoryFilter\(f\.subcategory\); setSearchQuery\(f\.search\);/);
  });
  it('only a resolved, owned transaction is highlighted; closing Tag / Back to Prime clears it', () => {
    expect(page).toContain('setHighlightTxId(tx ? tx.id : null); // only a resolved, owned row is ever highlighted');
    expect(page.match(/setHighlightTxId\(null\)/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it('the same transaction can be reviewed again (consumed marker resets when the param is gone)', () => {
    expect(page).toContain("if (!requested) { tagTxConsumedRef.current = null; return; }");
  });
});

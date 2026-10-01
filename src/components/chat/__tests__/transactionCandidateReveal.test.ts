/**
 * TransactionCandidateListCard reveal — timing, rendering and wiring.
 *
 * Runs PRODUCTION code: the timing helper, the real card component (via
 * react-dom, already installed) and PrimeChatV2 wiring. No test dependency added.
 * Static rendering runs in node; re-render tests create a DOM with the
 * project's existing jsdom package before loading react-dom/client.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  candidateRowDelayMs,
  candidateRowStaggerMs,
  candidateRevealTotalMs,
  MAX_REVEAL_MS,
  CANDIDATE_REVEAL_CSS,
} from '../transactionCandidateReveal';
import { TransactionCandidateListCard, type TxCandidate } from '../TransactionCandidateListCard';

const PRIME_SRC = fs.readFileSync(path.resolve(__dirname, '../../../pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');
const REVEAL_SRC = fs.readFileSync(path.resolve(__dirname, '../../../pages/PrimeChatV2/candidateCardReveal.ts'), 'utf8');

function candidates(n: number): TxCandidate[] {
  return Array.from({ length: n }, (_, i) => ({
    ordinal: i + 1,
    id: `${String(i + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
    merchant: `MERCHANT ${i + 1}`,
    date: '2025-10-10',
    amount: -(100 + i),
    category: 'Groceries',
    subcategory: null,
  }));
}

const render = (n: number, animateReveal?: boolean) =>
  renderToStaticMarkup(createElement(TransactionCandidateListCard, { candidates: candidates(n), animateReveal }));

type GlobalWithDom = { window?: unknown; document?: unknown };
const g = globalThis as unknown as GlobalWithDom;

// ─────────────────────────────────────────────────────────────────────────────
// 1–5. Timing
// ─────────────────────────────────────────────────────────────────────────────
describe('timing', () => {
  it('1. one row: starts at 80ms, total ≈ 300ms', () => {
    expect(candidateRowDelayMs(0, 1)).toBe(80);
    expect(candidateRevealTotalMs(1)).toBe(300);
  });

  it('2. ten rows: last row starts at 440ms, total ≈ 660ms', () => {
    expect(candidateRowStaggerMs(10)).toBe(40);
    expect(candidateRowDelayMs(9, 10)).toBe(440);
    expect(candidateRevealTotalMs(10)).toBe(660);
  });

  it('3. twenty-five rows: last row starts at 440ms, total ≈ 660ms', () => {
    expect(candidateRowStaggerMs(25)).toBe(15);
    expect(candidateRowDelayMs(24, 25)).toBe(440);
    expect(candidateRevealTotalMs(25)).toBe(660);
  });

  it('4. total never exceeds the cap for any valid candidate count (1–25)', () => {
    expect(MAX_REVEAL_MS).toBe(660);
    for (let n = 1; n <= 25; n++) expect(candidateRevealTotalMs(n)).toBeLessThanOrEqual(MAX_REVEAL_MS);
  });

  it('5. row delays increase monotonically top to bottom', () => {
    for (const n of [2, 10, 17, 25]) {
      const delays = Array.from({ length: n }, (_, i) => candidateRowDelayMs(i, n));
      for (let i = 1; i < n; i++) expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6–11. Rendering
// ─────────────────────────────────────────────────────────────────────────────
describe('rendering', () => {
  it('6. animateReveal=false (default): no animation, no keyframes, no reveal markers', () => {
    for (const html of [render(10), render(10, false)]) {
      expect(html).not.toContain('animation');
      expect(html).not.toContain('<style>');
      expect(html).not.toContain('data-tx-reveal');
    }
  });

  it('7. animateReveal=true: card and every row carry the reveal, only opacity/transform keyframes', () => {
    const html = render(10, true);
    expect(html).toContain('animation:txCandidateCardIn 180ms ease-out both');
    for (let i = 0; i < 10; i++) {
      expect(html).toContain(`animation:txCandidateRowIn 220ms ease-out ${candidateRowDelayMs(i, 10)}ms both`);
    }
    expect(CANDIDATE_REVEAL_CSS).toContain('translateY(4px)');
    expect(CANDIDATE_REVEAL_CSS).toContain('translateY(3px)');
    expect(CANDIDATE_REVEAL_CSS).toContain('prefers-reduced-motion: reduce');
    expect(CANDIDATE_REVEAL_CSS).not.toMatch(/height|margin|padding|width|top:|left:/);
  });

  it('8. reduced motion: no animation or stagger delay even when animateReveal=true', () => {
    g.window = { matchMedia: (q: string) => ({ matches: q.includes('reduce'), media: q }) };
    try {
      const html = render(10, true);
      expect(html).not.toContain('animation');
      expect(html).not.toContain('data-tx-reveal');
      expect(html).toBe(render(10, false));
    } finally {
      delete g.window;
    }
  });

  it('9–11. row order, transaction text and data-testid/ordinal mapping are identical with and without reveal', () => {
    const strip = (h: string) => h
      .replace(/<style>[\s\S]*?<\/style>/g, '')
      .replace(/ data-tx-reveal="(card|row)"/g, '')
      .replace(/;?animation:[^;"]*/g, '');
    expect(strip(render(10, true))).toBe(render(10, false));
    const html = render(10, true);
    const ids = Array.from(html.matchAll(/data-testid="tx-candidate-(\d+)"/g), m => Number(m[1]));
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(html.indexOf('MERCHANT 1<')).toBeLessThan(html.indexOf('MERCHANT 10<'));
    expect(html).toContain('$109.00');
  });

  it('all rows mount at once (no progressive insertion)', () => {
    const html = render(25, true);
    expect((html.match(/data-testid="tx-candidate-\d+"/g) || []).length).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Re-render stability
// ─────────────────────────────────────────────────────────────────────────────
describe('14. the reveal decision is frozen at mount', () => {
  type Dom = { window: { document: Document; close: () => void } };
  let dom: Dom;
  let createRoot: typeof import('react-dom/client').createRoot;
  let flushSync: typeof import('react-dom').flushSync;
  beforeAll(async () => {
    const { JSDOM } = await import('jsdom');
    dom = new JSDOM('<!doctype html><html><body></body></html>') as unknown as Dom;
    g.window = dom.window;
    g.document = dom.window.document;
    ({ createRoot } = await import('react-dom/client'));
    ({ flushSync } = await import('react-dom'));
  });
  afterAll(() => {
    dom.window.close();
    delete g.window;
    delete g.document;
  });

  it('a later re-render (even with a flipped prop) neither restarts nor cancels the reveal', () => {
    const host = dom.window.document.createElement('div');
    const root = createRoot(host);
    const list = candidates(3);
    flushSync(() => root.render(createElement(TransactionCandidateListCard, { candidates: list, animateReveal: true })));
    const card = host.querySelector('[data-testid="tx-candidate-list-card"]') as HTMLElement;
    const before = card.getAttribute('style');
    expect(before).toContain('txCandidateCardIn');
    flushSync(() => root.render(createElement(TransactionCandidateListCard, { candidates: list, animateReveal: false })));
    const sameCard = host.querySelector('[data-testid="tx-candidate-list-card"]') as HTMLElement;
    expect(sameCard).toBe(card); // same element — not remounted
    expect(sameCard.getAttribute('style')).toBe(before);
    root.unmount();
  });

  it('a history card mounted without reveal never starts animating on re-render', () => {
    const host = dom.window.document.createElement('div');
    const root = createRoot(host);
    const list = candidates(3);
    flushSync(() => root.render(createElement(TransactionCandidateListCard, { candidates: list, animateReveal: false })));
    flushSync(() => root.render(createElement(TransactionCandidateListCard, { candidates: list, animateReveal: true })));
    expect(host.innerHTML).not.toContain('animation');
    root.unmount();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12–13, 15–16. PrimeChatV2 wiring
// ─────────────────────────────────────────────────────────────────────────────
describe('PrimeChatV2 wiring', () => {
  it('12–13. live reveals animate; hydrated history (typed via ref only) does not', () => {
    expect(PRIME_SRC).toContain('animateReveal={typedMessageIds.has(msg.id) || !typedIdsRef.current.has(msg.id)}');
    // history is pre-seeded into the ref only; live typing completion goes through state
    expect(PRIME_SRC).toContain("if (m.role === 'assistant') typedIdsRef.current.add(m.id);");
    expect(PRIME_SRC).toContain('setTypedMessageIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));');
  });

  it('15. candidate-card gating is unchanged', () => {
    expect(PRIME_SRC).toContain('{txCandidates && candidateCardVisible.get(msg.id) === true && (');
    expect(REVEAL_SRC).toContain('export function shouldRevealCandidateCard');
  });

  it('16. scroll-anchor logic is unchanged (double RAF, hold, observer stand-down)', () => {
    expect(PRIME_SRC).toContain('if (isCandidateCardRevealTransition(previous, visible)) anchorCandidateMessage(id);');
    expect(PRIME_SRC).toMatch(/const anchorCandidateMessage = useCallback\(\(id: string\) => \{[\s\S]{0,200}requestAnimationFrame\(\(\) => \{\s*requestAnimationFrame\(/);
    expect(PRIME_SRC).toContain('if (candidateAnchorHoldRef.current) return; // candidate response anchored at its start');
  });
});

/**
 * Semantic repair Stage 2 — deterministic VERIFIED VISIBLE FRAME FACTS.
 *
 * Prime explains; code computes. Exercises PRODUCTION code only
 * (candidate-frame-facts, tx-candidate-ownership, classifier/trust helpers and
 * chat.ts wiring). The only test-local code is in-memory Layer 2 storage.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  summarizeCandidateFrame,
  formatCandidateFrameFacts,
  formatCents,
  RAW_TX_SEARCH_TOTALS_NOTE,
  type FrameCandidateLike,
} from '../candidate-frame-facts';
import {
  VISIBLE_CANDIDATE_FRAME_MAX,
  createCandidateOwnershipGate,
  buildTxResolutionFromSearchResult,
  presentTxSearchResultForModel,
  selectCandidateFromFrame,
  type TxResolutionContext,
  type TxSearchRow,
} from '../tx-candidate-ownership';
import { classifyFinancialQuery } from '../financial-query-classifier';
import { resolveMerchantHintTrust, isUntrustedMerchantHint } from '../merchant-hint-trust';

type ModelView = { candidateFrame: { facts?: string; note: string }; totalsNote?: string; totals?: unknown };

const CHAT_SRC = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

// The verified 10-row non-gas Costco frame, in its verified search order
// (same ids/amounts/categories as merchant-scope-parity.behavior.test.ts).
const COSTCO_FRAME: Array<TxSearchRow & FrameCandidateLike> = [
  { id: '85f64784-7cf8-461a-943e-5c02260de191', merchant: 'COSTCO WHOLESALE', amount: -190.27, date: '2026-05-04', category: 'Restaurants / Dining' },
  { id: '95a2d713-ca36-4fe9-8ad1-cf94eb8227ac', merchant: 'COSTCO', amount: 415.23, date: '2025-12-18', category: 'Groceries' },
  { id: '5838a84e-517c-4ad3-a423-9fcd97b788d6', merchant: 'COSTCO', amount: 249.15, date: '2025-10-10', category: 'Groceries' },
  { id: '8b95bba5-5f21-4f75-a13d-663da76d7cec', merchant: 'COSTCO', amount: 255.09, date: '2025-10-07', category: 'Groceries' },
  { id: 'e975cb0c-0f35-43aa-9f85-7e7cb80d3491', merchant: 'COSTCO', amount: 307.2, date: '2025-06-17', category: 'Groceries' },
  { id: '9f169ea5-696f-40e3-81a2-92c9cad99c31', merchant: 'COSTCO', amount: 294.78, date: '2025-06-14', category: 'Groceries' },
  { id: '88f50b79-f91a-47ab-99ea-cb24356051ca', merchant: 'COSTCO', amount: 27.48, date: '2025-06-14', category: 'Groceries' },
  { id: '0a3afed7-d881-47f7-a5f8-7e8bc669c7cd', merchant: 'COSTCO', amount: 112.87, date: '2025-06-05', category: 'Groceries' },
  { id: 'd7fe4e2f-4c77-4ecd-9bc9-c6d46b104987', merchant: 'COSTCO', amount: 18.34, date: '2025-04-16', category: 'Groceries' },
  { id: '2fe63464-557a-4a3e-894a-2be58d3e91b4', merchant: 'COSTCO', amount: 744.33, date: '2025-04-16', category: 'Groceries' },
];

const uuid = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function establish(result: unknown) {
  let stored: TxResolutionContext | null = null;
  const gate = createCandidateOwnershipGate({
    persistLayer2: async (r: unknown) => { stored = buildTxResolutionFromSearchResult(r, 1); return true; },
    applyLayer1: () => {},
    clearLayer1: () => {},
  });
  const outcome = await gate.submitSearchResult(result, 'streaming', 'candidate_establishment');
  return { gate, outcome, layer2: () => stored };
}

const costcoFacts = () => summarizeCandidateFrame(COSTCO_FRAME)!;

// ─────────────────────────────────────────────────────────────────────────────
// Pure module
// ─────────────────────────────────────────────────────────────────────────────
describe('summarizeCandidateFrame — arithmetic', () => {
  it('1. Costco 10-row frame: count, integer-cent total/average, largest #10, smallest #9', () => {
    const f = costcoFacts();
    expect(f.count).toBe(10);
    expect(f.amountCount).toBe(10);
    expect(f.missingAmountCount).toBe(0);
    expect(f.spending).toEqual({ count: 10, totalCents: 261474, averageCents: 26147 });
    expect(f.nonSpending).toBeNull();
    expect(f.mixed).toBe(false);
    expect(f.largest).toMatchObject({ ordinal: 10, id: '2fe63464-557a-4a3e-894a-2be58d3e91b4', amountCents: 74433 });
    expect(f.smallest).toMatchObject({ ordinal: 9, id: 'd7fe4e2f-4c77-4ecd-9bc9-c6d46b104987', amountCents: 1834 });
    expect(formatCents(f.spending!.totalCents)).toBe('$2,614.74');
    expect(formatCents(f.spending!.averageCents)).toBe('$261.47');
  });

  it('2–3. candidate order and objects are untouched', () => {
    const input = COSTCO_FRAME.map(r => ({ ...r })) as FrameCandidateLike[];
    const snapshot = JSON.stringify(input);
    summarizeCandidateFrame(Object.freeze(input.map(r => Object.freeze(r))));
    summarizeCandidateFrame(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('4. positive and negative ordinary charges both use the shown |amount|', () => {
    const f = summarizeCandidateFrame([
      { id: 'a', amount: -10.1, category: 'Groceries' },
      { id: 'b', amount: 10.1, category: 'Groceries' },
    ])!;
    expect(f.spending).toEqual({ count: 2, totalCents: 2020, averageCents: 1010 });
  });

  it('integer cents: no binary floating-point drift', () => {
    const f = summarizeCandidateFrame([{ id: 'a', amount: 0.1 }, { id: 'b', amount: 0.2 }])!;
    expect(f.spending!.totalCents).toBe(30);
  });

  it('5. null / non-finite amounts are excluded and counted, never zero', () => {
    const f = summarizeCandidateFrame([
      { id: 'a', amount: 12, category: 'Groceries' },
      { id: 'b', amount: null, category: 'Groceries' },
      { id: 'c', amount: Number.NaN },
    ])!;
    expect(f).toMatchObject({ count: 3, amountCount: 1, missingAmountCount: 2 });
    expect(f.spending).toEqual({ count: 1, totalCents: 1200, averageCents: 1200 });
    expect(f.smallest!.ordinal).toBe(1);
    expect(formatCandidateFrameFacts(f)).toContain('2 without an amount');
  });

  it('6. empty frame → null, nothing to format', () => {
    expect(summarizeCandidateFrame([])).toBeNull();
    expect(summarizeCandidateFrame(null)).toBeNull();
    expect(formatCandidateFrameFacts(null)).toBe('');
  });

  it('7. one row: total = average, same largest/smallest #1', () => {
    const f = summarizeCandidateFrame([{ id: 'only', merchant: 'X', amount: -42.5, date: '2025-01-01', category: 'Groceries' }])!;
    expect(f.spending).toEqual({ count: 1, totalCents: 4250, averageCents: 4250 });
    expect(f.largest).toEqual(f.smallest);
    expect(f.largest!.ordinal).toBe(1);
  });

  it('8 + 10. mixed frame: spending and non-spending separated, never combined', () => {
    const f = summarizeCandidateFrame([
      { id: 'a', amount: 100, category: 'Groceries' },
      { id: 'b', amount: -500, category: 'Transfers' },
      { id: 'c', amount: 2000, category: 'Income' },
    ])!;
    expect(f.mixed).toBe(true);
    expect(f.spending).toEqual({ count: 1, totalCents: 10000, averageCents: 10000 });
    expect(f.nonSpending).toEqual({ count: 2, totalCents: 250000 });
    const text = formatCandidateFrameFacts(f);
    expect(text).toContain('Never add them together');
    expect(text).not.toContain('$2,600.00');
  });

  it('9. non-spending-only frame is never called spending', () => {
    const f = summarizeCandidateFrame([{ id: 'a', amount: 2000, category: 'Income' }, { id: 'b', amount: 300, category: 'Debt Payments' }])!;
    expect(f.spending).toBeNull();
    expect(f.mixed).toBe(false);
    const text = formatCandidateFrameFacts(f);
    expect(text).not.toMatch(/- Spending:/);
    expect(text).toContain('NOT spending');
  });

  it('existing taxonomy is reused as-is (Employment Income gap not fixed here)', () => {
    const f = summarizeCandidateFrame([{ id: 'a', amount: 1000, category: 'Employment Income' }])!;
    expect(f.spending!.count).toBe(1);
  });
});

describe('formatCandidateFrameFacts — canonical block', () => {
  const text = formatCandidateFrameFacts(costcoFacts());
  it('11. describes the verified visible frame with exact figures', () => {
    expect(text).toContain('VERIFIED VISIBLE FRAME FACTS');
    expect(text).toContain('- Shown: 10 transactions');
    expect(text).toContain('total $2,614.74, average $261.47');
    expect(text).toContain('- Largest: #10 COSTCO $744.33 (2025-04-16)');
    expect(text).toContain('- Smallest: #9 COSTCO $18.34 (2025-04-16)');
  });
  it('12. count-match guidance', () => { expect(text).toContain('A stated count of 10 matches this list'); });
  it('13–14. count-mismatch: clarify, never pick a subset or create identity', () => {
    expect(text).toContain('If the user states a different count, do not choose a subset');
    expect(text).toContain('ask whether they mean all 10 shown or a specific subset');
    expect(text).toContain('Set wording never selects a transaction');
    expect(text).toContain('cover only the 10 shown transactions');
  });
  it('no number-word dictionary in the module', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../candidate-frame-facts.ts'), 'utf8');
    expect(src).not.toMatch(/\b(eight|twelve|twenty)\b/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring — one arithmetic path, one formatter
// ─────────────────────────────────────────────────────────────────────────────
describe('wiring', () => {
  it('15 + 21. Phase 1D: facts recomputed from persisted (incl. restored) Layer 2 candidates', async () => {
    const { layer2 } = await establish({ rows: COSTCO_FRAME });
    const restored = JSON.parse(JSON.stringify(layer2())) as TxResolutionContext; // close/reopen round trip
    expect(formatCandidateFrameFacts(summarizeCandidateFrame(restored.candidates))).toBe(formatCandidateFrameFacts(costcoFacts()));
    expect(CHAT_SRC).toContain('const phase1dFacts = summarizeCandidateFrame(visibleExisting);');
    expect(CHAT_SRC).toContain('cLines.push(formatCandidateFrameFacts(phase1dFacts));');
  });

  it('16. P3.3B/B2C: facts from exactly the shown cards', async () => {
    const { gate } = await establish({ rows: COSTCO_FRAME });
    expect(formatCandidateFrameFacts(summarizeCandidateFrame(gate.txCandidatesForResponse))).toBe(formatCandidateFrameFacts(costcoFacts()));
    expect(CHAT_SRC).toContain('const b2cFacts = summarizeCandidateFrame(b2cCandidates);');
  });

  it('17 + 19. model tx_search view: same facts, raw totals labelled non-authoritative, totals kept', async () => {
    const result = { rows: COSTCO_FRAME, totals: { sum: 533.48, spending: 1040.63 } };
    const { gate, outcome } = await establish(result);
    const view = presentTxSearchResultForModel(result, outcome, gate.visibleFrame) as ModelView;
    expect(view.candidateFrame.facts).toBe(formatCandidateFrameFacts(costcoFacts()));
    expect(view.totalsNote).toBe(RAW_TX_SEARCH_TOTALS_NOTE);
    expect(view.totals).toEqual({ sum: 533.48, spending: 1040.63 });
    expect(result).not.toHaveProperty('totalsNote');
    const evidenceView = presentTxSearchResultForModel(result, 'skipped_analytical', null) as ModelView;
    expect(evidenceView.candidateFrame.facts).toBeUndefined();
  });

  it('18. grounding-established frame gets the same facts + raw-totals label', () => {
    expect(CHAT_SRC).toContain('const groundingFacts = summarizeCandidateFrame(ownershipGate.txCandidatesForResponse);');
    expect(CHAT_SRC).toContain('${formatCandidateFrameFacts(groundingFacts)}\\n${RAW_TX_SEARCH_TOTALS_NOTE}');
  });

  it('single arithmetic implementation: chat.ts never sums frame amounts itself', () => {
    expect((CHAT_SRC.match(/summarizeCandidateFrame\(/g) || []).length).toBe(3);
    expect((CHAT_SRC.match(/formatCandidateFrameFacts\(/g) || []).length).toBe(3);
  });

  it('20. 30 matched / 25 shown: facts describe only the 25 shown', async () => {
    const rows30: TxSearchRow[] = Array.from({ length: 30 }, (_, i) => ({ id: uuid(i + 1), merchant: 'M', amount: 1, date: '2025-01-01', category: 'Groceries' }));
    const result = { rows: rows30 };
    const { gate, outcome, layer2 } = await establish(result);
    expect(gate.visibleFrame).toMatchObject({ shown: 25, matched: 30, partial: true });
    const view = presentTxSearchResultForModel(result, outcome, gate.visibleFrame) as ModelView;
    expect(view.candidateFrame.facts).toContain('- Shown: 25 transactions');
    expect(view.candidateFrame.facts).toContain('total $25.00');
    expect(view.candidateFrame.facts).not.toContain('$30.00');
    expect(view.candidateFrame.note).toMatch(/25/);
    expect(summarizeCandidateFrame(layer2()!.candidates)!.count).toBe(25);
    expect(layer2()!.candidates.length).toBe(VISIBLE_CANDIDATE_FRAME_MAX);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Semantics — model owns language; code owns figures
// ─────────────────────────────────────────────────────────────────────────────
describe('semantics', () => {
  const block = formatCandidateFrameFacts(costcoFacts());
  it.each([
    ["What's the total of these ten transactions?", '$2,614.74'],
    ['What do these transactions add up to?', '$2,614.74'],
    ["What's the average of these transactions?", '$261.47'],
    ['Which was the biggest?', '#10 COSTCO $744.33'],
    ['Which was the smallest?', '#9 COSTCO $18.34'],
    ['How many are there?', 'Shown: 10 transactions'],
    ["What's the total of those transactions?", '$2,614.74'],
  ])('22–28. frame 10 + %s → deterministic fact available', (_msg, fact) => {
    expect(block).toContain(fact);
  });

  it('29. "these eight" with a 10-frame: no subset is selected by facts', async () => {
    const { layer2 } = await establish({ rows: COSTCO_FRAME });
    const before = JSON.stringify(layer2());
    summarizeCandidateFrame(layer2()!.candidates);
    formatCandidateFrameFacts(summarizeCandidateFrame(layer2()!.candidates));
    expect(JSON.stringify(layer2())).toBe(before);
    expect(layer2()!.selectedId).toBeNull();
    expect(selectCandidateFromFrame(layer2(), 'eight').ok).toBe(false);
  });

  const forcedFallbackBlocked = (msg: string) => {
    const fc = classifyFinancialQuery(msg);
    return isUntrustedMerchantHint(fc, resolveMerchantHintTrust(fc, null));
  };

  it('30. "Show me eight transactions" → no merchant "eight", fallback deferred to the model', () => {
    expect(forcedFallbackBlocked('Show me eight transactions.')).toBe(true);
  });

  it('31–32. no frame: these/those wording does not force an arbitrary recent frame', () => {
    expect(forcedFallbackBlocked("What's the total of these ten transactions?")).toBe(true);
    expect(forcedFallbackBlocked('What do these transactions add up to?')).toBe(true);
  });

  it('legitimate fallbacks are unaffected', () => {
    for (const m of ['Show me recent transactions', 'Show me my transactions', 'What did I spend on groceries?', 'How much did I spend last month?']) {
      expect(forcedFallbackBlocked(m)).toBe(false);
    }
  });

  it('documented residual: "How much did these ten cost?" carries no hint and is not gated', () => {
    expect(forcedFallbackBlocked('How much did these ten cost?')).toBe(false);
  });

  it('both mirrored forced-fallback sites carry the approved trust gate; protocol has unresolved-reference guidance', () => {
    expect((CHAT_SRC.match(/!isUntrustedMerchantHint\(shadowIntentResult\?\.financialClassification, merchantHintTrusted\)/g) || []).length).toBe(2);
    expect(CHAT_SRC).toContain('UNRESOLVED REFERENCES: If the user refers to these/those transactions but no active candidate list or earlier result identifies which ones, ask which transactions they mean');
  });

  it('33–34. real merchants stay Stage-1 trusted', () => {
    const costco = classifyFinancialQuery('What did I spend at Costco?');
    expect(resolveMerchantHintTrust(costco, null)).toBe(true);
    const walmart = classifyFinancialQuery('How much did I spend at Walmart?');
    expect(resolveMerchantHintTrust(walmart, null)).toBe(true);
    const purchases = classifyFinancialQuery('Show me Costco purchases.');
    expect(resolveMerchantHintTrust(purchases, ['costco', 'costco gas'])).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Safety
// ─────────────────────────────────────────────────────────────────────────────
describe('safety', () => {
  it('35. "the third one" still resolves through the existing ordinal path', async () => {
    const { layer2 } = await establish({ rows: COSTCO_FRAME });
    const third = selectCandidateFromFrame(layer2(), 3);
    expect(third.ok && third.candidate.id).toBe('5838a84e-517c-4ad3-a423-9fcd97b788d6');
  });

  it('36–37. facts carry no identity/selection fields and never set selectedId/selectedIndex', async () => {
    const { layer2 } = await establish({ rows: COSTCO_FRAME });
    const f = summarizeCandidateFrame(layer2()!.candidates)!;
    expect(Object.keys(f).sort()).toEqual(['amountCount', 'count', 'largest', 'missingAmountCount', 'mixed', 'nonSpending', 'smallest', 'spending']);
    expect(layer2()!.selectedId).toBeNull();
    expect(layer2()!.selectedIndex).toBeNull();
  });

  it('38–40. ownership, Layer 2 shape and the 25 cap are unchanged', async () => {
    const { layer2 } = await establish({ rows: COSTCO_FRAME });
    expect(Object.keys(layer2()!).sort()).toEqual(['candidates', 'selectedId', 'selectedIndex', 'updatedAt']);
    expect(Object.keys(layer2()!.candidates[0]).sort()).toEqual(['amount', 'category', 'date', 'id', 'merchant']);
    expect(VISIBLE_CANDIDATE_FRAME_MAX).toBe(25);
    let persisted = 0;
    const gate = createCandidateOwnershipGate({ persistLayer2: async () => { persisted++; return true; }, applyLayer1: () => {}, clearLayer1: () => {} });
    await gate.submitSearchResult({ rows: COSTCO_FRAME }, 'streaming', 'candidate_establishment');
    expect(await gate.submitSearchResult({ rows: COSTCO_FRAME.slice(0, 2) }, 'streaming', 'analytical_evidence')).not.toBe('established');
    expect(persisted).toBe(1);
  });
});

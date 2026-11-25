/**
 * P-UI-3 (verified spending breakdown) and P-UI-4 (safe activity label).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { breakdownTitle, formatBreakdownAmount, breakdownShare, BREAKDOWN_COLORS } from '../spendingBreakdownView';
import { thinkingLabelFor } from '../primeActivity';
import { validateFinancialVisual } from '../../shared/prime-financial-visual';

const root = path.resolve(__dirname, '../../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const v2 = read('src/pages/PrimeChatV2/PrimeChatV2.tsx');
const card = read('src/pages/PrimeChatV2/SpendingBreakdown.tsx');
const engine = read('src/hooks/useUnifiedChatEngine.ts');

const visual = {
  kind: 'category_breakdown', version: 1, source: 'transaction_category_totals',
  period: { start: '2026-05-01', end: '2026-05-31' }, currency: 'CAD',
  rows: [{ label: 'Groceries', amount: 412.5, count: 9 }, { label: 'Dining', amount: 180, count: 6 }],
  total: 592.5, transactionCount: 15,
};

describe('P-UI-3 spending breakdown', () => {
  it('title from the verified period, or a plain title without one', () => {
    expect(breakdownTitle(visual as never)).toBe('Spending · May 1 – May 31, 2026');
    expect(breakdownTitle({ period: null })).toBe('Spending breakdown');
  });

  it('amounts formatted with the payload currency; bar share only', () => {
    expect(formatBreakdownAmount(412.5, 'CAD')).toMatch(/412\.50/);
    expect(formatBreakdownAmount(412.5, 'CAD')).toMatch(/\$/);
    expect(breakdownShare(180, 592.5)).toBe(30);
    expect(breakdownShare(5, 0)).toBe(0);
    expect(BREAKDOWN_COLORS).toHaveLength(6);
  });

  it('renders only a validated payload, never a model-written total', () => {
    expect(validateFinancialVisual(visual)).not.toBeNull();
    expect(validateFinancialVisual({ ...visual, total: 600 })).toBeNull();
    expect(v2).toMatch(/const financialVisual = msg\.role === "assistant" \? validateFinancialVisual\(metaAny\?\.financialVisual\) : null;/);
    expect(v2).toMatch(/\{financialVisual && !isThisStreaming && \(typedMessageIds\.has\(msg\.id\) \|\| typedIdsRef\.current\.has\(msg\.id\)\) && \(\s*<SpendingBreakdown visual=\{financialVisual\} \/>/);
  });

  it('card shows payload figures only (no hard-coded period, no client totals)', () => {
    expect(card).not.toMatch(/This Period/);
    expect(card).toMatch(/formatBreakdownAmount\(visual\.total, visual\.currency\)/);
    expect(card).not.toMatch(/reduce\(/);
    expect(card).toMatch(/prefers-reduced-motion/);
  });

  it('transaction candidate cards are untouched', () => {
    expect(v2).toMatch(/<TransactionCandidateListCard\s+candidates=\{txCandidates\}/);
  });
});

describe('P-UI-4 activity label', () => {
  it('only whitelisted phrases; otherwise the generic text', () => {
    expect(thinkingLabelFor('Prime', 'Reviewing your transactions')).toBe('Prime is reviewing your transactions…');
    expect(thinkingLabelFor('Prime', 'Consulting Tag')).toBe('Prime is consulting Tag…');
    expect(thinkingLabelFor('Prime', null)).toBe('Prime is thinking…');
    expect(thinkingLabelFor('Prime', 'tx_search {"q":"x"}')).toBe('Prime is thinking…');
  });

  it('wired from the engine; only for Prime', () => {
    expect(engine).toMatch(/activeToolLabel: primeChat\.activeToolLabel,/);
    expect(v2).toMatch(/label=\{thinkingLabelFor\(agentForMsg, agentForMsg === "Prime" \? activeToolLabel : null\)\}/);
  });
});

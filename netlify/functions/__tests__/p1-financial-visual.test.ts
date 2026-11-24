/**
 * P-1 item 4/5 — verified financial visuals (SpendingBreakdown recovery + typed chart contract).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildCategoryBreakdownVisual, validateFinancialVisual, MAX_BREAKDOWN_ROWS } from '../../../src/shared/prime-financial-visual';

const root = path.resolve(__dirname, '../../..');
const chat = fs.readFileSync(path.join(root, 'netlify/functions/chat.ts'), 'utf8');
const hook = fs.readFileSync(path.join(root, 'src/hooks/usePrimeChat.ts'), 'utf8');

const row = (category: string | null, totalCents: number, count: number, purpose = 'spending', direction = 'outflow') =>
  ({ category, totalAmount: totalCents / 100, transactionCount: count, avgAmount: 0, totalCents, direction, purpose });
const out = (rows: unknown[], extra: Record<string, unknown> = {}) =>
  ({ categoryTotals: rows, grandTotal: 0, dateRange: { start: '2026-05-01', end: '2026-05-31' }, queryStatus: 'verified', categoryFilter: null, ...extra });

describe('buildCategoryBreakdownVisual — only verified ordinary spending', () => {
  it('builds sorted rows and an exact cents total', () => {
    const v = buildCategoryBreakdownVisual(out([row('Dining', 12345, 4), row('Groceries', 45010, 9), row('Salary', 500000, 1, 'income', 'inflow')]), 'cad');
    expect(v).toEqual({
      kind: 'category_breakdown', version: 1, source: 'transaction_category_totals',
      period: { start: '2026-05-01', end: '2026-05-31' }, currency: 'CAD',
      rows: [{ label: 'Groceries', amount: 450.1, count: 9 }, { label: 'Dining', amount: 123.45, count: 4 }],
      total: 573.55, transactionCount: 13,
    });
  });
  it('transfers, debt payments and income never count as spending', () => {
    const v = buildCategoryBreakdownVisual(out([row('Groceries', 1000, 1), row('Dining', 2000, 1), row('Card payment', 99999, 1, 'debt_payment'), row('Transfer', 5000, 1, 'transfer_out')]));
    expect(v?.total).toBe(30);
  });
  it('rejects unverified, partial, errored, filtered or single-category results', () => {
    const two = [row('A', 100, 1), row('B', 200, 1)];
    expect(buildCategoryBreakdownVisual(out(two, { queryStatus: 'partial' }))).toBeNull();
    expect(buildCategoryBreakdownVisual(out(two, { queryStatus: 'query_error' }))).toBeNull();
    expect(buildCategoryBreakdownVisual(out(two, { categoryFilter: 'Groceries' }))).toBeNull();
    expect(buildCategoryBreakdownVisual(out([row('A', 100, 1)]))).toBeNull();
    expect(buildCategoryBreakdownVisual(null)).toBeNull();
  });
  it('caps rows: top five plus "Other", total unchanged', () => {
    const many = Array.from({ length: 9 }, (_, i) => row(`C${i}`, (i + 1) * 1000, 1));
    const v = buildCategoryBreakdownVisual(out(many))!;
    expect(v.rows).toHaveLength(MAX_BREAKDOWN_ROWS);
    expect(v.rows[MAX_BREAKDOWN_ROWS - 1].label).toBe('Other');
    expect(v.total).toBe(450);
  });
  it('labels are sanitized; null category is "Uncategorized"', () => {
    const v = buildCategoryBreakdownVisual(out([row('<script>x</script>', 100, 1), row(null, 200, 1)]))!;
    expect(v.rows.map(r => r.label)).toEqual(['Uncategorized', 'scriptx/script']);
  });
});

describe('validateFinancialVisual — client guard', () => {
  const good = buildCategoryBreakdownVisual(out([row('A', 100, 1), row('B', 250, 2)]))!;
  it('accepts a server-built visual', () => expect(validateFinancialVisual(good)).toEqual(good));
  it('rejects tampered or model-shaped payloads', () => {
    expect(validateFinancialVisual({ ...good, total: 999 })).toBeNull();                 // rows must add up
    expect(validateFinancialVisual({ ...good, kind: 'html' })).toBeNull();
    expect(validateFinancialVisual({ ...good, source: 'model' })).toBeNull();
    expect(validateFinancialVisual({ ...good, rows: [{ label: '<b>x</b>', amount: 1, count: 1 }, good.rows[1]] })).toBeNull();
    expect(validateFinancialVisual({ ...good, currency: 'dollars' })).toBeNull();
    expect(validateFinancialVisual('<svg onload=alert(1)>')).toBeNull();
    expect(validateFinancialVisual(undefined)).toBeNull();
  });
});

describe('wiring', () => {
  it('chat.ts captures only verified tool results at all three tool sites, Prime only', () => {
    expect(chat.match(/captureFinancialVisual\(toolName, result\)/g)?.length).toBe(3);
    expect(chat).toContain("if (!isPrimeBoss || tool !== 'transaction_category_totals') return;");
  });
  it('emitted on stream, returned on JSON, persisted in message metadata', () => {
    expect(chat).toContain("writeSSE({ type: 'financial_visual', financialVisual })");
    expect(chat).toContain('...(financialVisual && { financialVisual }),');
    expect(chat).toContain('assistantMsgMetadata.financialVisual = financialVisual;');
  });
  it('usePrimeChat re-validates on both paths', () => {
    expect(hook.match(/validateFinancialVisual\(/g)?.length).toBe(2);
  });
});

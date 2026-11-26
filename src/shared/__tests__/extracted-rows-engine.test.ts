/**
 * AR1b-TG-21 (owner GO 2026-11-26): totals over worker-extracted rows come from the shared engine,
 * never from model is_spend / category_totals. Synthetic rows only.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { engineRowsFromExtracted, buildStatementBreakdown } from '../statement-breakdown';

describe('worker-extracted rows through the engine', () => {
  const rows = [
    { direction: 'debit', amount: 80, category: 'Groceries', is_spend: false },          // model wrongly says not spend
    { direction: 'debit', amount: 500, category: 'Transfers', subcategory: 'e-Transfer', is_spend: true }, // model wrongly says spend
    { direction: 'credit', amount: 20, category: 'Shopping' },                            // refund
    { direction: 'credit', amount: 2000, category: 'Income', subcategory: 'Employment' },
    { direction: null, amount: 10, category: 'Groceries' },                               // no side: never guessed
  ];
  const b = buildStatementBreakdown(engineRowsFromExtracted(rows, '2026-03-10'));
  const line = (k: string) => b.lines.find(l => l.key === k)!;

  it('the engine classifies; the model flags are ignored', () => {
    expect(line('everyday_spending').cents).toBe(8000);
    expect(line('outgoing_transfers').cents).toBe(50000);
    expect(line('refunds').cents).toBe(2000);
    expect(line('employment_income').cents).toBe(200000);
  });
  it('a row with no debit/credit side is reported, not guessed', () => {
    expect(b.unplaced.count).toBe(1);
    expect(b.reconciled).toBe(false);
  });
  it('chat.ts no longer sums model is_spend or uses model category_totals for totals', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
    expect(chat).not.toMatch(/is_spend === true \? Math\.abs|tx\?\.is_spend === true && tx\?\.direction === 'debit'/);
    expect(chat).not.toMatch(/category_totals : \[\]\)\s*\n\s*\.sort\(/);
    expect(chat).toContain('engineRowsFromExtracted(');
  });
});

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

describe('AR1b-TG-21 part (a): the worker prompt asks only for per-row categorization', () => {
  const chat = fs.readFileSync(path.join(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
  const prompt = chat.slice(chat.indexOf('TAG_WORKER_SYSTEM_PROMPT'), chat.indexOf('TAG_WORKER_SYSTEM_PROMPT') + 4000);
  it('no is_spend or category_totals requested from the model', () => {
    expect(prompt).not.toMatch(/"is_spend"/);
    expect(prompt).not.toMatch(/"category_totals"/);
  });
  it('the normalizer recomputes is_spend and category_totals with the shared engine; no side is never assumed debit', () => {
    const norm = chat.slice(chat.indexOf('function normalizeTagWorkerOutput'), chat.indexOf('function normalizeTagWorkerOutput') + 3500);
    expect(norm).toContain("is_spend: classifyCashFlow(engineRows[i]).purpose === 'spending'");
    expect(norm).toContain("engineAgg.categories.filter(c => c.purpose === 'spending')");
    expect(norm).not.toContain("direction: t?.direction === 'credit' ? 'credit' : 'debit'");
  });
});

describe('Tag HQ review: worker category names map to canonical categories', () => {
  const b = buildStatementBreakdown(engineRowsFromExtracted([
    { direction: 'debit', amount: 100, category: 'Cash Withdrawal' },
    { direction: 'debit', amount: 300, category: 'Credit Card Payment' },
    { direction: 'debit', amount: 40, category: 'Dining' },
    { direction: 'debit', amount: 15, category: 'Software/AI' },
  ], '2026-03-10'));
  const line = (k: string) => b.lines.find(l => l.key === k)!;
  it('a debit "Cash Withdrawal" is NOT spending: it lands on the cash-withdrawals line', () => {
    expect(line('cash_withdrawals').cents).toBe(10000);
    expect(line('everyday_spending').cents).toBe(5500);
  });
  it('card payments are debt repayment, never spending', () => {
    expect(line('credit_card_payments').cents).toBe(30000);
  });
  it('the prompt no longer lets the model turn ATM rows into spending', () => {
    const chat = fs.readFileSync(path.join(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
    expect(chat).not.toContain('unless explicit spending context exists');
  });
});

describe('Tag HQ note: an unexpected worker category is flagged, never everyday spending', () => {
  it('unknown model category → Needs Review → unresolved line', () => {
    const b = buildStatementBreakdown(engineRowsFromExtracted([{ direction: 'debit', amount: 25, category: 'ATM' }], '2026-03-10'));
    expect(b.lines.find(l => l.key === 'unresolved')!.cents).toBe(2500);
    expect(b.lines.find(l => l.key === 'everyday_spending')!.cents).toBe(0);
  });
});

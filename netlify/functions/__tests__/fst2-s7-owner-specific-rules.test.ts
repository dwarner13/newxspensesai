/**
 * FST-2 S7 — owner-specific categorization rules removed (owner GO 2026-11-25; Attachments HQ
 * conditions honoured). Rules built for ONE customer (their employer payroll, business name, city)
 * applied to every customer's imports. They are removed from shared code; that customer's own
 * approved rules live in their category_rules and are untouched. Synthetic merchant text only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { matchMerchantMap } from '../_shared/merchantCategoryMap';

const read = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

describe('S7 — no customer is categorized by another customer\'s rules', () => {
  it('employer payroll text is not Income for everyone', () => {
    for (const m of ['GFS PAY 004213', 'GORDON FOOD SER PAY', 'gfs pay']) {
      expect(matchMerchantMap(m)?.category).not.toBe('Income');
    }
  });
  it('the city-specific entry is gone; the generic supplier mapping (a grocery/food supplier) is kept', () => {
    expect(matchMerchantMap('GFS EDMONTON #12')?.category ?? null).not.toBe('Income');
    expect(matchMerchantMap('GORDON FOODS STORE')?.category).toBe('Groceries');
  });
  it('shared Tag code carries no single-customer payroll / business tokens', () => {
    const files = [
      'apply-category-rules.ts', '_shared/merchantCategoryMap.ts', '_shared/tx_pipeline.ts',
      'tag-categorize-committed.ts', 'tag-action.ts', 'tag-copilot.ts', 'tag-chat.ts', 'tag-bulk-fix.ts',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/rownmi/i);
      expect(src, f).not.toMatch(/gfs pay|gordon food ser pay|gordon foods pay|gfs edmonton/i);
      expect(src, f).not.toMatch(/includes\('GFS'\)/);
      expect(src, f).not.toMatch(/gordon food[^'"]*['"][^\n]*category:\s*['"]Income/i);
    }
  });
  it('the hardcoded one-customer bulk fixes can no longer change anyone\'s transactions', () => {
    const src = read('tag-bulk-fix.ts');
    expect(src).not.toMatch(/\.(update|upsert|insert|delete)\(/);
    expect(src).toContain('statusCode: 410');
  });
});

describe('S7 — Attachments HQ condition: generic expense spreadsheets classify and map exactly as before', () => {
  const src = read('process-spreadsheet.ts');
  it('the four document types and the expense_report label are unchanged', () => {
    expect(src).toContain('   - "income_report" (e.g. FreshBooks Payments Collected, invoice summaries, revenue reports)');
    expect(src).toContain('   - "expense_report" (e.g. business expense spreadsheets, category breakdowns, receipt logs)');
    expect(src).toContain('   - "bank_statement" (e.g. exported bank/credit card transactions)');
    expect(src).toContain('   - "unknown"');
    expect(src).not.toMatch(/rownmi/i);
  });
  it('the column_map roles (incl. category / subcategory mapping) are unchanged', () => {
    for (const line of [
      '   - date: which column has the transaction date',
      '   - amount: which column has the dollar amount',
      '   - description: which column has a description or memo',
      '   - client: which column has client/payer name (income reports)',
      '   - method: which column has payment method',
      '   - category: which column has the primary/parent expense category (e.g. "Parent Category", "Category")',
      '   - subcategory: which column has the subcategory or detailed category (e.g. "Subcategory", "Sub-Category")',
    ]) expect(src).toContain(line);
  });
});

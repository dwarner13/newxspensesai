/**
 * D-2 — transaction drawer visual redesign. Presentation only: every save call and payload
 * is byte-for-byte unchanged (tx-update-category, tx-update-amount, tag-action, tx-split,
 * receipt-upload, user-subcategories).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const drawer = fs.readFileSync(path.join(root, 'src/components/transactions/TransactionInsightDrawer.tsx'), 'utf8');

describe('drawer facts', () => {
  it('shows date, account and statement as labelled facts', () => {
    expect(drawer).toMatch(/<dt[^>]*>Date<\/dt>/);
    expect(drawer).toMatch(/<dt[^>]*>Account<\/dt>/);
    expect(drawer).toMatch(/<dt[^>]*>Statement<\/dt>/);
    // LIVE-UI-04: account / statement text now come from lib/statementFacts (tested there).
    expect(drawer).toMatch(/accountText\(statementMeta\)/);
  });

  it('reads account and period from the existing imports query (no new request)', () => {
    expect(drawer.match(/\.from\('imports'\)/g)?.length).toBe(1);
    expect(drawer).toMatch(/factsFromStatementMeta\(\(imp\?\.statement_breakdown_json as any\)\?\.statement_meta/);
  });
});

describe('drawer accessibility', () => {
  it('uses 44px+ targets for close, chips, type toggle, subcategory and footer', () => {
    expect(drawer).not.toMatch(/width: 32, height: 32/);
    expect(drawer.match(/aria-label="Close transaction details"/g)?.length).toBe(2);
    expect(drawer).toMatch(/minHeight: 44, padding: '0 14px', borderRadius: 22, fontSize: 14/);
    expect(drawer).toMatch(/minHeight: 44, padding: '0 20px', borderRadius: 22, fontSize: 14/);
    expect(drawer).toMatch(/minHeight: 44, padding: '0 12px', borderRadius: 10, background: '#0b1220'/);
    expect(drawer).toMatch(/minHeight: 46, padding: '0 10px'/);
    expect(drawer).toMatch(/aria-pressed=\{localCategory === q\.category\}/);
  });

  it('larger Tag logo and category text; footer clears the home indicator', () => {
    expect(drawer).toMatch(/width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient/);
    expect(drawer).toMatch(/fontSize: 18, fontWeight: 800, color: '#f1f5f9'/);
    expect(drawer).toMatch(/padding: '12px 16px calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\)'/);
  });
});

describe('save behaviour is unchanged', () => {
  it('keeps the exact tx-update-category payloads', () => {
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ id: row\.transaction\.id, table, category, applyToVendor: row\.kind === 'committed' \}\)/);
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ id: row\.transaction\.id, table, category: localCategory, subcategory: value \}\)/);
  });

  it('keeps the sign-flip, fix_type, split, rule and receipt calls', () => {
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ id: row\.transaction\.id, amount: -currentAmount \}\)/);
    expect(drawer).toMatch(/body: JSON\.stringify\(\{ intent: 'fix_type', transactionId: row\.transaction\.id, newType \}\)/);
    expect(drawer).toMatch(/'\/\.netlify\/functions\/tx-split'/);
    expect(drawer).toMatch(/intent: 'save_rule'/);
    expect(drawer).toMatch(/'\/\.netlify\/functions\/receipt-upload'/);
  });
});

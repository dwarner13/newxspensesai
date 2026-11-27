/**
 * UX-FST2-9 Tax Workspace on the server tax summary (owner FST-2 GO; AR-1b FR-011; FR-029 fixed
 * server-side: refunds are not income; internal movement is its own section).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.resolve(__dirname, '../TaxWorkspacePage.tsx'), 'utf8');
const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('UX-FST2-9 Tax Workspace', () => {
  it('reads the server tax summary; no capped transaction read, local rules or sums', () => {
    expect(code).toMatch(/fetch\('\/\.netlify\/functions\/tax-summary'/);
    expect(code).not.toMatch(/from\("transactions"\)|\.limit\(|\.reduce\(|groupIntoBuckets|groupByMerchant|SECTION_BUCKETS|BUCKET_FILTER_MAP/);
  });
  it('honest partial / unavailable state and no section totals then', () => {
    expect(code).toMatch(/body\.queryStatus === 'partial'/);
    expect(code).toMatch(/data-testid="tax-state"/);
    expect(code).toMatch(/\{taxFigures && SECTIONS\.map/);
  });
  it('owner labels from the engine; review count served; no deductible wording', () => {
    expect(code).toMatch(/FINANCIAL_LABELS\.actualIncome/);
    expect(code).toMatch(/tax\.engine\.incomeCents \/ 100/);
    expect(code).toMatch(/reviewFinancial\.summary\.needsReviewCount/);
    expect(src).not.toMatch(/deductib/i);
  });
});

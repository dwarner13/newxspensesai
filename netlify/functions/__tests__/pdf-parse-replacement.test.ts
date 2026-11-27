/**
 * pdf-parse replacement (owner GO 2026-11-27: "replace it in this fix").
 *
 * pdf-parse bundled its own unmaintained PDF.js v1.10 (no isEvalSupported option) and parsed
 * customer uploads. extractPdfTextPlain now uses the patched pdfjs-dist and must produce the
 * SAME text pdf-parse did, because lib/ocr/cleanupOcrText.ts is tuned to pdf-parse's "glued"
 * BMO output. The GOLDEN strings below were captured from pdf-parse 1.1.4 on these exact
 * synthetic statements (pdfkit, uncompressed) before the dependency was removed.
 * Synthetic data only.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { extractPdfTextPlain, extractPdfTextWithPdfParse } from '../_lib/pdfText';

type Row = Array<[string, number]>;

function build(pages: Row[][]): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40, compress: false });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    pages.forEach((rows, pi) => {
      if (pi > 0) doc.addPage();
      let y = 50;
      for (const cols of rows) {
        let x = 40;
        for (const [text, width] of cols) {
          if (text) doc.fontSize(9).text(text, x, y, { lineBreak: false });
          x += width;
        }
        y += 14;
      }
    });
    doc.end();
  });
}

const BMO_LIKE: Row[][] = [[
  [['Synthetic Bank Everyday Banking', 300]],
  [['Summary of your account', 300]],
  [['Opening balance', 200], ['1,000.00', 100]],
  [['Amounts deducted', 200], ['300.00', 100]],
  [['Amounts added', 200], ['200.00', 100]],
  [['Closing balance', 200], ['900.00', 100]],
  [['Date', 60], ['Description', 260], ['Amounts deducted', 90], ['Amounts added', 90], ['Balance', 80]],
  [['Mar 05', 60], ['POS PURCHASE SYNTHETIC GROCER', 260], ['300.00', 90], ['', 90], ['700.00', 80]],
  [['Mar 15', 60], ['DIRECT DEPOSIT SYNTHETIC PAYROLL', 260], ['', 90], ['200.00', 90], ['900.00', 80]],
  [['Closing totals', 320], ['300.00', 90], ['200.00', 90]],
], [
  [['Page 2 continued', 300]],
  [['Mar 20', 60], ['E-TRANSFER SENT', 260], ['0.00', 90], ['', 90], ['900.00', 80]],
]];

const CARD_LIKE: Row[][] = [[
  [['Synthetic Card Statement', 300]],
  [['Previous balance', 200], ['500.00', 100]],
  [['Payments', 200], ['500.00 CR', 100]],
  [['Purchases', 200], ['120.45', 100]],
  [['New balance', 200], ['120.45', 100]],
  [['Mar 02', 60], ['SYNTHETIC CAFE', 260], ['12.45', 90]],
  [['Mar 09', 60], ['PAYMENT THANK YOU', 260], ['500.00 CR', 90]],
]];

// Captured from pdf-parse 1.1.4 (result.text), then trimmed as extractPdfTextWithPdfParse always did.
const GOLDEN_BMO = 'Synthetic Bank Everyday Banking\nSummary of your account\nOpening balance1,000.00\nAmounts deducted300.00\nAmounts added200.00\nClosing balance900.00\nDateDescriptionAmounts deductedAmounts addedBalance\nMar 05POS PURCHASE SYNTHETIC GROCER300.00700.00\nMar 15DIRECT DEPOSIT SYNTHETIC PAYROLL200.00900.00\nClosing totals300.00200.00\n\nPage 2 continued\nMar 20E-TRANSFER SENT0.00900.00';
const GOLDEN_CARD = 'Synthetic Card Statement\nPrevious balance500.00\nPayments500.00 CR\nPurchases120.45\nNew balance120.45\nMar 02SYNTHETIC CAFE12.45\nMar 09PAYMENT THANK YOU500.00 CR';

describe('extractPdfTextPlain reproduces pdf-parse output exactly', () => {
  it('BMO-style glued columns (what cleanupOcrText is tuned to), multi-page', async () => {
    expect(await extractPdfTextPlain(await build(BMO_LIKE))).toBe(GOLDEN_BMO);
  });

  it('card-style lines with CR markers', async () => {
    expect(await extractPdfTextPlain(await build(CARD_LIKE))).toBe(GOLDEN_CARD);
  });

  it('the deprecated name is the same function (existing callers unchanged)', async () => {
    const buf = await build(CARD_LIKE);
    expect(await extractPdfTextWithPdfParse(buf)).toBe(await extractPdfTextPlain(buf));
  });

  it('downstream BMO cleanup sees the same input it did with pdf-parse', async () => {
    const { cleanupOcrText } = await import('../lib/ocr/cleanupOcrText');
    expect(cleanupOcrText(await extractPdfTextPlain(await build(BMO_LIKE)))).toBe(cleanupOcrText(GOLDEN_BMO));
  });
});

describe('pdf-parse is gone (guard)', () => {
  const root = path.resolve(__dirname, '../../..');
  const SKIP = new Set(['node_modules', 'dist', '.netlify', '__tests__', 'functions_old']);
  function walk(dir: string, out: string[] = []): string[] {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(e.name)) out.push(p);
    }
    return out;
  }

  it('no dependency on pdf-parse in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty('pdf-parse');
  });

  it('no file in src/, netlify/ (deployed) or scripts/ imports pdf-parse', () => {
    // netlify/functions_old is not deployed (netlify.toml functions = netlify/functions) and is skipped.
    const offenders = ['src', 'netlify', 'scripts']
      .flatMap((d) => walk(path.join(root, d)))
      .filter((f) => /from ['"]pdf-parse|import\(['"]pdf-parse|require\(['"]pdf-parse/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});

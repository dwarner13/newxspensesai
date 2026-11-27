/**
 * pdf-parse replacement: statement-level equivalence (owner GO 2026-11-27: "compare extracted text,
 * transaction counts, amounts, direction and reconciliation against known-good statement fixtures").
 *
 * fixtures/pdf-parse-golden/*.pdfparse.txt is the text pdf-parse 1.1.4 itself produced (trimmed, as
 * the old helper did) for these exact synthetic BMO-style statements, captured before the
 * dependency was removed. Synthetic data only, with no real customer statements.
 *
 * Known, accepted difference: when two text runs TOUCH on the page (e.g. an amount column running
 * into the balance column), PDF.js 6 merges them with a space ("124.65 1,941.40") where pdf-parse's
 * v1.10 glued them ("124.651,941.40"). PDF.js offers no option to disable this. So:
 *   - text must be IDENTICAL apart from inserted spaces;
 *   - parsed rows (date, description, amount, direction), counts and debit/credit sums must be
 *     IDENTICAL to the rows parsed from pdf-parse's own text.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';

vi.mock('../_shared/supabase', () => ({ admin: () => ({}) }));
vi.mock('openai', () => {
  class OpenAI { constructor() { /* offline: never called with a null client */ } }
  return { default: OpenAI, OpenAI };
});

type Row = Array<[string, number]>;
type Parsed = { date?: string; description?: string; merchant?: string; amount?: number; direction?: string; type?: string };

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
        for (const [t, w] of cols) {
          if (t) doc.fontSize(9).text(t, x, y, { lineBreak: false });
          x += w;
        }
        y += 13;
      }
    });
    doc.end();
  });
}

const merchants = ['SYNTHETIC GROCER', 'SYNTHETIC FUEL', 'SYNTHETIC CAFE', 'SYNTHETIC PHARMACY', 'SYNTHETIC HARDWARE', 'SYNTHETIC BOOKS'];
const f = (v: number) => v.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Same generator that produced the golden pdf-parse text. tight = columns touch. */
function bmoLike(n: number, tight = false): Row[][] {
  const W = tight ? [44, 150, 30, 30, 34] : [60, 230, 90, 90, 80];
  let bal = 2500;
  let ded = 0;
  let add = 0;
  const tx: Row[] = [];
  for (let i = 0; i < n; i++) {
    const day = String(1 + (i % 28)).padStart(2, '0');
    const isCredit = i % 5 === 0;
    const amt = Math.round((15 + i * 7.31) * 100) / 100;
    if (isCredit) { bal += amt; add += amt; } else { bal -= amt; ded += amt; }
    tx.push([[`Mar ${day}`, W[0]], [isCredit ? 'DIRECT DEPOSIT SYNTHETIC PAYROLL' : `POS PURCHASE ${merchants[i % merchants.length]}`, W[1]], [isCredit ? '' : f(amt), W[2]], [isCredit ? f(amt) : '', W[3]], [f(bal), W[4]]]);
  }
  const head: Row[] = [
    [['Bank of Montreal', 300]], [['Everyday Banking', 300]], [['Summary of your account', 300]],
    [['Opening balance', 200], [f(2500), 100]], [['Amounts deducted', 200], [f(ded), 100]], [['Amounts added', 200], [f(add), 100]], [['Closing balance', 200], [f(bal), 100]],
    [["Here's what happened in your account", 300]],
    [['Date', 60], ['Description', 230], ['Amounts deducted ($)', 90], ['Amounts added ($)', 90], ['Balance ($)', 80]],
    [['Mar 01', 60], ['Opening balance', 230], ['', 90], ['', 90], [f(2500), 80]],
  ];
  const all = [...head, ...tx, [['Closing totals', 290], [f(ded), 90], [f(add), 90]] as Row];
  return [all.slice(0, 40), all.slice(40)].filter((p) => p.length);
}

const FIXTURES: Array<[string, Row[][]]> = [
  ['bmo_30', bmoLike(30)],
  ['bmo_55_multipage', bmoLike(55)],
  ['bmo_tight', bmoLike(30, true)],
];

const golden = (name: string) =>
  fs.readFileSync(path.join(__dirname, 'fixtures/pdf-parse-golden', `${name}.pdfparse.txt`), 'utf8');

let extract: (b: Buffer) => Promise<string>;
let parse: (text: string, name: string) => Promise<Parsed[]>;

beforeAll(async () => {
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:9';
  process.env.SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'offline';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'offline-not-a-secret';
  ({ extractPdfTextPlain: extract } = await import('../_lib/pdfText'));
  const { normalizeOcrResult } = await import('../_shared/ocr_normalize');
  parse = async (text, name) => (await normalizeOcrResult(text, 'synthetic-user', null, { filename: `${name}.pdf` })) as Parsed[];
});

const summary = (rows: Parsed[]) => {
  const amts = rows.map((r) => Number(r.amount || 0));
  const cents = (xs: number[]) => Math.round(xs.reduce((s, a) => s + a, 0) * 100);
  return {
    count: rows.length,
    debits: amts.filter((a) => a < 0).length,
    credits: amts.filter((a) => a > 0).length,
    debitCents: cents(amts.filter((a) => a < 0)),
    creditCents: cents(amts.filter((a) => a > 0)),
  };
};
const keys = (rows: Parsed[]) => rows.map((r) => [r.date, r.description ?? r.merchant, r.amount, r.direction ?? r.type]);

describe.each(FIXTURES)('%s: new extraction vs pdf-parse 1.1.4 golden', (name, pages) => {
  it('text identical apart from inserted spaces (touching runs)', async () => {
    const got = await extract(await build(pages));
    expect(got.replace(/ /g, '')).toBe(golden(name).replace(/ /g, ''));
  });

  it('identical parsed rows: count, dates, descriptions, amounts, direction, debit/credit totals', async () => {
    const fromNew = await parse(await extract(await build(pages)), name);
    const fromOld = await parse(golden(name), name);
    expect(fromNew.length).toBeGreaterThan(0);
    expect(summary(fromNew)).toEqual(summary(fromOld));
    expect(keys(fromNew)).toEqual(keys(fromOld));
  });
});

describe('the printed totals the reconciliation reads are present and unchanged', () => {
  it.each(FIXTURES)('%s: summary and closing-totals lines carry the same numbers', async (name, pages) => {
    const got = await extract(await build(pages));
    const nums = (t: string) =>
      t.split('\n').filter((l) => /^(Opening balance|Amounts deducted|Amounts added|Closing balance|Closing totals)/.test(l)).map((l) => l.replace(/ /g, ''));
    expect(nums(got)).toEqual(nums(golden(name)));
    expect(nums(got).length).toBeGreaterThanOrEqual(5);
  });
});

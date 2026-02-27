import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import pdfParse from 'pdf-parse';

import { extractPdfTextWithLayout, extractPdfTextWithPdfParse } from '../netlify/functions/_lib/pdfText.ts';

function loadLocalEnvFiles(): void {
  const files = ['.env.local', '.envlocal', '.env'];
  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    if (!fsSync.existsSync(absPath)) continue;
    const text = fsSync.readFileSync(absPath, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadLocalEnvFiles();

type NormalizedTransaction = {
  kind?: string;
  date?: string;
  amount?: number;
  merchant?: string;
  description?: string;
};

type QualitySummary = {
  fileName: string;
  docType: 'statement' | 'invoice' | 'receipt' | 'unknown';
  pageCount: number | null;
  txnsFound: number;
  pctWithDate: number;
  pctWithAmount: number;
  pctWithMerchantOrDescription: number;
  duplicateRate: number;
  warnings: string[];
};

const DATE_THRESHOLD = 0.7;
const AMOUNT_THRESHOLD = 0.9;
const MERCHANT_OR_DESC_THRESHOLD = 0.85;

function toPercent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function normalizeDocTypeFromText(fileName: string, text: string, txns: NormalizedTransaction[]): QualitySummary['docType'] {
  const txKinds = new Set(txns.map((tx) => String(tx.kind || '')));
  if (txKinds.has('invoice')) return 'invoice';
  if (txKinds.has('receipt')) return 'receipt';
  if (txKinds.has('bank')) return 'statement';

  const lowerName = fileName.toLowerCase();
  if (/invoice/.test(lowerName) || /\binvoice\b/i.test(text)) return 'invoice';
  if (/statement|bank|credit.?card|account/.test(lowerName) || /\bstatement\b|\btransaction\b/i.test(text)) return 'statement';
  if (/receipt/.test(lowerName) || /\bsubtotal\b|\btip\b|\btotal\b/i.test(text)) return 'receipt';
  return 'unknown';
}

function estimateDuplicateRate(txns: NormalizedTransaction[]): number {
  if (!txns.length) return 0;
  const keys = txns.map((tx) => {
    const date = String(tx.date || '').trim().toLowerCase();
    const amount = Number(tx.amount || 0).toFixed(2);
    const merchant = String(tx.merchant || tx.description || '').trim().toLowerCase();
    return `${date}|${amount}|${merchant}`;
  });
  const uniqueCount = new Set(keys).size;
  const duplicateCount = Math.max(0, keys.length - uniqueCount);
  return Number(((duplicateCount / keys.length) * 100).toFixed(1));
}

async function extractInputText(filePath: string): Promise<{ text: string; pageCount: number | null }> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const buffer = await fs.readFile(filePath);
    let text = '';
    try {
      text = await extractPdfTextWithLayout(buffer as Buffer);
    } catch {
      text = await extractPdfTextWithPdfParse(buffer as Buffer);
    }
    let pageCount: number | null = null;
    try {
      const parsed = await pdfParse(buffer as Buffer);
      pageCount = Number.isFinite(parsed.numpages) ? parsed.numpages : null;
    } catch {
      pageCount = null;
    }
    return { text, pageCount };
  }
  if (ext === '.csv' || ext === '.txt' || ext === '.md' || ext === '.json') {
    const text = await fs.readFile(filePath, 'utf8');
    return { text, pageCount: 1 };
  }
  return { text: '', pageCount: null };
}

function buildQualitySummary(filePath: string, text: string, pageCount: number | null, txns: NormalizedTransaction[]): QualitySummary {
  const txnsFound = txns.length;
  const withDate = txns.filter((tx) => Boolean(tx.date)).length;
  const withAmount = txns.filter((tx) => typeof tx.amount === 'number' && Number.isFinite(Number(tx.amount))).length;
  const withMerchantOrDescription = txns.filter((tx) => Boolean(tx.merchant || tx.description)).length;
  const docType = normalizeDocTypeFromText(path.basename(filePath), text, txns);
  const duplicateRate = estimateDuplicateRate(txns);
  const pctWithDate = toPercent(withDate, txnsFound);
  const pctWithAmount = toPercent(withAmount, txnsFound);
  const pctWithMerchantOrDescription = toPercent(withMerchantOrDescription, txnsFound);

  const warnings: string[] = [];
  if (docType === 'unknown') warnings.push('type=unknown');
  if ((pageCount ?? 1) === 1) warnings.push('pages=1');
  if (txnsFound === 0) warnings.push('txns=0');
  if (txnsFound > 0) {
    if ((pctWithDate / 100) < DATE_THRESHOLD) warnings.push('missing_fields:date');
    if ((pctWithAmount / 100) < AMOUNT_THRESHOLD) warnings.push('missing_fields:amount');
    if ((pctWithMerchantOrDescription / 100) < MERCHANT_OR_DESC_THRESHOLD) warnings.push('missing_fields:merchant_or_description');
  }

  return {
    fileName: path.basename(filePath),
    docType,
    pageCount,
    txnsFound,
    pctWithDate,
    pctWithAmount,
    pctWithMerchantOrDescription,
    duplicateRate,
    warnings,
  };
}

function printSummary(summary: QualitySummary): void {
  console.log('[OCR STRENGTH CHECK]');
  console.log(`file_name: ${summary.fileName}`);
  console.log(`detected_doc_type: ${summary.docType}`);
  console.log(`page_count: ${summary.pageCount === null ? 'n/a' : summary.pageCount}`);
  console.log(`txns_found: ${summary.txnsFound}`);
  console.log(`pct_rows_with_date: ${summary.pctWithDate}%`);
  console.log(`pct_rows_with_amount: ${summary.pctWithAmount}%`);
  console.log(`pct_rows_with_merchant_or_description: ${summary.pctWithMerchantOrDescription}%`);
  console.log(`duplicate_rate_estimate: ${summary.duplicateRate}%`);
  console.log(`warnings: ${summary.warnings.length > 0 ? summary.warnings.join(', ') : 'none'}`);
}

function shouldPass(summary: QualitySummary): boolean {
  if (summary.txnsFound <= 0) return false;
  return (
    (summary.pctWithDate / 100) >= DATE_THRESHOLD &&
    (summary.pctWithAmount / 100) >= AMOUNT_THRESHOLD &&
    (summary.pctWithMerchantOrDescription / 100) >= MERCHANT_OR_DESC_THRESHOLD
  );
}

async function main(): Promise<void> {
  const filePathArg = process.argv[2];
  if (!filePathArg) {
    console.error('Usage: npm run ocr:check -- <path-to-file.pdf|.csv|.txt>');
    process.exitCode = 1;
    return;
  }
  const filePath = path.resolve(filePathArg);
  const exists = await fs
    .stat(filePath)
    .then((s) => s.isFile())
    .catch(() => false);
  if (!exists) {
    console.error(`[OCR STRENGTH CHECK] file not found: ${filePath}`);
    process.exitCode = 1;
    return;
  }

  const { text, pageCount } = await extractInputText(filePath);
  const { normalizeOcrResult } = await import('../netlify/functions/_shared/ocr_normalize.ts');
  const txns = await normalizeOcrResult(text, 'local-ocr-check', undefined, {
    filename: path.basename(filePath),
    includeAllAccounts: false,
  });
  const summary = buildQualitySummary(filePath, text, pageCount, txns);
  printSummary(summary);

  if (shouldPass(summary)) {
    process.exitCode = 0;
    return;
  }
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('[OCR STRENGTH CHECK] fatal', error?.message || error);
  process.exitCode = 1;
});

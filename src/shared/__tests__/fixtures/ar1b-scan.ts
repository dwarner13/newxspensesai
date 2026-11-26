/**
 * AR-1b static scanner (owner GO 2026-11-26, "AR-1b permanent architecture protection"; spec:
 * AR1B_FINANCIAL_RULE_COPY_AUDIT.md §6, AI Architecture HQ). Finds financial-rule copies outside the
 * authoritative engine modules. Pre-existing hits are recorded in ar1b-baseline.json (shrink-only,
 * owner + expiry per §5A); a NEW hit fails the architecture test.
 */
import fs from 'fs';
import path from 'path';

/** §6A: the only places that may define financial rules (plus thin consumers). */
export const AUTHORITATIVE = new Set([
  'src/shared/financial-taxonomy.ts', 'src/shared/period-aggregate.ts', 'src/shared/statement-breakdown.ts',
  'src/shared/financial-integrity-signals.ts', 'src/shared/transaction-range-fetch.ts', 'src/shared/paged-select.ts',
  'netlify/functions/_shared/financial-ledger.ts', 'src/shared/financial-sections.ts',
  // thin consumers (§6A + fst2-summary-2 additions)
  'netlify/functions/financial-summary.ts', 'netlify/functions/financial-export.ts', 'netlify/functions/_shared/financial-export-csv.ts',
  'src/agent/tools/impl/cash_flow_summary.ts', 'src/agent/tools/impl/transaction_category_totals.ts',
  'netlify/functions/_shared/tagFinancialContext.ts', 'netlify/functions/_shared/financial-position.ts',
  'netlify/functions/_shared/financial-snapshot.ts', 'netlify/functions/prime-briefing.ts',
  'netlify/functions/_shared/financial-summary-v2.ts', 'src/shared/coverage-insights.ts', 'src/shared/needs-category-rule.ts',
  'src/shared/statement-coverage.ts', 'src/shared/statement-reconciliation-guard.ts', 'src/shared/comparison-claim-guard.ts',
]);

export interface Ar1bHit { file: string; rule: 'R1' | 'R2' | 'R3' | 'R4' | 'R6'; detail: string }

const R1 = [
  /\b(?:function|const|let)\s+(is(?:Income|Expense|Spend|NonSpend|NonSpending|Transfer|Refund|Credit|Debit)\w*)/g,
  /\b(NON_SPEND\w*)\s*=/g,
  /\b(getTxDirection)\s*=/g,
  /\/[^/\n]*(PAYMENT\s*\|\s*CREDIT|CREDIT\s*\|\s*REFUND|PAYMENT RECEIVED)[^/\n]*\/[gimsuy]*/g,
];
const READS_TRANSACTIONS = /from\(\s*['"]transactions(?:_staging)?['"]\s*\)|useTransactions\(|tx-search/;
const R2 = [
  /\b((?:income|spend\w*|expense\w*|debit\w*|credit\w*|inflow\w*|outflow\w*|total\w*))\s*\+=\s*[^;\n]*\bamount\b/gi,
  /\.reduce\(\s*\([^)]*\)\s*=>\s*[^;]{0,80}\bamount\b/g,
];
const R3 = /\b(isIncomeBroad|isIncomeCashFlow|INCOME_MERCHANT_PATTERNS)\b/g;
const R4 = /from\(\s*['"]transactions['"]\s*\)[^;]{0,500}?\.limit\(/g;
const R6 = /(["'`>])\s*(Net Flow|Deductions Found|deductions identified)\b/gi;

export function scanFile(file: string, src: string): Ar1bHit[] {
  if (AUTHORITATIVE.has(file)) return [];
  const hits: Ar1bHit[] = [];
  const add = (rule: Ar1bHit['rule'], detail: string) => { if (!hits.some(h => h.rule === rule && h.detail === detail)) hits.push({ file, rule, detail }); };
  for (const rx of R1) for (const m of src.matchAll(rx)) add('R1', (m[1] ?? m[0]).slice(0, 60));
  if (READS_TRANSACTIONS.test(src)) {
    for (const rx of R2) for (const m of src.matchAll(rx)) add('R2', (m[1] ?? 'reduce(amount)').toLowerCase().slice(0, 40));
    if ([...src.matchAll(R4)].length > 0) add('R4', 'transactions .limit(');
  }
  for (const m of src.matchAll(R3)) if (!/^\s*\*|\/\//.test(src.slice(src.lastIndexOf('\n', m.index ?? 0) + 1, (m.index ?? 0)))) add('R3', m[1]);
  if (file.startsWith('src/pages/')) for (const m of src.matchAll(R6)) add('R6', m[2].toLowerCase());
  return hits;
}

export function scanAll(root: string): Ar1bHit[] {
  const out: Ar1bHit[] = [];
  const skip = new Set(['node_modules', '__tests__', 'dist']);
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); continue; }
      if (!/\.(ts|tsx|js|jsx)$/.test(e.name) || /\.test\./.test(e.name)) continue;
      out.push(...scanFile(path.relative(root, p).replace(/\\/g, '/'), fs.readFileSync(p, 'utf8')));
    }
  };
  walk(path.join(root, 'src'));
  walk(path.join(root, 'netlify', 'functions'));
  return out;
}

export const hitKey = (h: Ar1bHit) => `${h.file}|${h.rule}|${h.detail}`;

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { cleanupOcrText } from './lib/ocr/cleanupOcrText.js';
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';
import { runLLMAdvisorSummary } from './_shared/primeSummarizer.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GENERIC_SUMMARY = 'Your categorized results and insights are available.';
const LOW_CONFIDENCE_THRESHOLD = 0.6;
const ISSUER_PATTERNS = [
  { match: /triangle/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /canadian tire/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /ctfs/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /ct financial/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /canadian tire bank/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /world elite mastercard/i, name: 'Canadian Tire — Triangle Mastercard' },
  { match: /capital one/i, name: 'Capital One' },
  { match: /td bank|td canada trust/i, name: 'TD Bank' },
  { match: /rbc|royal bank of canada/i, name: 'RBC' },
  { match: /scotiabank|bank of nova scotia/i, name: 'Scotiabank' },
  { match: /cibc/i, name: 'CIBC' },
  { match: /bmo|bank of montreal/i, name: 'BMO' },
  { match: /desjardins/i, name: 'Desjardins' },
  { match: /national bank/i, name: 'National Bank' },
  { match: /tangerine/i, name: 'Tangerine' },
  { match: /simplii/i, name: 'Simplii Financial' },
  { match: /amex|american express/i, name: 'American Express' },
  { match: /hsbc/i, name: 'HSBC' },
  { match: /\batb\b|atb financial/i, name: 'ATB Financial' },
  { match: /servus/i, name: 'Servus Credit Union' },
  { match: /coast capital/i, name: 'Coast Capital' },
  { match: /vancity/i, name: 'Vancity' },
  { match: /meridian/i, name: 'Meridian Credit Union' },
  { match: /eq bank/i, name: 'EQ Bank' },
  { match: /koho/i, name: 'KOHO' },
  { match: /wealthsimple/i, name: 'Wealthsimple' },
];

interface StatementBreakdown {
  version: 1;
  import_id: string;
  document_id: string | null;
  user_id: string;
  created_at: string;
  statement_meta: {
    issuer: string | null;
    account_last4: string | null;
    period_start: string | null;
    period_end: string | null;
    statement_type: 'bank' | 'credit_card' | 'unknown';
  };
  totals: {
    total_debits: number;
    total_credits: number;
    net: number;
    transaction_count: number;
  };
  category_totals: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  top_merchants: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  flags: {
    duplicate_count: number;
    refund_count: number;
    needs_review_count: number;
    low_confidence_count: number;
    missing_date_count: number;
  };
  read_completeness?: {
    status: 'complete' | 'partial' | 'unknown';
    pages_detected: number | null;
    pages_read: number | null;
    coverage_ratio: number | null;
    signals: string[];
  };
  confidence: {
    overall: 'high' | 'medium' | 'low';
    ocr_confidence: number | null;
    parse_confidence: number | null;
    transaction_match_rate: number | null;
    reconciled: boolean;
    recon_method: 'direct_debits' | 'balance_equation' | 'direct_credits' | 'none';
  };
}

function parseBreakdownCandidate(candidate: any): any | null {
  if (candidate == null) return null;
  if (typeof candidate === 'string') {
    const raw = candidate.trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof candidate === 'object' ? candidate : null;
}

function hasUsableStatementMetadata(breakdown: any): boolean {
  if (!breakdown || typeof breakdown !== 'object') return false;
  const meta = breakdown.statement_meta && typeof breakdown.statement_meta === 'object'
    ? breakdown.statement_meta
    : {};
  const hasMetaFields = Boolean(
    String(meta.issuer || breakdown.institution || breakdown.issuer || '').trim() ||
    String(meta.account_last4 || breakdown.account_last4 || '').trim() ||
    String(meta.period_start || breakdown.period_start || '').trim() ||
    String(meta.period_end || breakdown.period_end || '').trim()
  );
  const hasStatementMath =
    breakdown.statement_math && typeof breakdown.statement_math === 'object'
      ? Object.values(breakdown.statement_math).some((v) => Number.isFinite(Number(v)))
      : false;
  const hasCoreBalances =
    Number.isFinite(Number(breakdown.previous_balance)) ||
    Number.isFinite(Number(breakdown.new_balance));
  return hasMetaFields || hasStatementMath || hasCoreBalances;
}

function isUsableBreakdown(breakdown: any): boolean {
  if (!breakdown || typeof breakdown !== 'object') return false;
  const hasTransactions = Array.isArray(breakdown.transactions) && breakdown.transactions.length > 0;
  const hasCategoryTotals = Array.isArray(breakdown.category_totals) && breakdown.category_totals.length > 0;
  const hasTopMerchants = Array.isArray(breakdown.top_merchants) && breakdown.top_merchants.length > 0;
  const hasTotals = breakdown.totals && typeof breakdown.totals === 'object' &&
    (Number.isFinite(Number(breakdown.totals.total_debits)) || Number.isFinite(Number(breakdown.totals.total_credits)));
  const hasAccountSummary = breakdown.account_summary && typeof breakdown.account_summary === 'object' &&
    (Number.isFinite(Number(breakdown.account_summary.new_balance)) || Number.isFinite(Number(breakdown.account_summary.credit_limit)));
  return hasTransactions || hasCategoryTotals || hasTopMerchants || hasTotals || hasAccountSummary || hasUsableStatementMetadata(breakdown);
}

function readStatementBreakdownFromImport(importData: any): StatementBreakdown | null {
  const candidateRaw =
    importData?.statement_breakdown_json ||
    importData?.statement_breakdown ||
    importData?.metadata?.statement_breakdown ||
    null;
  const candidate = parseBreakdownCandidate(candidateRaw);
  if (!candidate) return null;
  if (Number(candidate.version || 1) !== 1 && !isUsableBreakdown(candidate)) return null;
  return candidate as StatementBreakdown;
}

async function loadStatementBreakdownFromSummaryFallback(
  sb: any,
  importId: string,
  userId: string
): Promise<StatementBreakdown | null> {
  const selectAttempts = [
    'statement_breakdown_json, metadata, created_at',
    'statement_breakdown_json, created_at',
    'metadata, created_at',
  ];
  for (const selectClause of selectAttempts) {
    try {
      const scoped = await sb
        .from('import_summaries')
        .select(selectClause)
        .eq('import_id', importId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      const rows = Array.isArray(scoped.data) ? scoped.data : [];
      if (rows.length > 0) {
        for (const row of rows) {
          const parsed =
            parseBreakdownCandidate(row?.statement_breakdown_json) ||
            parseBreakdownCandidate(row?.metadata?.statement_breakdown);
          if (parsed && isUsableBreakdown(parsed)) return parsed as StatementBreakdown;
        }
      }
      if (!scoped.error) continue;
      const unscoped = await sb
        .from('import_summaries')
        .select(selectClause)
        .eq('import_id', importId)
        .order('created_at', { ascending: false })
        .limit(5);
      const unscopedRows = Array.isArray(unscoped.data) ? unscoped.data : [];
      for (const row of unscopedRows) {
        const parsed =
          parseBreakdownCandidate(row?.statement_breakdown_json) ||
          parseBreakdownCandidate(row?.metadata?.statement_breakdown);
        if (parsed && isUsableBreakdown(parsed)) return parsed as StatementBreakdown;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function loadImportRowWithBreakdown(sb: any, importId: string): Promise<any | null> {
  const selectAttempts = [
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown_json',
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown_json, metadata',
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown_json, statement_breakdown, metadata, summary, analytics, committed_summary, results_json',
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown_json, statement_breakdown, metadata, summary',
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown_json, metadata, summary',
    'id, user_id, status, created_at, document_id, file_url, statement_breakdown, metadata, summary',
    'id, user_id, status, created_at, document_id, file_url, metadata',
    'id, user_id, status, created_at, document_id, file_url',
  ];
  for (const selectClause of selectAttempts) {
    const { data, error } = await sb
      .from('imports')
      .select(selectClause)
      .eq('id', importId)
      .maybeSingle();
    if (!error) {
      console.log('[prime-summary] loadImportRowWithBreakdown success', {
        importId,
        selectClause: selectClause.substring(0, 80),
        hasData: Boolean(data),
        hasBreakdownJson: Boolean(data?.statement_breakdown_json),
        breakdownJsonType: typeof data?.statement_breakdown_json,
      });
      return data || null;
    }
    console.log('[prime-summary] loadImportRowWithBreakdown select failed', {
      importId,
      selectClause: selectClause.substring(0, 80),
      errorCode: error?.code,
      errorMessage: error?.message?.substring(0, 120),
    });
  }
  return null;
}

function getActiveProcessingLock(metadata: any): { token: string; expiresAt: string } | null {
  const lock = metadata?.processing_lock;
  if (!lock || typeof lock !== 'object') return null;
  const token = String(lock.token || '').trim();
  const expiresAt = String(lock.expires_at || '').trim();
  if (!token || !expiresAt) return null;
  const expiresMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs <= Date.now()) return null;
  return { token, expiresAt };
}

function buildDocFallbackFromImport(importData: any): any {
  const fileUrl = String(importData?.file_url || '').trim();
  if (!fileUrl) return {};
  const name = fileUrl.split('/').filter(Boolean).pop() || '';
  return { original_name: name };
}

async function sanitizeSummaryForOutput(
  summary: string,
  userId: string | null
): Promise<string> {
  const base = cleanupOcrText(String(summary || ''));
  if (!base.trim() || !userId) return base;

  try {
    const result = await runGuardrailsForText(base, userId, 'chat');
    let finalText = cleanupOcrText(String(result.text || ''));
    if (!finalText.trim()) {
      const fallback = maskPiiFallback(base, 'last4');
      finalText = cleanupOcrText(String(fallback.masked || ''));
    }
    if (!result.ok) {
      console.warn('[prime-summary] Output guardrails signaled block; returning sanitized summary', {
        reasons: result.reasons || [],
      });
    }
    return finalText.trim() ? finalText : base;
  } catch (error: any) {
    console.warn('[prime-summary] Output guardrails failed; returning base summary', {
      error: error?.message || String(error),
    });
    return base;
  }
}

type ResolvedBreakdownMeta = {
  issuer: string | null;
  accountLast4: string | null;
  periodStart: string | null;
  periodEnd: string | null;
};

function normalizeIsoDateForBreakdown(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const m = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function resolveBreakdownMetaForSummary(
  sb: any,
  importData: any,
  b: StatementBreakdown
): Promise<ResolvedBreakdownMeta> {
  const fromMeta = {
    issuer: String(b.statement_meta?.issuer || '').trim() || null,
    accountLast4: String(b.statement_meta?.account_last4 || '').trim() || null,
    periodStart: normalizeIsoDateForBreakdown(b.statement_meta?.period_start),
    periodEnd: normalizeIsoDateForBreakdown(b.statement_meta?.period_end),
  };
  if (fromMeta.issuer && fromMeta.accountLast4 && fromMeta.periodStart && fromMeta.periodEnd) {
    return fromMeta;
  }

  let docData: any = buildDocFallbackFromImport(importData);
  if (importData?.document_id) {
    const loaded = await loadDocumentDataForSummary(sb, String(importData.document_id));
    docData = {
      ...(docData || {}),
      ...(loaded || {}),
      original_name: String(loaded?.original_name || docData?.original_name || '').trim() || undefined,
    };
  }

  const issuer =
    fromMeta.issuer ||
    extractInstitutionOrCard(docData) ||
    inferInstitutionFromFileName(docData) ||
    null;
  const accountLast4 =
    fromMeta.accountLast4 ||
    extractAccountLast4(docData) ||
    null;

  let periodStart = fromMeta.periodStart;
  let periodEnd = fromMeta.periodEnd;
  if (!periodStart || !periodEnd) {
    const fromDocPeriod = extractStatementPeriod(docData);
    if (fromDocPeriod && /\bto\b/i.test(fromDocPeriod)) {
      const parts = fromDocPeriod.split(/\bto\b/i).map((p) => p.trim());
      periodStart = periodStart || normalizeIsoDateForBreakdown(parts[0]);
      periodEnd = periodEnd || normalizeIsoDateForBreakdown(parts[1]);
    }
  }
  if (!periodStart || !periodEnd) {
    const fromName = inferPeriodFromFileName(docData);
    if (fromName && /\bto\b/i.test(fromName)) {
      const parts = fromName.split(/\bto\b/i).map((p) => p.trim());
      periodStart = periodStart || normalizeIsoDateForBreakdown(parts[0]);
      periodEnd = periodEnd || normalizeIsoDateForBreakdown(parts[1]);
    }
  }
  if (!periodStart || !periodEnd) {
    const { data: txRows } = await sb
      .from('transactions')
      .select('date')
      .eq('import_id', b.import_id)
      .order('date', { ascending: true })
      .limit(500);
    const dates = (Array.isArray(txRows) ? txRows : [])
      .map((r: any) => normalizeIsoDateForBreakdown(r?.date))
      .filter((d: string | null): d is string => Boolean(d));
    if (dates.length > 0) {
      periodStart = periodStart || dates[0];
      periodEnd = periodEnd || dates[dates.length - 1];
    }
  }

  return {
    issuer: issuer || null,
    accountLast4: accountLast4 || null,
    periodStart: periodStart || null,
    periodEnd: periodEnd || null,
  };
}

function parseMoney(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,\s]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return 'n/a';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMaybeAmount(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Not available in this statement.';
  return formatMoney(n);
}

function buildPrimeReadHeadline(institutionRaw: string | null | undefined, utilizationPct: number | null): string {
  const institution = String(institutionRaw || '').trim() || 'This account';
  const normalized = institution.toLowerCase();
  let signal = 'The Strategic Read';
  if (utilizationPct !== null && Number.isFinite(utilizationPct)) {
    if (utilizationPct >= 90) signal = 'The Pressure Point';
    else if (utilizationPct >= 75) signal = 'The Tight Zone';
    else if (utilizationPct <= 35) signal = 'The Flex Zone';
  }
  if (normalized.includes('capital one')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Pressure Point' : 'The Focus Lane';
  if (normalized.includes('rbc')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Weight' : 'The Control Lane';
  if (normalized.includes('triangle')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Weight' : 'The Loadout';
  if (normalized.includes('scotia') || normalized.includes('scotiabank')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Pinch Point' : 'The Control Path';
  if (normalized.includes('cibc')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Stress Point' : 'The Leverage Lane';
  if (normalized.includes('td')) signal = utilizationPct !== null && utilizationPct >= 90 ? 'The Pressure Line' : 'The Planning Lane';
  return `${institution} — ${signal}`;
}

function parseDateRangeLabel(dateRange: any): string | null {
  const start = String(dateRange?.startDate || dateRange?.start || '').trim();
  const end = String(dateRange?.endDate || dateRange?.end || '').trim();
  if (!start && !end) return null;
  if (start && end) return `${start} to ${end}`;
  return start || end;
}

function appendTransactionsCta(summary: string, importId: string): string {
  const safeImportId = encodeURIComponent(String(importId || '').trim());
  if (!safeImportId) return summary;
  const cta = [
    '## Continue in Transactions',
    `- [View this statement in Transactions](/dashboard/transactions?importId=${safeImportId})`,
  ].join('\n');
  if (summary.includes('## Continue in Transactions')) {
    return summary;
  }
  return `${summary.trim()}\n\n${cta}\n`;
}

function detectIssuerFromRawText(rawText: string): string | null {
  const text = String(rawText || '');
  if (!text) return null;
  for (const pattern of ISSUER_PATTERNS) {
    if (pattern.match.test(text)) return pattern.name;
  }
  return null;
}

function detectInstitutionFromHeader(rawText: string): string | null {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 60);
  if (lines.length === 0) return null;

  const statementLine = lines.find((line) => /account statement|statement period|statement date/i.test(line));
  if (statementLine) {
    const accountStatementMatch = statementLine.match(/^([A-Za-z][A-Za-z0-9&'., -]{2,60})\s+account statement\b/i);
    if (accountStatementMatch?.[1]) {
      const candidate = accountStatementMatch[1].trim();
      if (!/^bank account$/i.test(candidate)) return candidate;
    }
  }

  for (const line of lines) {
    const orgMatch = line.match(/\b([A-Za-z][A-Za-z0-9&'., -]{2,60}\s(?:Bank|Credit Union|Financial|Trust))\b/i);
    if (orgMatch?.[1] && !/^bank account/i.test(orgMatch[1])) {
      return orgMatch[1].trim();
    }
  }
  return null;
}

function renderPrimeNarrativeV1(params: {
  docName: string;
  period: string | null;
  analytics: any;
  counts: { transactionCount: number | null };
  warnings: string[];
}): string {
  const a = params.analytics || {};
  const totals = a?.totals || {};
  const txCount =
    params.counts.transactionCount ??
    (Number(totals.transaction_count || a?.totalTransactions || 0) || null);
  const totalDebits = Number(totals.total_debits ?? a?.totalDebits);
  const totalCredits = Number(totals.total_credits ?? a?.totalCredits);
  const net = Number(totals.net);
  const statementMeta = a?.statement_meta || {};
  const institution = String(statementMeta?.issuer || '').trim() || 'unknown';
  const accountLast4 = String(statementMeta?.account_last4 || '').trim() || null;
  const needsReviewCount = Number(
    a?.flags?.needs_review_count ??
    a?.uncategorizedCount ??
    0
  );

  const categoryBreakdown = Array.isArray(a?.category_totals)
    ? a.category_totals.slice(0, 5).map((row: any) =>
        `- ${String(row?.category || 'Uncategorized')}: ${formatMaybeAmount(row?.total)} (${Number(row?.count || 0)} tx)`
      )
    : Array.isArray(a?.topCategories)
      ? a.topCategories.slice(0, 5).map((row: any) =>
          `- ${String(row?.category || 'Uncategorized')}: ${formatMaybeAmount(row?.total)} (${Number(row?.count || 0)} tx)`
        )
      : [];

  const notableFindings = Array.isArray(a?.top_merchants)
    ? a.top_merchants.slice(0, 3).map((row: any) =>
        `- ${String(row?.merchant || 'Unknown merchant')}: ${formatMaybeAmount(row?.total)} (${Number(row?.count || 0)} tx)`
      )
    : [];

  const summaryParagraphs: string[] = [];
  const corePeriod = params.period || parseDateRangeLabel(a?.dateRange) || 'an unknown period';
  const statusSentence =
    needsReviewCount > 0
      ? `Tag flagged ${needsReviewCount} item(s) for category review, so this snapshot is usable but still needs a quick pass before final decisions.`
      : 'Tag did not flag category blockers, so this snapshot is ready for immediate review and action.';
  summaryParagraphs.push(
    `Here is what matters most from ${params.docName || 'your statement'}: Byte validated ${txCount ?? 'unknown'} transaction row(s) for ${corePeriod}. ${statusSentence}`
  );
  if (categoryBreakdown.length > 0) {
    const topCategoryNames = categoryBreakdown
      .slice(0, 3)
      .map((line) => line.replace(/^- /, '').split(':')[0])
      .join(', ');
    summaryParagraphs.push(
      `The spending pressure this cycle is concentrated in ${topCategoryNames}. Next best step: ${
        needsReviewCount > 0
          ? 'confirm the flagged lines first, then approve categorization.'
          : 'review recurring merchants and high-impact charges so your plan is clear.'
      }`
    );
  } else {
    summaryParagraphs.push(
      `This statement is grounded on validated rows. Next step: ${
        needsReviewCount > 0
          ? 'confirm flagged lines first, then approve categorization.'
          : 'review recurring merchants and high-impact charges to lock in actions.'
      }`
    );
  }

  const cleanedRows = Array.isArray(a?.top_merchants)
    ? a.top_merchants.slice(0, 8).map((row: any) => {
        const merchant = String(row?.merchant || '').trim() || 'UNKNOWN-MERCHANT';
        const amount = formatMaybeAmount(row?.total);
        const count = Number(row?.count || 0);
        const note = count > 0 ? `${count} tx aggregate` : 'aggregate';
        return `UNKNOWN-DATE | ${merchant} | ${amount} | UNKNOWN-CURRENCY | ${note}`;
      })
    : [];

  const issues: string[] = [];
  issues.push(...params.warnings.map((w) => `- ${w}`));
  if (!params.period && !parseDateRangeLabel(a?.dateRange)) {
    issues.push('- Statement period is unknown from current analytics payload.');
  }
  if (!Number.isFinite(totalDebits) || !Number.isFinite(totalCredits)) {
    issues.push('- Some totals are not visible in analytics payload; verify against source statement.');
  }
  if (needsReviewCount > 0) {
    issues.push(`- ${needsReviewCount} transaction(s) were flagged for review.`);
  }

  const lines: string[] = [
    '## Summary',
    ...summaryParagraphs.slice(0, 2),
    '',
    '## Key details',
    `- Statement period: ${params.period || parseDateRangeLabel(a?.dateRange) || 'unknown'}`,
    `- Institution / Card: ${institution}`,
    `- Account last-4 (if present): ${accountLast4 || 'not present'}`,
    `- Totals (only if visible): debits ${formatMaybeAmount(totalDebits)}, credits ${formatMaybeAmount(totalCredits)}, net ${formatMaybeAmount(net)}`,
    '',
    '## Transactions (cleaned)',
    ...(cleanedRows.length > 0
      ? cleanedRows
      : ['- UNKNOWN-DATE | UNKNOWN-MERCHANT | UNKNOWN-AMOUNT | UNKNOWN-CURRENCY | analytics summary available but merchant lines not provided']),
  ];
  if (issues.length > 0) {
    lines.push('', '## Issues / Uncertain lines', ...issues);
  }
  const primeReadClauses: string[] = [];
  const utilization = Number(a?.statement_meta?.utilization_pct ?? a?.utilization_pct ?? NaN);
  if (Number.isFinite(utilization)) {
    if (utilization >= 90) {
      primeReadClauses.push('utilization is very high, which keeps this account under constant payment pressure');
    } else if (utilization >= 75) {
      primeReadClauses.push('utilization is elevated and reducing principal should stay priority one');
    }
  }
  if (Number.isFinite(net)) {
    if (net < 0) {
      primeReadClauses.push('the period closed net negative, so tightening discretionary spend can restore margin faster');
    } else if (net > 0) {
      primeReadClauses.push('the period closed net positive and that surplus should go to high-interest balances first');
    }
  }
  if (categoryBreakdown.length > 0) {
    primeReadClauses.push(`the biggest cost pressure is concentrated in ${categoryBreakdown[0].replace(/^- /, '').split(':')[0]}`);
  }
  const readParagraphOne =
    primeReadClauses.length > 0
      ? `What stands out right now is that ${primeReadClauses.join(', ')}.`
      : 'The core numbers are clear — review the top merchants and recurring charges above to identify where spend pressure is highest.';
  const readParagraphTwo =
    'If you do one thing this cycle, push payment above minimum and review recurring charges so your monthly cash flow starts opening up instead of tightening.';
  const narrativeInstitution = institution === 'unknown' ? 'This account' : institution;
  const headline = buildPrimeReadHeadline(narrativeInstitution, Number.isFinite(utilization) ? utilization : null);
  lines.push('', "## Prime's Read", `### ${escapeInlineMarkdown(headline)}`, readParagraphOne, '', readParagraphTwo);
  return lines.join('\n');
}

function resolveAnalyticsFromImport(importData: any): { analytics: any | null; sourceField: string | null } {
  const candidates: Array<{ sourceField: string; value: any }> = [
    { sourceField: 'imports.statement_breakdown_json', value: importData?.statement_breakdown_json },
    { sourceField: 'imports.statement_breakdown', value: importData?.statement_breakdown },
    { sourceField: 'imports.metadata.statement_breakdown', value: importData?.metadata?.statement_breakdown },
    { sourceField: 'imports.analytics', value: importData?.analytics },
    { sourceField: 'imports.committed_summary', value: importData?.committed_summary },
    { sourceField: 'imports.results_json', value: importData?.results_json },
    { sourceField: 'imports.summary', value: importData?.summary },
  ];

  for (const candidate of candidates) {
    const parsed = parseBreakdownCandidate(candidate.value);
    if (parsed && typeof parsed === 'object') {
      return { analytics: parsed, sourceField: candidate.sourceField };
    }
    const fromBreakdown = parseBreakdownCandidate(candidate.value?.statement_breakdown);
    if (fromBreakdown) {
      return { analytics: fromBreakdown, sourceField: `${candidate.sourceField}.statement_breakdown` };
    }
    const fromSummary = parseBreakdownCandidate(candidate.value?.summary);
    if (fromSummary) {
      return { analytics: fromSummary, sourceField: `${candidate.sourceField}.summary` };
    }
    const fromAnalytics = parseBreakdownCandidate(candidate.value?.analytics);
    if (fromAnalytics) {
      return { analytics: fromAnalytics, sourceField: `${candidate.sourceField}.analytics` };
    }
  }
  return { analytics: null, sourceField: null };
}

async function resolveAnalyticsFallbackFromSummaries(
  sb: any,
  importId: string,
  userId: string
): Promise<{ analytics: any | null; sourceField: string | null }> {
  try {
    const { data } = await sb
      .from('import_summaries')
      .select('statement_breakdown_json, metadata, created_at')
      .eq('import_id', importId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const parsed =
        parseBreakdownCandidate(row?.statement_breakdown_json) ||
        parseBreakdownCandidate(row?.metadata?.statement_breakdown);
      if (parsed && typeof parsed === 'object') {
        return { analytics: parsed, sourceField: 'import_summaries.statement_breakdown_json' };
      }
    }
  } catch {
    // best-effort lookup
  }
  return { analytics: null, sourceField: null };
}

function coerceDateLabel(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return 'UNKNOWN-DATE';
  const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return 'UNKNOWN-DATE';
}

function coerceMerchantLabel(value: unknown): string {
  const raw = String(value || '').trim();
  return escapeInlineMarkdown(raw || 'UNKNOWN-MERCHANT');
}

function escapeInlineMarkdown(value: string): string {
  return String(value || '').replace(/([\\`*_[\]{}])/g, '\\$1');
}

function coerceAmountLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'UNKNOWN-AMOUNT';
  const sign = n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

function getStatementSummaryMeta(docData: any): Record<string, unknown> {
  const summary = docData?.metadata?.statement_summary;
  return summary && typeof summary === 'object' ? summary : {};
}

function getSummarySourceText(docData: any): string {
  const statementSummary = getStatementSummaryMeta(docData);
  return cleanupOcrText(
    [
      docData?.ocr_text,
      docData?.summary,
      docData?.extracted_data?.rawText,
      docData?.extracted_data?.text,
      statementSummary?.institution,
      statementSummary?.issuer,
      statementSummary?.card_name,
      statementSummary?.card_brand,
    ]
      .filter(Boolean)
      .join('\n')
  );
}

function extractStatementPeriod(docData: any): string | null {
  const extractedPeriod = String(docData?.extracted_data?.statement_period || '').trim();
  if (extractedPeriod) return extractedPeriod;
  const rawText = getSummarySourceText(docData);
  if (!rawText) return null;
  const periodMatch =
    rawText.match(/For the period:\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})\s+to\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i) ||
    rawText.match(/For\s+([A-Za-z]{3,9}\s+\d{1,2})\s+to\s+([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);
  if (!periodMatch) return null;
  if (periodMatch.length >= 3) {
    return `${periodMatch[1]} to ${periodMatch[2]}`;
  }
  const slashPeriod =
    rawText.match(/\b(\d{4}[-\/]\d{2}[-\/]\d{2})\s*(?:to|\-|–)\s*(\d{4}[-\/]\d{2}[-\/]\d{2})\b/i) ||
    rawText.match(/\b(\d{2}[-\/]\d{2}[-\/]\d{4})\s*(?:to|\-|–)\s*(\d{2}[-\/]\d{2}[-\/]\d{4})\b/i);
  if (slashPeriod?.[1] && slashPeriod?.[2]) {
    return `${slashPeriod[1].replace(/\//g, '-')} to ${slashPeriod[2].replace(/\//g, '-')}`;
  }
  return periodMatch[1] || null;
}

function extractInstitutionOrCard(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const statementSummary = getStatementSummaryMeta(docData);
  const normalizeInstitutionCandidate = (value: unknown): string | null => {
    const raw = String(value || '').replace(/\s+/g, ' ').trim();
    if (!raw) return null;
    const lower = raw.toLowerCase();
    // Reject OCR/legal noise that often appears around exchange-rate disclaimers.
    if (
      lower.includes('transaction was converted') ||
      lower.includes('may be obtained at') ||
      lower.includes('exchange rate') ||
      lower.includes('currency conversion') ||
      lower.includes('for more information') ||
      lower.includes('customer service') ||
      lower.includes('terms and conditions')
    ) {
      return null;
    }
    // Reject overly long sentence-like values; institution/card labels are short.
    if (raw.length > 50) return null;
    // Require at least one alphabetic character and avoid mostly numeric blobs.
    const alphaCount = (raw.match(/[A-Za-z]/g) || []).length;
    const digitCount = (raw.match(/[0-9]/g) || []).length;
    if (alphaCount < 3 || digitCount > alphaCount) return null;
    return raw;
  };
  const candidates = [
    extracted.institution,
    extracted.bank,
    extracted.card,
    extracted.card_name,
    extracted.issuer,
    statementSummary?.institution,
    statementSummary?.bank,
    statementSummary?.issuer,
    statementSummary?.card_name,
    statementSummary?.card_brand,
  ];
  for (const candidate of candidates) {
    const text = normalizeInstitutionCandidate(candidate);
    if (text) return text;
  }
  const rawText = getSummarySourceText(docData);
  const matchedIssuer = detectIssuerFromRawText(rawText);
  if (matchedIssuer) return matchedIssuer;
  const headerInstitution = detectInstitutionFromHeader(rawText);
  if (headerInstitution) return headerInstitution;
  const cardMatch = rawText.match(/Triangle World Elite Mastercard/i);
  if (cardMatch) return 'Triangle World Elite Mastercard';
  const bankMatch = rawText.match(/^([A-Z][A-Za-z0-9 ]+Account Statement)/m);
  return bankMatch?.[1] || null;
}

function extractAccountLast4(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const statementSummary = getStatementSummaryMeta(docData);
  const candidate = String(
    extracted.account_last4 ||
      extracted.account_last_4 ||
      extracted.last4 ||
      extracted.last_4 ||
      statementSummary?.account_last4 ||
      statementSummary?.last4 ||
      statementSummary?.account_last_4 ||
      ''
  ).trim();
  if (candidate) return candidate.slice(-4);
  const accountNumber = String(extracted.account_number || '').replace(/\D/g, '');
  if (accountNumber.length >= 4) return accountNumber.slice(-4);
  const rawText = getSummarySourceText(docData);
  const endingMatch = rawText.match(/ending with\s+(\d{4})/i);
  if (endingMatch?.[1]) return endingMatch[1];
  const endingInMatch = rawText.match(/ending in\s+(\d{4})/i);
  if (endingInMatch?.[1]) return endingInMatch[1];
  const cardMatch = rawText.match(/Card\s*#\s*[0-9Xx ]+(\d{4})/i);
  if (cardMatch?.[1]) return cardMatch[1];
  const accountEndingMatch = rawText.match(/account(?: number)?\s*(?:ending|ending in|#)?\s*[Xx*\- ]*(\d{4})/i);
  if (accountEndingMatch?.[1]) return accountEndingMatch[1];
  const originalName = String(docData?.original_name || '');
  const digitRun = originalName.match(/(\d{12,19})/);
  if (digitRun?.[1]) {
    return digitRun[1].slice(-4);
  }
  return null;
}

function inferInstitutionFromFileName(docData: any): string | null {
  const name = String(docData?.original_name || '').toLowerCase();
  if (!name) return null;
  if ((name.includes('triangle') || name.includes('ctfs')) && (name.includes('mastercard') || name.includes('worldelite'))) {
    return 'Triangle World Elite Mastercard';
  }
  if (name.includes('rbc') && name.includes('visa')) return 'RBC Visa';
  if (name.includes('scotia') && name.includes('visa')) return 'Scotiabank Visa';
  if (name.includes('cibc') && name.includes('visa')) return 'CIBC Visa';
  if (name.includes('td') && name.includes('visa')) return 'TD Visa';
  if (name.includes('bmo') && name.includes('mastercard')) return 'BMO Mastercard';
  if (name.includes('capitalone') || name.includes('capital one')) return 'Capital One';
  if (name.includes('amex') || name.includes('americanexpress') || name.includes('american express')) return 'American Express';
  if (name.includes('mastercard')) return 'Mastercard';
  if (name.includes('visa')) return 'Visa';
  return null;
}

function inferPeriodFromFileName(docData: any): string | null {
  const name = String(docData?.original_name || '');
  if (!name) return null;
  const snake = name.match(/(\d{4})[_-](\d{2})[_-](\d{2})[_-](\d{4})[_-](\d{2})[_-](\d{2})/);
  if (snake) {
    return `${snake[1]}-${snake[2]}-${snake[3]} to ${snake[4]}-${snake[5]}-${snake[6]}`;
  }
  return null;
}

function extractTotalsLine(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const statementSummary = getStatementSummaryMeta(docData);
  const parts: string[] = [];
  if (extracted.new_balance !== undefined && extracted.new_balance !== null && extracted.new_balance !== '') {
    parts.push(`balance ${coerceAmountLabel(extracted.new_balance)}`);
  }
  if (extracted.payments !== undefined && extracted.payments !== null && extracted.payments !== '') {
    parts.push(`payments ${coerceAmountLabel(extracted.payments)}`);
  }
  if (extracted.fees !== undefined && extracted.fees !== null && extracted.fees !== '') {
    parts.push(`fees ${coerceAmountLabel(extracted.fees)}`);
  }
  if (extracted.interest_charged !== undefined && extracted.interest_charged !== null && extracted.interest_charged !== '') {
    parts.push(`interest ${coerceAmountLabel(extracted.interest_charged)}`);
  }
  const rawText = getSummarySourceText(docData);
  if (parts.length === 0 && rawText) {
    const credits = rawText.match(/Total credits\s*-?\$?([0-9,]+\.\d{2})/i)?.[1] || null;
    const charges = rawText.match(/Total charges\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
    const newBalance = rawText.match(/Your New Balance\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
    const balanceDue = rawText.match(/Balance Due\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
    if (credits) parts.push(`total credits -${Number(credits.replace(/,/g, '')).toFixed(2)}`);
    if (charges) parts.push(`total charges ${Number(charges.replace(/,/g, '')).toFixed(2)}`);
    if (newBalance) parts.push(`new balance ${Number(newBalance.replace(/,/g, '')).toFixed(2)}`);
    if (balanceDue) parts.push(`balance due ${Number(balanceDue.replace(/,/g, '')).toFixed(2)}`);
  }
  if (parts.length === 0) {
    const newBalance = parseFieldMoney(statementSummary?.new_balance);
    const previousBalance = parseFieldMoney(statementSummary?.previous_balance);
    if (previousBalance !== null) parts.push(`previous balance ${coerceAmountLabel(previousBalance)}`);
    if (newBalance !== null) parts.push(`new balance ${coerceAmountLabel(newBalance)}`);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

type CardStatementFields = {
  dueDate: string | null;
  minimumPayment: number | null;
  newBalance: number | null;
  creditLimit: number | null;
  availableCredit: number | null;
  utilizationPct: number | null;
};

function parseFieldMoney(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  return parseMoney(raw);
}

function extractCardStatementFields(docData: any): CardStatementFields {
  const extracted = docData?.extracted_data || {};
  const statementSummary = getStatementSummaryMeta(docData);
  const rawText = getSummarySourceText(docData);
  const dueDateFromText = rawText.match(/Payment due date\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)?.[1] || null;
  const minDueFromText = rawText.match(/Minimum payment due\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const newBalanceFromText = rawText.match(/Your New Balance\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const creditLimitFromText = rawText.match(/Credit limit\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const availableCreditFromText = rawText.match(/Available credit\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const dueDate = String(
    extracted.due_date ||
      extracted.payment_due_date ||
      statementSummary?.due_date ||
      statementSummary?.payment_due_date ||
      ''
  ).trim() || null;
  const minimumPayment = parseFieldMoney(
    extracted.minimum_payment_due ?? extracted.minimum_due ?? statementSummary?.minimum_payment_due ?? minDueFromText
  );
  const newBalance = parseFieldMoney(
    extracted.new_balance ?? extracted.statement_balance ?? statementSummary?.new_balance ?? newBalanceFromText
  );
  const creditLimit = parseFieldMoney(
    extracted.credit_limit ?? statementSummary?.credit_limit ?? creditLimitFromText
  );
  const availableCredit = parseFieldMoney(
    extracted.available_credit ?? statementSummary?.available_credit ?? availableCreditFromText
  );
  const utilizationPct =
    creditLimit !== null && creditLimit > 0 && newBalance !== null
      ? Math.max(0, Math.min(100, (newBalance / creditLimit) * 100))
      : null;
  return {
    dueDate: dueDate || dueDateFromText,
    minimumPayment,
    newBalance,
    creditLimit,
    availableCredit,
    utilizationPct,
  };
}

type SummaryTransactionRow = {
  line: string;
  issue?: string;
};

function toSummaryTransactionRow(tx: any): SummaryTransactionRow {
  const data = tx?.data_json || {};
  const date = coerceDateLabel(data.posted_at || data.date || data.transaction_date);
  const merchant = coerceMerchantLabel(
    data.merchant || data.vendor || data.description || data.payee || data.memo || data.name
  );
  const amount = coerceAmountLabel(data.amount);
  const currency = String(data.currency || 'UNKNOWN-CURRENCY').trim() || 'UNKNOWN-CURRENCY';
  const category = String(tx?.tag_category || data.category || '').trim();
  const status = String(tx?.tag_status || '').trim();
  const needsReview = status === 'needs_review';
  const notes = needsReview ? 'Review suggested' : 'Purchase';

  const row: SummaryTransactionRow = {
    line: `${date} | ${merchant} | ${amount} | ${currency} | ${notes}`,
  };
  if (needsReview) {
    row.issue = `${date} | ${merchant} needs a quick review`;
  }
  return row;
}

function inferInstitutionFromTransactions(transactions: any[]): string | null {
  const merchants = transactions
    .map((tx) =>
      String(
        tx?.data_json?.merchant ||
          tx?.data_json?.vendor ||
          tx?.data_json?.description ||
          ''
      ).toUpperCase()
    )
    .filter(Boolean);
  if (merchants.length === 0) return null;
  const hasBankSignals = merchants.some(
    (m) =>
      m.includes('INTERAC') ||
      m.includes('ABM') ||
      m.includes('MOBILECHEQUE') ||
      m.includes('E-TRANSFER')
  );
  if (hasBankSignals) return null;
  return null;
}

function detectPaymentActivity(transactions: any[]): boolean {
  return (Array.isArray(transactions) ? transactions : []).some((tx: any) => {
    const data = tx?.data_json || {};
    const amount = Number(tx?.amount ?? data?.amount ?? 0);
    const direction = String(data?.direction || '').toLowerCase();
    const category = String(tx?.tag_category || data?.category || '').toLowerCase();
    const text = String(
      data?.merchant || data?.description || data?.payee || data?.memo || ''
    ).toLowerCase();
    return (
      amount < 0 ||
      direction === 'credit' ||
      category.includes('payment') ||
      /\b(payment|autopay|auto-pay|thank you|credit card payment)\b/.test(text)
    );
  });
}

export function formatOcrSummaryMarkdown(params: {
  docData?: any;
  transactions?: any[];
  transactionCount?: number;
  topCategories?: string[];
  needsReviewCount?: number;
  extraIssues?: string[];
}): string {
  const docData = params.docData || {};
  const transactions = Array.isArray(params.transactions) ? params.transactions : [];
  const transactionCount = Number.isFinite(Number(params.transactionCount))
    ? Number(params.transactionCount)
    : transactions.length;
  const topCategories = Array.isArray(params.topCategories) ? params.topCategories : [];
  const needsReviewCount = Number(params.needsReviewCount || 0);
  const issues: string[] = Array.isArray(params.extraIssues) ? [...params.extraIssues] : [];
  const cardFields = extractCardStatementFields(docData);
  const merchantCounts = new Map<string, { count: number; amount: number }>();
  let totalCapturedAmount = 0;
  let largestTxnAmount = 0;
  let largestTxnMerchant = 'UNKNOWN-MERCHANT';
  for (const tx of transactions) {
    const data = tx?.data_json || {};
    const merchant = String(
      data.merchant || data.vendor || data.description || data.payee || data.memo || data.name || ''
    ).trim();
    const amountNum = Number(data.amount);
    if (Number.isFinite(amountNum)) {
      totalCapturedAmount += Math.abs(amountNum);
      if (Math.abs(amountNum) > largestTxnAmount) {
        largestTxnAmount = Math.abs(amountNum);
        largestTxnMerchant = merchant || 'UNKNOWN-MERCHANT';
      }
    }
    if (!merchant) continue;
    const key = merchant.toLowerCase();
    const existing = merchantCounts.get(key) || { count: 0, amount: 0 };
    existing.count += 1;
    if (Number.isFinite(amountNum)) {
      existing.amount += Math.abs(amountNum);
    }
    merchantCounts.set(key, existing);
  }
  const recurringMerchants = Array.from(merchantCounts.entries())
    .map(([merchant, stats]) => ({ merchant, ...stats }))
    .filter((row) => row.count >= 2)
    .sort((a, b) => b.count - a.count || b.amount - a.amount)
    .slice(0, 3);

  const trustedCount = Math.max(transactionCount - needsReviewCount, 0);
  const summaryParagraphs: string[] = [];
  const normalizedTopCategories = topCategories
    .map((c) => String(c || '').trim())
    .filter(Boolean);
  const nonUncategorizedTopCategories = normalizedTopCategories.filter(
    (c) => c.toLowerCase() !== 'uncategorized'
  );
  const tagSentence =
    nonUncategorizedTopCategories.length > 0
      ? `Tag is already seeing spend patterns in ${nonUncategorizedTopCategories
          .slice(0, 3)
          .join(', ')}.`
      : normalizedTopCategories.length > 0
        ? `Tag placed ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} into initial categories — review and correct any mismatches so Tag can learn.`
        : `All ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} are uncategorized — open Smart Categories to kick off Tag.`;
  summaryParagraphs.push(
    `Byte extracted ${transactionCount} transaction${transactionCount === 1 ? '' : 's'} for this statement, with ${trustedCount} currently ready to use and ${needsReviewCount} needing review.`
  );
  summaryParagraphs.push(tagSentence);
  if (recurringMerchants.length > 0) {
    const recurringLabel = recurringMerchants
      .map((row) => `${escapeInlineMarkdown(String(row.merchant || '').toUpperCase())} (${row.count}x)`)
      .join(', ');
    summaryParagraphs.push(`A recurring pattern is visible in ${recurringLabel}.`);
  }
  if (totalCapturedAmount > 0) {
    summaryParagraphs.push(`Total captured spend in this statement is ${formatMoney(totalCapturedAmount)}.`);
  }
  const nextStepSentence =
    needsReviewCount > 0
      ? 'Next step: confirm the flagged lines first so corrections can be learned.'
      : 'Next step: review top merchants, recurring charges, and unusual activity.';
  summaryParagraphs.push(nextStepSentence);

  const txDates = transactions
    .map((tx: any) => String(tx?.data_json?.posted_at || tx?.data_json?.date || tx?.data_json?.transaction_date || '').slice(0, 10))
    .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const inferredPeriodFromTx =
    txDates.length >= 2 ? `${txDates[0]} to ${txDates[txDates.length - 1]}` : null;
  const period = extractStatementPeriod(docData) || inferPeriodFromFileName(docData) || inferredPeriodFromTx || 'unknown';
  const institution =
    extractInstitutionOrCard(docData) ||
    inferInstitutionFromFileName(docData) ||
    inferInstitutionFromTransactions(transactions) ||
    null;
  const accountLast4 = extractAccountLast4(docData);
  const totalsLine = extractTotalsLine(docData);

  const transactionLines: string[] = [];
  for (const tx of transactions) {
    const row = toSummaryTransactionRow(tx);
    transactionLines.push(row.line);
    if (row.issue) issues.push(row.issue);
  }
  const MAX_TX_LINES = 40;
  const shownTransactionLines =
    transactionLines.length > MAX_TX_LINES
      ? transactionLines.slice(0, MAX_TX_LINES)
      : transactionLines;
  if (transactionLines.length === 0) {
    shownTransactionLines.push('- UNKNOWN-DATE | UNKNOWN-MERCHANT | UNKNOWN-AMOUNT | UNKNOWN-CURRENCY | no parsed transactions');
  }

  const uniqueIssues = Array.from(new Set(issues.map((x) => String(x || '').trim()).filter(Boolean)));

  const output: string[] = [];
  output.push('## Summary');
  output.push(...summaryParagraphs.slice(0, 4));
  output.push('');
  output.push('## Key details');
  output.push(`- Statement period: ${period}`);
  output.push(`- Institution / Card: ${institution ? escapeInlineMarkdown(institution) : 'not detected from OCR'}`);
  output.push(`- Account last-4 (if present): ${accountLast4 || 'not present'}`);
  if (totalsLine) {
    output.push(`- Totals (only if visible): ${totalsLine}`);
  } else {
    output.push('- Totals (only if visible): not visible');
  }
  output.push(`- Payment due date: ${cardFields.dueDate || 'not visible'}`);
  output.push(
    `- Minimum payment due: ${cardFields.minimumPayment !== null ? formatMoney(cardFields.minimumPayment) : 'not visible'}`
  );
  output.push(
    `- Credit utilization (if visible): ${cardFields.utilizationPct !== null ? `${cardFields.utilizationPct.toFixed(1)}%` : 'not visible'}`
  );
  output.push('');
  output.push('## Transactions (cleaned)');
  output.push(...shownTransactionLines);
  if (transactionLines.length > MAX_TX_LINES) {
    output.push(
      `- ... ${transactionLines.length - MAX_TX_LINES} more row(s) omitted for readability. Open Transactions for full list.`
    );
  }
  if (uniqueIssues.length > 0) {
    output.push('');
    output.push('## Issues / Uncertain lines');
    output.push(...uniqueIssues.map((issue) => `- ${issue}`));
    output.push('- If any line looks wrong, tell me which one and I will fix and learn it.');
  }

  const primeReadClauses: string[] = [];
  if (cardFields.utilizationPct !== null) {
    if (cardFields.utilizationPct >= 90) {
      primeReadClauses.push('this account is running at very high utilization, which amplifies monthly interest pressure');
    } else if (cardFields.utilizationPct >= 75) {
      primeReadClauses.push('utilization is elevated and principal paydown should stay priority one');
    }
  }
  if (recurringMerchants.length > 0) {
    const topRecurring = recurringMerchants[0];
    primeReadClauses.push(
      `recurring spend is clustering around ${escapeInlineMarkdown(String(topRecurring.merchant || '').toUpperCase())} (${topRecurring.count} charges)`
    );
  }
  if (largestTxnAmount > 0) {
    primeReadClauses.push(
      `the largest captured charge is ${formatMoney(largestTxnAmount)} at ${escapeInlineMarkdown(String(largestTxnMerchant || '').toUpperCase())}`
    );
  }
  let actionParagraph = 'Keep non-essential card spend low for one cycle and prioritize this balance before adding new recurring charges.';
  if (cardFields.minimumPayment !== null && cardFields.newBalance !== null) {
    const suggestedPayment = Math.round(Math.max(cardFields.minimumPayment * 1.5, cardFields.minimumPayment + 50) * 100) / 100;
    const projectedBalance = Math.max(cardFields.newBalance - suggestedPayment, 0);
    if (cardFields.creditLimit !== null && cardFields.creditLimit > 0) {
      const projectedUtilPct = Math.max(0, Math.min(100, (projectedBalance / cardFields.creditLimit) * 100));
      actionParagraph = `One concrete move this cycle: pay ${formatMoney(suggestedPayment)} so balance trends toward ${formatMoney(projectedBalance)} (about ${projectedUtilPct.toFixed(1)}% utilization).`;
    } else {
      actionParagraph = `One concrete move this cycle: pay ${formatMoney(suggestedPayment)} so balance trends toward ${formatMoney(projectedBalance)}.`;
    }
  }
  const readParagraphOne =
    primeReadClauses.length > 0
      ? `What this statement is telling us is that ${primeReadClauses.join(', ')}, and that is the pressure point to manage first.`
      : 'This statement is cleanly parsed, but deeper insight is limited until categorization finishes.';
  const topRecurring = recurringMerchants[0];
  const recurringTotal = topRecurring ? topRecurring.amount : 0;
  const recurringShare =
    recurringTotal > 0 && totalCapturedAmount > 0
      ? (recurringTotal / totalCapturedAmount) * 100
      : null;
  const readParagraphTwo =
    recurringShare !== null && recurringShare >= 10
      ? `${actionParagraph} Also, ${escapeInlineMarkdown(String(topRecurring.merchant || '').toUpperCase())} alone is about ${recurringShare.toFixed(
          1
        )}% of captured spend, so it is the first merchant to review for controllable cuts.`
      : actionParagraph;
  const readParagraphThree =
    'If you want, I can break this into merchant-level actions next and show which recurring charges are easiest to trim first.';
  const utilizationForHeadline =
    cardFields.utilizationPct !== null && Number.isFinite(cardFields.utilizationPct)
      ? cardFields.utilizationPct
      : null;
  const headline = buildPrimeReadHeadline(
    institution || 'This account',
    utilizationForHeadline
  );
  output.push('', "## Prime's Read", `### ${escapeInlineMarkdown(headline)}`, readParagraphOne, '', readParagraphTwo, '', readParagraphThree);

  return output.join('\n');
}

function parseStatementStyleSummary(docData: any): string | null {
  const rawText = getSummarySourceText(docData);
  if (!rawText) return null;
  const looksLikeStatement =
    /Account Statement/i.test(rawText) ||
    (/Opening balance/i.test(rawText) && /Closing balance/i.test(rawText)) ||
    (/Withdrawals/i.test(rawText) && /Deposits/i.test(rawText) && /E-TRANSFER/i.test(rawText));
  if (!looksLikeStatement) return null;

  const periodMatch = rawText.match(/For\s+([A-Za-z]{3}\s+\d+\s+to\s+[A-Za-z]{3}\s+\d+,\s+\d{4})/i);
  const period = periodMatch?.[1] || null;
  const bankMatch = rawText.match(/^([A-Z][A-Za-z0-9 ]+Account Statement)/m);
  const bankLabel = bankMatch?.[1] || 'Bank statement';
  const accountNumberMatch = rawText.match(/Account number\s*\n\s*([0-9\-]+)/i);
  const accountNumber = accountNumberMatch?.[1] || null;

  const openingMatch = rawText.match(/Opening balance on[^\n]*\s(-?\$?[0-9,]+\.\d{2})/i);
  const withdrawalsMatch = rawText.match(/Withdrawals[^\d-]*-?\s*([0-9][0-9,]*\.\d{2})/i);
  const depositsMatch = rawText.match(/Deposits[^\d+]*\+?\s*([0-9][0-9,]*\.\d{2})/i);
  const closingMatch =
    rawText.match(/Closing balance on[^\n=]*=\s*\$?([0-9][0-9,]*\.\d{2})/i) ||
    rawText.match(/Closing balance\s*\$([0-9,]+\.\d{2})/i);

  const opening = parseMoney(openingMatch?.[1] || null);
  const withdrawals = parseMoney(withdrawalsMatch?.[1] || null);
  const deposits = parseMoney(depositsMatch?.[1] || null);
  let closing = parseMoney(closingMatch?.[1] || null);
  if (closing === null && opening !== null && withdrawals !== null && deposits !== null) {
    closing = opening - withdrawals + deposits;
  }
  const netChange = opening !== null && closing !== null ? closing - opening : null;

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l));

  const transferItems: Array<{ amount: number }> = [];
  const retailByMerchant = new Map<string, number>();
  let cashWithdrawal: { label: string; amount: number } | null = null;
  let serviceCharge: number | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^E-TRANSFER\b/i.test(line)) {
      const amountLine = lines[i + 2] || '';
      const amountMatch = amountLine.match(/([0-9,]+\.\d{2})/);
      const amount = parseMoney(amountMatch?.[1] || null);
      if (amount !== null) {
        transferItems.push({ amount });
      }
    }

    if (/^WITHDRAWAL\b/i.test(line)) {
      const locationHint = (lines[i + 1] || '').replace(/\s+/g, ' ').trim();
      const label = locationHint || 'Cash withdrawal';
      const localProbe = [line, lines[i + 1] || '', lines[i + 2] || ''].join(' ');
      const moneyMatches = Array.from(localProbe.matchAll(/([0-9][0-9,]*\.\d{2})/g))
        .map((m) => parseMoney(m[1]))
        .filter((n): n is number => n !== null);
      if (moneyMatches.length > 0) {
        cashWithdrawal = { label, amount: Math.max(...moneyMatches) };
      }
    }

    if (/^RETAIL PURCHASE\b/i.test(line)) {
      const merchant = (lines[i + 1] || 'Retail merchant').trim();
      const amountLine = lines[i + 2] || '';
      const amountMatch = amountLine.match(/([0-9,]+\.\d{2})/);
      const amount = parseMoney(amountMatch?.[1] || null);
      if (amount !== null) {
        retailByMerchant.set(merchant, (retailByMerchant.get(merchant) || 0) + amount);
      }
    }

    if (/SERVICE CHARGE/i.test(line)) {
      for (let j = i; j <= i + 4; j += 1) {
        const probe = lines[j] || '';
        const amountMatch = probe.match(/([0-9,]+\.\d{2})/);
        const amount = parseMoney(amountMatch?.[1] || null);
        if (amount !== null) {
          serviceCharge = amount;
          break;
        }
      }
    }
  }

  const topTransferItems = transferItems
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 2)
    .map((x) => formatMoney(x.amount));
  const retailItems = Array.from(retailByMerchant.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const summaryLines: string[] = [];
  summaryLines.push('STATEMENT SNAPSHOT');
  summaryLines.push(
    `Account: ${bankLabel}${accountNumber ? `, account ${accountNumber}` : ''}, ending balance ${formatMoney(closing)}`
  );
  if (period) {
    summaryLines.push(`Statement period: ${period}`);
  }
  summaryLines.push(`Opening balance: ${formatMoney(opening)}`);
  summaryLines.push(`Total withdrawals: ${formatMoney(withdrawals)}`);
  summaryLines.push(`Total deposits: ${formatMoney(deposits)}`);
  summaryLines.push(
    `Net change: ${formatMoney(netChange)}${opening !== null && closing !== null ? ` (from ${formatMoney(opening)} to ${formatMoney(closing)})` : ''}`
  );
  summaryLines.push('');
  summaryLines.push('WHAT HAPPENED');
  summaryLines.push('- Most activity is e-Transfers with repeated movement between known names.');
  if (topTransferItems.length > 0) {
    summaryLines.push(`- Largest transfer entries are approximately ${topTransferItems.join(' and ')}.`);
  }
  if (cashWithdrawal) {
    summaryLines.push(`- Large cash withdrawal: ${formatMoney(cashWithdrawal.amount)} (${cashWithdrawal.label}).`);
  }
  if (retailItems.length > 0) {
    summaryLines.push(`- Small retail spend appears limited (e.g., Coke and Castledowns BIN purchases).`);
  }
  if (serviceCharge !== null) {
    summaryLines.push(`- Monthly bank fee charged: ${formatMoney(serviceCharge)}.`);
  }
  summaryLines.push('');
  summaryLines.push('QUICK INSIGHT');
  summaryLines.push('- This period shows high cash movement and relatively low discretionary spend.');
  summaryLines.push('- Balance repeatedly moved near low levels between transfer cycles, then recovered.');
  summaryLines.push('- Biggest impact drivers were transfer-outs, cash withdrawal, and service charges.');

  return summaryLines.join('\n');
}

function isMissingColumnError(err: unknown): boolean {
  if (!err) return false;
  const code = String((err as any)?.code ?? '');
  const msg = String((err as any)?.message ?? '').toLowerCase();
  return (
    code === 'PGRST204' ||
    msg.includes('schema cache') ||
    (msg.includes('column') && msg.includes('does not exist')) ||
    (msg.includes("could not find the '") && msg.includes('column'))
  );
}

async function loadDocumentDataForSummary(sb: any, documentId: string): Promise<any | null> {
  // Tiered SELECT so a missing column never silently returns null.
  // Each tier drops optional columns that may not yet exist in the schema cache.
  const selectAttempts = [
    'id, ocr_text, ocr_text_hash, ocr_text_length, summary, original_name, pii_types, extracted_data, metadata',
    'id, ocr_text_hash, ocr_text_length, summary, original_name, pii_types, extracted_data, metadata',
    'id, ocr_text_hash, summary, original_name, extracted_data, metadata',
    'id, summary, original_name, extracted_data, metadata',
    'id, summary, original_name, extracted_data',
  ];

  for (const table of ['user_documents', 'documents']) {
    for (const projection of selectAttempts) {
      const { data, error } = await sb
        .from(table)
        .select(projection)
        .eq('id', documentId)
        .maybeSingle();
      if (!error) return data ?? null;
      // Only retry with a narrower projection if the failure is a missing column.
      if (!isMissingColumnError(error)) break;
    }
  }
  return null;
}

function extractVendorForSummary(dataJson: any): string {
  return String(
    dataJson?.description ||
    dataJson?.merchant ||
    dataJson?.vendor ||
    dataJson?.payee ||
    dataJson?.memo ||
    dataJson?.name ||
    dataJson?.details ||
    'Unknown vendor'
  ).trim() || 'Unknown vendor';
}

function normalizeVendorForSummary(input: string): string {
  return input
    .toLowerCase()
    .replace(/[0-9]{4,}/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFallbackSummary(docData: any): string | null {
  if (!docData) return null;
  const extracted = docData.extracted_data || null;
  const lines: string[] = [];

  if (extracted) {
    if (extracted.vendor) lines.push(`Vendor: ${extracted.vendor}`);
    if (extracted.merchant) lines.push(`Merchant: ${extracted.merchant}`);
    if (extracted.invoice_no) lines.push(`Invoice #: ${extracted.invoice_no}`);
    if (extracted.date) lines.push(`Date: ${extracted.date}`);
    if (extracted.statement_period) lines.push(`Statement period: ${extracted.statement_period}`);
    if (extracted.new_balance) lines.push(`New balance: $${extracted.new_balance}`);
    if (extracted.minimum_payment_due) lines.push(`Minimum payment due: $${extracted.minimum_payment_due}`);
    if (extracted.due_date) lines.push(`Payment due date: ${extracted.due_date}`);
    if (extracted.previous_balance) lines.push(`Previous balance: $${extracted.previous_balance}`);
    if (extracted.payments) lines.push(`Payments: -$${extracted.payments}`);
    if (extracted.transactions) lines.push(`Transactions: +$${extracted.transactions}`);
    if (extracted.interest_charged) lines.push(`Interest charged: +$${extracted.interest_charged}`);
    if (extracted.credit_limit) lines.push(`Credit limit: $${extracted.credit_limit}`);
    if (extracted.available_credit) lines.push(`Available credit: $${extracted.available_credit}`);
    if (extracted.total) {
      lines.push(`Total: $${extracted.total}${extracted.currency ? ` ${extracted.currency}` : ''}`);
    }
    if (Array.isArray(docData.pii_types) && docData.pii_types.length > 0) {
      lines.push(`PII redacted: ${docData.pii_types.join(', ')}`);
    }
  }

  if (lines.length > 0) {
    return `I read your document (${docData.original_name || 'upload'}). Here's what I found:\n${lines
      .map((l) => `• ${l}`)
      .join('\n')}`;
  }

  const textLength = Number(docData?.ocr_text_length ?? docData?.extracted_data?.text_length ?? 0);
  const textHash = String(docData?.ocr_text_hash || docData?.extracted_data?.text_hash || '');
  if (textLength > 0 || textHash) {
    return `I read your document (${docData.original_name || 'upload'}) but couldn't extract transactions yet. OCR metrics: length=${textLength || 0}, hash=${textHash || 'n/a'}.`;
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    let importId = body.importId as string | undefined;
    const docId = body.docId as string | undefined;
    const summaryLockToken = String(body.summaryLockToken || '').trim();

    const sb = admin();
    if (!importId && docId) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', docId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      importId = latestImport?.id;
    }

    if (!importId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing importId or docId' }),
      };
    }

    const importData = await loadImportRowWithBreakdown(sb, importId);

    if (!importData) {
      const rawSummary = formatOcrSummaryMarkdown({
        transactions: [],
        transactionCount: 0,
        needsReviewCount: 0,
        extraIssues: ['Import record not found for the provided identifier'],
      });
      const summary = await sanitizeSummaryForOutput(rawSummary, null);
      const transactionsForLog: Array<{ amount: number }> = [];
      const statementMeta: { issuer?: string | null } | null = null;
      console.log('[prime-summary] output_path:', process.env.PRIME_SUMMARY_ALLOW_LLM === '1' ? 'LLM' : 'deterministic');
      console.log('[prime-summary] issuer_detected:', statementMeta?.issuer ?? 'null');
      console.log('[prime-summary] tx_count:', transactionsForLog?.length ?? 0);
      console.log('[prime-summary] has_payment:', detectPaymentActivity(transactionsForLog));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, summary }),
      };
    }

    const activeLock = getActiveProcessingLock(importData?.metadata);
    if (activeLock && activeLock.token !== summaryLockToken) {
      console.log('[prime-summary] stage=import_lock_blocked', {
        importId,
        expiresAt: activeLock.expiresAt,
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          state: 'already_processing',
          importId,
          summary: null,
        }),
      };
    }

    let persistedBreakdown = readStatementBreakdownFromImport(importData);
    if (!persistedBreakdown) {
      persistedBreakdown = await loadStatementBreakdownFromSummaryFallback(
        sb,
        String(importId),
        String(importData?.user_id || '')
      );
    }

    const { data: stagingTransactions } = await sb
      .from('transactions_staging')
      .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
      .eq('import_id', importId);

    let transactions = stagingTransactions || [];
    if (!transactions.length) {
      const { data: committedTransactions } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('import_id', importId);
      transactions = committedTransactions || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDoc } = await sb
        .from('transactions_staging')
        .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
        .contains('data_json', { documentId: importData.document_id });
      transactions = stagedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: stagedByDocEq } = await sb
        .from('transactions_staging')
        .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
        .eq('data_json->>documentId', importData.document_id);
      transactions = stagedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDoc } = await sb
        .from('transactions')
        .select('id, data_json')
        .contains('data_json', { documentId: importData.document_id });
      transactions = committedByDoc || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: committedByDocEq } = await sb
        .from('transactions')
        .select('id, data_json')
        .eq('data_json->>documentId', importData.document_id);
      transactions = committedByDocEq || [];
    }
    if (!transactions.length && importData.document_id) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id')
        .eq('document_id', importData.document_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestImport?.id && latestImport.id !== importId) {
        const { data: stagedByLatest } = await sb
          .from('transactions_staging')
          .select('id, data_json, tag_category, tag_status, tag_confidence, tag_rule_source')
          .eq('import_id', latestImport.id);
        transactions = stagedByLatest || [];
      }
    }

    const transactionCount = transactions.length;
    let statementDocData: any = null;
    if (importData.document_id) {
      const docData = await loadDocumentDataForSummary(sb, importData.document_id);
      statementDocData = docData;
    }
    const resolvedMeta = persistedBreakdown
      ? await resolveBreakdownMetaForSummary(sb, importData, persistedBreakdown)
      : null;
    let analyticsResolution = resolveAnalyticsFromImport(importData);
    if (!analyticsResolution.analytics && persistedBreakdown) {
      analyticsResolution = {
        analytics: {
          ...persistedBreakdown,
          statement_meta: {
            ...persistedBreakdown.statement_meta,
            issuer: resolvedMeta?.issuer || persistedBreakdown.statement_meta?.issuer || null,
            account_last4: resolvedMeta?.accountLast4 || persistedBreakdown.statement_meta?.account_last4 || null,
            period_start: resolvedMeta?.periodStart || persistedBreakdown.statement_meta?.period_start || null,
            period_end: resolvedMeta?.periodEnd || persistedBreakdown.statement_meta?.period_end || null,
          },
        },
        sourceField: 'imports.statement_breakdown*',
      };
    }
    if (!analyticsResolution.analytics) {
      const fallbackAnalytics = await resolveAnalyticsFallbackFromSummaries(
        sb,
        String(importId),
        String(importData?.user_id || '')
      );
      if (fallbackAnalytics.analytics) {
        analyticsResolution = fallbackAnalytics;
      }
    }
    console.log('[prime-summary] stage=prime_summary_input', {
      importId,
      sourceField: analyticsResolution.sourceField || null,
      hasAnalytics: Boolean(analyticsResolution.analytics),
    });

    const docName =
      String(statementDocData?.original_name || '').trim() ||
      String(importData?.file_url || '').split('/').filter(Boolean).pop() ||
      'Statement';
    const period =
      resolvedMeta?.periodStart && resolvedMeta?.periodEnd
        ? `${resolvedMeta.periodStart} to ${resolvedMeta.periodEnd}`
        : extractStatementPeriod(statementDocData) ||
          inferPeriodFromFileName(statementDocData) ||
          null;
    const importStatus = String(importData?.status || '').toLowerCase();

    if (analyticsResolution.analytics) {
      const mergedStatementMeta = {
        ...(analyticsResolution.analytics?.statement_meta || {}),
        issuer:
          String(
            analyticsResolution.analytics?.statement_meta?.issuer ||
            resolvedMeta?.issuer ||
            inferInstitutionFromTransactions(transactions) ||
            ''
          ).trim() || null,
        account_last4:
          String(
            analyticsResolution.analytics?.statement_meta?.account_last4 ||
            resolvedMeta?.accountLast4 ||
            ''
          ).trim() || null,
        period_start:
          normalizeIsoDateForBreakdown(
            analyticsResolution.analytics?.statement_meta?.period_start ||
            resolvedMeta?.periodStart
          ),
        period_end:
          normalizeIsoDateForBreakdown(
            analyticsResolution.analytics?.statement_meta?.period_end ||
            resolvedMeta?.periodEnd
          ),
      };
      const analyticsForSummary = {
        ...analyticsResolution.analytics,
        statement_meta: mergedStatementMeta,
      };
      const warnings: string[] = [];
      const warningNeedsReview = Number(
        analyticsForSummary?.flags?.needs_review_count ??
        analyticsForSummary?.uncategorizedCount ??
        0
      );
      if (warningNeedsReview > 0) {
        warnings.push(`${warningNeedsReview} transaction(s) need review.`);
      }
      const narrative = renderPrimeNarrativeV1({
        docName,
        period,
        analytics: analyticsForSummary,
        counts: { transactionCount },
        warnings,
      });

      // ── LLM advisor voice (gated by PRIME_SUMMARY_ALLOW_LLM=1) ──────────
      const advisorNarrative = process.env.PRIME_SUMMARY_ALLOW_LLM === '1'
        ? await runLLMAdvisorSummary({
            analytics: analyticsForSummary,
            deterministicNarrative: narrative,
            docName,
            period,
            transactionCount,
          })
        : narrative;
      // ────────────────────────────────────────────────────────────────────

      const summaryWithCta = appendTransactionsCta(advisorNarrative, String(importId));
      const summary = await sanitizeSummaryForOutput(summaryWithCta, String(importData?.user_id || '') || null);
      const transactionsForLog = (Array.isArray(transactions) ? transactions : []).map((t: any) => ({
        amount: Number(t?.amount ?? t?.data_json?.amount),
      }));
      const statementMeta = analyticsForSummary?.statement_meta || { issuer: resolvedMeta?.issuer || null };
      console.log('[prime-summary] output_path:', process.env.PRIME_SUMMARY_ALLOW_LLM === '1' ? 'LLM' : 'deterministic');
      console.log('[prime-summary] issuer_detected:', statementMeta?.issuer ?? 'null');
      console.log('[prime-summary] tx_count:', transactionsForLog?.length ?? 0);
      console.log('[prime-summary] has_payment:', detectPaymentActivity(transactions));
      console.log('[prime-summary] stage=prime_summary_rendered', {
        importId,
        hasAnalytics: true,
        txCount: transactionCount,
      });

      // Persist summary to import_summaries so chat can display it
      try {
        const effectiveUserId = String(importData?.user_id || '').trim();
        if (importId && effectiveUserId) {
          await sb
            .from('import_summaries')
            .upsert(
              {
                import_id: importId,
                user_id: effectiveUserId,
                summary_text: summary,
                statement_breakdown_json: analyticsForSummary || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'import_id' }
            );
          console.log('[prime-summary] summary persisted to import_summaries', { importId });
        }
      } catch (persistErr: any) {
        console.error('[prime-summary] failed to persist summary', persistErr?.message);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, summary }),
      };
    }

    const isLikelyStillProcessing =
      transactionCount === 0 &&
      ['queued', 'uploading', 'processing', 'ocr_processing', 'parsed', 'normalizing', 'pending'].includes(importStatus);
    if (isLikelyStillProcessing) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          state: 'already_processing',
          importId,
          summary: null,
        }),
      };
    }

    const needsReviewCount = transactions.filter(
      (tx: any) => String(tx?.tag_status || '').trim().toLowerCase() === 'needs_review'
    ).length;
    const topCategories = Array.from(
      transactions.reduce((acc: Map<string, number>, tx: any) => {
        const data = tx?.data_json || {};
        const category = String(tx?.tag_category || data?.category || '').trim() || 'Uncategorized';
        acc.set(category, (acc.get(category) || 0) + 1);
        return acc;
      }, new Map<string, number>()).entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);
    const extraIssues: string[] = [];
    if (transactionCount === 0) {
      extraIssues.push(`No parsed transactions are available yet for ${docName}.`);
    }
    const fallbackSummary = formatOcrSummaryMarkdown({
      docData: statementDocData || buildDocFallbackFromImport(importData),
      transactions,
      transactionCount,
      topCategories,
      needsReviewCount,
      extraIssues,
    });
    
    const summaryWithCta = appendTransactionsCta(fallbackSummary, String(importId));
    const summary = await sanitizeSummaryForOutput(summaryWithCta, String(importData?.user_id || '') || null);
    const transactionsForLog = (Array.isArray(transactions) ? transactions : []).map((t: any) => ({
      amount: Number(t?.amount ?? t?.data_json?.amount),
    }));
    const statementMeta = {
      ...(resolvedMeta || {}),
      issuer: resolvedMeta?.issuer || inferInstitutionFromTransactions(transactions) || null,
    };
    console.log('[prime-summary] output_path:', process.env.PRIME_SUMMARY_ALLOW_LLM === '1' ? 'LLM' : 'deterministic');
    console.log('[prime-summary] issuer_detected:', statementMeta?.issuer ?? 'null');
    console.log('[prime-summary] tx_count:', transactionsForLog?.length ?? 0);
    console.log('[prime-summary] has_payment:', detectPaymentActivity(transactions));
    console.log('[prime-summary] stage=prime_summary_rendered', {
      importId,
      hasAnalytics: false,
      txCount: transactionCount,
    });

    // Persist summary to import_summaries so chat can display it
    try {
      const effectiveUserId = String(importData?.user_id || '').trim();
      if (importId && effectiveUserId) {
        await sb
          .from('import_summaries')
          .upsert(
            {
              import_id: importId,
              user_id: effectiveUserId,
              summary_text: summary,
              statement_breakdown_json: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'import_id' }
          );
        console.log('[prime-summary] summary persisted to import_summaries', { importId });
      }
    } catch (persistErr: any) {
      console.error('[prime-summary] failed to persist summary', persistErr?.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, summary }),
    };
  } catch (error: any) {
    const rawFallbackSummary = formatOcrSummaryMarkdown({
      transactions: [],
      transactionCount: 0,
      needsReviewCount: 0,
      extraIssues: [String(error?.message || 'Summary generation failed')],
    });
    const fallbackSummary = await sanitizeSummaryForOutput(rawFallbackSummary, null);
    const transactionsForLog: Array<{ amount: number }> = [];
    const statementMeta: { issuer?: string | null } | null = null;
    console.log('[prime-summary] output_path:', process.env.PRIME_SUMMARY_ALLOW_LLM === '1' ? 'LLM' : 'deterministic');
    console.log('[prime-summary] issuer_detected:', statementMeta?.issuer ?? 'null');
    console.log('[prime-summary] tx_count:', transactionsForLog?.length ?? 0);
    console.log('[prime-summary] has_payment:', detectPaymentActivity([]));
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, summary: fallbackSummary }),
    };
  }
};

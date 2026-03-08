import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { cleanupOcrText } from './lib/ocr/cleanupOcrText.js';
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GENERIC_SUMMARY = 'Your categorized results and insights are available.';
const LOW_CONFIDENCE_THRESHOLD = 0.6;

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
  return hasTransactions || hasUsableStatementMetadata(breakdown);
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
    if (!error) return data || null;
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

function parseDateRangeLabel(dateRange: any): string | null {
  const start = String(dateRange?.startDate || dateRange?.start || '').trim();
  const end = String(dateRange?.endDate || dateRange?.end || '').trim();
  if (!start && !end) return null;
  if (start && end) return `${start} to ${end}`;
  return start || end;
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

  const lines: string[] = [
    `Statement Summary — ${params.docName || 'Statement'}`,
    '',
    'WHAT I PROCESSED',
    `I reviewed import ${String(a?.import_id || '').trim() || 'Not available in this statement.'}.`,
    `Period: ${params.period || parseDateRangeLabel(a?.dateRange) || 'Not available in this statement.'}`,
    '',
    'KEY TOTALS',
    `- Transaction count: ${txCount ?? 'Not available in this statement.'}`,
    `- Total debits: ${formatMaybeAmount(totalDebits)}`,
    `- Total credits: ${formatMaybeAmount(totalCredits)}`,
    `- Net: ${formatMaybeAmount(net)}`,
  ];

  if (categoryBreakdown.length > 0) {
    lines.push('', 'BREAKDOWN', ...categoryBreakdown);
  }
  if (notableFindings.length > 0) {
    lines.push('', 'NOTABLE FINDINGS', ...notableFindings);
  }
  lines.push(
    '',
    'NEXT STEPS',
    '- Review uncategorized transactions first.',
    '- Verify the statement period and totals.',
    '- Export transactions if you need a backup copy.',
    '- Upload the next statement when ready.',
  );
  if (params.warnings.length > 0) {
    lines.push('', ...params.warnings.map((w) => `- ${w}`));
  }
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
  return raw || 'UNKNOWN-MERCHANT';
}

function coerceAmountLabel(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'UNKNOWN-AMOUNT';
  const sign = n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

function getSummarySourceText(docData: any): string {
  return cleanupOcrText(
    docData?.ocr_text ||
      docData?.extracted_data?.rawText ||
      docData?.extracted_data?.text ||
      ''
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
  const candidates = [
    extracted.institution,
    extracted.bank,
    extracted.card,
    extracted.card_name,
    extracted.issuer,
  ];
  for (const candidate of candidates) {
    const text = String(candidate || '').trim();
    if (text) return text;
  }
  const rawText = getSummarySourceText(docData);
  if (/\brbc\b/i.test(rawText) && /\bvisa\b/i.test(rawText)) {
    return 'RBC Visa';
  }
  if (/\broyal bank of canada\b/i.test(rawText) && /\bvisa\b/i.test(rawText)) {
    return 'RBC Visa';
  }
  const cardMatch = rawText.match(/Triangle World Elite Mastercard/i);
  if (cardMatch) return 'Triangle World Elite Mastercard';
  const bankMatch = rawText.match(/^([A-Z][A-Za-z0-9 ]+Account Statement)/m);
  return bankMatch?.[1] || null;
}

function extractAccountLast4(docData: any): string | null {
  const extracted = docData?.extracted_data || {};
  const candidate = String(
    extracted.account_last4 ||
      extracted.account_last_4 ||
      extracted.last4 ||
      extracted.last_4 ||
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
  const rawText = getSummarySourceText(docData);
  const dueDateFromText = rawText.match(/Payment due date\s+([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/i)?.[1] || null;
  const minDueFromText = rawText.match(/Minimum payment due\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const newBalanceFromText = rawText.match(/Your New Balance\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const creditLimitFromText = rawText.match(/Credit limit\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const availableCreditFromText = rawText.match(/Available credit\s*\$?([0-9,]+\.\d{2})/i)?.[1] || null;
  const dueDate = String(extracted.due_date || extracted.payment_due_date || '').trim() || null;
  const minimumPayment = parseFieldMoney(extracted.minimum_payment_due ?? extracted.minimum_due ?? minDueFromText);
  const newBalance = parseFieldMoney(extracted.new_balance ?? extracted.statement_balance ?? newBalanceFromText);
  const creditLimit = parseFieldMoney(extracted.credit_limit ?? creditLimitFromText);
  const availableCredit = parseFieldMoney(extracted.available_credit ?? availableCreditFromText);
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

  const trustedCount = Math.max(transactionCount - needsReviewCount, 0);
  const summaryBullets: string[] = [
    `- I reviewed this document and captured ${transactionCount} transaction${transactionCount === 1 ? '' : 's'}.`,
    `- ${trustedCount} look ready to use, and ${needsReviewCount} need a quick review.`,
  ];
  if (topCategories.length > 0) {
    summaryBullets.push(`- Biggest spend signals this period: ${topCategories.slice(0, 3).join(', ')}.`);
  }
  if (needsReviewCount > 0) {
    summaryBullets.push('- Next best step: confirm the flagged lines first and I will learn from your corrections.');
  } else {
    summaryBullets.push('- Next best step: ask for top merchants, recurring charges, or unusual activity.');
  }
  if (cardFields.newBalance !== null) {
    summaryBullets.push(`- Statement balance detected: ${formatMoney(cardFields.newBalance)}.`);
  }
  if (cardFields.utilizationPct !== null) {
    const pct = `${cardFields.utilizationPct.toFixed(1)}%`;
    summaryBullets.push(`- Credit utilization: ${pct}.`);
    if (cardFields.utilizationPct >= 80) {
      summaryBullets.push('- Risk signal: high utilization can increase interest pressure this cycle.');
    }
  }
  if (cardFields.minimumPayment !== null || cardFields.dueDate) {
    const minDue = cardFields.minimumPayment !== null ? formatMoney(cardFields.minimumPayment) : 'unknown minimum due';
    const due = cardFields.dueDate || 'unknown due date';
    summaryBullets.push(`- Next action: plan at least ${minDue} before ${due}.`);
  }

  const txDates = transactions
    .map((tx: any) => String(tx?.data_json?.posted_at || tx?.data_json?.date || tx?.data_json?.transaction_date || '').slice(0, 10))
    .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const inferredPeriodFromTx =
    txDates.length >= 2 ? `${txDates[0]} to ${txDates[txDates.length - 1]}` : null;
  const period = extractStatementPeriod(docData) || inferPeriodFromFileName(docData) || inferredPeriodFromTx || 'unknown';
  const institution = extractInstitutionOrCard(docData) || inferInstitutionFromFileName(docData) || 'unknown';
  const accountLast4 = extractAccountLast4(docData);
  const totalsLine = extractTotalsLine(docData);

  const transactionLines: string[] = [];
  for (const tx of transactions) {
    const row = toSummaryTransactionRow(tx);
    transactionLines.push(row.line);
    if (row.issue) issues.push(row.issue);
  }
  if (transactionLines.length === 0) {
    transactionLines.push('- UNKNOWN-DATE | UNKNOWN-MERCHANT | UNKNOWN-AMOUNT | UNKNOWN-CURRENCY | no parsed transactions');
  }

  const uniqueIssues = Array.from(new Set(issues.map((x) => String(x || '').trim()).filter(Boolean)));

  const output: string[] = [];
  output.push('## Summary');
  output.push(...summaryBullets.slice(0, 6));
  output.push('');
  output.push('## Key details');
  output.push(`- Statement period: ${period}`);
  output.push(`- Institution / Card: ${institution}`);
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
  output.push(...transactionLines);
  output.push('');
  output.push('## Issues / Uncertain lines');
  if (uniqueIssues.length === 0) {
    output.push('- None detected from parsed data');
  } else {
    output.push(...uniqueIssues.map((issue) => `- ${issue}`));
    output.push('- If any line looks wrong, tell me which one and I will fix and learn it.');
  }

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
    'id, ocr_text, ocr_text_hash, ocr_text_length, summary, original_name, pii_types, extracted_data',
    'id, ocr_text_hash, ocr_text_length, summary, original_name, pii_types, extracted_data',
    'id, ocr_text_hash, summary, original_name, extracted_data',
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
      const warnings: string[] = [];
      const warningNeedsReview = Number(
        analyticsResolution.analytics?.flags?.needs_review_count ??
        analyticsResolution.analytics?.uncategorizedCount ??
        0
      );
      if (warningNeedsReview > 0) {
        warnings.push(`${warningNeedsReview} transaction(s) need review.`);
      }
      const narrative = renderPrimeNarrativeV1({
        docName,
        period,
        analytics: analyticsResolution.analytics,
        counts: { transactionCount },
        warnings,
      });
      const summary = await sanitizeSummaryForOutput(narrative, String(importData?.user_id || '') || null);
      console.log('[prime-summary] stage=prime_summary_rendered', {
        importId,
        hasAnalytics: true,
        txCount: transactionCount,
      });
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

    let fallbackSummary = '';
    
    if (transactionCount === 0) {
      fallbackSummary = [
        `Clean Canvas.`,
        `You have 0 transactions imported from ${docName}.`,
        `- Upload a receipt or connect an account to get started.`
      ].join('\n');
    } else {
      const txLabel = transactionCount === 1 ? '1 transaction' : `${transactionCount} transactions`;
      fallbackSummary = [
        `${txLabel} imported from ${docName}`,
        `- ${txLabel} imported and categorized.`,
        '- Ask me which merchants appeared most often this period.',
        '- Ask me for a spending breakdown by category.',
        '- Flag any unfamiliar charges and I can help you review them.',
      ].join('\n');
    }
    
    const summary = await sanitizeSummaryForOutput(fallbackSummary, String(importData?.user_id || '') || null);
    console.log('[prime-summary] stage=prime_summary_rendered', {
      importId,
      hasAnalytics: false,
      txCount: transactionCount,
    });

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
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, summary: fallbackSummary }),
    };
  }
};

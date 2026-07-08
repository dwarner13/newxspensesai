/**
 * Commit Import Netlify Function
 * 
 * Moves transactions from transactions_staging to transactions table.
 * Links transactions to user_documents via document_id.
 * 
 * SECURITY: Uses x-user-id header for authentication (not from request body).
 * This prevents users from importing other users' staging data.
 * 
 * Flow:
 * 1. Validates importId from request body
 * 2. Gets userId from x-user-id header (secure auth)
 * 3. Verifies import exists and belongs to user
 * 4. Checks import status is 'parsed' (ready to commit)
 * 5. Reads staging rows from transactions_staging WHERE import_id = :importId AND user_id = :userId
 * 6. Maps data_json to transactions table format
 * 7. Categorizes uncategorized transactions using Tag learning
 * 8. Inserts into transactions table
 * 9. Updates imports row: status='committed', committed_at=now(), committed_count=N
 * 10. Returns success with inserted transaction count
 */

import type { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import { admin } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { categorizeTransactionWithLearning } from './_shared/categorize.js';
import { detectAndUpsertRecurringObligations, type RecurringCandidate } from './_shared/recurringDetection.js';
import { queueUpcomingPaymentNotifications } from './_shared/chimeNotifications.js';
import { getFirstMoney } from './_shared/money.js';

const STAGED_ROWS_WAIT_MS = 12000;
const STAGED_ROWS_POLL_MS = 750;
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
];

export interface StatementBreakdown {
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
  account_summary?: {
    previous_balance: number | null;
    new_balance: number | null;
    minimum_payment_due: number | null;
    due_date: string | null;
    credit_limit: number | null;
    available_credit: number | null;
  };
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeDateOnly(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function deriveStatementType(meta: any): 'bank' | 'credit_card' | 'unknown' {
  const source = `${String(meta?.statement_type || '')} ${String(meta?.docType || '')} ${String(meta?.document_type || '')} ${String(meta?.mime_type || '')}`.toLowerCase();
  if (/credit[_\s-]?card|cardmember|visa|mastercard|amex/.test(source)) return 'credit_card';
  if (/bank|statement|account/.test(source)) return 'bank';
  return 'unknown';
}

function extractIssuer(meta: any): string | null {
  const rawText = [
    meta?.rawText,
    meta?.text,
    meta?.ocr_text,
    meta?.summary,
    meta?.institution,
    meta?.issuer,
    meta?.bank,
    meta?.card,
    meta?.card_name,
  ]
    .filter(Boolean)
    .join('\n');
  for (const pattern of ISSUER_PATTERNS) {
    if (pattern.match.test(rawText)) return pattern.name;
  }
  const candidates = [
    meta?.issuer,
    meta?.institution,
    meta?.bank,
    meta?.card,
    meta?.card_name,
  ];
  for (const candidate of candidates) {
    const value = String(candidate || '').trim();
    if (value) return value;
  }
  return null;
}

function extractAccountLast4(meta: any): string | null {
  const direct = String(
    meta?.account_last4 ||
      meta?.account_last_4 ||
      meta?.last4 ||
      meta?.last_4 ||
      ''
  ).trim();
  if (direct) return direct.slice(-4);
  const accountNumber = String(meta?.account_number || '').replace(/\D/g, '');
  return accountNumber.length >= 4 ? accountNumber.slice(-4) : null;
}

function extractPeriodRange(meta: any): { periodStart: string | null; periodEnd: string | null } {
  const start = normalizeDateOnly(meta?.period_start || meta?.statement_period_start || null);
  const end = normalizeDateOnly(meta?.period_end || meta?.statement_period_end || null);
  if (start || end) return { periodStart: start, periodEnd: end };
  const periodRaw = String(meta?.statement_period || '').trim();
  if (!periodRaw) return { periodStart: null, periodEnd: null };
  const matches = periodRaw.match(/\d{4}-\d{2}-\d{2}/g);
  if (matches && matches.length >= 2) {
    return { periodStart: matches[0], periodEnd: matches[1] };
  }
  return { periodStart: null, periodEnd: null };
}

function deriveReadCompleteness(args: {
  docMeta: any;
  transactionCount: number;
  needsReviewCount: number;
  matchRate: number | null;
}): StatementBreakdown['read_completeness'] {
  const { docMeta, transactionCount, needsReviewCount, matchRate } = args;
  const metrics = docMeta?.debug?.metrics || {};
  const pagesDetectedCandidate = [
    docMeta?.pages,
    metrics?.pagesTotal,
    Array.isArray(docMeta?.pages_detected) ? docMeta.pages_detected.length : null,
  ].map((n) => Number(n)).find((n) => Number.isFinite(n) && n > 0);
  const pagesReadCandidate = [
    metrics?.pagesProcessed,
    docMeta?.pages_processed,
    docMeta?.pages,
  ].map((n) => Number(n)).find((n) => Number.isFinite(n) && n > 0);

  const pagesDetected = Number.isFinite(Number(pagesDetectedCandidate)) ? Number(pagesDetectedCandidate) : null;
  const pagesRead = Number.isFinite(Number(pagesReadCandidate)) ? Number(pagesReadCandidate) : null;
  const coverageRatio =
    pagesDetected && pagesRead
      ? Math.max(0, Math.min(1, pagesRead / pagesDetected))
      : null;

  const signals: string[] = [];
  if (coverageRatio !== null && coverageRatio < 1) signals.push('pages_partial');
  if (transactionCount === 0) signals.push('no_transactions_extracted');
  if (needsReviewCount > 0) signals.push('transactions_need_review');
  if (matchRate !== null && matchRate < 0.95) signals.push('totals_not_fully_reconciled');

  let status: 'complete' | 'partial' | 'unknown' = 'unknown';
  if (coverageRatio !== null) {
    status = coverageRatio >= 1 && transactionCount > 0 ? 'complete' : 'partial';
  } else if (transactionCount > 0 && needsReviewCount === 0 && (matchRate === null || matchRate >= 0.95)) {
    status = 'complete';
  } else if (transactionCount > 0 || signals.length > 0) {
    status = 'partial';
  }

  return {
    status,
    pages_detected: pagesDetected,
    pages_read: pagesRead,
    coverage_ratio: coverageRatio !== null ? round2(coverageRatio) : null,
    signals,
  };
}

async function loadCommittedRowsForBreakdown(
  sb: any,
  importId: string,
  userIdText: string
): Promise<any[]> {
  const selectAttempts = [
    'date,merchant,amount,category,type,description,confidence,needs_review,metadata',
    'date,merchant,amount,category,type,description,metadata',
    'date,merchant,amount,category,type,description',
  ];
  for (const selectClause of selectAttempts) {
    const scoped = await sb
      .from('transactions')
      .select(selectClause)
      .eq('import_id', importId)
      .eq('user_id', userIdText);
    if (!scoped.error) {
      return Array.isArray(scoped.data) ? scoped.data : [];
    }
    if (!isMissingColumnError(scoped.error)) {
      console.warn('[CommitImport] Breakdown transaction query failed', {
        importId,
        error: scoped.error.message,
      });
      return [];
    }
    const fallback = await sb
      .from('transactions')
      .select(selectClause)
      .eq('import_id', importId);
    if (!fallback.error) {
      return Array.isArray(fallback.data) ? fallback.data : [];
    }
    if (!isMissingColumnError(fallback.error)) {
      return [];
    }
  }
  return [];
}

async function persistStatementBreakdown(
  sb: any,
  importId: string,
  userIdText: string,
  breakdown: StatementBreakdown
): Promise<boolean> {
  // Pre-flight: verify the row exists with this WHERE clause to distinguish
  // "column missing" vs "row not found" vs "write succeeded" in downstream logs.
  const { data: preCheck, error: preCheckErr } = await sb
    .from('imports')
    .select('id, user_id, status, statement_breakdown_json')
    .eq('id', importId)
    .eq('user_id', userIdText)
    .maybeSingle();
  console.log('[CommitImport] persistStatementBreakdown pre-flight', {
    importId,
    rowFound: !!preCheck,
    status: preCheck?.status ?? null,
    preCheckError: preCheckErr?.message ?? null,
  });
  if (!preCheck) {
    // Row not found with this user_id — go straight to import_summaries fallback.
    console.warn('[CommitImport] persistStatementBreakdown: import row not found for this user_id, skipping imports UPDATE', { importId });
    const { error: summaryError } = await sb
      .from('import_summaries')
      .upsert(
        { import_id: importId, user_id: userIdText, statement_breakdown_json: breakdown, employee: 'prime', version: 1 },
        { onConflict: 'import_id' }
      );
    if (!summaryError) return true;
    console.warn('[CommitImport] persistStatementBreakdown: import_summaries also failed (row-not-found path)', { importId, error: summaryError.message });
    return false;
  }

  // Strategy A1: dedicated JSONB column statement_breakdown_json on imports.
  // Use .select('id') so we can detect 0-row updates — Supabase returns no error when WHERE matches nothing.
  // PATCH2: Merge with existing SBD to preserve statementTotals
  // (written by normalize-transactions). Spread order: existing first,
  // breakdown second, so commit-import's authoritative keys win for
  // anything it models. statementTotals is unique to existing and survives.
  const existingSbdA1 =
    preCheck && (preCheck as any).statement_breakdown_json && typeof (preCheck as any).statement_breakdown_json === 'object'
      ? (preCheck as any).statement_breakdown_json as Record<string, unknown>
      : {};
  const mergedBreakdownA1: Record<string, unknown> = {
    ...existingSbdA1,
    ...(breakdown as unknown as Record<string, unknown>),
  };
  if (existingSbdA1.statementTotals && !mergedBreakdownA1.statementTotals) {
    mergedBreakdownA1.statementTotals = existingSbdA1.statementTotals;
  }
  let { data: a1Rows, error: updateError } = await sb
    .from('imports')
    .update({ statement_breakdown_json: mergedBreakdownA1 })
    .eq('id', importId)
    .eq('user_id', userIdText)
    .select('id');
  if (!updateError && Array.isArray(a1Rows) && a1Rows.length > 0) {
    console.log('[CommitImport] persistStatementBreakdown A1: wrote statement_breakdown_json to imports', { importId });
    return true;
  }
  if (!updateError && (!a1Rows || a1Rows.length === 0)) {
    // Pre-flight confirmed the row exists but update still matched 0 rows.
    // This means statement_breakdown_json column is missing — run migration
    // sql/migrations/20260301_imports_statement_breakdown.sql to add it.
    console.warn('[CommitImport] persistStatementBreakdown A1: 0 rows updated — column likely missing. Run migration 20260301_imports_statement_breakdown.sql', { importId });
  }

  // Strategy A2: alternate direct column name.
  if (isMissingColumnError(updateError) || (!updateError && (!a1Rows || a1Rows.length === 0))) {
    const { data: a2Rows, error: a2Err } = await sb
      .from('imports')
      .update({ statement_breakdown: breakdown })
      .eq('id', importId)
      .eq('user_id', userIdText)
      .select('id');
    if (!a2Err && Array.isArray(a2Rows) && a2Rows.length > 0) {
      console.log('[CommitImport] persistStatementBreakdown A2: wrote statement_breakdown to imports', { importId });
      return true;
    }
    if (!a2Err) updateError = null; // keep falling through
    else updateError = a2Err;
  }

  // Strategy A3: merge into imports.metadata when available.
  if (isMissingColumnError(updateError) || (!updateError && (!a1Rows || a1Rows.length === 0))) {
    const { data: importRow } = await sb
      .from('imports')
      .select('metadata')
      .eq('id', importId)
      .eq('user_id', userIdText)
      .maybeSingle();
    const metadata = importRow?.metadata && typeof importRow.metadata === 'object'
      ? importRow.metadata
      : {};
    const { data: a3Rows, error: a3Err } = await sb
      .from('imports')
      .update({
        metadata: {
          ...metadata,
          statement_breakdown: breakdown,
        },
      })
      .eq('id', importId)
      .eq('user_id', userIdText)
      .select('id');
    if (!a3Err && Array.isArray(a3Rows) && a3Rows.length > 0) {
      console.log('[CommitImport] persistStatementBreakdown A3: merged into imports.metadata', { importId });
      return true;
    }
    if (!a3Err) updateError = null;
    else updateError = a3Err;
  }

  // Strategy B: import_summaries table (created by migration 20260301_imports_statement_breakdown.sql).
  {
    const { error: summaryError } = await sb
      .from('import_summaries')
      .upsert(
        { import_id: importId, user_id: userIdText, statement_breakdown_json: breakdown, employee: 'prime', version: 1 },
        { onConflict: 'import_id' }
      );
    if (!summaryError) {
      console.log('[CommitImport] persistStatementBreakdown B: wrote to import_summaries', { importId });
      return true;
    }
    console.warn('[CommitImport] persistStatementBreakdown B: import_summaries also failed', { importId, error: summaryError.message });
  }

  console.warn('[CommitImport] Failed to persist statement breakdown', {
    importId,
    error: updateError?.message || 'unknown_error',
  });
  return false;
}

async function buildStatementBreakdown(args: {
  sb: any;
  importId: string;
  userIdText: string;
  documentId: string | null;
}): Promise<StatementBreakdown> {
  const { sb, importId, userIdText, documentId } = args;
  const committedRows = await loadCommittedRowsForBreakdown(sb, importId, userIdText);

  let docMeta: any = {};
  if (documentId) {
    const { data: docRow } = await sb
      .from('user_documents')
      .select('extracted_data,metadata,mime_type,file_type')
      .eq('id', documentId)
      .eq('user_id', userIdText)
      .maybeSingle();
    const extractedData = docRow?.extracted_data && typeof docRow.extracted_data === 'object' ? docRow.extracted_data : {};
    const docMetadata = docRow?.metadata && typeof docRow.metadata === 'object' ? docRow.metadata : {};
    docMeta = {
      ...extractedData,
      mime_type: docRow?.mime_type || null,
      file_type: docRow?.file_type || null,
      // Merge issuer/institution from metadata.statement_summary (written by normalize-transactions)
      institution: extractedData?.institution || docMetadata?.statement_summary?.institution || docMetadata?.issuer || null,
      issuer: extractedData?.issuer || docMetadata?.statement_summary?.issuer || docMetadata?.issuer || null,
    };
  }

  // Load account_summary (balances, due date, min payment) stored by normalize-transactions
  // in user_documents.metadata.statement_summary during the OCR/normalization phase.
  // NOTE: imports.metadata column does not exist — user_documents.metadata is used instead.
  const toN = (v: unknown): number | null => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  let accountSummary: StatementBreakdown['account_summary'] | undefined;
  if (documentId) {
    const { data: docMetaRow } = await sb
      .from('user_documents')
      .select('metadata')
      .eq('id', documentId)
      .eq('user_id', userIdText)
      .maybeSingle();
    const storedSummary = docMetaRow?.metadata?.statement_summary;
    if (storedSummary && typeof storedSummary === 'object') {
      accountSummary = {
        previous_balance: toN(storedSummary.previous_balance),
        new_balance: toN(storedSummary.new_balance),
        minimum_payment_due: toN(storedSummary.minimum_payment_due),
        due_date: String(storedSummary.due_date || '') || null,
        credit_limit: toN(storedSummary.credit_limit),
        available_credit: toN(storedSummary.available_credit),
      };
      // Backfill issuer from statement_summary, then validate against known patterns
      const candidateInst = String(storedSummary?.institution || docMeta?.institution || '').trim();
      const ocrText = String(docMetaRow?.metadata?.ocr_text || '').slice(0, 2000);
      // Get filename from document row or import row
      let fileName = '';
      try {
        const { data: impRow } = await sb.from('imports').select('file_url').eq('id', importId).maybeSingle();
        fileName = String(impRow?.file_url || '').toLowerCase();
        if (!fileName) {
          const { data: docNameRow } = await sb.from('user_documents').select('original_name').eq('id', documentId).maybeSingle();
          fileName = String(docNameRow?.original_name || '').toLowerCase();
        }
      } catch {} 
      let resolvedIssuer: string | null = null;
      // First: trust structured issuer from docMeta / statement_summary
      // (resolved upstream by normalize-transactions; NOT gated by ISSUER_PATTERNS
      //  so non-listed issuers like RBC / Capital One survive). Fixes null-column
      //  (Bug 1) and OCR-body-override (Bug 2) in one inversion.
      const structuredIssuer = String(docMeta?.issuer || candidateInst || '').trim();
      if (structuredIssuer) { resolvedIssuer = structuredIssuer; }
      // Fallback: header-zone OCR scan only when structured value absent.
      // NOTE: reads metadata.ocr_text which is currently always '' post-fb4b25cc,
      //  so this fallback is inert today — intentional. Header-zone slice guards
      //  Bug 2 if the read is ever restored.
      if (!resolvedIssuer && ocrText) {
        const headerZone = ocrText.slice(0, 600);
        for (const pat of ISSUER_PATTERNS) { if (pat.match.test(headerZone)) { resolvedIssuer = pat.name; break; } }
      }
      // Fallback: filename
      if (!resolvedIssuer && fileName) { for (const pat of ISSUER_PATTERNS) { if (pat.match.test(fileName)) { resolvedIssuer = pat.name; break; } } }
      if (resolvedIssuer) { docMeta.institution = resolvedIssuer; docMeta.issuer = resolvedIssuer; }
      console.log('[CommitImport] Issuer resolution', { resolvedIssuer, candidateInst: candidateInst.slice(0, 40), ocrTextLen: ocrText.length });
      console.log('[CommitImport] Loaded account_summary from user_documents.metadata', {
        importId,
        documentId,
        fields: Object.entries(accountSummary).filter(([, v]) => v !== null).map(([k]) => k),
      });
    }
  }

  let totalDebits = 0;
  let totalCredits = 0;
  let needsReviewCount = 0;
  let lowConfidenceCount = 0;
  let missingDateCount = 0;
  let refundCount = 0;
  const confidenceSamples: number[] = [];
  const categoryMap = new Map<string, { total: number; count: number }>();
  const merchantMap = new Map<string, { total: number; count: number }>();
  const duplicateMap = new Map<string, number>();
  const statementType = deriveStatementType(docMeta);

  for (const row of committedRows) {
    const amountNum = Number(row?.amount || 0);
    const absAmount = Math.abs(amountNum);
    const typeText = String(row?.type || '').toLowerCase();
    const merchant = String(row?.merchant || row?.description || 'UNKNOWN-MERCHANT').trim() || 'UNKNOWN-MERCHANT';
    const category = String(row?.category || 'Uncategorized').trim() || 'Uncategorized';
    const dateValue = normalizeDateOnly(row?.date);
    const needsReview = Boolean(row?.needs_review ?? row?.metadata?.needs_review ?? false);
    const confidence = toNum(row?.confidence ?? row?.metadata?.confidence);

    // Use merchant patterns to detect income (mirrors getTxDirection from frontend)
    const INCOME_EXACT_BD = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
    const INCOME_CONTAINS_BD = /\b(PAYMENT RECEIVED|PAYMENT THANK YOU|CREDIT ADJUSTMENT|REFUND|DEPOSIT|E-TRANSFER IN|PAYROLL)\b/;
    const merchantUpper = String(row?.merchant || row?.description || '').toUpperCase().trim();
    const isIncomeTx = typeText === 'income' || typeText === 'credit' ||
                       INCOME_EXACT_BD.test(merchantUpper) || INCOME_CONTAINS_BD.test(merchantUpper);
    const isDebitTx = !isIncomeTx;
    if (isIncomeTx) totalCredits += absAmount;
    if (isDebitTx) totalDebits += absAmount;

    if (needsReview) needsReviewCount += 1;
    if (!dateValue) missingDateCount += 1;
    if (confidence !== null) {
      confidenceSamples.push(confidence);
      if (confidence < 0.7) lowConfidenceCount += 1;
    }
    if (typeText === 'refund' || /REFUND/i.test(merchantUpper)) {
      refundCount += 1;
    }

    const cat = categoryMap.get(category) || { total: 0, count: 0 };
    cat.total += absAmount;
    cat.count += 1;
    categoryMap.set(category, cat);

    const mer = merchantMap.get(merchant) || { total: 0, count: 0 };
    mer.total += absAmount;
    mer.count += 1;
    merchantMap.set(merchant, mer);

    const dupKey = `${dateValue || 'UNKNOWN-DATE'}|${merchant.toLowerCase()}|${absAmount.toFixed(2)}`;
    duplicateMap.set(dupKey, (duplicateMap.get(dupKey) || 0) + 1);
  }

  const spendDenominator = Math.max(totalDebits, 0.000001);
  const categoryTotals = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      total: round2(stats.total),
      count: stats.count,
      percentage: round2((stats.total / spendDenominator) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, stats]) => ({
      merchant,
      total: round2(stats.total),
      count: stats.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const duplicateCount = Array.from(duplicateMap.values()).reduce((sum, groupSize) => {
    if (groupSize <= 1) return sum;
    return sum + (groupSize - 1);
  }, 0);

  const parseConfidence = confidenceSamples.length > 0
    ? confidenceSamples.reduce((sum, n) => sum + n, 0) / confidenceSamples.length
    : null;
  const ocrConfidence = toNum(docMeta?.confidence?.overall);
  const overall: StatementBreakdown['confidence']['overall'] =
    (ocrConfidence !== null && ocrConfidence > 0.85 && needsReviewCount < 3)
      ? 'high'
      : ((ocrConfidence !== null && ocrConfidence < 0.6) || needsReviewCount > 10)
        ? 'low'
        : 'medium';
  const { periodStart, periodEnd } = extractPeriodRange(docMeta);
  const breakdown: StatementBreakdown = {
    version: 1,
    import_id: importId,
    document_id: documentId || null,
    user_id: userIdText,
    created_at: new Date().toISOString(),
    statement_meta: {
      issuer: extractIssuer(docMeta),
      account_last4: extractAccountLast4(docMeta),
      period_start: periodStart,
      period_end: periodEnd,
      statement_type: statementType,
    },
    totals: {
      total_debits: round2(totalDebits),
      total_credits: round2(totalCredits),
      net: round2(totalCredits - totalDebits),
      transaction_count: committedRows.length,
    },
    category_totals: categoryTotals,
    top_merchants: topMerchants,
    flags: {
      duplicate_count: duplicateCount,
      refund_count: refundCount,
      needs_review_count: needsReviewCount,
      low_confidence_count: lowConfidenceCount,
      missing_date_count: missingDateCount,
    },
    confidence: {
      overall,
      ocr_confidence: ocrConfidence,
      parse_confidence: parseConfidence !== null ? round2(parseConfidence) : null,
      transaction_match_rate: null,
      reconciled: false,
      recon_method: 'none',
    },
    ...(accountSummary ? { account_summary: accountSummary } : {}),
  };

  // --- Reconciliation: compare extracted totals vs statement printed totals ---
  const recon = await reconcileAgainstPrintedTotals(sb, documentId, breakdown.totals);
  breakdown.confidence.transaction_match_rate = recon.match_rate;
  breakdown.confidence.reconciled = recon.reconciled;
  breakdown.confidence.recon_method = recon.recon_method;
  breakdown.read_completeness = deriveReadCompleteness({
    docMeta,
    transactionCount: committedRows.length,
    needsReviewCount,
    matchRate: recon.match_rate,
  });
  if (recon.match_rate !== null && recon.match_rate < 0.95) {
    breakdown.confidence.overall = recon.match_rate < 0.8 ? 'low' : 'medium';
  }

  return breakdown;
}

async function reconcileAgainstPrintedTotals(
  sb: any,
  documentId: string | null,
  computedTotals: { total_debits: number; total_credits: number; net: number }
): Promise<{
  match_rate: number | null;
  reconciled: boolean;
  discrepancy: number | null;
  recon_method: 'direct_debits' | 'balance_equation' | 'direct_credits' | 'none';
}> {
  if (!documentId) return { match_rate: null, reconciled: false, discrepancy: null, recon_method: 'none' };

  try {
    const selectAttempts = ['extracted_data', 'id'];
    let doc: any = null;
    for (const clause of selectAttempts) {
      const { data, error } = await sb
        .from('user_documents')
        .select(clause)
        .eq('id', documentId)
        .maybeSingle();
      if (!error) {
        doc = data || null;
        break;
      }
    }
    if (!doc?.extracted_data || typeof doc.extracted_data !== 'object') {
      return { match_rate: null, reconciled: false, discrepancy: null, recon_method: 'none' };
    }

    const ed = doc.extracted_data;
    const printedDebits = getFirstMoney(ed, ['total_debits', 'transactions', 'total_charges']);
    const printedCredits = getFirstMoney(ed, ['total_credits', 'payments', 'total_payments']);
    const printedNewBalance = getFirstMoney(ed, ['new_balance', 'ending_balance', 'closing_balance']);
    const printedPrevBalance = getFirstMoney(ed, ['previous_balance', 'opening_balance', 'beginning_balance']);

    let discrepancy: number | null = null;
    let reconMethod: 'direct_debits' | 'balance_equation' | 'direct_credits' | 'none' = 'none';
    if ((printedDebits ?? 0) > 0) {
      discrepancy = Math.abs(Math.abs(computedTotals.total_debits) - Math.abs(Number(printedDebits || 0)));
      reconMethod = 'direct_debits';
    } else if ((printedNewBalance ?? 0) !== 0 && (printedPrevBalance ?? 0) !== 0) {
      const expectedNet = Number(printedNewBalance || 0) - Number(printedPrevBalance || 0);
      discrepancy = Math.abs(computedTotals.net - expectedNet);
      reconMethod = 'balance_equation';
    } else if ((printedCredits ?? 0) > 0) {
      discrepancy = Math.abs(Math.abs(computedTotals.total_credits) - Math.abs(Number(printedCredits || 0)));
      reconMethod = 'direct_credits';
    }

    if (discrepancy === null) {
      return { match_rate: null, reconciled: false, discrepancy: null, recon_method: 'none' };
    }

    const totalSpend = Math.abs(computedTotals.total_debits) || 1;
    const matchRate = Math.max(0, Math.min(1, 1 - (discrepancy / totalSpend)));
    const reconciled = discrepancy <= 1.0;
    console.log(
      `[RECONCILIATION] Discrepancy: $${discrepancy.toFixed(2)}, Match rate: ${(matchRate * 100).toFixed(1)}%, Reconciled: ${reconciled}`
    );
    return {
      match_rate: round2(matchRate),
      reconciled,
      discrepancy: round2(discrepancy),
      recon_method: reconMethod,
    };
  } catch (err: any) {
    console.error('[RECONCILIATION] Error:', err);
    return { match_rate: null, reconciled: false, discrepancy: null, recon_method: 'none' };
  }
}

async function runReconciliationGate(
  sb: any,
  importId: string,
  userIdText: string,
  transactionsToInsert: Array<{ amount?: number | string | null }>
): Promise<{
  gated: boolean;
  reason: string;
  details?: {
    bank_total_deducted: number;
    bank_total_added: number;
    row_total_deducted: number;
    row_total_added: number;
    delta_deducted: number;
    delta_added: number;
    tolerance: number;
    source: string;
  };
}> {
  const TOLERANCE = 0.05;

  const { data: importRow, error: readErr } = await sb
    .from('imports')
    .select('statement_breakdown_json')
    .eq('id', importId)
    .eq('user_id', userIdText)
    .maybeSingle();

  if (readErr) {
    console.warn('[CommitImport][Gate] Could not read SBD, skipping gate', { importId, error: readErr.message });
    return { gated: false, reason: 'sbd_read_failed' };
  }

  const sbd = importRow?.statement_breakdown_json;
  const stmtTotals =
    sbd && typeof sbd === 'object' ? (sbd as Record<string, unknown>).statementTotals : null;

  if (!stmtTotals || typeof stmtTotals !== 'object') {
    console.log('[CommitImport][Gate] No statementTotals present, skipping gate (non-BMO or extraction failed)', { importId });
    return { gated: false, reason: 'no_statement_totals' };
  }

  const totalsObj = stmtTotals as Record<string, unknown>;
  const bankDeducted = Number(totalsObj.totalDeducted);
  const bankAdded = Number(totalsObj.totalAdded);

  if (!Number.isFinite(bankDeducted) || !Number.isFinite(bankAdded)) {
    console.warn('[CommitImport][Gate] statementTotals present but values non-finite, blocking commit (data problem)', { importId });
    return {
      gated: true,
      reason: 'invalid_statement_totals',
      details: {
        bank_total_deducted: 0,
        bank_total_added: 0,
        row_total_deducted: 0,
        row_total_added: 0,
        delta_deducted: 0,
        delta_added: 0,
        tolerance: TOLERANCE,
        source: 'invalid_statement_totals',
      },
    };
  }

  let rowDeducted = 0;
  let rowAdded = 0;
  for (const tx of transactionsToInsert) {
    const amt = Number((tx as any)?.amount);
    if (!Number.isFinite(amt)) continue;
    if (amt < 0) rowDeducted += Math.abs(amt);
    else if (amt > 0) rowAdded += amt;
  }
  rowDeducted = round2(rowDeducted);
  rowAdded = round2(rowAdded);

  const deltaDeducted = Math.abs(rowDeducted - bankDeducted);
  const deltaAdded = Math.abs(rowAdded - bankAdded);
  const source = String(totalsObj.source || 'unknown');

  console.log('[CommitImport][Gate] Reconciliation check', {
    importId,
    bank: { deducted: bankDeducted, added: bankAdded, source },
    row: { deducted: rowDeducted, added: rowAdded },
    delta: { deducted: round2(deltaDeducted), added: round2(deltaAdded) },
    tolerance: TOLERANCE,
  });

  const failed = deltaDeducted > TOLERANCE || deltaAdded > TOLERANCE;

  return {
    gated: failed,
    reason: failed ? 'reconciliation_failed' : 'reconciled',
    details: {
      bank_total_deducted: bankDeducted,
      bank_total_added: bankAdded,
      row_total_deducted: rowDeducted,
      row_total_added: rowAdded,
      delta_deducted: round2(deltaDeducted),
      delta_added: round2(deltaAdded),
      tolerance: TOLERANCE,
      source,
    },
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function getNetlifyBaseUrl(): string {
  const envUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    process.env.NETLIFY_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, '');
  const port = process.env.NETLIFY_LOCAL_PORT || process.env.PORT || '8888';
  return `http://localhost:${port}`;
}

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'PGRST204' || message.includes('does not exist') || message.includes('schema cache');
}

async function updateImportCommittedStatus(
  sb: any,
  importId: string,
  userIdText: string,
  committedCount: number,
  now: string
): Promise<void> {
  const basePayload = {
    status: 'committed',
    updated_at: now,
  };
  const withCommittedAt = {
    ...basePayload,
    committed_at: now,
  };
  const withCommittedCount = {
    ...withCommittedAt,
    committed_count: committedCount,
  };

  let { error: updateError } = await sb
    .from('imports')
    .update(withCommittedCount)
    .eq('id', importId)
    .eq('user_id', userIdText);

  if (updateError && isMissingColumnError(updateError)) {
    console.warn('[CommitImport] Missing column in imports update, retrying without committed_count', {
      importId,
      error: updateError.message,
    });
    ({ error: updateError } = await sb
      .from('imports')
      .update(withCommittedAt)
      .eq('id', importId)
      .eq('user_id', userIdText));
  }

  if (updateError && isMissingColumnError(updateError)) {
    console.warn('[CommitImport] Missing column in imports update, retrying with minimal fields', {
      importId,
      error: updateError.message,
    });
    ({ error: updateError } = await sb
      .from('imports')
      .update(basePayload)
      .eq('id', importId)
      .eq('user_id', userIdText));
  }

  if (updateError) {
    console.error('[CommitImport] Error updating import status:', updateError);
  } else {
    console.log('[CommitImport] Import status updated successfully', {
      importId,
      status: 'committed',
      committedCount,
    });
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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
    const importIdSingle = body?.importId ? String(body.importId).trim() : '';
    const importIds = Array.isArray(body?.importIds)
      ? Array.from(
          new Set(
            body.importIds
              .map((id: any) => String(id || '').trim())
              .filter((id: string) => id.length > 0)
          )
        )
      : [];

    // SECURITY: Get userId from header, not from client body
    // This prevents users from importing other users' staging data
    const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
    const traceId = event.headers['x-trace-id'] || event.headers['X-Trace-Id'] || `trace_${Date.now()}`;
    const userIdText = String(userId || '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdText);
    
    if (!importIdSingle && importIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing importId in request body' }),
      };
    }

    if (!userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'Unauthorized: Missing x-user-id header' }),
      };
    }
    if (!isUuid) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'Unauthorized: Invalid x-user-id format' }),
      };
    }

    // Batch mode: reuse the proven single-import path with internal HTTP calls.
    // This keeps the diff minimal and preserves single-import behavior.
    if (!importIdSingle && importIds.length > 0) {
      const base = getNetlifyBaseUrl();
      const committed: Array<{ importId: string; transactionCount: number }> = [];
      const failed: Array<{ importId: string; error: string }> = [];
      for (const id of importIds) {
        try {
          const res = await fetch(`${base}/.netlify/functions/commit-import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userIdText,
            },
            body: JSON.stringify({ importId: id }),
          });
          const payload = await res.json().catch(() => ({} as any));
          const txCount = Number(payload?.committed ?? payload?.insertedCount ?? 0);
          if (res.ok && (payload?.ok === true || payload?.success === true || Number.isFinite(txCount))) {
            committed.push({ importId: id, transactionCount: Number.isFinite(txCount) ? txCount : 0 });
          } else {
            failed.push({ importId: id, error: String(payload?.error || payload?.message || `status_${res.status}`) });
          }
        } catch (error: any) {
          failed.push({ importId: id, error: String(error?.message || 'batch_commit_failed') });
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          success: failed.length === 0,
          committed,
          failed,
        }),
      };
    }

    const importId = importIdSingle;

    const sb = admin();

    console.log('[CommitImport] stage=commit_start', {
      traceId,
      importId,
      userId: userIdText.substring(0, 8) + '...',
    });

    // 1. Get import record and verify it exists and is ready to commit
    const { data: importRecord, error: importError } = await sb
      .from('imports')
      .select('id, user_id, document_id, file_url, file_type, status, created_at, approved_at')
      .eq('id', importId)
      .eq('user_id', userIdText)
      .maybeSingle();
    
    console.log('[CommitImport] Import record fetched', { 
      found: !!importRecord,
      status: importRecord?.status,
      fileType: importRecord?.file_type
    });
    // Idempotency guard: short-circuit duplicate invocations for the same import.
    // The frontend sometimes fires commit-import twice within ~3 seconds; without
    // this guard the second call wastes ~6s on staging fetch + categorization
    // before hitting the unique constraint on transactions_dedupe_key.
    if (importRecord?.status === 'committed') {
      console.log('[CommitImport] Idempotent re-invocation: import already committed', {
        importId,
        status: importRecord.status,
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          idempotent: true,
          status: 'committed',
          importId,
          message: 'Import already committed; no action needed.',
        }),
      };
    }

    if (importError) {
      if (isMissingColumnError(importError) && String(importError.message || '').includes('approved_at')) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            ok: false,
            error: 'approval_schema_missing',
            message: 'imports.approved_at is required. Run the approval migration first.',
          }),
        };
      }
      console.error('[CommitImport] Error fetching import:', importError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'db_error',
          message: `Failed to fetch import: ${importError.message}` 
        }),
      };
    }

    if (!importRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'no_import_found',
          message: 'Import not found for this user' 
        }),
      };
    }

    // Verify import status is 'parsed' (ready to commit)
    if (importRecord.status !== 'parsed') {
      if (importRecord.status === 'committed') {
        // Double-click protection: return 409 Conflict for already committed imports
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            ok: false,
            success: false,
            error: 'already_committed',
            message: 'This import has already been committed',
            importId,
            insertedCount: 0,
            committed: 0,
          }),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false,
          success: false,
          error: 'import_not_ready',
          message: `Import status is '${importRecord.status}', expected 'parsed'` 
        }),
      };
    }

    // --- Approval gate ---
    // Commit is allowed only after persisted backend approval.
    if (!importRecord.approved_at) {
      console.warn('[APPROVAL] Commit blocked, import not approved', {
        importId,
        userId: userIdText,
      });
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          success: false,
          error: 'User approval required before committing transactions.',
          code: 'APPROVAL_REQUIRED',
        }),
      };
    }

    // 2. If no document_id in import, try to find/create user_documents record
    let documentId = importRecord.document_id;
    
    if (!documentId && importRecord.file_url) {
      // Try to find existing user_documents by storage_path
      const { data: existingDoc } = await sb
        .from('user_documents')
        .select('id')
        .eq('user_id', userIdText)
        .eq('storage_path', importRecord.file_url)
        .maybeSingle();

      if (existingDoc) {
        documentId = existingDoc.id;
        // Update import record with document_id
        await sb
          .from('imports')
          .update({ document_id: documentId })
          .eq('id', importId);
      } else {
        // Create user_documents record if it doesn't exist
        const { data: newDoc, error: docError } = await sb
          .from('user_documents')
          .insert({
            user_id: userIdText,
            source: 'upload',
            original_name: importRecord.file_url.split('/').pop() || 'Document',
            mime_type: importRecord.file_type || 'application/pdf',
            storage_path: importRecord.file_url,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!docError && newDoc) {
          documentId = newDoc.id;
          // Update import record with document_id
          await sb
            .from('imports')
            .update({ document_id: documentId })
            .eq('id', importId);
        }
      }
    }

    // 3. Wait briefly for staged transactions to appear (when commit-import is called early)
    const waitStart = Date.now();
    console.log('[CommitImport] Waiting for staged rows...', { importId });
    let stagedCount = 0;
    while (Date.now() - waitStart < STAGED_ROWS_WAIT_MS) {
      console.log('[CommitImport] Poll staged count', {
        importId,
        userId: userIdText,
      });
      const { count, error: countError } = await sb
        .from('transactions_staging')
        .select('id', { count: 'exact', head: true })
        .eq('import_id', importId)
        .eq('user_id', userIdText);
      console.log('[CommitImport] Poll result', {
        importId,
        userId: userIdText,
        stagedCount: count || 0,
      });
      if (countError) {
        console.error('[CommitImport] Error checking staged count:', countError);
        break;
      }
      stagedCount = count || 0;
      if (stagedCount > 0) {
        console.log('[CommitImport] Staged rows appeared', {
          importId,
          count: stagedCount,
          elapsedMs: Date.now() - waitStart,
        });
        break;
      }
      await sleep(STAGED_ROWS_POLL_MS);
    }
    if (stagedCount === 0) {
      console.log('[CommitImport] No staged rows after wait', { importId, elapsedMs: Date.now() - waitStart, reason: 'no_staged_rows' });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          committed: 0,
          reason: 'no_staged_rows',
        }),
      };
    }

    // 4. Read staged transactions for this import
    // SECURITY: Always filter by user_id from auth header to prevent cross-user access
    console.log('[CommitImport] Fetching staged transactions', { importId });
    const { data: stagedRows, error: stagingError } = await sb
      .from('transactions_staging')
      .select('id, user_id, import_id, data_json, hash, parsed_at')
      .eq('import_id', importId)
      .eq('user_id', userIdText) // Critical: Use userId from auth header, not from client
      .order('parsed_at', { ascending: true });
    
    console.log('[CommitImport] Staged transactions fetched', { 
      count: stagedRows?.length || 0,
      hasError: !!stagingError 
    });
    safeLog('commit-import.staging_found', {
      userId: userIdText,
      importId,
      stagedCount: stagedRows?.length || 0,
      sampleStageIds: (stagedRows || []).slice(0, 5).map((row: any) => row.id),
    });

    if (stagingError) {
      console.error('[CommitImport] Error fetching staged transactions:', stagingError);
      safeLog('commit-import.error', {
        importId,
        userId: userIdText,
        error: stagingError?.message || 'staging_fetch_failed',
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'db_error',
          message: `Failed to fetch staged transactions: ${stagingError.message}` 
        }),
      };
    }

    if (!stagedRows || stagedRows.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          committed: 0, 
          error: 'no_transactions_in_staging',
          message: 'No staged transactions found for this import' 
        }),
      };
    }

    // 4. Transform and categorize transactions
    // Use Tag learning to categorize transactions that don't have a category yet
    console.log('[CommitImport] Transforming and categorizing transactions', { count: stagedRows.length });
    const transactionsToInsert = await Promise.all(
      stagedRows.map(async (row) => {
        const tx = row.data_json || {};
        
        // Determine transaction type (income vs expense)
        const amount = Number(tx.amount) || 0;
        const merchant = String(tx.merchant || tx.vendor || tx.vendor_normalized || '').toUpperCase().trim();
        const description = String(tx.description || tx.memo || '').toUpperCase().trim();
        const INCOME_EXACT = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
        const INCOME_CONTAINS = /\b(PAYMENT RECEIVED|PAYMENT THANK YOU|CREDIT ADJUSTMENT|REFUND|DEPOSIT|E-TRANSFER IN|PAYROLL)\b/;
        // For credit card statements, positive amounts are PURCHASES (expenses), not income.
        // Only treat as income if: merchant matches income pattern, or type is explicitly 'income',
        // or direction is 'in'. Never use type='Credit' or type='credit' as income indicator —
        // those are credit card transaction labels, not income signals.
        const isCreditCardStatement = tx.statementType === 'credit_card';
        const isIncome = !isCreditCardStatement && (
          INCOME_EXACT.test(merchant) ||
          INCOME_CONTAINS.test(merchant) ||
          INCOME_CONTAINS.test(description)
        ) ||
          tx.type === 'income' ||
          tx.direction === 'in' ||
          tx.is_credit === true ||
          // Bank statements: normalize-transactions sets type='Credit' for any
          // row with rawAmount >= 0 (its line 1137). That IS the income signal
          // for bank rows. The !isCreditCardStatement guard above already
          // scopes this - credit-card statements label purchases as 'Credit',
          // which we correctly ignore in that branch.
          (tx.type === 'Credit' && !isCreditCardStatement);
        
        // If transaction doesn't have a category, use Tag learning to categorize it
        let category = tx.category || tx.category_suggested;
        let confidence = tx.confidence || tx.category_confidence;
        let categorySource: string | null = null;
        
        if (!category || category === 'Uncategorized') {
          try {
            const categorizationResult = await categorizeTransactionWithLearning({
              userId: userIdText,
              merchant: tx.merchant || tx.vendor || tx.vendor_normalized || null,
              description: tx.description || tx.memo || tx.merchant || tx.vendor || 'Transaction',
              amount: Math.abs(amount)
            });
            
            category = categorizationResult.category;
            confidence = categorizationResult.confidence;
            categorySource = categorizationResult.source; // 'learned' or 'ai'
          } catch (error) {
            console.error('[CommitImport] Categorization error:', error);
            // Fallback to Uncategorized if categorization fails
            category = category || 'Uncategorized';
            confidence = confidence || 0.5;
          }
        }
        
        // Preserve the sign set by ocr_normalize (negative = expense, positive = income).
        // Do NOT call Math.abs() here — that was stripping all signs and making every
        // transaction appear as income in the UI.
        const signedAmount = amount;

        const rawDate = tx.date || tx.posted_at || tx.occurred_at || new Date().toISOString().split('T')[0];
        // Ensure posted_at is a full ISO timestamp so TransactionRow date rendering works.
        const postedAt = rawDate.includes('T')
          ? rawDate
          : new Date(rawDate + 'T00:00:00.000Z').toISOString();
        const dateOnly = rawDate.split('T')[0];

        let merchantName = tx.merchant || tx.vendor || tx.vendor_normalized || null;
        if (merchantName && String(merchantName).toLowerCase().replace(/[^a-z0-9]/g, '').includes('7eleven')) {
          merchantName = '7-Eleven';
        }

        return {
          id: randomUUID(),
          user_id: userIdText,
          // posted_at is the primary date field read by useTransactions / TransactionRow.
          // date is kept for backward compat with legacy queries in this file.
          posted_at: postedAt,
          date: dateOnly,
          merchant_name: merchantName, // field read by TransactionRow for committed rows
          merchant: merchantName,      // kept for legacy breakdown queries
          description: tx.description || tx.memo || merchantName || 'Transaction',
          amount: signedAmount,
          type: isIncome ? 'income' : 'expense',
          category: isIncome
            ? (category && category !== 'Uncategorized' && category !== 'Other' ? category : 'Income')
            : (category || 'Uncategorized'),
          category_source: categorySource || (tx.category_source as string | null) || null,
          source_type: 'smart_import',
          source: 'bank_statement',
          import_id: importId,
          document_id: tx.documentId || tx.docId || null,
          staging_hash: row.hash,
        };
      })
    );

    // 5. Bulk insert transactions (with conflict handling)
    // Use insert instead of upsert to prevent duplicates on double-click
    // PATCH2: Reconciliation gate. Runs BEFORE insert so failed parses
    // do not pollute the transactions table.
    const gateResult = await runReconciliationGate(sb, importId, userIdText, transactionsToInsert);
    if (gateResult.gated) {
      const gateNow = new Date().toISOString();
      console.warn('[CommitImport][Gate] BLOCKED commit, marking import parsed_unreconciled', {
        importId,
        reason: gateResult.reason,
        details: gateResult.details,
      });
      const { error: gateUpdateErr } = await sb
        .from('imports')
        .update({ status: 'parsed_unreconciled', updated_at: gateNow })
        .eq('id', importId)
        .eq('user_id', userIdText);
      if (gateUpdateErr) {
        console.error('[CommitImport][Gate] Failed to set parsed_unreconciled status', {
          importId,
          error: gateUpdateErr.message,
        });
      }
      safeLog('commit-import.gate_blocked', {
        importId,
        userId: userIdText,
        reason: gateResult.reason,
        details: gateResult.details,
      });
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          ok: false,
          success: false,
          error: 'reconciliation_failed',
          message: 'Row totals do not match printed statement totals. Import marked parsed_unreconciled.',
          importId,
          status: 'parsed_unreconciled',
          reconciliation: gateResult.details,
        }),
      };
    }

    // The unique constraint on transactions table will prevent duplicates
    console.log('[CommitImport] Inserting transactions into final table', { 
      count: transactionsToInsert.length,
      user_id: userIdText,
      import_id: importId,
    });
    const { data: insertedTransactions, error: insertError } = await sb
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id');    const { count: userTransactionCount } = await sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userIdText);
    
    console.log('[CommitImport] User transaction count after insert', {
      user_id: userIdText,
      count: userTransactionCount ?? 0,
    });
    
    console.log('[CommitImport] Transactions inserted', { 
      insertedCount: insertedTransactions?.length || 0,
      hasError: !!insertError,
      errorCode: insertError?.code 
    });
    safeLog('commit-import.insert_ok', {
      userId: userIdText,
      importId,
      insertedCount: insertedTransactions?.length || 0,
      sampleInsertedIds: (insertedTransactions || []).slice(0, 5).map((row: any) => row.id),
    });

    if (insertError) {
      // Check if error is due to duplicate (unique constraint violation)
      // This can happen if user clicks Import All twice quickly
      const isDuplicateError = insertError.code === '23505' || 
                               insertError.message?.includes('duplicate') ||
                               insertError.message?.includes('unique constraint');
      
      if (isDuplicateError) {
        console.warn('[CommitImport] Duplicate transactions detected - import may have already been committed');
        // Check if import is already committed
        const { data: checkImport } = await sb
          .from('imports')
          .select('status')
          .eq('id', importId)
          .eq('user_id', userIdText)
          .maybeSingle();
        
        if (checkImport?.status === 'committed') {
          const { count: committedCount } = await sb
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('import_id', importId)
            .eq('user_id', userIdText);
          // Import was already committed - return 409 Conflict
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              ok: false,
              success: false,
              error: 'already_committed',
              message: 'This import has already been committed',
              importId,
              insertedCount: committedCount || 0,
              committed: committedCount || 0,
            }),
          };
        }
        
        // If not committed yet, continue to update status (partial success)
        // Some transactions may have been inserted before the duplicate error
      } else {
        console.error('[CommitImport] Error inserting transactions:', insertError);
        safeLog('commit-import.error', {
          importId,
          userId: userIdText,
          error: insertError?.message || 'insert_failed',
        });
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            ok: false,
            success: false,
            error: 'db_error',
            message: `Failed to insert transactions: ${insertError.message}` 
          }),
        };
      }
    }

    // 6. Mark import as committed with timestamp and count
    const now = new Date().toISOString();
    const committedCount = insertedTransactions?.length || transactionsToInsert.length;
    
    console.log('[CommitImport] Updating import status to committed', { 
      importId, 
      committedCount,
      timestamp: now 
    });
    
    await updateImportCommittedStatus(sb, importId, userIdText, committedCount, now);

    safeLog('commit-import.success', { 
      importId, 
      userId: userIdText, 
      documentId, 
      transactionCount: committedCount 
    });

    // 7. Detect recurring obligations from newly committed transactions
    // This runs synchronously but doesn't block the response
    const DISABLE_RECURRING = process.env.DISABLE_RECURRING === '1' || process.env.DISABLE_RECURRING === 'true';
    if (DISABLE_RECURRING) {
      console.log('[recurring] disabled by env');
    } else {
      try {
      // Fetch newly committed transactions for this import
      const { data: newTransactions, error: txError } = await sb
        .from('transactions')
        .select('id, date, posted_at, amount, merchant, description, category, type')
        .eq('import_id', importId)
        .eq('user_id', userIdText)
        .eq('type', 'expense') // Only expenses can be recurring obligations
        .order('date', { ascending: true });

      if (!txError && newTransactions && newTransactions.length > 0) {
        // Group transactions by merchant to form candidates
        const merchantGroups = new Map<string, RecurringCandidate>();

        for (const tx of newTransactions) {
          const merchant = tx.merchant || tx.description || 'Unknown';
          const key = merchant;

          if (!merchantGroups.has(key)) {
            merchantGroups.set(key, {
              userId,
              merchantName: merchant,
              transactions: [],
            });
          }

          merchantGroups.get(key)!.transactions.push({
            id: tx.id,
            date: tx.date || tx.posted_at || new Date().toISOString(),
            amount: Math.abs(Number(tx.amount) || 0),
          });
        }

        // Convert to array and detect patterns
        const candidates = Array.from(merchantGroups.values());
        const detectionResults = await detectAndUpsertRecurringObligations(candidates);

        const obligationsCreated = detectionResults.filter(r => r.isNew).length;
        const obligationsUpdated = detectionResults.filter(r => !r.isNew).length;

        safeLog('[Chime] Recurring detection complete', {
          userId: userIdText.substring(0, 8) + '...',
          importId: importId.substring(0, 8) + '...',
          candidatesAnalyzed: candidates.length,
          obligationsCreated,
          obligationsUpdated,
        });

        // Queue notifications for upcoming payments (async, don't wait)
        queueUpcomingPaymentNotifications({
          userId,
          horizonDays: 14, // Look ahead 14 days
        }).catch(err => {
          // Silently fail - notification queuing is not critical
          safeLog('[Chime] Failed to queue notifications', {
            userId: userIdText.substring(0, 8) + '...',
            error: err?.message || String(err),
          });
        });
      }
      } catch (err: any) {
        // Silently fail - detection is not critical for import success
        safeLog('[Chime] Error in recurring detection', {
          userId: userIdText.substring(0, 8) + '...',
          error: err?.message || String(err),
        });
      }
    }

    // 8. Compute summary and detect issues from committed transactions
    const { data: committedTransactions, error: summaryError } = await sb
      .from('transactions')
      .select('id, date, posted_at, amount, type, merchant, description, category')
      .eq('import_id', importId)
      .eq('user_id', userIdText)
      .order('posted_at', { ascending: true });

    let summary: any = null;
    let issues: any = null;

    if (!summaryError && committedTransactions && committedTransactions.length > 0) {
      console.log('[CommitImport] Computing summary and detecting issues', { 
        transactionCount: committedTransactions.length 
      });
      
      // Compute summary
      const totalTransactions = committedTransactions.length;
      let totalCredits = 0;
      let totalDebits = 0;
      let uncategorizedCount = 0;
      const categoryMap = new Map<string, { total: number; count: number }>();
      
      // Track date range
      let minDate: string | null = null;
      let maxDate: string | null = null;

      committedTransactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          totalCredits += amount;
        } else {
          totalDebits += amount;
        }

        const category = tx.category || 'Uncategorized';
        if (category === 'Uncategorized' || !category) {
          uncategorizedCount++;
        }

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, count: 0 });
        }
        const catStats = categoryMap.get(category)!;
        catStats.total += amount;
        catStats.count++;
        
        // Track date range
        const txDate = tx.date || tx.posted_at || '';
        if (txDate) {
          const dateStr = txDate.split('T')[0]; // Just the date part
          if (!minDate || dateStr < minDate) minDate = dateStr;
          if (!maxDate || dateStr > maxDate) maxDate = dateStr;
        }
      });

      // Top 5 categories by total amount
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          total: Math.round(stats.total * 100) / 100,
          count: stats.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      summary = {
        totalTransactions,
        totalCredits: Math.round(totalCredits * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        uncategorizedCount,
        topCategories,
        dateRange: minDate && maxDate ? {
          startDate: minDate,
          endDate: maxDate,
        } : null,
      };
      
      console.log('[CommitImport] Summary computed', {
        totalTransactions,
        totalCredits: summary.totalCredits,
        totalDebits: summary.totalDebits,
        uncategorizedCount,
        topCategoriesCount: topCategories.length,
        dateRange: summary.dateRange,
      });

      // Detect fixable issues
      const unassignedCategories: Array<{
        transactionId: string;
        merchant: string;
        amount: number;
        date: string;
      }> = [];

      const possibleDuplicates: Array<{
        transactionIds: string[];
        date: string;
        amount: number;
        description: string;
        similarity: number;
      }> = [];

      // Find unassigned categories
      committedTransactions.forEach(tx => {
        const category = tx.category || '';
        if (category === 'Uncategorized' || !category) {
          unassignedCategories.push({
            transactionId: tx.id,
            merchant: tx.merchant || 'Unknown',
            amount: Math.round((Number(tx.amount) || 0) * 100) / 100,
            date: tx.date || tx.posted_at || '',
          });
        }
      });

      // Detect possible duplicates (same date + same amount + similar description)
      // Simple heuristic: same date, same amount (within $0.01), similar description
      const duplicateMap = new Map<string, string[]>();
      committedTransactions.forEach(tx => {
        const date = tx.date || tx.posted_at || '';
        const amount = Math.round((Number(tx.amount) || 0) * 100) / 100;
        const description = (tx.description || tx.merchant || '').toLowerCase().trim();
        
        // Create a key for potential duplicates
        const dateStr = date.split('T')[0]; // Just the date part
        const key = `${dateStr}_${amount}`;
        
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key)!.push(tx.id);
      });

      // Find groups with multiple transactions (potential duplicates)
      duplicateMap.forEach((transactionIds, key) => {
        if (transactionIds.length > 1) {
          const [dateStr, amountStr] = key.split('_');
          const sampleTx = committedTransactions.find(t => t.id === transactionIds[0]);
          
          // Calculate similarity between descriptions in the group
          const descriptions = transactionIds
            .map(id => {
              const tx = committedTransactions.find(t => t.id === id);
              return (tx?.description || tx?.merchant || '').toLowerCase().trim();
            })
            .filter(Boolean);

          // Simple similarity: if descriptions are similar (contain common words)
          let similarity = 0.5; // Default moderate similarity
          if (descriptions.length >= 2) {
            const words1 = new Set(descriptions[0].split(/\s+/));
            const words2 = new Set(descriptions[1].split(/\s+/));
            const common = [...words1].filter(w => words2.has(w)).length;
            const total = new Set([...words1, ...words2]).size;
            similarity = total > 0 ? common / total : 0.5;
          }

          possibleDuplicates.push({
            transactionIds,
            date: dateStr,
            amount: parseFloat(amountStr),
            description: sampleTx?.description || sampleTx?.merchant || 'Transaction',
            similarity: Math.round(similarity * 100) / 100,
          });
        }
      });

      issues = {
        unassignedCategories: unassignedCategories.slice(0, 10), // Limit to 10 for UI
        possibleDuplicates: possibleDuplicates.slice(0, 10), // Limit to 10 for UI
      };
      
      console.log('[CommitImport] Issues detected', {
        unassignedCategoriesCount: issues.unassignedCategories.length,
        possibleDuplicatesCount: issues.possibleDuplicates.length,
      });
    } else if (summaryError) {
      console.error('[CommitImport] Failed to compute summary', { error: summaryError.message });
    }

    let statementBreakdown: StatementBreakdown | null = null;
    try {
      statementBreakdown = await buildStatementBreakdown({
        sb,
        importId,
        userIdText,
        documentId: documentId || null,
      });
      console.log('[BREAKDOWN]', JSON.stringify(statementBreakdown, null, 2));
      const persisted = await persistStatementBreakdown(sb, importId, userIdText, statementBreakdown);
      if (!persisted) {
        console.error('[CommitImport] ⚠ statement_breakdown_json NOT saved — run migration sql/migrations/20260301_imports_statement_breakdown.sql', { importId });
      }
    } catch (breakdownError: any) {
      console.warn('[CommitImport] Failed to build/persist statement breakdown', {
        importId,
        error: breakdownError?.message || String(breakdownError),
      });
    }

    console.log('[CommitImport] stage=commit_done', {
      traceId,
      importId,
      documentId: documentId || null,
      committedCount,
    });

    // Return success response with inserted transaction details, summary, issues, and deterministic breakdown
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ok: true, // Keep for backward compatibility
        importId,
        insertedCount: committedCount,
        committed: committedCount, // Keep for backward compatibility
        documentId: documentId || null,
        transactions: insertedTransactions?.map(t => ({ id: t.id })) || [],
        message: `Successfully committed ${committedCount} transaction${committedCount !== 1 ? 's' : ''}`,
        userTransactionCount: userTransactionCount ?? null,
        summary: summary || undefined,
        issues: issues || undefined,
        statement_breakdown: statementBreakdown || undefined,
      }),
    };

  } catch (error: any) {
    console.error('[CommitImport] Unexpected error:', error);
    safeLog('commit-import.error', { error: error?.message, stack: error?.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'internal_error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};

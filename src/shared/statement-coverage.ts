/**
 * L-B — statement inventory and coverage (owner GO 2026-11-24; Attachments HQ review applied).
 *
 * Read-only, owner-scoped view over EXISTING records: `imports` (status, upload/commit times,
 * statement_breakdown_json.statement_meta) joined to `user_documents` (name, period fallback,
 * purpose). No new table, no duplicated document logic.
 *
 * Rules:
 *  - Chat documents (purpose = 'chat_document') are never statements. Before the purpose migration
 *    the column does not exist: every row is treated as an import (same fallback as
 *    documentImportBlock).
 *  - Upload date (imports.created_at) and statement period (statement_meta.period_start/end) are
 *    separate fields. The most recent upload ATTEMPT is distinct from the most recent COMPLETED import.
 *  - Only completed imports count as coverage. Pending and failed imports are reported, never as coverage.
 *  - Coverage is per account (institution + last 4) from statement periods — never inferred from
 *    first/last transaction dates. Missing or ambiguous metadata is disclosed, not guessed.
 *  - Never returns OCR text, extracted contents or storage paths; last 4 digits only.
 */

import { resolveStatementPeriod, type StatementPeriodSource } from './statement-period';

export type ImportState = 'completed' | 'awaiting_review' | 'in_progress' | 'failed' | 'unknown';

const COMPLETED = new Set(['committed', 'completed']);
const AWAITING_REVIEW = new Set(['parsed_unreconciled', 'needs_review', 'parsed', 'ready', 'ready_cached']);
const IN_PROGRESS = new Set(['pending', 'processing', 'parsing', 'normalizing', 'running', 'uploaded', 'ocr_processing', 'queued']);
const FAILED = new Set(['failed', 'rejected', 'timed_out', 'cancelled', 'canceled', 'error']);

export function classifyImportStatus(status: unknown, committedAt?: unknown): ImportState {
  const s = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (COMPLETED.has(s)) return 'completed';
  if (AWAITING_REVIEW.has(s)) return 'awaiting_review';
  if (IN_PROGRESS.has(s)) return 'in_progress';
  if (FAILED.has(s)) return 'failed';
  if (typeof committedAt === 'string' && committedAt) return 'completed';
  return 'unknown';
}

export interface StatementRecord {
  institution: string | null;
  accountLast4: string | null;
  statementType: 'bank' | 'credit_card' | 'unknown';
  periodStart: string | null;
  periodEnd: string | null;
  /** L-D3: verbatim printed period when that is the only source (shown "as printed"). */
  periodText: string | null;
  /** L-D3: printed text is a single "period ending" date (no start, no coverage). */
  periodEndingOnly: boolean;
  periodSource: StatementPeriodSource;
  uploadedAt: string | null;
  completedAt: string | null;
  state: ImportState;
  fileName: string | null;
  metadataMissing: boolean;
}

export interface AccountCoverage {
  institution: string | null;
  accountLast4: string | null;
  label: string;
  statementCount: number;
  earliestPeriodStart: string | null;
  latestPeriodEnd: string | null;
  /** Periods between completed statements with no completed statement (inclusive dates). */
  gaps: Array<{ from: string; to: string }>;
  /** Each completed statement's own period, oldest first (unified engine: comparable periods). */
  periods: Array<{ start: string; end: string }>;
}

export interface StatementCoverage {
  status: 'ok' | 'no_statements' | 'query_error';
  lastUploadAttempt: StatementRecord | null;
  lastCompletedImport: StatementRecord | null;
  statusCounts: Record<ImportState, number>;
  accounts: AccountCoverage[];
  completedWithoutPeriod: number;
  limitations: string[];
  readOnly: true;
}

const ts =(v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

function last4(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const d = String(v).replace(/\D/g, '').slice(-4);
  return d.length === 4 ? d : null;
}
function institutionName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const n = v.replace(/\d{5,}/g, '').trim().slice(0, 60);
  return n || null;
}
function accountLabel(inst: string | null, l4: string | null): string {
  if (inst && l4) return `${inst} •••• ${l4}`;
  if (l4) return `Account •••• ${l4}`;
  return inst || 'Unidentified account';
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface ImportRow {
  id?: string;
  document_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  committed_at?: string | null;
  issuer?: string | null;
  filename?: string | null;
  statement_breakdown_json?: { statement_meta?: { issuer?: unknown; account_last4?: unknown; period_start?: unknown; period_end?: unknown; statement_type?: unknown } } | null;
}
export interface DocumentRow {
  id: string;
  original_name?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  purpose?: string | null;
  /** extracted_data->claude_vision->period (ISO start/end), selected as a JSON path. */
  vision_period?: { start?: unknown; end?: unknown } | null;
  /** metadata->statement_summary->>statement_period (printed text), selected as a JSON path. */
  printed_period?: string | null;
}

export function toStatementRecord(imp: ImportRow, doc: DocumentRow | undefined): StatementRecord {
  const meta = imp.statement_breakdown_json?.statement_meta ?? {};
  const inst = institutionName(meta.issuer) ?? institutionName(imp.issuer);
  const l4 = last4(meta.account_last4);
  const period = resolveStatementPeriod({
    statementMeta: meta,
    visionPeriod: doc?.vision_period ?? null,
    documentPeriod: doc ? { start: doc.period_start, end: doc.period_end } : null,
    printedPeriod: doc?.printed_period ?? null,
  });
  const periodStart = period.start;
  const periodEnd = period.end;
  const st = typeof meta.statement_type === 'string' && (meta.statement_type === 'bank' || meta.statement_type === 'credit_card') ? meta.statement_type : 'unknown';
  return {
    institution: inst,
    accountLast4: l4,
    statementType: st,
    periodStart,
    periodEnd,
    periodText: period.printedText,
    periodEndingOnly: period.printedEndingOnly,
    periodSource: period.source,
    uploadedAt: ts(imp.created_at),
    completedAt: ts(imp.committed_at),
    state: classifyImportStatus(imp.status, imp.committed_at),
    fileName: typeof (doc?.original_name ?? imp.filename) === 'string' ? String(doc?.original_name ?? imp.filename).slice(0, 120) : null,
    metadataMissing: !inst || !l4 || !periodStart || !periodEnd,
  };
}

/** Pure summary over already-loaded, owner-scoped, non-chat records (newest upload first). */
export function summarizeStatementCoverage(records: StatementRecord[]): StatementCoverage {
  const statusCounts: Record<ImportState, number> = { completed: 0, awaiting_review: 0, in_progress: 0, failed: 0, unknown: 0 };
  for (const r of records) statusCounts[r.state]++;
  const byUpload = [...records].sort((a, b) => String(b.uploadedAt ?? '').localeCompare(String(a.uploadedAt ?? '')));
  const completed = records.filter(r => r.state === 'completed');
  const lastCompleted = [...completed].sort((a, b) => String(b.completedAt ?? b.uploadedAt ?? '').localeCompare(String(a.completedAt ?? a.uploadedAt ?? '')))[0] ?? null;

  const groups = new Map<string, StatementRecord[]>();
  let completedWithoutPeriod = 0;
  for (const r of completed) {
    if (!r.periodStart || !r.periodEnd) { completedWithoutPeriod++; continue; }
    const key = `${(r.institution ?? '').toLowerCase()}|${r.accountLast4 ?? ''}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const accounts: AccountCoverage[] = [...groups.values()].map(list => {
    const sorted = [...list].sort((a, b) => a.periodStart!.localeCompare(b.periodStart!));
    const gaps: Array<{ from: string; to: string }> = [];
    let coveredTo = sorted[0].periodEnd!;
    for (const r of sorted.slice(1)) {
      const nextStart = r.periodStart!;
      if (nextStart > addDays(coveredTo, 3)) gaps.push({ from: addDays(coveredTo, 1), to: addDays(nextStart, -1) });
      if (r.periodEnd! > coveredTo) coveredTo = r.periodEnd!;
    }
    return {
      institution: sorted[0].institution,
      accountLast4: sorted[0].accountLast4,
      label: accountLabel(sorted[0].institution, sorted[0].accountLast4),
      statementCount: sorted.length,
      earliestPeriodStart: sorted[0].periodStart,
      latestPeriodEnd: coveredTo,
      gaps,
      periods: sorted.map(r => ({ start: r.periodStart!, end: r.periodEnd! })),
    };
  }).sort((a, b) => a.label.localeCompare(b.label));

  const limitations: string[] = [];
  if (completedWithoutPeriod > 0) limitations.push(`${completedWithoutPeriod} completed import(s) have no statement period recorded, so their coverage is unknown.`);
  if (completed.some(r => !r.institution || !r.accountLast4)) limitations.push('Some completed statements have no institution or account number recorded; they are grouped as "Unidentified account".');
  if (statusCounts.awaiting_review + statusCounts.in_progress > 0) limitations.push('Imports still processing or awaiting review are not counted as coverage.');
  if (statusCounts.failed > 0) limitations.push('Failed imports are not counted as coverage.');
  limitations.push('Coverage comes from imported statement periods only; there is no live bank connection.');

  return {
    status: records.length === 0 ? 'no_statements' : 'ok',
    lastUploadAttempt: byUpload[0] ?? null,
    lastCompletedImport: lastCompleted,
    statusCounts,
    accounts,
    completedWithoutPeriod,
    limitations,
    readOnly: true,
  };
}

/** For L-C: how a requested period [start, end] (inclusive) is covered by each account's statements. */
export type PeriodCoverage = 'complete' | 'incomplete' | 'none' | 'unknown';
export function coverageForPeriod(
  coverage: StatementCoverage,
  start: string,
  end: string,
): { overall: PeriodCoverage; byAccount: Array<{ label: string; coverage: 'covered' | 'partial' | 'not_covered' }> } {
  if (coverage.status !== 'ok' || coverage.accounts.length === 0) return { overall: coverage.completedWithoutPeriod > 0 ? 'unknown' : 'none', byAccount: [] };
  const byAccount = coverage.accounts.map(a => {
    const s = a.earliestPeriodStart!, e = a.latestPeriodEnd!;
    if (e < start || s > end) return { label: a.label, coverage: 'not_covered' as const };
    const fullyInside = s <= start && e >= end && !a.gaps.some(g => !(g.to < start || g.from > end));
    return { label: a.label, coverage: fullyInside ? 'covered' as const : 'partial' as const };
  });
  const covered = byAccount.filter(b => b.coverage === 'covered').length;
  const none = byAccount.every(b => b.coverage === 'not_covered');
  let overall: PeriodCoverage = none ? 'none' : covered === byAccount.length ? 'complete' : 'incomplete';
  if (overall === 'complete' && coverage.completedWithoutPeriod > 0) overall = 'unknown';
  return { overall, byAccount };
}

// ── I/O (owner-scoped; chat documents excluded) ─────────────────────────────

interface Q {
  select(c: string): Q;
  eq(c: string, v: unknown): Q;
  is(c: string, v: null): Q;
  in(c: string, v: unknown[]): Q;
  order(c: string, o: { ascending: boolean }): Q;
  limit(n: number): PromiseLike<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
}
export interface CoverageDbClient { from(t: 'imports' | 'user_documents'): Q }

function isMissingPurposeColumn(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  const m = String(e.message || '').toLowerCase();
  return e.code === '42703' || (m.includes('purpose') && (m.includes('does not exist') || m.includes('schema cache')));
}

const MAX_IMPORTS = 500;

export async function loadStatementCoverage(sb: CoverageDbClient, userId: string): Promise<StatementCoverage> {
  const errorResult: StatementCoverage = {
    status: 'query_error', lastUploadAttempt: null, lastCompletedImport: null,
    statusCounts: { completed: 0, awaiting_review: 0, in_progress: 0, failed: 0, unknown: 0 },
    accounts: [], completedWithoutPeriod: 0,
    limitations: ['Statement records could not be retrieved; do not guess.'], readOnly: true,
  };
  if (!userId) return errorResult;
  try {
    const { data: imps, error } = await sb
      .from('imports')
      .select('id, document_id, status, created_at, committed_at, issuer, filename, statement_breakdown_json')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(MAX_IMPORTS);
    if (error || !Array.isArray(imps)) return errorResult;
    const imports = imps as ImportRow[];
    const docIds = [...new Set(imports.map(i => i.document_id).filter((x): x is string => typeof x === 'string' && !!x))];

    const docs = new Map<string, DocumentRow>();
    if (docIds.length > 0) {
      // L-D3: the two verified extra period sources are read as JSON paths only (no document text).
      const PERIOD_PATHS = 'vision_period:extracted_data->claude_vision->period, printed_period:metadata->statement_summary->>statement_period';
      let res = await sb.from('user_documents').select(`id, original_name, period_start, period_end, purpose, ${PERIOD_PATHS}`).eq('user_id', userId).in('id', docIds).limit(MAX_IMPORTS);
      if (res.error && isMissingPurposeColumn(res.error)) {
        // Before the purpose migration: no chat documents can exist; every row is an import.
        res = await sb.from('user_documents').select(`id, original_name, period_start, period_end, ${PERIOD_PATHS}`).eq('user_id', userId).in('id', docIds).limit(MAX_IMPORTS);
      }
      if (res.error) return errorResult;
      for (const d of (res.data ?? []) as DocumentRow[]) docs.set(d.id, d);
    }

    const records = imports
      .filter(i => docs.get(String(i.document_id))?.purpose !== 'chat_document')
      .map(i => toStatementRecord(i, i.document_id ? docs.get(i.document_id) : undefined));
    const summary = summarizeStatementCoverage(records);
    if (imports.length >= MAX_IMPORTS) summary.limitations.unshift(`Only the most recent ${MAX_IMPORTS} imports were checked.`);
    return summary;
  } catch {
    return errorResult;
  }
}

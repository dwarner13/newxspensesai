/**
 * COLLAB-2a — code-owned rule for Prime's read-only Tag consultation (tag_status).
 * Prime may identify and explain suspected categorization problems; it never changes categories.
 *
 * L-A (owner GO 2026-11-24): categorization-status / quality questions are answered by a
 * DETERMINISTIC server-side tag_status consultation (the model no longer decides whether to
 * consult), and the unrelated full-year tax_summary pre-run is skipped for them. A specialist
 * consultation event is returned only when the tool actually executed.
 */

import type { TagStatus } from './tag-status';

export function buildPrimeTagConsultationRule(): string {
  return [
    'TAG CONSULTATION (code-owned; read-only):',
    '- When the customer asks whether their categories look right, what needs review, or about categorization quality — or before you suggest any recategorization — call tag_status.',
    '- Scope, in this order: the period the customer asked for (periodSource "requested"); otherwise a specific imported statement the customer referenced (importId); otherwise the period already established in this conversation (periodSource "conversation"); otherwise omit dates and the current calendar month is used. Always state the period or statement used. If both a period and a statement were referenced, do not combine them — explain the difference or ask which one they meant.',
    '- Status: "no_transactions_in_period" means zero matching transactions; "no_imported_data" means nothing is imported; "outside_imported_coverage" means the period is outside the imported data; "partial" means counts are minimums; "query_error" means Tag data is unavailable — never guess. Never widen the period on your own.',
    "- Findings are PROPOSALS. Never say a category was changed. Offer: \"Want Tag to review these?\" Any change goes through Tag with the customer's explicit confirmation.",
    '- Never propose changing customer-confirmed or possibly customer-approved categories (both are excluded from tag_status findings).',
    '- Always disclose the caveats tag_status returns, including that category-source labels are not fully reliable yet.',
  ].join('\n');
}

// ── L-A: categorization-question detection ──────────────────────────────────

const CATEGORIZATION_PATTERNS: readonly RegExp[] = [
  // "are my transactions categorized correctly", "do my categories look right", "is the categorization accurate"
  /\bcategori[sz](?:ed|ation|ing)\b[^?.!]*\b(correct(?:ly)?|right|wrong|accurate(?:ly)?|properly|ok|okay|good|look)\b/i,
  /\bcategor(?:y|ies)\b[^?.!]*\b(look|looks|correct|right|wrong|accurate|ok|okay)\b/i,
  /\b(correct(?:ly)?|right|wrong(?:ly)?|properly)\s+categori[sz]ed\b/i,
  /\bmis-?categori[sz]ed\b/i,
  /\b(uncategori[sz]ed|needs?\s+review)\b[^?.!]*\b(transactions?|items?|any|how many|what|which|do i have)\b/i,
  /\b(how many|which|what|any)\b[^?.!]*\b(uncategori[sz]ed|need(?:s)?\s+review|miscategori[sz]ed)\b/i,
  /\b(check|review|audit|verify)\b[^?.!]*\b(my\s+)?categor(?:y|ies|i[sz]ation)\b/i,
];

/**
 * True for questions about categorization status or quality (not spending-by-category totals and
 * not a specific change request — those keep their existing paths).
 */
export function isCategorizationReviewQuestion(message: string): boolean {
  const m = String(message || '');
  if (!m.trim()) return false;
  // A change request ("change X to Travel", "recategorize ...") is a Tag action, not a status read.
  if (/\b(change|move|set|switch|recategori[sz]e|re-categori[sz]e|make)\b[^?.!]*\b(to|as|into)\b/i.test(m)) return false;
  return CATEGORIZATION_PATTERNS.some(re => re.test(m));
}

// ── L-A: scope from Prime's resolved temporal scope ─────────────────────────

/** Minimal shape of Prime's resolved temporal scope (from = inclusive, to = EXCLUSIVE). */
export interface ResolvedPeriodLike { primary?: { from: string; to: string; label?: string } }

function minusOneDay(iso: string): string | null {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * tag_status input from Prime's scope, following the owner's precedence:
 * explicit period (requested) → conversation period (inherited by M1b) → current month (omit dates).
 * Document scope is not resolved here (no importId in this path); tag_status handles it when given.
 */
export function tagStatusInputFromScope(
  scope: ResolvedPeriodLike | null | undefined,
  inheritedFromConversation: boolean,
): { startDate?: string; endDate?: string; periodSource?: 'requested' | 'conversation' } {
  const p = scope?.primary;
  if (!p?.from || !p?.to) return {};
  const end = minusOneDay(p.to);
  if (!end || end < p.from) return {};
  return { startDate: p.from, endDate: end, periodSource: inheritedFromConversation ? 'conversation' : 'requested' };
}

// ── L-A: evidence for the model, and the genuine consultation event ─────────

// ── L-D1: outcome classes and the empty-period offer ──────────────────────

export type TagConsultationOutcome = 'with_transactions' | 'no_transactions' | 'partial' | 'failed';

/** L-D1: the four outcomes the owner asked to distinguish. */
export function classifyTagConsultation(s: TagStatus | null | undefined): TagConsultationOutcome {
  if (!s || s.status === 'query_error') return 'failed';
  if (s.status === 'partial') return 'partial';
  if (s.status === 'ok' && s.totals.transactionCount > 0) return 'with_transactions';
  return 'no_transactions'; // no_transactions_in_period, outside_imported_coverage, no_imported_data
}

/** True when Tag produced usable evidence (anything except a failed consultation). */
export function tagConsultationAnswered(s: TagStatus | null | undefined): boolean {
  return classifyTagConsultation(s) !== 'failed';
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "June 2026" from an ISO date, or null. */
function monthLabel(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** L-D1: honest reply when the consultation itself failed (never the legacy financial fallback). */
export const TAG_CONSULTATION_FAILED_REPLY =
  "I asked Tag to check your categories, but the check didn't complete, so I can't tell you yet whether anything needs fixing. Nothing was changed. Could you try again in a moment?";

export function formatTagConsultationEvidence(s: TagStatus): string {
  const lines: string[] = [
    'TAG CONSULTATION RESULT (you consulted Tag via tag_status — read-only, server-verified):',
    `- Period / scope: ${s.scope.label} (${s.scope.source.replace(/_/g, ' ')})`,
    `- Status: ${s.status}`,
    `- Outcome: ${classifyTagConsultation(s).replace(/_/g, ' ')}`,
  ];
  // L-D1: an empty period is a valid answer — say so, give the coverage, and OFFER (never run) the latest month.
  if (classifyTagConsultation(s) === 'no_transactions') {
    const latest = monthLabel(s.coverage?.latestDate ?? null);
    if (s.status === 'no_imported_data') {
      lines.push('- There are no imported transactions yet, so there is nothing for Tag to review.');
    } else {
      lines.push(`- There are no imported transactions in ${s.scope.label}.${s.coverage?.latestDate ? ` The most recent imported transaction is dated ${s.coverage.latestDate}.` : ''}`);
      if (latest) lines.push(`- OFFER (do not do it automatically): "Would you like me to have Tag review ${latest}, your most recent imported month?" Do not widen the period on your own.`);
    }
  }
  if (s.status !== 'query_error') {
    lines.push(`- Transactions in scope: ${s.totals.transactionCount}; uncategorized: ${s.totals.uncategorized}; "Other": ${s.totals.otherCount}; needs review: ${s.needsReviewCount}`);
    lines.push(`- Category sources: customer-confirmed ${s.provenance.customer_confirmed}, possibly customer-approved ${s.provenance.possibly_customer_approved}, automatic ${s.provenance.automatic}, needs review ${s.provenance.needs_review}, unknown ${s.provenance.unknown}`);
    if (s.recentCorrections.available) lines.push(`- Customer corrections in the last 90 days: ${s.recentCorrections.count}`);
    if (s.anomalies.length > 0) {
      lines.push('- Suspected categorization issues (proposals only):');
      for (const a of s.anomalies) {
        lines.push(`  • ${a.merchant}: ${a.count} × ${a.currentCategory}${a.suggestedCategory ? ` → possibly ${a.suggestedCategory}` : ''} (${a.kind.replace(/_/g, ' ')}) — ${a.reason}`);
      }
    } else {
      lines.push('- Tag found no suspected categorization issues in this scope.');
    }
  }
  for (const c of s.caveats) lines.push(`- Caveat: ${c}`);
  lines.push(
    'How to answer: say you checked with Tag; state the period/scope; summarize the counts and any suspected issues as proposals; '
    + 'include the category-source caveat; offer "Want Tag to review these with you?" — never say anything was changed. '
    + 'Do not use tax-section totals to answer a categorization question.',
  );
  return lines.join('\n');
}

export interface SpecialistConsultationEvent {
  employee: 'tag';
  tool: 'tag_status';
  status: TagStatus['status'];
  scopeLabel: string;
  readOnly: true;
}

/**
 * Only ever built from a tag_status result that actually executed AND succeeded (L-D1: no success
 * indicator for a failed consultation).
 */
export function buildTagConsultationEvent(s: TagStatus): SpecialistConsultationEvent | null {
  if (!tagConsultationAnswered(s)) return null;
  return { employee: 'tag', tool: 'tag_status', status: s.status, scopeLabel: s.scope.label, readOnly: true };
}

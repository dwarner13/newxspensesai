/**
 * T-LIVE-01 — Tag's verified financial context.
 *
 * Tag is the categorization specialist. The only money figures Tag may state are SPENDING totals by
 * category and by merchant, calculated here on the server from the shared financial engine
 * (fetchTransactionsInRange → buildPeriodAggregate / classifyCashFlow, computeIntegritySignals).
 * There is no independent calculation: this module only selects the engine's `spending` purpose,
 * groups it by merchant with merchantGroupingKey (unchanged) and renders it with its scope.
 *
 * Owner rules (2026-11-24):
 *  - The server calculates; the model only explains. Every breakdown reconciles exactly (integer
 *    cents) or names the unlisted remainder.
 *  - Every figure states its period, accounts, currency and data completeness. A partial read is
 *    never presented as the complete picture.
 *  - Transfers, credit card / loan payments and savings are not spending (engine purposes), so card
 *    purchases are never double counted. Possible duplicate imports and possible refunds are
 *    disclosed, never silently removed (Prime HQ contract (f)).
 *  - Income, cash flow, net and financial-health assessments belong to Prime; Tag gets no income
 *    figure at all.
 *  - Categorization progress covers the full scope with exact counts. A protected "Other" (a verified
 *    customer choice, or protected (origin unverified)) is never counted as unfinished and never
 *    described as customer-approved unless verified.
 *
 * No merchant names, amounts or transaction data are logged here.
 */

import {
  fetchTransactionsInRange,
  TRANSACTION_SIGNAL_COLUMNS,
  type RangeFetchClient,
} from '../../../src/shared/transaction-range-fetch';
import { buildPeriodAggregate, toCompletenessOutput, type AggregateFetchCompleteness, type CompletenessOutput } from '../../../src/shared/period-aggregate';
import { classifyCashFlow } from '../../../src/shared/financial-taxonomy';
import { computeIntegritySignals, type FinancialIntegritySignals } from '../../../src/shared/financial-integrity-signals';
import { PROTECTED_SOURCES } from '../../../src/shared/tag-status';
import { merchantGroupingKey } from './merchantNormalize';
import { readAuthoritativeLedger } from './financial-ledger';
import { buildNeedsReview, type NeedsReviewSummary } from '../../../src/shared/needs-review-summary';

/**
 * LA-4 (Prime×Tag parity, owner acceptance 2026-11-26): the SERVED review figure — the same
 * buildNeedsReview over the same complete authoritative ledger read that financial-summary uses.
 * One statement (importId) or all imported transactions. An incomplete read ⇒ every figure null.
 */
export async function loadTagNeedsReview(sb: unknown, userId: string, importId?: string | null): Promise<NeedsReviewSummary> {
  try {
    const read = await readAuthoritativeLedger(sb, { userId, startDate: null, endDate: null, importIds: importId ? [importId] : null });
    return buildNeedsReview(read.rows, { complete: read.status === 'ok' });
  } catch {
    return buildNeedsReview([], { complete: false });
  }
}

const money = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;

/** The review line Tag may quote. Only server figures; never anything for the model to add up. */
export function formatNeedsReviewLine(review: NeedsReviewSummary | null | undefined, expectedCount: number): string {
  const never = 'NEVER add up transaction amounts yourself';
  if (!review || !review.complete || review.count === null || !review.inflow || !review.outflow || !review.unclassified) {
    return `  Amount needing review: not available right now. ${never}; if asked for that total, say you can't state it yet.`;
  }
  if (review.count !== expectedCount) {
    // Two server reads disagree: state no amount rather than a figure that may not match the count.
    return `  Amount needing review: not available right now (the counts are being refreshed). ${never}.`;
  }
  if (review.count === 0) return '  Amount needing review: none.';
  const parts = [
    `${review.outflow.count} going out, totalling ${money(review.outflow.cents)}`,
    `${review.inflow.count} coming in, totalling ${money(review.inflow.cents)}`,
  ];
  if (review.unclassified.count > 0) parts.push(`${review.unclassified.count} with no direction recorded (${money(review.unclassified.cents)}, counted in neither)`);
  return `  Amount needing review (server-calculated; quote exactly, keep money out and money in separate, ${never}): ${parts.join('; ')}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TagFinancialRow {
  id?: string | null;
  date?: string | null;
  amount?: unknown;
  type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  merchant_name?: string | null;
  description?: string | null;
  import_id?: string | null;
}

export interface TagSpendingScope {
  period: { start: string; end: string } | null;
  /** How the period was chosen. */
  periodSource: 'requested' | 'full_history' | 'statement';
  currency: string;
  /** Statement / account labels the rows came from. */
  accounts: string[];
  /** Rows with no `date` (a date range cannot select them): not in any total. */
  undatedRows: number | null;
}

export interface TagBreakdownLine { label: string; cents: number; count: number }

export interface TagSpendingSummary {
  status: 'ok' | 'no_data' | 'unavailable';
  scope: TagSpendingScope;
  completeness: CompletenessOutput | null;
  /** True only when the fetch was complete AND every breakdown reconciled. */
  authoritative: boolean;
  spending: { cents: number; count: number };
  categories: TagBreakdownLine[];
  categoriesRemainder: { groups: number; cents: number; count: number } | null;
  merchants: TagBreakdownLine[];
  merchantsRemainder: { groups: number; cents: number; count: number } | null;
  /** Merchant + category breakdowns each sum exactly to spending.cents. */
  reconciled: boolean;
  notSpending: { transferOutCents: number; debtPaymentCents: number; savingsInvestmentCents: number; classificationConflictCents: number };
  conflicts: CompletenessOutput['conflicts'] | null;
  integrity: FinancialIntegritySignals | null;
  /** Spending for merchant names containing `focusMerchant` (same row filter as the totals). */
  focusMerchant: { query: string; cents: number; count: number; names: number } | null;
}

export interface CategorizationProgress {
  available: boolean;
  scopeLabel: string;
  total: number;
  uncategorized: number;
  needsReview: number;
  /**
   * "Other" chosen automatically (not confirmed by the customer). Informational only: under the ONE
   * owner-approved review rule (src/shared/needs-category-rule.ts) it does NOT need review.
   */
  otherUnconfirmed: number;
  /** Protected Other (customer-set or origin unverified): never "unfinished". */
  otherKeptByCustomer: number;
  /** null when counts are unavailable: no completeness claim may be made. */
  allCategorized: boolean | null;
  unfinished: number;
}

const DEFAULT_TOP_CATEGORIES = 8;
const DEFAULT_TOP_MERCHANTS = 15;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ─────────────────────────────────────────────────────────────────────────────
// Pure summary (engine output → Tag's spending view)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Summarize SPENDING for Tag from already-fetched rows. The category totals come straight from
 * buildPeriodAggregate; the merchant grouping applies the SAME row filter (valid date, in period,
 * classifyCashFlow purpose 'spending', valid amount) so both breakdowns reconcile to the engine's
 * spending total. A mismatch is reported as reconciled:false — never papered over.
 */
export function summarizeTagSpending(
  rows: ReadonlyArray<TagFinancialRow>,
  opts: {
    fetch: AggregateFetchCompleteness;
    scope: TagSpendingScope;
    topCategories?: number;
    topMerchants?: number;
    focusMerchant?: string | null;
  },
): TagSpendingSummary {
  const focusQuery = (opts.focusMerchant || '').trim().toLowerCase();
  const focus = focusQuery ? { query: focusQuery, cents: 0, count: 0, names: new Set<string>() } : null;
  const period = opts.scope.period;
  const agg = buildPeriodAggregate(rows, { fetch: opts.fetch, period });
  const completeness = toCompletenessOutput(agg);

  // Categories: engine entries with purpose 'spending'.
  const spendCats = agg.categories.filter(c => c.purpose === 'spending');
  const topC = Math.max(1, opts.topCategories ?? DEFAULT_TOP_CATEGORIES);
  const categories = spendCats.slice(0, topC).map(c => ({ label: c.category, cents: c.totalCents, count: c.count }));
  const restC = spendCats.slice(topC);
  const categoriesRemainder = restC.length > 0
    ? { groups: restC.length, cents: restC.reduce((s, c) => s + c.totalCents, 0), count: restC.reduce((s, c) => s + c.count, 0) }
    : null;

  // Merchants: identical row filter to the aggregate, spending purpose only.
  const groups = new Map<string, { cents: number; count: number; names: Map<string, number> }>();
  const inScope: TagFinancialRow[] = [];
  for (const row of rows) {
    const date = typeof row.date === 'string' && ISO_DATE.test(row.date) ? row.date.slice(0, 10) : null;
    if (!date) continue;
    if (period && (date < period.start || date > period.end)) continue;
    inScope.push(row);
    const c = classifyCashFlow(row);
    if (c.purpose !== 'spending' || c.excluded !== null || c.amountCents === null) continue;
    const raw = String(row.merchant_name || row.description || '').trim();
    const key = merchantGroupingKey(raw) || '(no merchant name)';
    const g = groups.get(key) || { cents: 0, count: 0, names: new Map<string, number>() };
    g.cents += c.amountCents;
    g.count++;
    const display = raw || '(no merchant name)';
    g.names.set(display, (g.names.get(display) || 0) + 1);
    groups.set(key, g);
    if (focus && raw.toLowerCase().includes(focus.query)) {
      focus.cents += c.amountCents;
      focus.count++;
      focus.names.add(key);
    }
  }
  const merchantList = [...groups.entries()]
    .map(([key, g]) => {
      // Display the most frequent raw name in the group (ties: alphabetical) — deterministic.
      const label = [...g.names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      return { key, label, cents: g.cents, count: g.count };
    })
    .sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label));
  const topM = Math.max(1, opts.topMerchants ?? DEFAULT_TOP_MERCHANTS);
  const merchants = merchantList.slice(0, topM).map(({ label, cents, count }) => ({ label, cents, count }));
  const restM = merchantList.slice(topM);
  const merchantsRemainder = restM.length > 0
    ? { groups: restM.length, cents: restM.reduce((s, m) => s + m.cents, 0), count: restM.reduce((s, m) => s + m.count, 0) }
    : null;

  const spendingCents = agg.cents.spending;
  const catSum = categories.reduce((s, c) => s + c.cents, 0) + (categoriesRemainder?.cents ?? 0);
  const merSum = merchants.reduce((s, m) => s + m.cents, 0) + (merchantsRemainder?.cents ?? 0);
  const catCount = categories.reduce((s, c) => s + c.count, 0) + (categoriesRemainder?.count ?? 0);
  const merCount = merchants.reduce((s, m) => s + m.count, 0) + (merchantsRemainder?.count ?? 0);
  const reconciled = catSum === spendingCents && merSum === spendingCents
    && catCount === agg.counts.spending && merCount === agg.counts.spending;

  const integrity = computeIntegritySignals(inScope, { merchantKey: merchantGroupingKey });

  return {
    status: agg.counts.included === 0 && completeness.dataComplete ? 'no_data' : 'ok',
    scope: opts.scope,
    completeness,
    authoritative: completeness.authoritative && reconciled,
    spending: { cents: spendingCents, count: agg.counts.spending },
    categories,
    categoriesRemainder,
    merchants: reconciled ? merchants : [],
    merchantsRemainder: reconciled ? merchantsRemainder : null,
    reconciled,
    notSpending: {
      transferOutCents: agg.cents.transferOut,
      debtPaymentCents: agg.cents.debtPayments,
      savingsInvestmentCents: agg.cents.savingsInvestment,
      classificationConflictCents: agg.cents.classificationConflict,
    },
    conflicts: completeness.conflicts,
    integrity,
    focusMerchant: focus ? { query: focus.query, cents: focus.cents, count: focus.count, names: focus.names.size } : null,
  };
}

export function unavailableSpendingSummary(scope: TagSpendingScope): TagSpendingSummary {
  return {
    status: 'unavailable', scope, completeness: null, authoritative: false,
    spending: { cents: 0, count: 0 }, categories: [], categoriesRemainder: null, merchants: [], merchantsRemainder: null,
    reconciled: false,
    notSpending: { transferOutCents: 0, debtPaymentCents: 0, savingsInvestmentCents: 0, classificationConflictCents: 0 },
    conflicts: null, integrity: null, focusMerchant: null,
  };
}

/** One-line scope: period, accounts, currency, completeness. */
export function formatScopeLine(s: TagSpendingSummary): string {
  const sc = s.scope;
  const period = sc.period
    ? `${sc.period.start} to ${sc.period.end}${sc.periodSource === 'full_history' ? ' (all imported history)' : sc.periodSource === 'statement' ? ' (this statement)' : ''}`
    : 'no dated transactions';
  const shownAccounts = sc.accounts.slice(0, 6);
  const accounts = sc.accounts.length === 0
    ? 'none identified'
    : shownAccounts.join(', ') + (sc.accounts.length > shownAccounts.length ? ` (+${sc.accounts.length - shownAccounts.length} more)` : '');
  const c = s.completeness;
  const data = !c ? 'UNAVAILABLE'
    : s.authoritative ? `complete (${c.rowsFetched} transactions read)`
      : !c.dataComplete || c.truncated ? `PARTIAL — only ${c.rowsFetched} transactions could be read; figures are minimums`
        : 'PARTIAL — breakdowns did not reconcile';
  const undated = sc.undatedRows && sc.undatedRows > 0 ? `; ${plural(sc.undatedRows, 'transaction')} with no date not included` : '';
  return `Period ${period} · Accounts: ${accounts} · Currency: ${sc.currency} (account currency, assumed for every transaction; not converted) · Data: ${data}${undated}`;
}

/** Prompt block with Tag's ONLY money figures. */
export function formatSpendingBlock(s: TagSpendingSummary): string {
  if (s.status === 'unavailable' || !s.completeness) {
    return `VERIFIED SPENDING TOTALS: unavailable right now. Do not state any spending total, merchant total or category total; say you can't pull verified numbers at the moment.`;
  }
  const lines: string[] = [];
  lines.push(`VERIFIED SPENDING TOTALS (calculated by the server from the shared financial engine)`);
  lines.push(`SCOPE: ${formatScopeLine(s)}`);
  if (!s.authoritative) {
    lines.push(`WARNING: these figures are PARTIAL. If you quote any of them, say they cover only part of the data and are minimums. Never present them as the full picture.`);
  }
  if (s.status === 'no_data') {
    lines.push(`No spending transactions in this scope.`);
    return lines.join('\n');
  }
  lines.push(`Spending total: ${formatCents(s.spending.cents)} across ${plural(s.spending.count, 'transaction')}`);
  lines.push(`By category (top ${s.categories.length}):`);
  for (const c of s.categories) lines.push(`  ${c.label}: ${formatCents(c.cents)} (${plural(c.count, 'txn')})`);
  if (s.categoriesRemainder) {
    lines.push(`  All other categories (${s.categoriesRemainder.groups}): ${formatCents(s.categoriesRemainder.cents)} (${plural(s.categoriesRemainder.count, 'txn')})`);
  }
  if (s.reconciled) {
    lines.push(`By merchant (top ${s.merchants.length}):`);
    for (const m of s.merchants) lines.push(`  ${m.label}: ${formatCents(m.cents)} (${plural(m.count, 'txn')})`);
    if (s.merchantsRemainder) {
      lines.push(`  All other merchants (${s.merchantsRemainder.groups}): ${formatCents(s.merchantsRemainder.cents)} (${plural(s.merchantsRemainder.count, 'txn')})`);
    }
    lines.push(`(Category lines and merchant lines each add up exactly to the spending total.)`);
  } else {
    lines.push(`Merchant breakdown unavailable (it did not reconcile with the total). Do not give merchant totals.`);
  }
  const ns = s.notSpending;
  lines.push(`Not counted as spending (money moving between the customer's own accounts or paying down debt; counting it would double count purchases): transfers out ${formatCents(ns.transferOutCents)}, credit card / loan payments ${formatCents(ns.debtPaymentCents)}, savings / investments ${formatCents(ns.savingsInvestmentCents)}.`);
  if (ns.classificationConflictCents > 0) {
    lines.push(`Money out labelled with an income category (likely miscategorized, not in spending): ${formatCents(ns.classificationConflictCents)}.`);
  }
  if (s.focusMerchant) {
    const f = s.focusMerchant;
    lines.push(f.count > 0
      ? `Spending at merchants whose name contains "${f.query}": ${formatCents(f.cents)} across ${plural(f.count, 'transaction')} (${plural(f.names, 'merchant name')}), same scope.`
      : `No spending found at merchants whose name contains "${f.query}" in this scope.`);
  }
  const ig = s.integrity;
  if (ig) {
    if (ig.possibleDuplicates.count > 0) {
      lines.push(`Possible duplicate imports: ${plural(ig.possibleDuplicates.count, 'transaction')} (${formatCents(ig.possibleDuplicates.cents)}) look like the same statement imported more than once. They are still INCLUDED in the totals above; mention this if you quote a total.`);
    } else if (!ig.duplicateCheckAvailable) {
      lines.push(`Duplicate imports could not be checked for this scope.`);
    }
    if (ig.possibleRefunds.count > 0) {
      lines.push(`Money in labelled with a spending category (possible refunds): ${plural(ig.possibleRefunds.count, 'transaction')}, ${formatCents(ig.possibleRefunds.cents)}. Not subtracted from spending.`);
    }
  }
  return lines.join('\n');
}

/** Tag's financial rules, shared by tag-copilot and tag-chat so both Tag surfaces behave the same. */
export const TAG_FINANCIAL_RULES = `FINANCIAL FIGURES — HARD RULES
- Greetings and small talk get a natural, friendly reply: no numbers, no financial summary, no unsolicited assessment.
- The ONLY money totals you may state are the ones in VERIFIED SPENDING TOTALS or in a COMPLETE search result.
  Quote them exactly, together with their scope (period, accounts, currency, and "partial" when the data says partial).
- NEVER add, subtract, average, compare, re-total or estimate figures yourself, and never build your own breakdown.
  If you quote a breakdown, include its "all other" line so it adds up to the total.
- If a figure you need is not there, say you don't have a verified number.
- Income, cash flow, net, savings rate, affordability, budgets and whether the customer's finances are good or bad
  are Prime's job. Do not answer them; say something like "That's Prime's department — ask Prime in the main chat
  and they'll walk you through it." Never volunteer such assessments.
- Never say who a payer is (employer, salary, client, government benefit, etc.) or what kind of income a deposit is
  from its name. Describe deposits only by their recorded category.
- No tax advice: never say whether something is tax-deductible or how to treat it for tax. You can categorize it;
  tax questions go to the Tax Summary page or a tax professional.
- Only say everything is categorized when CATEGORIZATION PROGRESS says so. A protected "Other" is never unfinished
  work. Protected does NOT mean customer-approved: call it "protected (origin unverified)" unless the
  progress block says the customer confirmed it.`;

// ─────────────────────────────────────────────────────────────────────────────
// Categorization progress (exact counts, full scope)
// ─────────────────────────────────────────────────────────────────────────────

export function categorizationProgressFromCounts(
  counts: { total: number; uncategorized: number; needsReview: number; otherTotal: number; otherUnconfirmed: number } | null,
  scopeLabel: string,
): CategorizationProgress {
  if (!counts) {
    return { available: false, scopeLabel, total: 0, uncategorized: 0, needsReview: 0, otherUnconfirmed: 0, otherKeptByCustomer: 0, allCategorized: null, unfinished: 0 };
  }
  const otherUnconfirmed = Math.min(counts.otherUnconfirmed, counts.otherTotal);
  // LA-4 (Prime×Tag parity, owner rule 2026-11-25/26): "needs review" = no category, Uncategorized or
  // Needs Review — exactly needsCategory(); an "Other" is never counted, so Tag and Prime agree.
  const unfinished = counts.uncategorized + counts.needsReview;
  return {
    available: true,
    scopeLabel,
    total: counts.total,
    uncategorized: counts.uncategorized,
    needsReview: counts.needsReview,
    otherUnconfirmed,
    otherKeptByCustomer: counts.otherTotal - otherUnconfirmed,
    allCategorized: unfinished === 0,
    unfinished,
  };
}

export function formatProgressBlock(p: CategorizationProgress, review?: NeedsReviewSummary | null): string {
  if (!p.available) {
    return `CATEGORIZATION PROGRESS: unavailable right now. Do not say whether everything is categorized.`;
  }
  return [
    `CATEGORIZATION PROGRESS (exact counts across ${p.scopeLabel}: ${plural(p.total, 'transaction')})`,
    `  Uncategorized: ${p.uncategorized}`,
    `  Needs Review: ${p.needsReview}`,
    `  "Other" chosen automatically (not confirmed; does not need review — you may offer to check them): ${p.otherUnconfirmed}`,
    `  "Other" protected (set by the customer or origin unverified — never call it customer-approved): ${p.otherKeptByCustomer} (never count as unfinished and never propose changing)`,
    p.allCategorized
      ? `  Status: everything in this scope is categorized.`
      : `  Status: ${plural(p.unfinished, 'transaction')} still need a category. Do NOT say everything is categorized.`,
    // LA-4: only the served review figure (buildNeedsReview); the model never assembles one.
    formatNeedsReviewLine(review, p.unfinished),
  ].join('\n');
}

/** Minimal Supabase surface for the exact-count queries. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountClient = { from(table: string): any };

/** Protected category sources (PROTECTED_SOURCES: verified customer ∪ protected (origin unverified)). */
export const CUSTOMER_KEPT_SOURCES: ReadonlyArray<string> = [...PROTECTED_SOURCES];

export async function loadCategorizationProgress(
  sb: CountClient,
  userId: string,
  importId?: string | null,
): Promise<CategorizationProgress> {
  const scopeLabel = importId ? 'this statement' : 'all of the customer\'s transactions';
  const base = () => {
    let q = sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (importId) q = q.eq('import_id', importId);
    return q;
  };
  try {
    const kept = CUSTOMER_KEPT_SOURCES.join(',');
    const results = await Promise.all([
      base(),
      // The ONE review rule (needs-category-rule.ts): case-insensitive, as NEEDS_CATEGORY_OR_FILTER.
      base().or('category.is.null,category.eq.,category.ilike.uncategorized'),
      base().ilike('category', 'needs review'),
      base().eq('category', 'Other'),
      base().eq('category', 'Other').or(`category_source.is.null,category_source.not.in.(${kept})`),
    ]);
    if (results.some((r: { error?: unknown; count?: unknown }) => r?.error || typeof r?.count !== 'number')) {
      return categorizationProgressFromCounts(null, scopeLabel);
    }
    const [total, uncategorized, needsReview, otherTotal, otherUnconfirmed] = results.map((r: { count: number }) => r.count);
    return categorizationProgressFromCounts({ total, uncategorized, needsReview, otherTotal, otherUnconfirmed }, scopeLabel);
  } catch {
    return categorizationProgressFromCounts(null, scopeLabel);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader (I/O)
// ─────────────────────────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Load Tag's verified spending summary. Scope: the requested period, else the statement's own date
 * range (importId), else the customer's full dated history. Rows are fetched completely and paged
 * by the shared range fetch; the statement filter is applied after the fetch.
 */
export async function loadTagSpendingSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  userId: string,
  opts: { importId?: string | null; startDate?: string | null; endDate?: string | null; topCategories?: number; topMerchants?: number; focusMerchant?: string | null } = {},
): Promise<TagSpendingSummary> {
  const importId = opts.importId || null;
  let currency = 'CAD';
  const emptyScope: TagSpendingScope = { period: null, periodSource: importId ? 'statement' : 'full_history', currency, accounts: [], undatedRows: null };
  try {
    try {
      const { data: prof } = await sb.from('profiles').select('currency').eq('id', userId).maybeSingle();
      if (prof && typeof prof.currency === 'string' && /^[A-Z]{3}$/.test(prof.currency.trim())) currency = prof.currency.trim();
    } catch { /* default CAD, stated as an assumption */ }
    emptyScope.currency = currency;

    // Period.
    let start = opts.startDate && YMD.test(opts.startDate) ? opts.startDate : null;
    let end = opts.endDate && YMD.test(opts.endDate) ? opts.endDate : null;
    let periodSource: TagSpendingScope['periodSource'] = start && end ? 'requested' : importId ? 'statement' : 'full_history';
    if (!(start && end && start <= end)) {
      const bound = async (ascending: boolean) => {
        let q = sb.from('transactions').select('date').eq('user_id', userId).not('date', 'is', null);
        if (importId) q = q.eq('import_id', importId);
        const { data, error } = await q.order('date', { ascending }).limit(1);
        if (error) throw new Error('bound');
        const d = Array.isArray(data) && data[0] ? String(data[0].date || '').slice(0, 10) : null;
        return d && YMD.test(d) ? d : null;
      };
      start = await bound(true);
      end = await bound(false);
      periodSource = importId ? 'statement' : 'full_history';
    }

    // Undated rows (cannot be selected by a date range; disclosed, never silently dropped).
    let undatedRows: number | null = null;
    try {
      let q = sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('date', null);
      if (importId) q = q.eq('import_id', importId);
      const { count, error } = await q;
      undatedRows = error || typeof count !== 'number' ? null : count;
    } catch { undatedRows = null; }

    if (!start || !end) {
      const scope: TagSpendingScope = { ...emptyScope, periodSource, undatedRows };
      return summarizeTagSpending([], { fetch: { complete: true, truncated: false, rowsFetched: 0 }, scope });
    }

    const fetched = await fetchTransactionsInRange(sb as RangeFetchClient, { userId, startDate: start, endDate: end }, {
      columns: [...TRANSACTION_SIGNAL_COLUMNS],
    });
    if (fetched.error) {
      return unavailableSpendingSummary({ ...emptyScope, period: { start, end }, periodSource, undatedRows });
    }
    const rows = (fetched.rows as unknown as TagFinancialRow[]).filter(r => !importId || r.import_id === importId);

    // Accounts: statement labels for the rows actually in scope.
    const importIds = Array.from(new Set(rows.map(r => r.import_id).filter(Boolean))) as string[];
    const accounts: string[] = [];
    if (importIds.length > 0) {
      try {
        const { data: imps } = await sb.from('imports').select('id, filename, issuer').in('id', importIds.slice(0, 200));
        for (const imp of imps || []) {
          const name = String(imp.filename || '').replace(/\.(pdf|csv|xlsx?|txt)$/i, '').trim();
          const issuer = imp.issuer ? String(imp.issuer).trim() : '';
          accounts.push(issuer && name ? `${issuer} · ${name}` : issuer || name || 'unnamed statement');
        }
      } catch { /* labels optional */ }
      if (accounts.length < importIds.length) accounts.push(`${importIds.length - accounts.length} other statement(s)`);
    }
    if (rows.some(r => !r.import_id)) accounts.push('transactions not linked to a statement');
    accounts.sort();

    const scope: TagSpendingScope = { period: { start, end }, periodSource, currency, accounts, undatedRows };
    return summarizeTagSpending(rows, {
      fetch: { complete: fetched.complete, truncated: fetched.truncated, rowsFetched: fetched.rowsFetched },
      scope,
      topCategories: opts.topCategories,
      topMerchants: opts.topMerchants,
      focusMerchant: opts.focusMerchant,
    });
  } catch {
    return unavailableSpendingSummary(emptyScope);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// search_transactions totals (F-6)
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchRowForTotals { id: string; amount: number; merchant_name: string | null; date?: string | null; posted_at?: string | null }

/**
 * Deterministic totals for a search result. Only when EVERY match was returned are totals given,
 * split by the engine's direction/purpose (from each row's stored type). A partial result gets no
 * dollar total at all — it is labelled as a sample.
 */
export function summarizeSearchTotals(input: {
  rows: ReadonlyArray<SearchRowForTotals>;
  totalMatches: number;
  /** id → stored type/category/subcategory, read server-side for the returned ids. */
  classification: ReadonlyMap<string, { type: string | null; category: string | null; subcategory: string | null }>;
  currency: string;
  filtersLabel: string;
}): { complete: boolean; text: string } {
  const { rows, totalMatches } = input;
  if (rows.length === 0) return { complete: true, text: 'No transactions found matching the search.' };
  if (rows.length < totalMatches) {
    return {
      complete: false,
      text: `SAMPLE ONLY: showing the ${rows.length} newest of ${totalMatches} matching transactions (${input.filtersLabel}). `
        + `No total for all ${totalMatches} is available — do not state, estimate or add up a total from these rows. `
        + `Offer to narrow by date, merchant or amount.`,
    };
  }
  let spend = 0; let spendN = 0;
  let moneyIn = 0; let inN = 0;
  let moved = 0; let movedN = 0;
  let unclassified = 0;
  const byMerchant = new Map<string, { label: string; cents: number; count: number }>();
  const dates: string[] = [];
  for (const r of rows) {
    const cl = input.classification.get(r.id);
    const d = String(r.date || r.posted_at || '').slice(0, 10);
    if (ISO_DATE.test(d)) dates.push(d);
    const c = classifyCashFlow({ type: cl?.type ?? null, category: cl?.category ?? null, subcategory: cl?.subcategory ?? null, amount: r.amount });
    if (!cl || c.amountCents === null || c.direction === 'unclassified') { unclassified++; continue; }
    // Inflows: only the engine's 'income' purpose is money in. Transfers in (and, once D-1 lands in the
    // engine, payments received on the customer's own card) are internal movements, never income.
    if (c.direction === 'inflow') {
      if (c.purpose === 'income') { moneyIn += c.amountCents; inN++; } else { moved += c.amountCents; movedN++; }
      continue;
    }
    if (c.purpose === 'spending') {
      spend += c.amountCents; spendN++;
      const label = String(r.merchant_name || '(no merchant name)').trim();
      const key = merchantGroupingKey(label) || label;
      const g = byMerchant.get(key) || { label, cents: 0, count: 0 };
      g.cents += c.amountCents; g.count++;
      byMerchant.set(key, g);
    } else { moved += c.amountCents; movedN++; }
  }
  dates.sort();
  const range = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'dates unknown';
  const merchants = [...byMerchant.values()].sort((a, b) => b.cents - a.cents || a.label.localeCompare(b.label));
  const top = merchants.slice(0, 5);
  const rest = merchants.slice(5);
  const lines = [
    `COMPLETE: all ${totalMatches} matching transactions are included (${input.filtersLabel}; ${range}; currency ${input.currency}, assumed).`,
    `Spending: ${formatCents(spend)} across ${plural(spendN, 'transaction')}.`,
  ];
  if (top.length > 0) {
    lines.push(`Spending by merchant: ${top.map(m => `${m.label} ${formatCents(m.cents)} (${m.count})`).join('; ')}`
      + (rest.length ? `; all other merchants (${rest.length}) ${formatCents(rest.reduce((s, m) => s + m.cents, 0))} (${rest.reduce((s, m) => s + m.count, 0)})` : '')
      + ` — these add up exactly to the spending figure.`);
  }
  if (movedN > 0) lines.push(`Transfers / debt payments / savings, in or out (not spending, not income): ${formatCents(moved)} across ${plural(movedN, 'transaction')}.`);
  if (inN > 0) lines.push(`Money in: ${formatCents(moneyIn)} across ${plural(inN, 'transaction')} (not analysed by Tag; income questions go to Prime).`);
  if (unclassified > 0) lines.push(`${plural(unclassified, 'transaction')} could not be classified and are in no figure above.`);
  return { complete: true, text: lines.join('\n') };
}

// ─────────────────────────────────────────────────────────────────────────────
// Small talk (greetings never trigger financial context)
// ─────────────────────────────────────────────────────────────────────────────

const SMALL_TALK_WORDS = new Set([
  'hi', 'hey', 'hello', 'hiya', 'howdy', 'yo', 'sup', 'heya', 'hola', 'greetings',
  'good', 'morning', 'afternoon', 'evening', 'day',
  'tag', 'there', 'buddy', 'friend', 'mate', 'again',
  'how', 'are', 'you', 'u', 'r', 'doing', 'is', 'it', 'going', 'whats', "what's", 'what', 'up', 'hows', "how's", 'today', 'everything', 'things', 'ya',
  // Deliberately excludes ok / okay / sure / yes / great: those can confirm a pending proposal.
  'thanks', 'thank', 'thx', 'ty', 'cheers', 'bye', 'goodbye', 'later', 'see',
  'and', 'so', 'well', 'oh', 'ah', 'lol', 'haha', 'pretty',
]);

/** True for a message that is only a greeting / pleasantry (no request). Deterministic. */
export function isSmallTalk(message: unknown): boolean {
  if (typeof message !== 'string') return false;
  const words = message.toLowerCase().replace(/[^a-z' ]+/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 10) return false;
  return words.every(w => SMALL_TALK_WORDS.has(w));
}

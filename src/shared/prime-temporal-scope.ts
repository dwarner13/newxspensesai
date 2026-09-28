/**
 * P3.1A.1 — CANONICAL TEMPORAL SCOPE
 *
 * Deterministic temporal scope extraction for the Prime evidence architecture.
 * Reuses existing temporal infrastructure:
 *   - financial-dates.ts: DateRange, buildMonthRange, getYearRange, getLocalDateParts
 *   - financial-query-classifier.ts: MONTH_MAP (exported, shared single source)
 *   - temporalContext.ts: detectRelativePeriods, resolveRelativeDateRange
 *
 * Architecture position:
 *   P3.0A (intent) → TEMPORAL SCOPE (this module) → P3.1A (evidence) → P3.1B (plan)
 *
 * BOUNDARY CONTRACT:
 * - Canonical periods use financial-dates.ts convention: from INCLUSIVE, to EXCLUSIVE.
 * - Tools that expect inclusive end dates (e.g., transaction_category_totals uses .lte)
 *   must convert via toInclusiveEndDate() at the tool-parameter boundary.
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import { type DateRange, buildMonthRange, getYearRange, getLocalDateParts } from './financial-dates';
import { MONTH_MAP } from './financial-query-classifier';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type TemporalPeriodSource =
  | 'explicit_date'
  | 'relative_period'
  | 'month_name'
  | 'year'
  | 'inferred_previous';

export type TemporalConfidence = 'deterministic' | 'ambiguous';

export type TemporalGranularity = 'day' | 'month' | 'year' | 'range';

export interface PrimeTemporalPeriod {
  /** Inclusive start date YYYY-MM-DD */
  from: string;
  /** Exclusive end date YYYY-MM-DD (financial-dates.ts convention) */
  to: string;
  /** Human-readable label for telemetry */
  label: string;
  /** How the period was determined */
  source: TemporalPeriodSource;
  /** Whether the period boundaries are deterministic or ambiguous */
  confidence: TemporalConfidence;
}

export interface PrimeTemporalScope {
  primary?: PrimeTemporalPeriod;
  comparison?: PrimeTemporalPeriod;
  granularity: TemporalGranularity;
  confidence: TemporalConfidence;
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTH REFERENCE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthReference {
  month: number;  // 1-indexed
  year?: number;
}

/**
 * Extract a month reference from a user message.
 * Supports: "May", "in May", "during May", "May 2026", "in May 2026", etc.
 * Returns null if no month reference found.
 */
export function extractMonthReference(message: string): MonthReference | null {
  const lower = message.toLowerCase().trim();

  // Pattern: optional preposition + month name + optional year
  // Captures: [month_name] [year?]
  const match = lower.match(
    /\b(?:in|during|for|of)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{4})\b/
  );
  if (match) {
    const month = MONTH_MAP[match[1]];
    const year = parseInt(match[2], 10);
    if (month && year >= 2020 && year <= 2039) {
      return { month, year };
    }
  }

  // Pattern: month name without year (bare "May", "in May", "during May")
  const bareMatch = lower.match(
    /\b(?:in|during|for|of)?\s*(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/
  );
  if (bareMatch) {
    const month = MONTH_MAP[bareMatch[1]];
    if (month) {
      return { month };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RELATIVE PERIOD DETECTION (reuses existing infrastructure)
// ─────────────────────────────────────────────────────────────────────────────

/** Relative period expressions we recognize, including safe synonyms. */
const RELATIVE_PERIOD_PATTERNS: Array<{ regex: RegExp; canonical: string }> = [
  { regex: /\blast\s+30\s+days?\b/, canonical: 'last 30 days' },
  { regex: /\bpast\s+30\s+days?\b/, canonical: 'last 30 days' },
  { regex: /\blast\s+7\s+days?\b/, canonical: 'last 7 days' },
  { regex: /\bprevious\s+month\b/, canonical: 'last month' },
  { regex: /\blast\s+month\b/, canonical: 'last month' },
  { regex: /\blast\s+week\b/, canonical: 'last week' },
  { regex: /\blast\s+year\b/, canonical: 'last year' },
  { regex: /\bthis\s+month\b/, canonical: 'this month' },
  { regex: /\bthis\s+week\b/, canonical: 'this week' },
  { regex: /\bthis\s+year\b/, canonical: 'this year' },
  { regex: /\byesterday\b/, canonical: 'yesterday' },
  { regex: /\btoday\b/, canonical: 'today' },
];

/**
 * Detect relative period expressions in a message.
 * Returns canonical labels that resolveRelativeDateRange() accepts.
 * Includes safe synonyms: "previous month" → "last month", "past 30 days" → "last 30 days".
 */
function detectRelativePeriodsExtended(message: string): string[] {
  const lower = message.toLowerCase();
  const periods: string[] = [];
  for (const { regex, canonical } of RELATIVE_PERIOD_PATTERNS) {
    if (regex.test(lower)) {
      if (!periods.includes(canonical)) {
        periods.push(canonical);
      }
    }
  }
  return periods;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Comparison signal patterns (reuses COMPARISON_RE semantics from tool-gate). */
const COMPARISON_SIGNAL_RE = /\b(compare|comparing|comparison|compared (?:to|with)|vs\.?\b|versus|difference between|change from|year over year|month over month|more than last|less than last|increased|decreased|worse|better)\b/i;

/** Implicit comparison signal — questions about expense magnitude that imply comparison. */
const IMPLICIT_COMPARISON_RE = /\bwhy (?:were|are|was|is) .*(?:so )?(?:high|expensive|much|more|low|cheap|less)\b/i;

interface ComparisonExtraction {
  isComparison: boolean;
  isImplicit: boolean;
}

function detectComparisonSignal(message: string): ComparisonExtraction {
  const lower = message.toLowerCase();
  if (COMPARISON_SIGNAL_RE.test(lower)) {
    return { isComparison: true, isImplicit: false };
  }
  if (IMPLICIT_COMPARISON_RE.test(lower)) {
    return { isComparison: true, isImplicit: true };
  }
  return { isComparison: false, isImplicit: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// TWO-PERIOD EXTRACTION (for "April 2026 vs May 2026")
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES_PATTERN = 'january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';

interface TwoPeriodExtraction {
  periodA: MonthReference | { year: number };
  periodB: MonthReference | { year: number };
}

function isMonthRef(p: MonthReference | { year: number }): p is MonthReference {
  return 'month' in p;
}

/**
 * Extract two explicit periods from a comparison expression.
 * Supports: "May 2026 vs April 2026", "2025 vs 2026", "April 2026 compared with May 2026"
 */
function extractTwoPeriods(message: string): TwoPeriodExtraction | null {
  const lower = message.toLowerCase();

  // Pattern: month+year vs/compared month+year
  const monthVsMonth = new RegExp(
    `\\b(${MONTH_NAMES_PATTERN})\\s+(\\d{4})\\s+(?:vs\\.?|versus|compared (?:to|with))\\s+(${MONTH_NAMES_PATTERN})\\s+(\\d{4})\\b`
  );
  const mvm = lower.match(monthVsMonth);
  if (mvm) {
    const m1 = MONTH_MAP[mvm[1]], y1 = parseInt(mvm[2], 10);
    const m2 = MONTH_MAP[mvm[3]], y2 = parseInt(mvm[4], 10);
    if (m1 && m2 && y1 >= 2020 && y1 <= 2039 && y2 >= 2020 && y2 <= 2039) {
      return {
        periodA: { month: m1, year: y1 },
        periodB: { month: m2, year: y2 },
      };
    }
  }

  // Pattern: year vs year
  const yearVsYear = lower.match(
    /\b(\d{4})\s+(?:vs\.?|versus|compared (?:to|with))\s+(\d{4})\b/
  );
  if (yearVsYear) {
    const y1 = parseInt(yearVsYear[1], 10);
    const y2 = parseInt(yearVsYear[2], 10);
    if (y1 >= 2020 && y1 <= 2039 && y2 >= 2020 && y2 <= 2039 && y1 !== y2) {
      return {
        periodA: { year: y1 },
        periodB: { year: y2 },
      };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INCLUSIVE END DATE BOUNDARY CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert an exclusive end date (canonical) to an inclusive end date (tool boundary).
 *
 * Canonical: from=2026-05-01, to=2026-06-01 (exclusive)
 * Tool args: startDate=2026-05-01, endDate=2026-05-31 (inclusive, for .lte queries)
 *
 * This is the SINGLE place where this conversion happens.
 */
export function toInclusiveEndDate(exclusiveEnd: string): string {
  const [yearStr, monthStr, dayStr] = exclusiveEnd.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Subtract one day
  const d = new Date(year, month - 1, day - 1);
  const ry = d.getFullYear();
  const rm = d.getMonth() + 1;
  const rd = d.getDate();
  return `${ry}-${rm < 10 ? '0' : ''}${rm}-${rd < 10 ? '0' : ''}${rd}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD TEMPORAL SCOPE
// ─────────────────────────────────────────────────────────────────────────────

export interface TemporalScopeContext {
  /** User's IANA timezone (e.g., "America/Edmonton") */
  timezone: string | null;
  /** Reference time for "now" (defaults to new Date()) */
  referenceDate?: Date;
}

/**
 * Build a canonical temporal scope from a user message.
 *
 * Extraction priority:
 * 1. Two explicit periods (comparison) → primary + comparison
 * 2. Relative period ("last month", "this year") → primary
 * 3. Month+year ("May 2026") → primary, deterministic
 * 4. Bare month ("May") → primary, AMBIGUOUS
 * 5. Explicit year only (from financialClassification) → primary, deterministic
 *
 * Does NOT execute tools, query databases, or call models.
 */
export function buildTemporalScope(
  message: string,
  ctx: TemporalScopeContext,
  mentionedYears?: number[],
): PrimeTemporalScope | null {
  const compSignal = detectComparisonSignal(message);

  // ── 1. Two explicit periods ──
  const twoPeriods = extractTwoPeriods(message);
  if (twoPeriods) {
    const periodA = resolvePeriodRef(twoPeriods.periodA);
    const periodB = resolvePeriodRef(twoPeriods.periodB);
    if (periodA && periodB) {
      return {
        primary: periodA,
        comparison: periodB,
        granularity: isMonthRef(twoPeriods.periodA) ? 'month' : 'year',
        confidence: 'deterministic',
      };
    }
  }

  // ── 2. Relative periods ──
  const relativePeriods = detectRelativePeriodsExtended(message);
  if (relativePeriods.length > 0) {
    const primary = resolveRelativePeriod(relativePeriods[0], ctx);
    if (primary) {
      const scope: PrimeTemporalScope = {
        primary,
        granularity: inferGranularity(relativePeriods[0]),
        confidence: 'deterministic',
      };

      // If comparison signal present but no second period → ambiguous comparison
      if (compSignal.isComparison && relativePeriods.length < 2) {
        // Do NOT invent comparison period
      } else if (relativePeriods.length >= 2) {
        const comp = resolveRelativePeriod(relativePeriods[1], ctx);
        if (comp) scope.comparison = comp;
      }

      return scope;
    }
  }

  // ── 3. Month reference ──
  const monthRef = extractMonthReference(message);
  if (monthRef) {
    if (monthRef.year) {
      // Month+year → deterministic
      const range = buildMonthRange(monthRef.year, monthRef.month);
      const primary: PrimeTemporalPeriod = {
        from: range.start,
        to: range.end,
        label: `${monthName(monthRef.month)} ${monthRef.year}`,
        source: 'month_name',
        confidence: 'deterministic',
      };
      const scope: PrimeTemporalScope = {
        primary,
        granularity: 'month',
        confidence: 'deterministic',
      };

      // Implicit comparison — require it but mark ambiguous since no explicit comparison period
      if (compSignal.isComparison && compSignal.isImplicit) {
        // Do NOT invent comparison period — P3.1A will require period_comparison
        // evidence but P3.1B will mark it unresolved/ambiguous
      }

      return scope;
    } else {
      // Bare month without year → AMBIGUOUS
      // Use context year as candidate but mark ambiguous
      const parts = getLocalDateParts(ctx.timezone, ctx.referenceDate);
      const candidateYear = parts.year;
      const range = buildMonthRange(candidateYear, monthRef.month);
      const primary: PrimeTemporalPeriod = {
        from: range.start,
        to: range.end,
        label: `${monthName(monthRef.month)} ${candidateYear}`,
        source: 'month_name',
        confidence: 'ambiguous',
      };
      return {
        primary,
        granularity: 'month',
        confidence: 'ambiguous',
      };
    }
  }

  // ── 4. Explicit year(s) from financial classification ──
  const years = mentionedYears ?? [];
  if (years.length >= 2 && compSignal.isComparison) {
    // Two years + comparison signal → deterministic comparison
    const rangeA = getYearRange(years[0]);
    const rangeB = getYearRange(years[1]);
    return {
      primary: {
        from: rangeA.start, to: rangeA.end,
        label: `${years[0]}`, source: 'year', confidence: 'deterministic',
      },
      comparison: {
        from: rangeB.start, to: rangeB.end,
        label: `${years[1]}`, source: 'year', confidence: 'deterministic',
      },
      granularity: 'year',
      confidence: 'deterministic',
    };
  }
  if (years.length === 1) {
    const range = getYearRange(years[0]);
    return {
      primary: {
        from: range.start, to: range.end,
        label: `${years[0]}`, source: 'year', confidence: 'deterministic',
      },
      granularity: 'year',
      confidence: 'deterministic',
    };
  }

  // No temporal signal found
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function resolvePeriodRef(
  ref: MonthReference | { year: number },
): PrimeTemporalPeriod | null {
  if (isMonthRef(ref)) {
    if (!ref.year) return null;
    const range = buildMonthRange(ref.year, ref.month);
    return {
      from: range.start,
      to: range.end,
      label: `${monthName(ref.month)} ${ref.year}`,
      source: 'month_name',
      confidence: 'deterministic',
    };
  }
  const range = getYearRange(ref.year);
  return {
    from: range.start,
    to: range.end,
    label: `${ref.year}`,
    source: 'year',
    confidence: 'deterministic',
  };
}

function resolveRelativePeriod(
  expression: string,
  ctx: TemporalScopeContext,
): PrimeTemporalPeriod | null {
  // Use financial-dates getLocalDateParts for timezone-aware date calculation
  const parts = getLocalDateParts(ctx.timezone, ctx.referenceDate);
  const pad2 = (n: number) => n < 10 ? `0${n}` : `${n}`;
  const fmtYMD = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;

  switch (expression) {
    case 'today': {
      const from = fmtYMD(parts.year, parts.month, parts.day);
      // Exclusive end = next day
      const nd = new Date(parts.year, parts.month - 1, parts.day + 1);
      const to = fmtYMD(nd.getFullYear(), nd.getMonth() + 1, nd.getDate());
      return { from, to, label: 'today', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'yesterday': {
      const yd = new Date(parts.year, parts.month - 1, parts.day - 1);
      const from = fmtYMD(yd.getFullYear(), yd.getMonth() + 1, yd.getDate());
      const to = fmtYMD(parts.year, parts.month, parts.day);
      return { from, to, label: 'yesterday', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'this week': {
      const dayOfWeek = (ctx.referenceDate ?? new Date()).getDay();
      // Compute user-local day of week
      const localDow = new Date(parts.year, parts.month - 1, parts.day).getDay();
      const daysFromMonday = localDow === 0 ? 6 : localDow - 1;
      const ws = new Date(parts.year, parts.month - 1, parts.day - daysFromMonday);
      const we = new Date(ws.getTime() + 7 * 86400000);
      const from = fmtYMD(ws.getFullYear(), ws.getMonth() + 1, ws.getDate());
      const to = fmtYMD(we.getFullYear(), we.getMonth() + 1, we.getDate());
      return { from, to, label: 'this week', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'last week': {
      const localDow = new Date(parts.year, parts.month - 1, parts.day).getDay();
      const daysFromMonday = localDow === 0 ? 6 : localDow - 1;
      const thisWeekStart = new Date(parts.year, parts.month - 1, parts.day - daysFromMonday);
      const lwStart = new Date(thisWeekStart.getTime() - 7 * 86400000);
      const lwEnd = thisWeekStart; // exclusive
      const from = fmtYMD(lwStart.getFullYear(), lwStart.getMonth() + 1, lwStart.getDate());
      const to = fmtYMD(lwEnd.getFullYear(), lwEnd.getMonth() + 1, lwEnd.getDate());
      return { from, to, label: 'last week', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'this month': {
      const range = buildMonthRange(parts.year, parts.month);
      return { from: range.start, to: range.end, label: 'this month', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'last month': {
      const pm = parts.month === 1 ? 12 : parts.month - 1;
      const py = parts.month === 1 ? parts.year - 1 : parts.year;
      const range = buildMonthRange(py, pm);
      return { from: range.start, to: range.end, label: 'last month', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'this year': {
      const range = getYearRange(parts.year);
      return { from: range.start, to: range.end, label: 'this year', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'last year': {
      const range = getYearRange(parts.year - 1);
      return { from: range.start, to: range.end, label: 'last year', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'last 7 days': {
      const from_d = new Date(parts.year, parts.month - 1, parts.day - 6);
      // Exclusive end = tomorrow
      const to_d = new Date(parts.year, parts.month - 1, parts.day + 1);
      const from = fmtYMD(from_d.getFullYear(), from_d.getMonth() + 1, from_d.getDate());
      const to = fmtYMD(to_d.getFullYear(), to_d.getMonth() + 1, to_d.getDate());
      return { from, to, label: 'last 7 days', source: 'relative_period', confidence: 'deterministic' };
    }
    case 'last 30 days': {
      const from_d = new Date(parts.year, parts.month - 1, parts.day - 29);
      const to_d = new Date(parts.year, parts.month - 1, parts.day + 1);
      const from = fmtYMD(from_d.getFullYear(), from_d.getMonth() + 1, from_d.getDate());
      const to = fmtYMD(to_d.getFullYear(), to_d.getMonth() + 1, to_d.getDate());
      return { from, to, label: 'last 30 days', source: 'relative_period', confidence: 'deterministic' };
    }
  }
  return null;
}

function inferGranularity(expression: string): TemporalGranularity {
  if (expression === 'today' || expression === 'yesterday') return 'day';
  if (expression.includes('month')) return 'month';
  if (expression.includes('year')) return 'year';
  return 'range';
}

const MONTH_DISPLAY: Record<number, string> = {
  1: 'January', 2: 'February', 3: 'March', 4: 'April',
  5: 'May', 6: 'June', 7: 'July', 8: 'August',
  9: 'September', 10: 'October', 11: 'November', 12: 'December',
};

function monthName(m: number): string {
  return MONTH_DISPLAY[m] ?? `Month ${m}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY — safe log payload (no PII, no financial values)
// ─────────────────────────────────────────────────────────────────────────────

export interface TemporalScopeTelemetry {
  hasPrimary: boolean;
  hasComparison: boolean;
  granularity: string;
  confidence: string;
  primarySource?: string;
  primaryConfidence?: string;
  comparisonSource?: string;
  comparisonConfidence?: string;
}

export function buildTemporalScopeTelemetry(
  scope: PrimeTemporalScope | null,
): TemporalScopeTelemetry {
  if (!scope) {
    return { hasPrimary: false, hasComparison: false, granularity: 'none', confidence: 'none' };
  }
  return {
    hasPrimary: !!scope.primary,
    hasComparison: !!scope.comparison,
    granularity: scope.granularity,
    confidence: scope.confidence,
    primarySource: scope.primary?.source,
    primaryConfidence: scope.primary?.confidence,
    comparisonSource: scope.comparison?.source,
    comparisonConfidence: scope.comparison?.confidence,
  };
}

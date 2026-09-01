/**
 * CANONICAL TIMEZONE-AWARE DATE UTILITIES
 *
 * Single source of truth for financial date range calculations.
 *
 * RULES:
 * - Pure TypeScript only. No React, no Supabase, no Node-only APIs.
 * - Uses Intl.DateTimeFormat for timezone awareness (works in both
 *   browser and Node.js environments).
 * - All authoritative financial queries MUST use these utilities
 *   rather than relying on browser-local Date calculations.
 *
 * TIMEZONE CONTRACT:
 * ──────────────────
 * 1. Financial date ranges are computed in the user's IANA timezone
 *    (e.g., "America/Edmonton"), NOT UTC and NOT browser-local time.
 * 2. User timezone is stored in profiles.time_zone or profiles.metadata.timezone.
 * 3. When timezone is unavailable, UTC is used as the conservative fallback.
 * 4. Month/year boundaries respect local midnight in the user's timezone.
 *
 * BOUNDARY BEHAVIOR:
 * ──────────────────
 * - getMonthRange("America/Edmonton", referenceDate):
 *   At 11 PM Edmonton time (5 AM UTC next day), the month is still the
 *   Edmonton month, not the UTC month. This prevents the "Edmonton 11 PM
 *   problem" where UTC would report the next month.
 *
 * - getYearRange(2025, "America/Edmonton"):
 *   Returns { start: "2025-01-01", end: "2026-01-01" } as ISO date strings.
 *   These are DATE strings (no time component) suitable for Supabase
 *   .gte("date", start) and .lt("date", end) queries.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRange {
  /** Inclusive start date as ISO date string (YYYY-MM-DD) */
  start: string;
  /** Exclusive end date as ISO date string (YYYY-MM-DD) */
  end: string;
}

export interface LocalDateParts {
  year: number;
  /** 1-indexed month (1=January, 12=December) */
  month: number;
  day: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current date parts in a specific timezone.
 *
 * Uses Intl.DateTimeFormat to correctly resolve the local date regardless
 * of the runtime environment's timezone setting.
 *
 * @param timezone - IANA timezone string (e.g., "America/Edmonton", "America/Denver")
 * @param referenceDate - Date to resolve (defaults to now)
 * @returns LocalDateParts with year, month (1-indexed), day
 */
export function getLocalDateParts(
  timezone: string | null | undefined,
  referenceDate?: Date,
): LocalDateParts {
  const date = referenceDate ?? new Date();
  const tz = timezone || 'UTC';

  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(date);

    const year = parseInt(parts.find((p) => p.type === 'year')?.value || '', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value || '', 10);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value || '', 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      throw new Error('Failed to parse date parts');
    }

    return { year, month, day };
  } catch {
    // Fallback to UTC if timezone is invalid
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }
}

/**
 * Get the current month's date range in the user's timezone.
 *
 * Returns { start, end } where start is the first day of the month
 * and end is the first day of the NEXT month (exclusive upper bound).
 *
 * Example for August 2026 in America/Edmonton:
 *   { start: "2026-08-01", end: "2026-09-01" }
 *
 * @param timezone - IANA timezone string
 * @param referenceDate - Date to determine "current month" (defaults to now)
 */
export function getMonthRange(
  timezone: string | null | undefined,
  referenceDate?: Date,
): DateRange {
  const { year, month } = getLocalDateParts(timezone, referenceDate);
  return buildMonthRange(year, month);
}

/**
 * Get the previous month's date range in the user's timezone.
 *
 * @param timezone - IANA timezone string
 * @param referenceDate - Date to determine "current month" (defaults to now)
 */
export function getPreviousMonthRange(
  timezone: string | null | undefined,
  referenceDate?: Date,
): DateRange {
  const { year, month } = getLocalDateParts(timezone, referenceDate);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return buildMonthRange(prevYear, prevMonth);
}

/**
 * Get a full year's date range.
 *
 * Returns { start: "YYYY-01-01", end: "(YYYY+1)-01-01" }
 * Suitable for .gte("date", start) and .lt("date", end) queries.
 *
 * @param year - Calendar year (e.g., 2025)
 */
export function getYearRange(year: number): DateRange {
  return {
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

/**
 * Format a YYYY-MM-DD date string for a given year and month.
 */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function buildMonthRange(year: number, month: number): DateRange {
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return {
    start: `${year}-${pad2(month)}-01`,
    end: `${nextYear}-${pad2(nextMonth)}-01`,
  };
}

/**
 * Get the YYYY-MM bucket key for a transaction date in the user's timezone.
 *
 * @param dateStr - ISO date string from transaction (e.g., "2025-06-15")
 * @param timezone - IANA timezone (optional, defaults to UTC)
 */
export function getMonthBucketKey(
  dateStr: string,
  timezone?: string | null,
): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

  const { year, month } = getLocalDateParts(timezone, d);
  return `${year}-${pad2(month)}`;
}

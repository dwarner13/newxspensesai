/**
 * Categories year / month filtering, shared by the page (useCategoriesData) and the
 * category detail drawer, so both show exactly the same transactions for a period.
 *
 * K-c (owner GO): grouping uses the transaction's CALENDAR DAY, i.e. `date`
 * ("2025-06-01") or else the YYYY-MM-DD part of `posted_at`. posted_at is stored as UTC
 * midnight, so reading it as an instant (new Date(...)) put the 1st of a month into the
 * previous month (and Jan 1 into the previous year) in negative-offset timezones such as
 * Mountain time. This matches the Transactions list, the transaction drawer and Tag's
 * context card. Display / grouping only: stored dates are never changed.
 */
import { toCalendarDay } from '@/lib/calendarDate';

export interface DatedTx {
  date?: string | null;
  posted_at?: string | null;
}

/** "2025-06-01" for a transaction, or null when it has no valid date. */
export function calendarDayOfTx(t: DatedTx): string | null {
  return toCalendarDay(t.date || t.posted_at || null);
}

/** "2025-06" from a calendar day or any date string starting YYYY-MM-DD. */
export function periodKeyOf(value: string | null | undefined): string | null {
  const day = toCalendarDay(value);
  return day ? day.slice(0, 7) : null;
}

export function yearOf(value: string | null | undefined): number | null {
  const day = toCalendarDay(value);
  return day ? Number(day.slice(0, 4)) : null;
}

/** True when the date falls in the selected year (number or 'all') and month ('' = any). */
export function inSelectedPeriod(
  value: string | null | undefined,
  selectedYear: number | 'all' | undefined,
  selectedPeriod: string | undefined,
): boolean {
  if (typeof selectedYear === 'number' && yearOf(value) !== selectedYear) return false;
  if (selectedPeriod && periodKeyOf(value) !== selectedPeriod) return false;
  return true;
}

/** Human label for the drawer header. */
export function periodLabel(selectedYear: number | 'all' | undefined, selectedPeriod: string | undefined, monthLabel: (p: string) => string): string {
  if (selectedPeriod) return monthLabel(selectedPeriod);
  if (typeof selectedYear === 'number') return String(selectedYear);
  return 'All years';
}

export const DETAIL_PAGE_SIZE = 25;

/* ── K-d: custom date range and account scope ─────────────────────────────── */

export interface DateRange {
  /** Inclusive "YYYY-MM-DD"; empty = open-ended. */
  from?: string;
  to?: string;
}

export function isRangeActive(range: DateRange | null | undefined): boolean {
  return !!range && !!(range.from || range.to);
}

/** Inclusive calendar-day range check (string compare on YYYY-MM-DD). */
export function inDateRange(day: string | null | undefined, range: DateRange | null | undefined): boolean {
  if (!range || !isRangeActive(range)) return true;
  if (!day) return false;
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

export interface CategoryFilters {
  selectedYear?: number | 'all';
  selectedPeriod?: string;
  /** When active, replaces the year / month filter. */
  range?: DateRange | null;
  /** Import ids of the selected account; null = all accounts. */
  importIds?: Set<string> | null;
}

/**
 * The one Categories filter rule, used by the page totals (useCategoriesData) and by the
 * category / subcategory detail, so their transactions and counts always match.
 */
export function matchesCategoryFilters(t: DatedTx & { import_id?: string | null }, f: CategoryFilters): boolean {
  if (f.importIds && !f.importIds.has(t.import_id || '')) return false;
  const day = calendarDayOfTx(t);
  if (isRangeActive(f.range)) return inDateRange(day, f.range);
  return inSelectedPeriod(day, f.selectedYear, f.selectedPeriod);
}

/** Header label for a custom range. */
export function rangeLabel(range: DateRange | null | undefined, fmt: (day: string) => string): string {
  if (!range || !isRangeActive(range)) return '';
  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`;
  if (range.from) return `From ${fmt(range.from)}`;
  return `Until ${fmt(range.to as string)}`;
}

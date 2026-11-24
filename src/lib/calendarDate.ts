/**
 * Transaction dates are calendar dates, not instants.
 *
 * commit-import stores posted_at as UTC midnight ("2025-06-16T00:00:00.000Z"). Formatting
 * that as an instant in a negative-offset timezone (e.g. Mountain time) shows the previous
 * day ("Jun 15"). These helpers take only the YYYY-MM-DD part and format it as a local
 * calendar date, so every surface shows the statement's day. Display only: stored values
 * are never changed.
 */

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2025-06-16" from "2025-06-16" or "2025-06-16T00:00:00.000Z"; null if not a date. */
export function toCalendarDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = ISO_DAY.exec(String(value).trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${mo}-${d}`;
}

export type CalendarDateStyle = 'long' | 'medium' | 'short';

const STYLES: Record<CalendarDateStyle, Intl.DateTimeFormatOptions> = {
  long: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  short: { month: 'short', day: 'numeric' },
};

/** Human-readable calendar date ("Mon, Jun 16, 2025"), never shifted by timezone. */
export function formatCalendarDate(value: string | null | undefined, style: CalendarDateStyle = 'long'): string | null {
  const day = toCalendarDay(value);
  if (!day) return null;
  const [y, m, d] = day.split('-').map(Number);
  const local = new Date(y, m - 1, d);
  if (isNaN(local.getTime()) || local.getMonth() !== m - 1) return null;
  return local.toLocaleDateString('en-US', STYLES[style]);
}

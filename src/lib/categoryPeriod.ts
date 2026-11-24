/**
 * K-b — the Categories year / month filter as one shared predicate, so the category
 * detail shows exactly the transactions the page counted for the selected period.
 *
 * It mirrors useCategoriesData's existing rules: posted_at is read with new Date(),
 * and the year / month come from local time. Calendar-day bucketing is changed separately
 * (K-c) for both places at once.
 */

export function periodKeyOf(postedAt: string | null | undefined): string | null {
  const d = new Date(postedAt || '');
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function yearOf(postedAt: string | null | undefined): number | null {
  const d = new Date(postedAt || '');
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

/** True when the transaction falls in the selected year (number or 'all') and month ('' = any). */
export function inSelectedPeriod(
  postedAt: string | null | undefined,
  selectedYear: number | 'all' | undefined,
  selectedPeriod: string | undefined,
): boolean {
  if (typeof selectedYear === 'number' && yearOf(postedAt) !== selectedYear) return false;
  if (selectedPeriod && periodKeyOf(postedAt) !== selectedPeriod) return false;
  return true;
}

/** Human label for the drawer header. */
export function periodLabel(selectedYear: number | 'all' | undefined, selectedPeriod: string | undefined, monthLabel: (p: string) => string): string {
  if (selectedPeriod) return monthLabel(selectedPeriod);
  if (typeof selectedYear === 'number') return String(selectedYear);
  return 'All years';
}

export const DETAIL_PAGE_SIZE = 25;

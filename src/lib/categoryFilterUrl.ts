/**
 * K-d — Categories filters live in the URL (?year=&month=&from=&to=&account=), so they
 * survive opening Tag rules, the Transactions page or a reload and coming back.
 */

export interface CategoryUrlFilters {
  /** null = not in the URL (page default applies) */
  year: number | 'all' | null;
  month: string;
  from: string;
  to: string;
  account: string;
}

const MONTH = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function readCategoryFilters(search: string): CategoryUrlFilters {
  const sp = new URLSearchParams(search);
  const y = sp.get('year');
  const n = Number(y);
  const year = y === 'all' ? 'all' : (y && Number.isFinite(n) && n >= 2000 ? n : null);
  const month = sp.get('month') || '';
  const from = sp.get('from') || '';
  const to = sp.get('to') || '';
  return {
    year,
    month: MONTH.test(month) ? month : '',
    from: DAY.test(from) ? from : '',
    to: DAY.test(to) ? to : '',
    account: sp.get('account') || '',
  };
}

/** Returns the new query string with the filter keys replaced (other params kept). */
export function writeCategoryFilters(search: string, f: { year: number | 'all'; month: string; from: string; to: string; account: string }): string {
  const sp = new URLSearchParams(search);
  const set = (k: string, v: string) => { if (v) sp.set(k, v); else sp.delete(k); };
  set('year', f.year === 'all' ? '' : String(f.year));
  set('month', f.month);
  set('from', f.from);
  set('to', f.to);
  set('account', f.account && f.account !== 'all' ? f.account : '');
  return sp.toString();
}

/** True when anything differs from the page defaults (current year, everything else empty). */
export function hasActiveCategoryFilters(f: { year: number | 'all'; month: string; from: string; to: string; account: string; search: string }, currentYear: number): boolean {
  return f.year !== currentYear || !!f.month || !!f.from || !!f.to || (!!f.account && f.account !== 'all') || !!f.search.trim();
}

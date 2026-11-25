/**
 * X-3 — keep the reviewer's place in the Transactions list for this browser session:
 * how many rows were loaded and how far the list was scrolled, restored only when the
 * customer comes back to the SAME filters (same query string) within 30 minutes.
 * Per-viewer convenience only (sessionStorage, guarded); nothing is sent anywhere.
 */

export const TX_LIST_POSITION_KEY = 'xspensesai.txList.position';
export const TX_LIST_POSITION_TTL_MS = 30 * 60 * 1000;

export interface TxListPosition {
  search: string;
  visibleCount: number;
  scrollTop: number;
  savedAt: number;
}

/** Query string without params that only drive one-shot actions (deep links). */
export function filterKey(search: string): string {
  const sp = new URLSearchParams(search);
  for (const k of ['txId', 'tagTx', 'focus', 'trend', 'openTag', 'import_id', 'importId']) sp.delete(k);
  sp.sort();
  return sp.toString();
}

export function parsePosition(raw: string | null, search: string, now: number): TxListPosition | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<TxListPosition>;
    if (typeof p.search !== 'string' || p.search !== filterKey(search)) return null;
    if (typeof p.savedAt !== 'number' || now - p.savedAt > TX_LIST_POSITION_TTL_MS || now < p.savedAt) return null;
    const visibleCount = Number.isInteger(p.visibleCount) && (p.visibleCount as number) > 0 ? Math.min(p.visibleCount as number, 5000) : null;
    const scrollTop = typeof p.scrollTop === 'number' && p.scrollTop >= 0 ? p.scrollTop : null;
    if (visibleCount === null || scrollTop === null) return null;
    return { search: p.search, visibleCount, scrollTop, savedAt: p.savedAt };
  } catch {
    return null;
  }
}

export function serializePosition(search: string, visibleCount: number, scrollTop: number, now: number): string {
  return JSON.stringify({ search: filterKey(search), visibleCount, scrollTop: Math.max(0, Math.round(scrollTop)), savedAt: now });
}

/** The element the dashboard scrolls (DashboardLayout's main content), else the window. */
export function scrollContainer(): { get: () => number; set: (y: number) => void } {
  const el = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('.dashboard-main-content') : null;
  if (el) return { get: () => el.scrollTop, set: (y) => { el.scrollTop = y; } };
  return { get: () => window.scrollY, set: (y) => window.scrollTo(0, y) };
}

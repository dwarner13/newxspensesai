/**
 * P1-e — pure helpers for the conversation history drawer (no React).
 */

export interface HistoryDrawerItem {
  id: string;
  title: string | null | undefined;
  /** ISO timestamp of the latest activity (or creation). */
  lastActivity: string | null | undefined;
}

function startOfToday(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** "2:41 PM" for today, "Yesterday", or "Jun 16, 2025". */
export function formatHistoryTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const today = startOfToday(now);
  const t = d.getTime();
  if (t >= today) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (t >= today - 86_400_000) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Case-insensitive title filter + Today / Earlier grouping, newest first within each group. */
export function groupHistoryItems(items: HistoryDrawerItem[], query: string, now: Date = new Date()) {
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter(i => (i.title || "").toLowerCase().includes(q)) : items;
  const today = startOfToday(now);
  const ts = (i: HistoryDrawerItem) => new Date(i.lastActivity || 0).getTime() || 0;
  const byTime = (a: HistoryDrawerItem, b: HistoryDrawerItem) => ts(b) - ts(a);
  const todayItems = filtered.filter(i => ts(i) >= today).sort(byTime);
  const earlierItems = filtered.filter(i => ts(i) < today).sort(byTime);
  return { today: todayItems, earlier: earlierItems, total: filtered.length };
}

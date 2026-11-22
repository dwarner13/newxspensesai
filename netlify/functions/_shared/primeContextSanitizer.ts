/**
 * COLLAB-1 — validate the browser-supplied `prime_context` before chat.ts uses it.
 *
 * prime_context is a convenience snapshot computed in the browser. It reaches Prime's prompt
 * as unverified orientation (C2-F/C2-G2 already stop it from counting as evidence), but it
 * used to be accepted as-is: any fields, any sizes, any text. This keeps only the fields
 * chat.ts actually reads, with strict types, lengths and array caps, and drops everything
 * else (including a client-sent `lastTagOutput` — the server loads its own).
 */
import { cleanText } from './pageContextTemplates';

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e12 ? v : undefined;
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined);
const text = (v: unknown, max: number): string | undefined => cleanText(v, max) ?? undefined;
const arr = <T>(v: unknown, max: number, map: (x: Record<string, unknown>) => T | null): T[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out: T[] = [];
  for (const item of v.slice(0, max)) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const m = map(item as Record<string, unknown>);
      if (m) out.push(m);
    }
  }
  return out;
};
const nameAmount = (x: Record<string, unknown>) => {
  const name = text(x.name, 60);
  return name ? { name, amount: num(x.amount) ?? 0 } : null;
};
/** Multi-line summary text: control characters removed (newlines kept), bounded lines and size. */
function summaryText(v: unknown, maxLines: number, maxChars: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const lines = v.split('\n').map(l => cleanText(l, 200)).filter((l): l is string => !!l).slice(0, maxLines);
  const out = lines.join('\n').slice(0, maxChars);
  return out || undefined;
}

const STAGES = new Set(['novice', 'guided', 'power']);
const TZ_RE = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/;

export type SanitizedPrimeContext = Record<string, unknown>;

export function sanitizePrimeContext(raw: unknown): SanitizedPrimeContext | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const out: SanitizedPrimeContext = {};

  out.displayName = text(r.displayName, 60) ?? null;
  out.timezone = typeof r.timezone === 'string' && r.timezone.length <= 64 && TZ_RE.test(r.timezone) ? r.timezone : null;
  out.currency = typeof r.currency === 'string' && /^[A-Z]{3}$/.test(r.currency) ? r.currency : null;
  out.currentStage = typeof r.currentStage === 'string' && STAGES.has(r.currentStage) ? r.currentStage : null;

  const fs = r.financialSnapshot;
  if (fs && typeof fs === 'object' && !Array.isArray(fs)) {
    const f = fs as Record<string, unknown>;
    out.financialSnapshot = {
      hasTransactions: bool(f.hasTransactions) ?? false,
      uncategorizedCount: num(f.uncategorizedCount) ?? 0,
      monthlySpend: num(f.monthlySpend),
      topCategories: arr(f.topCategories, 10, nameAmount),
      hasDebt: bool(f.hasDebt),
      hasGoals: bool(f.hasGoals),
    };
  } else out.financialSnapshot = null;

  const ms = r.memorySummary;
  if (ms && typeof ms === 'object' && !Array.isArray(ms)) {
    const m = ms as Record<string, unknown>;
    out.memorySummary = {
      factsCount: num(m.factsCount),
      lastUpdatedAt: text(m.lastUpdatedAt, 40),
      recentFacts: Array.isArray(m.recentFacts) ? m.recentFacts.slice(0, 5).map(x => text(x, 120)).filter((x): x is string => !!x) : undefined,
    };
  } else out.memorySummary = null;

  const ris = arr(r.recentImportSummaries, 10, x => {
    const label = text(x.label, 80);
    if (!label) return null;
    return {
      importId: text(x.importId, 64) ?? '',
      label,
      totalSpend: num(x.totalSpend) ?? 0,
      totalIncome: num(x.totalIncome) ?? 0,
      txCount: num(x.txCount) ?? 0,
      topCategories: arr(x.topCategories, 10, nameAmount) ?? [],
      topMerchants: arr(x.topMerchants, 10, nameAmount) ?? [],
      displayedAt: text(x.displayedAt, 40) ?? '',
    };
  });
  if (ris) out.recentImportSummaries = ris;

  const tax = arr(r.taxSummary, 30, x => {
    const section = text(x.section, 60);
    const total = num(x.total);
    if (!section || total === undefined) return null;
    return { section, total, count: num(x.count) ?? 0, topSubcategories: arr(x.topSubcategories, 10, nameAmount) ?? [] };
  });
  if (tax) out.taxSummary = tax;

  const team = summaryText(r.teamActivitySummary, 20, 2000);
  if (team) out.teamActivitySummary = team;

  for (const k of ['pendingImports', 'transactionCount', 'totalSpent', 'totalIncome'] as const) {
    const v = num(r[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

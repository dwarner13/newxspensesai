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
    // FST-1 / P-G2: browser-computed amounts (monthlySpend, topCategories) are dropped here.
    // They came from a capped, screen-specific calculation and must never become financial
    // facts. The server rebuilds them from the shared engine when they are needed.
    out.financialSnapshot = {
      hasTransactions: bool(f.hasTransactions) ?? false,
      uncategorizedCount: num(f.uncategorizedCount) ?? 0,
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

  // Owner GO 2026-11-26 (UNIFIED FINANCIAL ENGINE): "Remove legacy browser financial context from
  // Prime." Browser-computed money (per-document spend/income/category/merchant totals and the
  // dashboard tax snapshot) never reaches the model or any server decision. Only what identifies a
  // document the customer is looking at is kept; every figure comes from the shared engine.
  const ris = arr(r.recentImportSummaries, 10, x => {
    const label = text(x.label, 80);
    if (!label) return null;
    return { importId: text(x.importId, 64) ?? '', label, displayedAt: text(x.displayedAt, 40) ?? '' };
  });
  if (ris) out.recentImportSummaries = ris;
  // taxSummary (browser-computed dashboard snapshot) is dropped entirely: it fed the prompt, the
  // "answer is in context" shortcut and the tool-stripping gate with unverified numbers.

  const team = summaryText(r.teamActivitySummary, 20, 2000);
  if (team) out.teamActivitySummary = team;

  // FST-1 / P-G2: browser totalSpent / totalIncome are no longer accepted (never facts).
  for (const k of ['pendingImports', 'transactionCount'] as const) {
    const v = num(r[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { pagedSelectAll, type PagedQuery } from '../../../shared/paged-select';
import { getLocalDateParts, getMonthRange, getPreviousMonthRange } from '../../../shared/financial-dates';

/**
 * Tag Category Brain — Tag's categorization intelligence for one category.
 *
 * Unified financial engine (owner GO 2026-11-26; AI Architecture HQ verdict REFACTOR):
 *  - NO money figures. Spending / income / averages / per-merchant amounts belong to the shared engine
 *    (transaction_category_totals; merchant_totals only once it is engine-compliant, AR-1b). The old sign/type money math counted refunds as
 *    income, never excluded transfers and was silently capped at 1,000 rows.
 *  - Complete reads (pagedSelectAll); an incomplete read is reported, never presented as the full picture.
 *  - Periods come from the shared calendar helpers (financial-dates), filtered on the engine's `date`.
 *  - Output is Tag's own knowledge: counts, first / last seen, merchants by count, how categories were
 *    set (AI / learned) and confidence.
 */

export const id = 'tag_category_brain';

export const inputSchema = z.object({
  category: z.string().min(1, 'Category name is required'),
  timeframe: z.enum(['all', 'last_30_days', 'this_month', 'last_month']).optional().default('all'),
});

export const outputSchema = z.object({
  category: z.string(),
  timeframe: z.string(),
  /** Inclusive start / exclusive end (YYYY-MM-DD) of the period read; null for 'all'. */
  dateRange: z.object({ start: z.string().nullable(), endExclusive: z.string().nullable() }),
  /** True only when every matching row was read without error. */
  complete: z.boolean(),
  totalTransactions: z.number(),
  firstSeenAt: z.string().nullable(),
  lastSeenAt: z.string().nullable(),
  /** Most frequent merchants by transaction COUNT (no amounts). */
  topMerchants: z.array(z.object({ name: z.string(), count: z.number() })),
  aiConfidenceSummary: z.object({
    avgConfidence: z.number().nullable(),
    aiCount: z.number(),
    learnedCount: z.number(),
  }),
  /** Where money questions must go (this tool never states amounts). */
  moneyFiguresFrom: z.literal('transaction_category_totals'),
  notes: z.array(z.string()),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

type Row = { id: string; date: string | null; merchant_name: string | null; category_source: string | null; confidence: number | null };

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Shared calendar logic (financial-dates): start inclusive, end exclusive. */
export function resolveTimeframe(timeframe: Input['timeframe'], timezone: string | null = null, now: Date = new Date()): { start: string | null; endExclusive: string | null } {
  if (timeframe === 'this_month') { const r = getMonthRange(timezone, now); return { start: r.start, endExclusive: r.end }; }
  if (timeframe === 'last_month') { const r = getPreviousMonthRange(timezone, now); return { start: r.start, endExclusive: r.end }; }
  if (timeframe === 'last_30_days') {
    const { year, month, day } = getLocalDateParts(timezone, now);
    const today = new Date(Date.UTC(year, month - 1, day));
    const start = new Date(today); start.setUTCDate(start.getUTCDate() - 29);
    const end = new Date(today); end.setUTCDate(end.getUTCDate() + 1);
    return { start: ymd(start), endExclusive: ymd(end) };
  }
  return { start: null, endExclusive: null };
}

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { category, timeframe } = input;
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();
    const range = resolveTimeframe(timeframe);

    const read = await pagedSelectAll<Row>(() => {
      let q = supabase.from('transactions')
        .select('id, date, merchant_name, category_source, confidence')
        .eq('user_id', userId)
        .eq('category', category);
      if (range.start) q = q.gte('date', range.start);
      if (range.endExclusive) q = q.lt('date', range.endExclusive);
      return q.order('date', { ascending: true }).order('id', { ascending: true }) as unknown as PagedQuery;
    });
    if (read.error) return Err(new Error('Failed to read transactions for this category'));

    const rows = read.rows;
    const base = {
      category, timeframe, dateRange: range, complete: read.complete,
      moneyFiguresFrom: 'transaction_category_totals' as const,
    };
    const incompleteNote = read.complete ? [] : ['Not every transaction could be read, so these counts are a minimum, not the full picture.'];

    if (rows.length === 0) {
      return Ok({
        ...base, totalTransactions: 0, firstSeenAt: null, lastSeenAt: null, topMerchants: [],
        aiConfidenceSummary: { avgConfidence: null, aiCount: 0, learnedCount: 0 },
        notes: [...incompleteNote, `No transactions found in "${category}"${timeframe !== 'all' ? ` for ${timeframe.replace(/_/g, ' ')}` : ''}.`],
      });
    }

    const dates = rows.map(r => r.date).filter((d): d is string => typeof d === 'string' && !!d).sort();
    const merchantCounts = new Map<string, number>();
    for (const r of rows) { const m = r.merchant_name || 'Unknown'; merchantCounts.set(m, (merchantCounts.get(m) ?? 0) + 1); }
    const topMerchants = [...merchantCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 10);

    const aiCount = rows.filter(r => r.category_source === 'ai').length;
    const learnedCount = rows.filter(r => r.category_source === 'learned').length;
    const confidences = rows.map(r => r.confidence).filter((c): c is number => typeof c === 'number');
    const avgConfidence = confidences.length ? confidences.reduce((s, c) => s + c, 0) / confidences.length : null;

    const total = rows.length;
    const notes: string[] = [...incompleteNote];
    const learnedPct = Math.round((learnedCount / total) * 100);
    const aiPct = Math.round((aiCount / total) * 100);
    if (learnedPct >= 70) notes.push(`Tag learned ${learnedPct}% of these from your corrections.`);
    else if (learnedPct >= 50) notes.push(`Tag learned ${learnedPct}% of these from your corrections. More corrections help Tag learn faster.`);
    else if (aiPct >= 70) notes.push(`Most of these (${aiPct}%) were categorized by AI. Correcting a few helps Tag learn your preferences.`);
    if (avgConfidence !== null && avgConfidence < 0.7) notes.push(`Average confidence is ${Math.round(avgConfidence * 100)}%, so Tag could use more learning data here.`);
    else if (avgConfidence !== null && avgConfidence >= 0.9) notes.push(`Average confidence is high (${Math.round(avgConfidence * 100)}%).`);
    if (topMerchants[0] && topMerchants[0].count >= total * 0.5) {
      notes.push(`${topMerchants[0].name} accounts for ${topMerchants[0].count} of ${total} transactions here.`);
    }
    notes.push('For amounts in this category, use transaction_category_totals (it states coverage).');

    return Ok({
      ...base, totalTransactions: total,
      firstSeenAt: dates[0] ?? null, lastSeenAt: dates[dates.length - 1] ?? null,
      topMerchants, aiConfidenceSummary: { avgConfidence, aiCount, learnedCount }, notes,
    });
  } catch {
    return Err(new Error('Tag category brain failed'));
  }
}

export const metadata = {
  name: 'Tag Category Brain',
  description: 'Tag\'s categorization knowledge for one category: how many transactions, first and last seen, the most frequent merchants (by count), and how the categories were set (AI or learned) with confidence. It never states amounts: for "how much do I spend here?" use transaction_category_totals.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};

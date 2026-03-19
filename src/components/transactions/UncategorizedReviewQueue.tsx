/**
 * UncategorizedReviewQueue
 *
 * A lightweight task-queue UI showing transactions that Tag couldn't categorize.
 * Lives in the `between` slot of DashboardPageShell on the Smart Categories page.
 *
 * Features:
 * - Inline category selector per row (auto-saves on change)
 * - Rule-based AI suggestion with one-click accept
 * - Skip button (hides row locally without mutating the DB)
 * - "Auto-Tag All" — calls tag-categorize-committed endpoint
 * - "Show All" link → /dashboard/transactions
 * - Celebration state when no uncategorized transactions remain
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Loader2, Sparkles, Tag, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { createCategoryRule } from '../../lib/categoryRules';
import { fetchPrimeSummarySingleFlight } from '../../lib/ai/primeSummaryClient';
import { useUncategorizedTransactions } from '../../hooks/useUncategorizedTransactions';
import { useAuth } from '../../contexts/AuthContext';
import type { UncategorizedTx } from '../../hooks/useUncategorizedTransactions';

// Fallback categories (same list as TransactionRow, plus a few extra)
const DEFAULT_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Utilities',
  'Travel',
  'Income',
  'Business',
  'Education',
  'Home & Garden',
  'Personal Care',
  'Subscriptions',
  'Bank Fees',
  'Transfers',
  'Insurance',
  'Housing',
  'Cash & ATM',
  'Health & Fitness',
  'Dining',
  'Other',
];

// Lightweight rule set mirrored from tag-categorize-committed.ts
// Used for client-side suggestions only — no server round-trip needed.
const SUGGESTION_RULES: Array<{ contains: string[]; category: string }> = [
  { contains: ['starbucks', 'tim horton', 'second cup'], category: 'Dining' },
  { contains: ['uber', 'lyft', 'taxi', 'transit', 'presto'], category: 'Transportation' },
  { contains: ['amazon', 'amzn'], category: 'Shopping' },
  { contains: ['insurance', 'allstate', 'intact'], category: 'Insurance' },
  { contains: ['telus', 'rogers', 'bell ', 'hydro', 'internet', 'fido', 'koodo'], category: 'Utilities' },
  { contains: ['payroll', 'salary', 'direct dep', 'employment'], category: 'Income' },
  { contains: ['transfer', 'e-transfer', 'etransfer', 'interac'], category: 'Transfers' },
  { contains: ['gas', 'petro', 'shell', 'esso', 'fuel', 'husky'], category: 'Transportation' },
  { contains: ['walmart', 'costco', 'safeway', 'sobeys', 'superstore', 'loblaws', 'metro ', 'food basics'], category: 'Groceries' },
  { contains: ['mcdonald', 'restaurant', 'cafe', 'doordash', 'ubereats', 'skip the dishes', 'pizza', 'sushi', 'burger', 'grill'], category: 'Dining' },
  { contains: ['best buy', 'apple store', 'ebay', 'staples'], category: 'Shopping' },
  { contains: ['netflix', 'spotify', 'disney', 'hulu', 'prime video', 'crave', 'dazn'], category: 'Entertainment' },
  { contains: ['rent', 'lease ', 'mortgage', 'condo fee'], category: 'Housing' },
  { contains: ['doctor', 'pharmacy', 'hospital', 'medical', 'dental', 'clinic', 'shoppers drug', 'rexall'], category: 'Healthcare' },
  { contains: ['atm', 'cash withdrawal'], category: 'Cash & ATM' },
  { contains: ['bank fee', 'service fee', 'monthly fee', 'overdraft', 'nsf'], category: 'Bank Fees' },
  { contains: ['gym', 'fitness', 'yoga', 'crossfit', 'goodlife', 'ymca'], category: 'Health & Fitness' },
  { contains: ['school', 'tuition', 'university', 'college', 'udemy', 'coursera'], category: 'Education' },
  { contains: ['hotel', 'airbnb', 'expedia', 'air canada', 'westjet'], category: 'Travel' },
];

function suggestCategory(merchant: string): string | null {
  const lower = merchant.toLowerCase();
  for (const rule of SUGGESTION_RULES) {
    if (rule.contains.some((k) => lower.includes(k))) return rule.category;
  }
  return null;
}

function getMerchant(tx: UncategorizedTx): string {
  return tx.merchant_name || tx.merchant || 'Unknown merchant';
}

function formatDate(tx: UncategorizedTx): string {
  const raw = tx.posted_at || tx.date;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  const year = d.getFullYear();
  if (year < 1900 || year > 2100) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toFixed(2);
  return amount < 0 ? `-$${abs}` : `+$${abs}`;
}

interface Props {
  /** User's existing category names — merged with defaults for the dropdown */
  categories?: string[];
  /** Optional date range from month chip selection */
  monthRange?: { start: string; end: string };
}

export function UncategorizedReviewQueue({ categories, monthRange }: Props) {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { transactions, totalCount, isLoading, refresh } = useUncategorizedTransactions({ monthRange });

  // Deduplicate and combine user categories with defaults
  const categoryList = [...new Set([...(categories || []), ...DEFAULT_CATEGORIES])].filter(Boolean);

  // Local UI state
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  const visibleTransactions = transactions.filter(
    (tx) => !skippedIds.has(tx.id) && !removingIds.has(tx.id)
  );

  // ── Save a category selection ────────────────────────────────────────────
  const handleSaveCategory = useCallback(
    async (tx: UncategorizedTx, category: string) => {
      if (!category) return;
      const supabase = getSupabase();
      if (!supabase) return;

      setSavingId(tx.id);
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            category,
            category_source: 'manual',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tx.id);
        if (error) throw error;

        // Trigger fade-out, then refresh after animation completes
        setRemovingIds((prev) => new Set([...prev, tx.id]));
        setTimeout(() => {
          refresh();
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(tx.id);
            return next;
          });
        }, 380);

        // Offer rule creation for meaningful merchant names
        const merchant = getMerchant(tx);
        const isGeneric = !merchant || merchant === 'Unknown merchant';
        if (!isGeneric && userId) {
          toast.custom(
            (t) => (
              <div
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border border-violet-500/30 bg-slate-900 shadow-xl max-w-sm transition-opacity ${
                  t.visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-100">
                    Always tag &ldquo;{merchant}&rdquo; as {category}?
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create a rule to auto-categorize future imports
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={async () => {
                        toast.dismiss(t.id);
                        const result = await createCategoryRule(userId, merchant, category, 'contains');
                        if (result.ok) toast.success('Rule created');
                        else toast.error('Failed to create rule');
                      }}
                      className="px-2.5 py-1 text-xs rounded-md bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 font-medium transition-colors"
                    >
                      Yes, create rule
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            ),
            { duration: 10000, position: 'bottom-right' }
          );
        }
      } catch (err: any) {
        toast.error(`Save failed: ${err?.message ?? 'unknown error'}`);
      } finally {
        setSavingId(null);
      }
    },
    [refresh, userId]
  );

  // ── Skip row locally ─────────────────────────────────────────────────────
  const handleSkip = useCallback((txId: string) => {
    setSkippedIds((prev) => new Set([...prev, txId]));
  }, []);

  // ── Auto-Tag All ─────────────────────────────────────────────────────────
  const handleAutoTagAll = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Session expired — please refresh');
      return;
    }

    setIsAutoTagging(true);
    try {
      const res = await fetch('/.netlify/functions/tag-categorize-committed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ limit: 1000 }),
      });
      const json = (await res.json()) as { ok: boolean; updated?: number; total?: number };
      if (json.ok) {
        if ((json.updated ?? 0) === 0) {
          toast('No rules matched — select categories manually below');
        } else {
          toast.success(
            `Tag categorized ${json.updated} of ${json.total} transaction${json.total !== 1 ? 's' : ''}`
          );
          // ── Re-fire Prime so summary reflects real categories ──
          try {
            await fetchPrimeSummarySingleFlight({ limit: 1000 }, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
          } catch {
            // non-fatal — categories are written, summary will be stale
          }
        }
        refresh();
      } else {
        toast.error('Auto-Tag failed — try again');
      }
    } catch {
      toast.error('Auto-Tag failed — check your connection');
    } finally {
      setIsAutoTagging(false);
    }
  }, [refresh]);

  // ── Celebration state ────────────────────────────────────────────────────
  if (!isLoading && totalCount === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] px-4 py-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          System Status: Optimized
        </div>
        <p className="mt-2 text-xs text-slate-400">Tag has categorized all uncategorized transactions.</p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div id="uncategorized-queue" className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <span className="text-sm font-semibold text-slate-100">Needs Review</span>
          {!isLoading && totalCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-medium">
              {totalCount}
            </span>
          )}
        </div>
        <button
          onClick={handleAutoTagAll}
          disabled={isAutoTagging || isLoading || totalCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isAutoTagging ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Tagging…
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Auto-Tag All
            </>
          )}
        </button>
      </div>

      {/* Transaction rows */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : visibleTransactions.length === 0 && totalCount > 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            All visible items skipped.{' '}
            <button onClick={refresh} className="text-violet-400 hover:underline">
              Refresh
            </button>
          </div>
        ) : (
          visibleTransactions.map((tx) => {
            const merchant = getMerchant(tx);
            const suggestion = suggestCategory(merchant);
            const isSaving = savingId === tx.id;
            const isRemoving = removingIds.has(tx.id);

            return (
              <div
                key={tx.id}
                style={{
                  opacity: isRemoving ? 0 : 1,
                  maxHeight: isRemoving ? 0 : '72px',
                  overflow: 'hidden',
                  transition: 'opacity 0.32s ease, max-height 0.38s ease',
                }}
              >
                <div className="grid items-center gap-2 px-4 py-2.5 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
                  style={{ gridTemplateColumns: '72px 1fr 88px minmax(150px,180px) auto' }}
                >
                  {/* Date */}
                  <div className="text-[11px] text-slate-500 tabular-nums">{formatDate(tx)}</div>

                  {/* Merchant + suggestion badge */}
                  <div className="min-w-0">
                    <div
                      className="text-xs font-medium text-slate-200 truncate"
                      title={merchant}
                    >
                      {merchant}
                    </div>
                    {suggestion && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Sparkles className="h-2.5 w-2.5 text-violet-400 shrink-0" />
                        <span className="text-[10px] text-violet-400 truncate">
                          Tag suggests: {suggestion}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Amount */}
                  <div
                    className={`text-xs font-semibold text-right tabular-nums ${
                      tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatAmount(tx.amount)}
                  </div>

                  {/* Category select */}
                  <div className="relative">
                    <select
                      defaultValue={suggestion ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) void handleSaveCategory(tx, val);
                      }}
                      disabled={isSaving}
                      className="w-full appearance-none rounded-md bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 pr-6 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/50 cursor-pointer hover:bg-slate-700/80 transition-colors disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Select category…
                      </option>
                      {categoryList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    {isSaving ? (
                      <Loader2 className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-violet-400" />
                    ) : (
                      <ChevronRight className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-90 text-slate-500" />
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-0.5">
                    {/* Accept suggestion */}
                    {suggestion && (
                      <button
                        onClick={() => void handleSaveCategory(tx, suggestion)}
                        disabled={isSaving}
                        title={`Accept: ${suggestion}`}
                        className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {/* Skip */}
                    <button
                      onClick={() => handleSkip(tx.id)}
                      disabled={isSaving}
                      title="Skip for now"
                      className="p-1.5 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-700/50 transition-colors disabled:opacity-40"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06]">
          <span className="text-[11px] text-slate-500">
            Showing {Math.min(5, visibleTransactions.length)} of {totalCount}
          </span>
          <button
            onClick={() => navigate('/dashboard/transactions?status=uncategorized')}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Show all
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

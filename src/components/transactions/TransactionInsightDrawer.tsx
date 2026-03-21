import { useEffect, useMemo, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

type DrawerTransaction =
  | { kind: 'committed'; transaction: CommittedTransaction }
  | { kind: 'pending'; transaction: PendingTransaction };

const DEFAULT_CATEGORIES = [
  'Income',
  'Groceries',
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Subscriptions',
  'Healthcare',
  'Bank Fees',
  'Transfers',
  'Other',
  'Uncategorized',
];

interface TransactionInsightDrawerProps {
  open: boolean;
  row: DrawerTransaction | null;
  allCommittedTransactions: CommittedTransaction[];
  onClose: () => void;
  onApprovePending?: (pendingId: string) => Promise<void> | void;
  onRejectPending?: (pendingId: string) => Promise<void> | void;
  onEditCommitted?: (transaction: CommittedTransaction) => void;
  categories?: string[];
  onCommittedCategorySaved?: (txId: string, category: string) => void;
  onAskTag?: (row: DrawerTransaction) => void;
  onFlagReview?: (row: DrawerTransaction) => void;
}

function normalizeMerchant(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function TransactionInsightDrawer({
  open,
  row,
  allCommittedTransactions,
  onClose,
  onApprovePending,
  onRejectPending,
  onEditCommitted,
  categories = DEFAULT_CATEGORIES,
  onCommittedCategorySaved,
  onAskTag,
  onFlagReview,
}: TransactionInsightDrawerProps) {
  const [localCategory, setLocalCategory] = useState('');
  const [isSavingCat, setIsSavingCat] = useState(false);

  const rawMerchant = useMemo(() => {
    if (!row) return 'Unknown merchant';
    if (row.kind === 'committed') return row.transaction.merchant_name || 'Unknown merchant';
    const dj = row.transaction.data_json as Record<string, unknown>;
    return String(dj.merchant || dj.description || 'Unknown merchant');
  }, [row]);

  const amount = useMemo(() => {
    if (!row) return 0;
    if (row.kind === 'committed') return Number(row.transaction.amount || 0);
    const dj = row.transaction.data_json as Record<string, unknown>;
    const parsed = Number(dj.amount ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [row]);

  const postedAt = useMemo(() => {
    if (!row) return '';
    if (row.kind === 'committed') return row.transaction.posted_at || '';
    const dj = row.transaction.data_json as Record<string, unknown>;
    return String(dj.date || row.transaction.parsed_at || '');
  }, [row]);

  const statementLabel = useMemo(() => {
    if (!row || row.kind !== 'committed') return null;
    const imp = row.transaction.import;
    const label = imp?.document?.original_name || (imp as Record<string, unknown>)?.label;
    if (typeof label === 'string' && label.trim()) return sanitizeIssuerPillLabel(label.trim());
    const id = String(row.transaction.import_id || '').trim();
    if (id) return `Statement …${id.slice(-6)}`;
    return null;
  }, [row]);

  const normalizedMerchant = useMemo(() => normalizeMerchant(rawMerchant), [rawMerchant]);

  const currentMonthSpend = useMemo(() => {
    if (!normalizedMerchant) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return allCommittedTransactions
      .filter((tx) => normalizeMerchant(tx.merchant_name || '') === normalizedMerchant)
      .filter((tx) => {
        const time = new Date(tx.posted_at).getTime();
        return Number.isFinite(time) && time >= monthStart;
      })
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
  }, [allCommittedTransactions, normalizedMerchant]);

  const sparklinePoints = useMemo(() => {
    if (!normalizedMerchant) return [] as number[];
    const now = new Date();
    const days = now.getDate();
    const totals = new Array(days).fill(0);
    allCommittedTransactions.forEach((tx) => {
      if (normalizeMerchant(tx.merchant_name || '') !== normalizedMerchant) return;
      const d = new Date(tx.posted_at);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
      const idx = d.getDate() - 1;
      if (idx >= 0 && idx < totals.length) {
        totals[idx] += Math.abs(Number(tx.amount || 0));
      }
    });
    return totals;
  }, [allCommittedTransactions, normalizedMerchant]);

  const sparklinePath = useMemo(() => {
    if (sparklinePoints.length === 0) return '';
    const w = 220;
    const h = 48;
    const max = Math.max(...sparklinePoints, 1);
    return sparklinePoints
      .map((v, i) => {
        const x = (i / Math.max(1, sparklinePoints.length - 1)) * w;
        const y = h - (v / max) * h;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [sparklinePoints]);

  const hasTrendData =
    sparklinePoints.some((v) => v > 0) && Math.max(...sparklinePoints) > 0 && currentMonthSpend > 0;

  useEffect(() => {
    if (!row) {
      setLocalCategory('');
      return;
    }
    if (row.kind === 'committed') {
      setLocalCategory(row.transaction.category || 'Uncategorized');
    } else {
      const dj = row.transaction.data_json as Record<string, unknown>;
      setLocalCategory(
        String(row.transaction.tag_category || dj.category || 'Uncategorized')
      );
    }
  }, [row]);

  if (!open || !row) return null;

  const formattedDate = postedAt
    ? new Date(postedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown date';

  const INCOME_PATTERNS_TR = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
  const catLower = localCategory.toLowerCase();
  const merchUpper = rawMerchant.toUpperCase();
  const isIncomeTx =
    amount < 0 || catLower === 'income' || INCOME_PATTERNS_TR.test(merchUpper);
  const amountClass = isIncomeTx ? 'text-emerald-500' : 'text-red-500';
  const amountPrefix = isIncomeTx ? '+' : '−';

  const saveCategory = async () => {
    if (row.kind !== 'committed') return;
    const tx = row.transaction;
    setIsSavingCat(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Not available');
      const { error } = await supabase
        .from('transactions')
        .update({
          category: localCategory,
          category_source: 'manual',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.id);
      if (error) throw error;
      onCommittedCategorySaved?.(tx.id, localCategory);
      toast.success('Category updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save category');
    } finally {
      setIsSavingCat(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-[61] w-full max-w-md border-l border-slate-700 bg-slate-950 shadow-2xl text-base">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold leading-snug text-slate-50 break-words">{rawMerchant}</h2>
              <p className="mt-1 text-sm text-slate-500">{formattedDate}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800 shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Amount</div>
              <div className={`mt-1 text-3xl font-semibold tabular-nums ${amountClass}`}>
                {amountPrefix}${Math.abs(amount).toFixed(2)}
              </div>
            </div>

            <div>
              <label htmlFor="tx-drawer-cat" className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Category
              </label>
              {row.kind === 'committed' ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    id="tx-drawer-cat"
                    value={localCategory}
                    onChange={(e) => setLocalCategory(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void saveCategory()}
                    disabled={isSavingCat}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    {isSavingCat ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <div className="mt-2 text-base text-slate-300">{localCategory}</div>
              )}
            </div>

            {statementLabel ? (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Statement</div>
                <div className="mt-1 text-sm text-slate-300">{statementLabel}</div>
              </div>
            ) : null}

            {hasTrendData ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <TrendingUp className="h-4 w-4" />
                  This month at this merchant
                </div>
                <div className="text-sm text-slate-300">
                  Total activity{' '}
                  <span className="font-semibold text-emerald-400">${currentMonthSpend.toFixed(2)}</span>
                </div>
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                  <svg viewBox="0 0 220 48" className="h-12 w-full">
                    <path d={sparklinePath} fill="none" stroke="#34d399" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => onAskTag?.(row)}
                className="w-full rounded-xl border border-violet-500/40 bg-violet-500/15 py-3 text-sm font-medium text-violet-100 hover:bg-violet-500/25"
              >
                Ask Tag to recategorize
              </button>
              <button
                type="button"
                onClick={() => onFlagReview?.(row)}
                className="w-full rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-sm font-medium text-amber-100 hover:bg-amber-500/20"
              >
                Flag for review
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 p-4">
            {row.kind === 'pending' ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => void onApprovePending?.(row.transaction.id)}
                  className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 py-2.5 text-sm font-medium text-emerald-200"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => void onRejectPending?.(row.transaction.id)}
                  className="rounded-lg border border-red-400/40 bg-red-500/15 py-2.5 text-sm font-medium text-red-200"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-700 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onEditCommitted?.(row.transaction)}
                  className="rounded-lg border border-slate-600 py-2.5 text-sm text-slate-100 hover:bg-slate-800"
                >
                  Edit / Split
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-700 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

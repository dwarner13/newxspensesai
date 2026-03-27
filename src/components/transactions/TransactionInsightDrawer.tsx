import { useEffect, useMemo, useState } from 'react';
import { X, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';
import { resolveMerchantAlias } from '../../lib/merchantAliases';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';
import { CategoryDropdown } from '../CategoryDropdown';

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
  'Personal Care',
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
  onPendingCategorySaved?: (pendingId: string, category: string) => void;
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
  onPendingCategorySaved,
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
    if (row.kind === 'committed') return row.transaction.posted_at || (row.transaction as any).transaction_date || (row.transaction as any).date || '';
    const dj = row.transaction.data_json as Record<string, unknown>;
    return String(dj.date || row.transaction.parsed_at || '');
  }, [row]);

  const [statementLabel, setStatementLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!row || row.kind !== 'committed') { setStatementLabel(null); return; }
    const imp = row.transaction.import;
    const label = imp?.document?.original_name || (imp as Record<string, unknown>)?.label;
    if (typeof label === 'string' && label.trim()) { setStatementLabel(sanitizeIssuerPillLabel(label.trim())); return; }
    // Try fetching issuer from imports table
    const importId = row.transaction.import_id;
    if (!importId) { setStatementLabel(null); return; }
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data } = await supabase.from('imports').select('statement_breakdown_json, file_url').eq('id', importId).single();
        const meta = (data?.statement_breakdown_json as Record<string, unknown>)?.statement_meta as Record<string, unknown> | undefined;
        const issuer = String(meta?.issuer || '').trim();
        if (issuer) { setStatementLabel(issuer); return; }
        // Fallback to document name
        const { data: doc } = await supabase.from('user_documents').select('original_name').eq('id', importId).single();
        if (doc?.original_name) { setStatementLabel(sanitizeIssuerPillLabel(String(doc.original_name))); return; }
        // Fallback to filename from file_url
        const fileUrl = String((data as any)?.file_url || '');
        if (fileUrl) { const fname = decodeURIComponent(fileUrl.split('/').pop() || ''); if (fname) { setStatementLabel(fname.replace('.pdf','').replace('.PDF','')); return; } }
      } catch { /* ignore */ }
      setStatementLabel(`Statement \u2026${importId.slice(-6)}`);
    })();
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
  const txTypeLower = String((row.transaction as Record<string, unknown>)?.type || '').toLowerCase();
  // Do NOT use amount sign — expenses are stored as negative values
  const isIncomeTx =
    txTypeLower === 'income' || catLower === 'income' || catLower === 'business income' || INCOME_PATTERNS_TR.test(merchUpper);
  const amountClass = isIncomeTx ? 'text-[#10b981]' : 'text-[#ef4444]';
  const amountPrefix = isIncomeTx ? '+' : '−';

  const mapHintSource =
    row.kind === 'committed'
      ? row.transaction.merchant_name || ''
      : String((row.transaction.data_json as Record<string, unknown>)?.merchant || '');
  const merchantHasMapHint = resolveMerchantAlias(mapHintSource) != null;

  const saveCategory = async () => {
    if (row.kind !== 'committed') return;
    const tx = row.transaction;
    setIsSavingCat(true);
    try {
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: tx.id,
          table: 'transactions',
          category: localCategory,
          applyToVendor: true,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCommittedCategorySaved?.(tx.id, localCategory);
      toast.success('Category updated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not save category');
    } finally {
      setIsSavingCat(false);
    }
  };
  const savePendingCategory = async () => {
    if (row.kind !== 'pending') return;
    const p = row.transaction;
    setIsSavingCat(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Not available');
      const prevJson = (p.data_json as Record<string, unknown>) || {};
      const data_json = { ...prevJson, category: localCategory };
      const { error } = await supabase
        .from('transactions_staging')
        .update({
          tag_category: localCategory,
          data_json,
        })
        .eq('id', p.id);
      if (error) throw error;
      onPendingCategorySaved?.(p.id, localCategory);
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
      <div className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[400px] flex-col border-l border-white/10 bg-slate-950 text-base shadow-[0_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/5 px-6 py-5">
            <div className="min-w-0 pr-2">
              <h2 className="break-words text-2xl font-semibold leading-tight tracking-tight text-white">{rawMerchant}</h2>
              <p className={`mt-3 text-[28px] font-bold tabular-nums ${amountClass}`}>
                {amountPrefix}${Math.abs(amount).toFixed(2)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/10 p-2.5 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Date</div>
              <div className="mt-1.5 text-sm text-slate-200">{formattedDate}</div>
            </div>

            <div>
              <label htmlFor="tx-drawer-cat" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Category
              </label>
              <div className="mt-2">
                <CategoryDropdown
                  value={localCategory}
                  onChange={(cat) => setLocalCategory(cat)}
                  onSave={() => void (row.kind === 'committed' ? saveCategory() : savePendingCategory())}
                  showSaveButton={!isSavingCat}
                />
              </div>
            </div>

            {statementLabel ? (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Statement source</div>
                <div className="mt-1.5 text-sm text-slate-300">{statementLabel}</div>
              </div>
            ) : null}

            {/* Receipt hint */}
            <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(34,211,238,0.04)", border: "1px solid rgba(34,211,238,0.12)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#22d3ee", flexShrink: 0 }}>B</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#22d3ee", marginBottom: 3 }}>No receipt attached</div>
                <div style={{ fontSize: 11, color: "#7a8fa6", lineHeight: 1.5 }}>Have a receipt? Snap a photo and send it to Byte in chat — he will match it to this transaction automatically.</div>
              </div>
            </div>

            {merchantHasMapHint ? (
              <div>
                <button
                  type="button"
                  className="text-sm font-medium text-cyan-400/90 underline decoration-cyan-500/40 underline-offset-4 transition-colors hover:text-cyan-300"
                  onClick={() => toast('Maps coming soon')}
                >
                  View on map
                </button>
                <p className="mt-1 text-xs text-slate-500">Location preview — full maps integration soon.</p>
              </div>
            ) : null}

            {hasTrendData ? (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                  <TrendingUp className="h-4 w-4" />
                  This month at this merchant
                </div>
                <div className="text-sm text-slate-300">
                  Total activity{' '}
                  <span className="font-semibold text-emerald-400">${currentMonthSpend.toFixed(2)}</span>
                </div>
                <div className="mt-3 rounded-xl border border-white/5 bg-slate-950/50 p-2">
                  <svg viewBox="0 0 220 48" className="h-12 w-full">
                    <path d={sparklinePath} fill="none" stroke="#34d399" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={() => onAskTag?.(row)}
                className="w-full rounded-xl border border-violet-400/50 bg-transparent py-3 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-500/10"
              >
                Ask Tag to recategorize
              </button>
              <button
                type="button"
                onClick={() => onFlagReview?.(row)}
                className="w-full rounded-xl border border-amber-400/50 bg-transparent py-3 text-sm font-medium text-amber-200/90 transition-colors hover:bg-amber-500/10"
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

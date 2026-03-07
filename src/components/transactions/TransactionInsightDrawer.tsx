import { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink, ReceiptText, MapPin, TrendingUp } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

type DrawerTransaction =
  | { kind: 'committed'; transaction: CommittedTransaction }
  | { kind: 'pending'; transaction: PendingTransaction };

interface TransactionInsightDrawerProps {
  open: boolean;
  row: DrawerTransaction | null;
  allCommittedTransactions: CommittedTransaction[];
  onClose: () => void;
  onApprovePending?: (pendingId: string) => Promise<void> | void;
  onRejectPending?: (pendingId: string) => Promise<void> | void;
  onEditCommitted?: (transaction: CommittedTransaction) => void;
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
}: TransactionInsightDrawerProps) {
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

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
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
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

  useEffect(() => {
    let cancelled = false;
    setReceiptUrl(null);
    if (!open || !row) return;

    const load = async () => {
      let docId: string | null = null;
      if (row.kind === 'committed') {
        docId = row.transaction.document_id || null;
      } else {
        const dj = row.transaction.data_json as Record<string, unknown>;
        docId = String(dj.documentId || dj.docId || '').trim() || null;
      }
      if (!docId) return;

      setIsLoadingReceipt(true);
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data } = await supabase
          .from('user_documents')
          .select('id,storage_path')
          .eq('id', docId)
          .maybeSingle();
        const storagePath = String((data as any)?.storage_path || '').trim();
        if (!storagePath) return;
        const buckets = ['original_docs', 'redacted_docs'];
        for (const bucket of buckets) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
          const url = urlData?.publicUrl;
          if (url) {
            if (!cancelled) setReceiptUrl(url);
            break;
          }
        }
      } finally {
        if (!cancelled) setIsLoadingReceipt(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, row]);

  if (!open || !row) return null;

  const mapQuery = encodeURIComponent(rawMerchant || 'store');
  const mapUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-700 bg-slate-950/98 shadow-2xl backdrop-blur">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Transaction details</div>
            <div className="text-xs text-slate-400">{rawMerchant}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-xs text-slate-400">Amount</div>
            <div className={`text-lg font-semibold ${amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {amount < 0 ? '-' : '+'}${Math.abs(amount).toFixed(2)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <MapPin className="h-3.5 w-3.5" />
              Map
            </div>
            <div className="overflow-hidden rounded-md border border-slate-700">
              <iframe
                title="Merchant location"
                src={mapUrl}
                className="h-40 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
            >
              Open in Maps <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <ReceiptText className="h-3.5 w-3.5" />
              Receipt
            </div>
            {isLoadingReceipt ? (
              <div className="text-xs text-slate-400">Loading receipt preview...</div>
            ) : receiptUrl ? (
              <img src={receiptUrl} alt="Receipt preview" className="max-h-48 w-full rounded-md border border-slate-700 object-cover" />
            ) : (
              <div className="rounded-md border border-dashed border-slate-700 p-3 text-xs text-slate-500">
                No receipt image linked to this transaction.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Trend
            </div>
            <div className="text-xs text-slate-300">
              You've spent <span className="font-semibold text-emerald-300">${currentMonthSpend.toFixed(2)}</span> here this month.
            </div>
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-950/70 p-2">
              <svg viewBox="0 0 220 48" className="h-12 w-full">
                <path d={sparklinePath || 'M0,48 L220,48'} fill="none" stroke="#34d399" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 p-4">
          {row.kind === 'pending' ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void onApprovePending?.(row.transaction.id)}
                className="rounded-md border border-emerald-400/40 bg-emerald-500/15 px-2 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => void onRejectPending?.(row.transaction.id)}
                className="rounded-md border border-red-400/40 bg-red-500/15 px-2 py-2 text-xs font-medium text-red-200 hover:bg-red-500/25"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-700 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEditCommitted?.(row.transaction)}
                className="rounded-md border border-slate-600 px-2 py-2 text-xs text-slate-100 hover:bg-slate-800"
              >
                Edit / Split
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-700 px-2 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


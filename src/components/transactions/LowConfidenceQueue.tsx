import React, { useMemo } from "react";
import type { TxRow } from "@/hooks/useTransactions";
import { CategoryPill } from "@/components/CategoryPill";

export default function LowConfidenceQueue({
  rows,
  onApproveAll,
  onChooseTopSuggestion, // optional future
  onOpenHistory,
  onOpenRule,
  onCorrect, // (tx: TxRow, categoryId: string) => Promise<void>
}: {
  rows: TxRow[];
  onApproveAll: () => Promise<void>;
  onChooseTopSuggestion?: () => Promise<void>;
  onOpenHistory: (txId: string, merchant?: string) => void;
  onOpenRule: (merchant?: string, categoryId?: string | null) => void;
  onCorrect: (tx: TxRow, to_category_id: string) => Promise<void>;
}) {
  const lowRows = useMemo(() => rows.filter(r => (r.confidence ?? 1) < 0.6), [rows]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-white">Low-Confidence Review</div>
          <div className="text-sm text-gray-300">{lowRows.length} to review (&lt; 60% confidence)</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onApproveAll}
            className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm text-white hover:bg-emerald-500/30 disabled:opacity-50"
            disabled={lowRows.length === 0}
            title="Approve current suggestions as-is"
          >
            Approve All
          </button>
          {/* Optional: could compute top suggestions via server; placeholder control */}
          {/* <button onClick={onChooseTopSuggestion} className="rounded-xl border border-violet-400/40 bg-violet-500/20 px-3 py-2 text-sm text-white">Auto-Choose Top</button> */}
        </div>
      </div>

      {lowRows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-gray-400">
          All caught up. 🎉
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {lowRows.slice(0, 10).map(tx => {
            const pct = Math.round((tx.confidence ?? 0) * 100);
            return (
              <div key={tx.id} className="rounded-xl border border-white/10 bg-zinc-900/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-white">{tx.merchant_name}</div>
                  <div className="text-xs text-gray-300">${Number(tx.amount).toFixed(2)}</div>
                </div>
                <div className="mb-2 text-xs text-gray-400">Date: {tx.posted_at?.slice(0,10) ?? "-"}</div>
                <div className="mb-2 flex items-center gap-2">
                  <CategoryPill
                    value={tx.category_id ?? null}
                    confidence={tx.confidence ?? undefined}
                    onChange={(catId) => onCorrect(tx, catId!)}
                  />
                  <span className="text-xs text-gray-300">{pct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs text-gray-200 hover:bg-white/20"
                    onClick={() => onOpenHistory(tx.id, tx.merchant_name)}
                  >
                    History
                  </button>
                  <button
                    className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs text-gray-200 hover:bg-white/20"
                    onClick={() => onOpenRule(tx.merchant_name, tx.category_id)}
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}





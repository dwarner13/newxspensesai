/**
 * TransactionDetailPanel Component
 * 
 * Slide-in panel for viewing/editing transaction details
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ConfidenceBar } from './ConfidenceBar';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

interface TransactionDetailPanelProps {
  transaction?: CommittedTransaction;
  pendingTransaction?: PendingTransaction;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (pendingId: string) => void;
  onReject?: (pendingId: string) => void;
  onSave?: (transaction: CommittedTransaction | PendingTransaction, isPending: boolean) => void;
}

export function TransactionDetailPanel({
  transaction,
  pendingTransaction,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onSave,
}: TransactionDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isPending = !!pendingTransaction;

  if (!isOpen) return null;

  const displayTransaction = isPending ? pendingTransaction : transaction;
  if (!displayTransaction) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 md:bg-black/30"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed z-50 top-0 right-0 h-full w-full max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              {isPending ? 'Review Transaction' : 'Transaction Details'}
            </h2>
            {isPending && (
              <p className="text-xs text-slate-400 mt-0.5">
                Review extracted data before approving
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-800 text-slate-300"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {isPending ? (
            <>
              {/* Confidence Scores */}
              <section>
                <h3 className="text-xs font-semibold text-slate-200 mb-2">Confidence Scores</h3>
                <div className="space-y-2">
                  <ConfidenceBar score={pendingTransaction.confidence.overall} label="Overall" />
                  <ConfidenceBar score={pendingTransaction.confidence.merchant} label="Merchant" />
                  <ConfidenceBar score={pendingTransaction.confidence.amount} label="Amount" />
                  <ConfidenceBar score={pendingTransaction.confidence.date} label="Date" />
                </div>
              </section>

              {/* Extracted Fields */}
              <section>
                <h3 className="text-xs font-semibold text-slate-200 mb-2">Extracted Data</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-100">{pendingTransaction.data_json.date || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Merchant:</span>
                    <span className="text-slate-100">{pendingTransaction.data_json.merchant || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className={`font-semibold ${pendingTransaction.data_json.amount && pendingTransaction.data_json.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {pendingTransaction.data_json.amount !== undefined
                        ? `${pendingTransaction.data_json.amount < 0 ? '-' : '+'}$${Math.abs(pendingTransaction.data_json.amount).toFixed(2)}`
                        : '—'}
                    </span>
                  </div>
                  {pendingTransaction.data_json.description && (
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-400">Description:</span>
                      <span className="text-slate-100">{pendingTransaction.data_json.description}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Duplicate Warning */}
              {pendingTransaction.possibleDuplicate && (
                <section className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="text-xs font-semibold text-orange-400 mb-1">⚠️ Possible Duplicate</p>
                  <p className="text-xs text-slate-400">
                    Similar transaction found with {pendingTransaction.possibleDuplicate.similarity}% similarity
                  </p>
                </section>
              )}

              {/* Actions */}
              <section className="flex gap-2 pt-4 border-t border-slate-800">
                {onApprove && (
                  <button
                    onClick={() => {
                      onApprove(pendingTransaction.id);
                      onClose();
                    }}
                    className="flex-1 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                  >
                    Approve
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => {
                      onReject(pendingTransaction.id);
                      onClose();
                    }}
                    className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Edit & Approve
                </button>
              </section>
            </>
          ) : (
            <>
              {/* Committed Transaction Details */}
              <section>
                <h3 className="text-xs font-semibold text-slate-200 mb-2">Transaction Details</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-slate-100">{transaction?.posted_at || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Merchant:</span>
                    <span className="text-slate-100">{transaction?.merchant_name || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className={`font-semibold ${transaction && transaction.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {transaction?.amount !== undefined
                        ? `${transaction.amount < 0 ? '-' : '+'}$${Math.abs(transaction.amount).toFixed(2)}`
                        : '—'}
                    </span>
                  </div>
                  {transaction?.category && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-slate-100">{transaction.category}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Actions */}
              <section className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

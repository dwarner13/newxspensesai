/**
 * TransactionDetailPanel Component
 * 
 * Slide-in panel for viewing/editing transaction details
 */

import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { ConfidenceBar } from './ConfidenceBar';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

const CATEGORIES = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Entertainment','Healthcare','Insurance','Education',
  'Travel','Transfers','Bank Fees','Business','Personal Care','Home & Garden',
  'Needs Review',
];

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
  const { userId } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMerchant, setEditMerchant] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const isPending = !!pendingTransaction;

  const startEditing = () => {
    setEditMerchant(transaction?.merchant_name || '');
    setEditCategory(transaction?.category || 'Needs Review');
    setEditSubcategory(transaction?.subcategory || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!transaction || !userId) return;
    const sb = getSupabase();
    if (!sb) return;

    setSaving(true);
    try {
      const merchantVal = editMerchant.trim() || null;
      const categoryVal = editCategory || 'Needs Review';
      const subcategoryVal = editSubcategory.trim() || null;

      // Update the transaction
      const { error } = await sb
        .from('transactions')
        .update({
          merchant_name: merchantVal,
          merchant: merchantVal,
          category: categoryVal,
          subcategory: subcategoryVal,
          category_source: 'user_edit',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Save a category rule so Tag remembers this merchant
      if (merchantVal && categoryVal !== 'Needs Review') {
        try {
          await sb.from('category_rules').upsert({
            user_id: userId,
            match_type: 'contains',
            match_value: merchantVal.toUpperCase(),
            merchant_pattern: merchantVal.toUpperCase(),
            category: categoryVal,
            subcategory: subcategoryVal,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,match_type,match_value' });
        } catch { /* rule save is non-blocking */ }
      }

      toast.success('Updated - Tag will remember this merchant');
      setIsEditing(false);

      // Notify parent so the list refreshes
      if (onSave) {
        onSave({ ...transaction, merchant_name: merchantVal || '', category: categoryVal, subcategory: subcategoryVal || undefined }, false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

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
                    <span className="text-slate-100">{pendingTransaction.data_json.date || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Merchant:</span>
                    <span className="text-slate-100">{(!pendingTransaction.data_json.merchant || pendingTransaction.data_json.merchant === 'null') ? 'Unknown Merchant' : pendingTransaction.data_json.merchant}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className={`font-semibold ${pendingTransaction.data_json.amount && pendingTransaction.data_json.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {pendingTransaction.data_json.amount !== undefined
                        ? `${pendingTransaction.data_json.amount < 0 ? '-' : '+'}$${Math.abs(pendingTransaction.data_json.amount).toFixed(2)}`
                        : '-'}
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
                    <span className="text-slate-100">{transaction?.posted_at || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount:</span>
                    <span className={`font-semibold ${transaction && transaction.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {transaction?.amount !== undefined
                        ? `${transaction.amount < 0 ? '-' : '+'}$${Math.abs(transaction.amount).toFixed(2)}`
                        : '-'}
                    </span>
                  </div>
                </div>
              </section>

              {isEditing ? (
                <section className="space-y-3 pt-3 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Merchant Name</label>
                    <input
                      type="text"
                      value={editMerchant}
                      onChange={(e) => setEditMerchant(e.target.value)}
                      placeholder="e.g. Tim Hortons"
                      className="w-full px-3 py-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Subcategory <span className="text-slate-500">(optional)</span></label>
                    <input
                      type="text"
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      placeholder="e.g. Coffee"
                      className="w-full px-3 py-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {saving ? 'Saving...' : 'Save & Learn'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              ) : (
                <section className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Merchant:</span>
                    <span className="text-slate-100">{(!transaction?.merchant_name || transaction.merchant_name === 'null') ? 'Unknown Merchant' : transaction.merchant_name}</span>
                  </div>
                  {transaction?.category && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-slate-100">{transaction.category}</span>
                    </div>
                  )}
                  {transaction?.subcategory && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subcategory:</span>
                      <span className="text-slate-100">{transaction.subcategory}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-slate-800">
                    <button
                      onClick={startEditing}
                      className="w-full px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

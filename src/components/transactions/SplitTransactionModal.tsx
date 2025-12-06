/**
 * SplitTransactionModal Component
 * 
 * Modal for splitting a transaction into multiple parts
 */

import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CommittedTransaction } from '../../types/transactions';

export interface SplitPart {
  id: string;
  amount: number;
  category?: string;
  note?: string;
}

interface SplitTransactionModalProps {
  isOpen: boolean;
  transaction: CommittedTransaction | null;
  onClose: () => void;
  onSave: (parts: SplitPart[]) => void;
}

export function SplitTransactionModal({
  isOpen,
  transaction,
  onClose,
  onSave,
}: SplitTransactionModalProps) {
  const [parts, setParts] = useState<SplitPart[]>([
    { id: '1', amount: 0, category: '', note: '' },
  ]);

  const totalAmount = transaction ? Math.abs(transaction.amount) : 0;
  const currentTotal = useMemo(
    () => parts.reduce((sum, p) => sum + p.amount, 0),
    [parts]
  );
  const remaining = totalAmount - currentTotal;
  const isValid = Math.abs(remaining) < 0.01; // Allow small rounding differences

  React.useEffect(() => {
    if (isOpen && transaction) {
      // Initialize with one part set to full amount
      setParts([
        {
          id: '1',
          amount: totalAmount,
          category: transaction.category || '',
          note: '',
        },
      ]);
    }
  }, [isOpen, transaction, totalAmount]);

  if (!isOpen || !transaction) {
    return null;
  }

  const addPart = () => {
    setParts([...parts, { id: Date.now().toString(), amount: 0, category: '', note: '' }]);
  };

  const removePart = (id: string) => {
    if (parts.length > 1) {
      setParts(parts.filter(p => p.id !== id));
    }
  };

  const updatePart = (id: string, field: keyof SplitPart, value: string | number) => {
    setParts(parts.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSave = () => {
    if (isValid) {
      onSave(parts);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Split Transaction</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {transaction.merchant_name} • ${totalAmount.toFixed(2)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {parts.map((part, index) => (
              <div
                key={part.id}
                className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-slate-300">Part {index + 1}</span>
                  {parts.length > 1 && (
                    <button
                      onClick={() => removePart(part.id)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalAmount}
                      value={part.amount || ''}
                      onChange={(e) => updatePart(part.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                    <input
                      type="text"
                      value={part.category || ''}
                      onChange={(e) => updatePart(part.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs text-slate-400 mb-1.5">Note</label>
                  <input
                    type="text"
                    value={part.note || ''}
                    onChange={(e) => updatePart(part.id, 'note', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Optional note"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addPart}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </button>

          {/* Total validation */}
          <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total:</span>
              <span className={`font-medium ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                ${currentTotal.toFixed(2)}
              </span>
            </div>
            {!isValid && (
              <p className="text-xs text-red-400 mt-1">
                Remaining: ${remaining.toFixed(2)} (must equal ${totalAmount.toFixed(2)})
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create {parts.length} Transaction{parts.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}








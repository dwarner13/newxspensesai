/**
 * 📊 Transactions Page
 * 
 * Lists transactions with inline category correction
 * - Table: date, merchant, amount, currency, category/subcategory, confidence
 * - "Correct" button → modal → POST /teach-category → optimistic update + toast
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Edit2, Check, X, Award, Loader2 } from 'lucide-react';

interface TransactionItem {
  id: number;
  name: string;
  qty?: number;
  unit?: string;
  price?: number;
}

interface Transaction {
  id: number;
  userId: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string;
  source: string;
  createdAt: string;
  itemsCount: number;
  items: TransactionItem[];
  confidence?: number | null;
}

interface CorrectionModal {
  transaction: Transaction | null;
  category: string;
  subcategory: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<CorrectionModal | null>(null);
  const [saving, setSaving] = useState(false);
  
  // TODO: Replace with actual user context/auth
  const userId = 'test-user'; // Get from auth context

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/.netlify/functions/transactions?limit=200`, {
        headers: {
          'X-User-Id': userId,
        },
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }
      
      setTransactions(data.data || []);
    } catch (err: any) {
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrectClick = (tx: Transaction) => {
    setModal({
      transaction: tx,
      category: tx.category || '',
      subcategory: tx.subcategory || '',
    });
  };

  const handleSaveCorrection = async () => {
    if (!modal || !modal.transaction) return;
    
    if (!modal.category.trim()) {
      toast.error('Category cannot be empty');
      return;
    }

    setSaving(true);
    
    try {
      // Optimistic update
      const updatedTransactions = transactions.map((t) =>
        t.id === modal.transaction!.id
          ? {
              ...t,
              category: modal.category,
              subcategory: modal.subcategory || undefined,
            }
          : t
      );
      setTransactions(updatedTransactions);
      
      // POST to teach-category
      const res = await fetch(`/.netlify/functions/teach-category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify({
          transactionId: modal.transaction.id,
          merchant: modal.transaction.merchant,
          category: modal.category,
          subcategory: modal.subcategory || null,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save category');
      }
      
      // Success toast with XP
      toast.success(
        <span className="flex items-center gap-2">
          Category saved!
          {data.xpAwarded > 0 && (
            <span className="flex items-center gap-1 text-yellow-600">
              <Award className="w-4 h-4" />
              +{data.xpAwarded} XP
            </span>
          )}
        </span>,
        { duration: 4000 }
      );
      
      setModal(null);
    } catch (err: any) {
      // Revert optimistic update
      fetchTransactions();
      toast.error(`Error saving category: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCorrection = () => {
    setModal(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Transactions</h1>
      
      {transactions.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No transactions found.</p>
          <p className="text-sm text-gray-500">
            Upload a receipt via OCR to get started!
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Merchant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Subcategory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(tx.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tx.merchant}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.currency} {tx.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tx.category || (
                          <span className="text-gray-400 italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.subcategory || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tx.confidence !== null && tx.confidence !== undefined
                          ? `${(tx.confidence * 100).toFixed(0)}%`
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleCorrectClick(tx)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 ml-auto"
                          title="Correct Category"
                        >
                          <Edit2 className="w-4 h-4" />
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="mt-4 text-sm text-gray-500 text-center">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Correction Modal */}
      {modal && modal.transaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Correct Category</h2>
            <p className="text-sm text-gray-600 mb-4">
              Merchant: <span className="font-medium">{modal.transaction.merchant}</span>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  value={modal.category}
                  onChange={(e) => setModal({ ...modal, category: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Groceries"
                  disabled={saving}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategory (optional)
                </label>
                <input
                  type="text"
                  value={modal.subcategory}
                  onChange={(e) => setModal({ ...modal, subcategory: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Produce"
                  disabled={saving}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveCorrection}
                disabled={saving || !modal.category.trim()}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={handleCancelCorrection}
                disabled={saving}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                <X className="w-4 h-4 inline mr-1" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

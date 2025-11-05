import React, { useEffect, useState } from "react";
import { Edit2, X, Check, Loader2 } from "lucide-react";

interface Transaction {
  id: number;
  date: string | null;
  merchant: string | null;
  amount: number | null;
  currency: string | null;
  category: string | null;
  subcategory: string | null;
  source: string | null;
  items?: Array<{
    id: number;
    name: string | null;
    qty: number | null;
    unit: string | null;
    price: number | null;
  }>;
}

interface EditingState {
  id: number;
  merchant: string;
  category: string;
  subcategory: string;
}

/**
 * Transactions Page
 * 
 * Displays user's transactions with category correction functionality
 */
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saving, setSaving] = useState(false);
  const [userId] = useState(() => {
    // Get user ID from localStorage or context (adjust as needed)
    return localStorage.getItem('userId') || 'anonymous';
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/.netlify/functions/transactions", {
        method: "GET",
        headers: {
          "X-User-Id": userId
        }
      });

      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setTransactions(data.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load transactions");
      console.error("[Transactions] Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tx: Transaction) => {
    setEditing({
      id: tx.id,
      merchant: tx.merchant || "",
      category: tx.category || "",
      subcategory: tx.subcategory || ""
    });
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const saveCorrection = async () => {
    if (!editing) return;

    setSaving(true);
    
    try {
      const res = await fetch("/.netlify/functions/teach-category", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
          "X-Convo-Id": "transactions-page"
        },
        body: JSON.stringify({
          merchant: editing.merchant,
          category: editing.category,
          subcategory: editing.subcategory || undefined
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Update local transaction
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === editing.id
            ? {
                ...tx,
                category: editing.category,
                subcategory: editing.subcategory || null
              }
            : tx
        )
      );

      setEditing(null);
      
      // Show success message
      alert(`Category updated! You earned ${data.xpAwarded} XP.`);
    } catch (e: any) {
      alert(`Failed to save: ${e?.message || "Unknown error"}`);
      console.error("[Transactions] Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount === null) return "-";
    const symbol = currency === "USD" ? "$" : currency || "$";
    return `${symbol}${amount.toFixed(2)}`;
  };

  const getConfidenceColor = (category: string | null) => {
    if (!category) return "text-gray-400";
    // This would ideally come from the backend, but for now assume presence = confidence
    return "text-green-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading transactions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchTransactions}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
          <p className="text-gray-600">
            Review and correct transaction categories to improve accuracy
          </p>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No transactions found.</p>
            <p className="text-sm text-gray-500 mt-2">
              Upload receipts or invoices to start tracking transactions.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => {
                    const isEditing = editing?.id === tx.id;
                    
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(tx.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tx.merchant || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatAmount(tx.amount, tx.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editing.category}
                              onChange={(e) =>
                                setEditing({ ...editing, category: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded"
                              placeholder="Category"
                            />
                          ) : (
                            <span className={getConfidenceColor(tx.category)}>
                              {tx.category || "Uncategorized"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editing.subcategory}
                              onChange={(e) =>
                                setEditing({ ...editing, subcategory: e.target.value })
                              }
                              className="w-full px-2 py-1 border rounded"
                              placeholder="Subcategory (optional)"
                            />
                          ) : (
                            <span className="text-gray-600">
                              {tx.subcategory || "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.category
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {tx.category ? "High" : "Low"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={saveCorrection}
                                disabled={saving}
                                className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                                title="Save"
                              >
                                {saving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(tx)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Correct Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


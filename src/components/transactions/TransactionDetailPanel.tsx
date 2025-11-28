import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  FileText,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { VALID_CATEGORIES } from '../../orchestrator/aiEmployees';
import toast from 'react-hot-toast';
import type { Transaction } from '../../types/transactions';
import { useAuth } from '../../contexts/AuthContext';

interface TransactionDetailPanelProps {
  transaction: Transaction;
  onClose: () => void;
  onUpdateCategory?: (transactionId: string, newCategory: string) => Promise<void>;
  onUpdateTransaction?: (transactionId: string, updates: { description?: string; merchant?: string; category?: string; amount?: number; notes?: string }) => Promise<void>;
  onViewDocument?: () => void;
  hasDocument?: boolean;
  selectedDocument?: any; // Document data for preview
  onAskCrystal?: () => void;
  onAskTag?: () => void;
}

const TransactionDetailPanel: React.FC<TransactionDetailPanelProps> = ({
  transaction,
  onClose,
  onUpdateCategory,
  onUpdateTransaction,
  onViewDocument,
  hasDocument = false,
  selectedDocument,
  onAskCrystal,
  onAskTag,
}) => {
  const { userId } = useAuth();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    description: transaction.description,
    merchant: transaction.merchant || '',
    category: transaction.category || 'Uncategorized',
    amount: Math.abs(transaction.amount).toFixed(2),
    notes: transaction.notes || '',
  });

  // Tag explanation states
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState<any>(null);
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [isLoadingMerchantInsights, setIsLoadingMerchantInsights] = useState(false);
  const [merchantInsightsData, setMerchantInsightsData] = useState<any>(null);
  const [showMerchantInsightsModal, setShowMerchantInsightsModal] = useState(false);

  // Sync edit form when transaction prop changes (e.g., after update)
  useEffect(() => {
    if (!isEditMode) {
      setEditForm({
        description: transaction.description,
        merchant: transaction.merchant || '',
        category: transaction.category || 'Uncategorized',
        amount: Math.abs(transaction.amount).toFixed(2),
        notes: transaction.notes || '',
      });
    }
  }, [transaction, isEditMode]);

  const handleUpdateCategory = async (newCategory: string) => {
    if (!onUpdateCategory || !newCategory || isSavingCategory) {
      return;
    }

    if (transaction.category === newCategory) {
      setEditingCategory(null);
      return;
    }

    setIsSavingCategory(true);
    setCategoryError(null);

    try {
      await onUpdateCategory(transaction.id, newCategory);
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      setCategoryError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onUpdateTransaction || isSaving) {
      return;
    }

    // Validation
    if (!editForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(editForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateTransaction(transaction.id, {
        description: editForm.description.trim(),
        merchant: editForm.merchant.trim() || undefined,
        category: editForm.category,
        amount: transaction.type === 'expense' ? -amount : amount,
        notes: editForm.notes.trim() || undefined,
      });
      setIsEditMode(false);
      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      description: transaction.description,
      merchant: transaction.merchant || '',
      category: transaction.category || 'Uncategorized',
      amount: Math.abs(transaction.amount).toFixed(2),
      notes: transaction.notes || '',
    });
    setIsEditMode(false);
  };

  // Tag explanation functions
  const handleExplainCategory = async () => {
    if (!userId) {
      toast.error('Please sign in to use Tag explanations');
      return;
    }

    setIsLoadingExplanation(true);
    setExplanationData(null);

    try {
      const response = await fetch('/.netlify/functions/tag-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          transactionId: transaction.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get explanation: ${response.status}`);
      }

      const data = await response.json();
      setExplanationData(data);
      setShowExplanationModal(true);
    } catch (error) {
      console.error('Error fetching Tag explanation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get explanation';
      toast.error(errorMessage);
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleMerchantInsights = async () => {
    if (!userId) {
      toast.error('Please sign in to use Tag insights');
      return;
    }

    const merchant = transaction.merchant;
    if (!merchant || !merchant.trim()) {
      toast.error('No merchant information available for this transaction');
      return;
    }

    setIsLoadingMerchantInsights(true);
    setMerchantInsightsData(null);

    try {
      const response = await fetch('/.netlify/functions/tag-merchant-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          merchant: merchant.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to get merchant insights: ${response.status}`);
      }

      const data = await response.json();
      setMerchantInsightsData(data);
      setShowMerchantInsightsModal(true);
    } catch (error) {
      console.error('Error fetching merchant insights:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get merchant insights';
      toast.error(errorMessage);
    } finally {
      setIsLoadingMerchantInsights(false);
    }
  };


  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 sticky top-24">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Transaction Details</h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Edit Transaction Button */}
      {onUpdateTransaction && !isEditMode && (
        <div className="mb-4">
          <button
            onClick={() => setIsEditMode(true)}
            className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-2 rounded-lg text-sm font-medium hover:bg-white/15 transition-all"
          >
            <Edit2 className="w-4 h-4" />
            Edit Transaction
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Description */}
        {isEditMode ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Description</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Transaction description"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Merchant</label>
              <input
                type="text"
                value={editForm.merchant}
                onChange={(e) => setEditForm({ ...editForm, merchant: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Merchant name (optional)"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isSaving}
              >
                {VALID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-800 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                disabled={isSaving}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Additional notes (optional)"
                rows={3}
                disabled={isSaving}
              />
              <p className="text-xs text-white/40 mt-1">
                Add any additional notes or reminders about this transaction.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-2 rounded-lg text-sm font-medium hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                {transaction.description}
              </h3>
              {transaction.merchant && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <p className="text-sm text-white/70">
                    {transaction.merchant}
                  </p>
                  {/* Merchant insights button */}
                  <button
                    onClick={handleMerchantInsights}
                    disabled={isLoadingMerchantInsights || !userId}
                    className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 hover:text-blue-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="How do I usually categorize this merchant?"
                  >
                    {isLoadingMerchantInsights ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    Insights
                  </button>
                </div>
              )}
            </div>

        {/* Category and Source Type */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {editingCategory === null ? (
              <>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
                  {transaction.category || 'Uncategorized'}
                </span>
                {onUpdateCategory && (
                  <button
                    onClick={() => setEditingCategory(transaction.category || 'Uncategorized')}
                    disabled={isSavingCategory}
                    className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Change category"
                  >
                    <Edit2 className="w-3 h-3" />
                    Change
                  </button>
                )}
                {/* Why this category? button */}
                <button
                  onClick={handleExplainCategory}
                  disabled={isLoadingExplanation || !userId}
                  className="text-xs px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Why did Tag choose this category?"
                >
                  {isLoadingExplanation ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <HelpCircle className="w-3 h-3" />
                  )}
                  Why?
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={editingCategory}
                  onChange={(e) => setEditingCategory(e.target.value)}
                  disabled={isSavingCategory}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {VALID_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-800 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleUpdateCategory(editingCategory)}
                  disabled={isSavingCategory || editingCategory === (transaction.category || 'Uncategorized')}
                  className="text-xs px-2 py-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save category"
                >
                  {isSavingCategory ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  {isSavingCategory ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryError(null);
                  }}
                  disabled={isSavingCategory}
                  className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cancel"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {transaction.source_type && (
              <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                {transaction.source_type === 'manual' ? 'Manual' : 'AI Processed'}
              </span>
            )}
          </div>
          {categoryError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {categoryError}
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <p className={`text-2xl font-bold mb-1 ${
            transaction.type === 'income' ? 'text-green-400' : 'text-red-400'
          }`}>
            {transaction.type === 'income' ? '+' : '-'}
            ${Math.abs(transaction.amount).toFixed(2)}
          </p>
          <p className="text-sm text-white/70 mb-4">
            {transaction.date}
          </p>
        </div>

        {/* Confidence Bar */}
        {transaction.confidence && (
          <div className="mt-2 mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/60">AI confidence</span>
              <span className="text-xs text-white/70">
                {Math.round(transaction.confidence * 100)}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                style={{ width: `${transaction.confidence * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* AI Actions Section */}
        {(onAskCrystal || onAskTag) && (
          <div className="mt-6 space-y-3">
            {onAskCrystal && (
              <button
                onClick={onAskCrystal}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                <span className="text-xs">🧠</span>
                Ask Crystal about this transaction
              </button>
            )}

            {onAskTag && (
              <button
                onClick={onAskTag}
                className="w-full flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-white/15 transition-all"
              >
                <span className="text-xs">🏷️</span>
                Talk to Tag about this category
              </button>
            )}
          </div>
        )}

        {/* Document Section with Preview and AI Summary */}
        {!isEditMode && (
          <div className="mt-4 pt-4 border-t border-white/10">
            {hasDocument && selectedDocument ? (
              <div className="space-y-3">
                {/* Document Preview */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {selectedDocument.originalFilename || 'Linked Receipt'}
                    </p>
                    <p className="text-xs text-white/50">
                      {selectedDocument.createdAt ? new Date(selectedDocument.createdAt).toLocaleDateString() : 'Document'}
                    </p>
                  </div>
                </div>

                {/* AI Summary */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-white/70 mb-2">AI Summary</h4>
                  {transaction.aiInsights && transaction.aiInsights.length > 0 ? (
                    <p className="text-sm text-white/80 leading-relaxed">
                      {transaction.aiInsights[0]}
                    </p>
                  ) : (
                    <p className="text-sm text-white/50 italic">
                      AI summary will appear here after Byte/Crystal process this receipt.
                    </p>
                  )}
                </div>

                {/* View Full Document Button */}
                {onViewDocument && (
                  <button
                    onClick={onViewDocument}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2.5 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Full Document
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                No linked document found for this transaction yet.
              </p>
            )}
          </div>
        )}
          </>
        )}
      </div>

      {/* Tag Explanation Modal */}
      {showExplanationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">Tag's Explanation</h3>
              </div>
              <button
                onClick={() => {
                  setShowExplanationModal(false);
                  setExplanationData(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {explanationData ? (
              <div className="space-y-4">
                {/* Category Source Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
                    {explanationData.category || 'Uncategorized'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    explanationData.categorySource === 'learned' 
                      ? 'bg-green-500/20 text-green-300'
                      : explanationData.categorySource === 'ai'
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-white/10 text-white/60'
                  }`}>
                    {explanationData.categorySource === 'learned' ? 'Learned' : 
                     explanationData.categorySource === 'ai' ? 'AI' : 
                     explanationData.categorySource || 'Unknown'}
                  </span>
                  {explanationData.confidence && (
                    <span className="text-xs text-white/60">
                      {Math.round(explanationData.confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                {/* Explanation Message */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-white/90 leading-relaxed">
                    {explanationData.message || 'No explanation available.'}
                  </p>
                </div>

                {/* Learning Stats */}
                {explanationData.learnedCount > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <Info className="w-4 h-4" />
                      <span>
                        Tag learned from {explanationData.learnedCount} of your past correction{explanationData.learnedCount > 1 ? 's' : ''}
                        {explanationData.lastLearnedAt && (
                          <span className="ml-1">
                            (last: {new Date(explanationData.lastLearnedAt).toLocaleDateString()})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-white/40 mx-auto mb-2" />
                <p className="text-sm text-white/60">Loading explanation...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Merchant Insights Modal */}
      {showMerchantInsightsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-blue-300" />
                </div>
                <h3 className="text-lg font-semibold text-white">Merchant Insights</h3>
              </div>
              <button
                onClick={() => {
                  setShowMerchantInsightsModal(false);
                  setMerchantInsightsData(null);
                }}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {merchantInsightsData ? (
              <div className="space-y-4">
                {/* Merchant Name */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-sm text-white/60 mb-1">Merchant</p>
                  <p className="text-base font-medium text-white">{merchantInsightsData.merchant}</p>
                </div>

                {/* Top Category */}
                {merchantInsightsData.topCategory ? (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-2">Most Common Category</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">
                        {merchantInsightsData.topCategory}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
                        Learned
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/60">No category pattern found yet</p>
                    <p className="text-xs text-white/40 mt-1">
                      Tag hasn't learned your preferences for this merchant yet. Correct a few transactions to help Tag learn!
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <p className="text-xs text-white/60 mb-1">Total Corrections</p>
                    <p className="text-2xl font-bold text-white">{merchantInsightsData.totalCorrections || 0}</p>
                  </div>
                  {merchantInsightsData.lastCorrectedAt && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <p className="text-xs text-white/60 mb-1">Last Corrected</p>
                      <p className="text-sm font-medium text-white">
                        {new Date(merchantInsightsData.lastCorrectedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Helpful Message */}
                {merchantInsightsData.totalCorrections > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs text-blue-300">
                      💡 Tag remembers your preferences! Future transactions from this merchant will be automatically categorized as <strong>{merchantInsightsData.topCategory}</strong>.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-white/40 mx-auto mb-2" />
                <p className="text-sm text-white/60">Loading insights...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPanel;


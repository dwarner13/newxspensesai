/**
 * CategoryRulesModal
 *
 * Full rules management interface - view, toggle, delete, and add new rules.
 * Opened from the "Manage Rules ->" link in TagWorkspacePanel.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import {
  addCategoryRule,
  toggleCategoryRule,
  deleteCategoryRule,
} from '../../lib/categoryRules';
import type { CategoryRule } from '../../lib/categoryRules';

const MATCH_TYPE_LABELS: Record<CategoryRule['match_type'], string> = {
  exact: 'Exact',
  contains: 'Contains',
  starts_with: 'Starts with',
  regex: 'Regex',
};

const MATCH_TYPE_COLORS: Record<CategoryRule['match_type'], string> = {
  exact: 'bg-violet-500/20 text-violet-300',
  contains: 'bg-sky-500/20 text-sky-300',
  starts_with: 'bg-amber-500/20 text-amber-300',
  regex: 'bg-rose-500/20 text-rose-300',
};

const DEFAULT_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transportation', 'Entertainment', 'Shopping',
  'Healthcare', 'Utilities', 'Travel', 'Income', 'Business', 'Education',
  'Home & Garden', 'Personal Care', 'Subscriptions', 'Bank Fees', 'Transfers',
  'Insurance', 'Housing', 'Cash & ATM', 'Health & Fitness', 'Dining', 'Other',
];

interface Props {
  rules: CategoryRule[];
  userCategories?: string[];
  onClose: () => void;
  onRefresh: () => void;
}

export function CategoryRulesModal({ rules, userCategories, onClose, onRefresh }: Props) {
  const { userId } = useAuth();
  const categoryList = [...new Set([...(userCategories || []), ...DEFAULT_CATEGORIES])].filter(Boolean);

  // New-rule form state
  const [showForm, setShowForm] = useState(rules.length === 0);
  const [newMatchType, setNewMatchType] = useState<CategoryRule['match_type']>('contains');
  const [newMatchValue, setNewMatchValue] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Per-row action states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [onClose]);

  const handleAdd = async () => {
    if (!newMatchValue.trim() || !newCategory || !userId) return;
    setIsAdding(true);
    const result = await addCategoryRule(userId, newMatchType, newMatchValue.trim(), newCategory);
    setIsAdding(false);
    if (result.ok) {
      toast.success('Rule added');
      setNewMatchValue('');
      setNewCategory('');
      setShowForm(false);
      onRefresh();
    } else {
      toast.error(result.error || 'Failed to add rule');
    }
  };

  const handleToggle = async (rule: CategoryRule) => {
    setTogglingId(rule.id);
    const ok = await toggleCategoryRule(rule.id, !rule.is_active);
    setTogglingId(null);
    if (ok) {
      onRefresh();
    } else {
      toast.error('Failed to update rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    setDeletingId(ruleId);
    const ok = await deleteCategoryRule(ruleId);
    setDeletingId(null);
    if (ok) {
      toast.success('Rule deleted');
      onRefresh();
    } else {
      toast.error('Failed to delete rule');
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Category Rules</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Rules run before AI - exact matches fire first
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New Rule
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* New-rule form */}
        {showForm && (
          <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
            <div className="flex items-end gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Type</label>
                <select
                  value={newMatchType}
                  onChange={(e) => setNewMatchType(e.target.value as CategoryRule['match_type'])}
                  className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                >
                  <option value="contains">Contains</option>
                  <option value="exact">Exact</option>
                  <option value="starts_with">Starts with</option>
                  <option value="regex">Regex</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">
                  Match value
                </label>
                <input
                  type="text"
                  value={newMatchValue}
                  onChange={(e) => setNewMatchValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                  placeholder={newMatchType === 'exact' ? 'STARBUCKS' : 'starbucks'}
                  className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                />
              </div>
              <div className="flex flex-col gap-1 w-44">
                <label className="text-[10px] text-slate-500 uppercase tracking-wide">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                >
                  <option value="" disabled>Select...</option>
                  {categoryList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => void handleAdd()}
                disabled={isAdding || !newMatchValue.trim() || !newCategory}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors disabled:opacity-40"
              >
                {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Add
              </button>
            </div>
          </div>
        )}

        {/* Rules list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-slate-400 mb-1">No rules yet</p>
              <p className="text-xs text-slate-600">
                Create a rule to auto-categorize future imports
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-5 py-2.5 text-[10px] text-slate-500 uppercase tracking-wide font-medium">Type</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-slate-500 uppercase tracking-wide font-medium">Match</th>
                  <th className="text-left px-3 py-2.5 text-[10px] text-slate-500 uppercase tracking-wide font-medium">Category</th>
                  <th className="text-right px-3 py-2.5 text-[10px] text-slate-500 uppercase tracking-wide font-medium">Used</th>
                  <th className="px-4 py-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className={`border-b border-white/[0.04] transition-colors ${rule.is_active ? '' : 'opacity-40'}`}
                  >
                    <td className="px-5 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${MATCH_TYPE_COLORS[rule.match_type]}`}>
                        {MATCH_TYPE_LABELS[rule.match_type]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-200 max-w-[180px] truncate" title={rule.match_value}>
                      {rule.match_value}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-[140px] truncate" title={rule.category}>
                      {"->"} {rule.category}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">
                      {rule.times_applied > 0 ? rule.times_applied.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle active */}
                        <button
                          onClick={() => void handleToggle(rule)}
                          disabled={togglingId === rule.id}
                          title={rule.is_active ? 'Disable rule' : 'Enable rule'}
                          className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          {togglingId === rule.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : rule.is_active ? (
                            <ToggleRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => void handleDelete(rule.id)}
                          disabled={deletingId === rule.id}
                          title="Delete rule"
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          {deletingId === rule.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {rules.filter((r) => r.is_active).length} active · {rules.length} total
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * CategoryRulesManager
 * Full CRUD UI for category_rules - create, edit, toggle, delete.
 */
import React, { useState } from 'react';
import { Plus, Trash2, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CategoryRule } from '../../lib/categoryRules';
import { createCategoryRule } from '../../lib/categoryRules';
import { useAuth } from '../../contexts/AuthContext';

const MATCH_TYPES: CategoryRule['match_type'][] = ['contains', 'exact', 'starts_with', 'regex'];

const DEFAULT_CATEGORIES = [
  'Income','Groceries','Food & Dining','Transportation','Housing',
  'Utilities','Shopping','Subscriptions','Entertainment','Healthcare','Insurance',
  'Education','Travel','Transfers','Bank Fees','Business',
  'Personal Care','Home & Garden','Other','Uncategorized',
];

interface Props {
  rules: CategoryRule[];
  isLoading: boolean;
  onDelete: (ruleId: string) => Promise<void>;
  onUpdate: (ruleId: string, patch: Partial<Pick<CategoryRule, 'match_value' | 'category' | 'subcategory' | 'match_type' | 'is_active'>>) => Promise<void>;
  onRefresh: () => void;
  categories?: string[];
}

export function CategoryRulesManager({ rules, isLoading, onDelete, onUpdate, onRefresh, categories }: Props) {
  const { userId } = useAuth();
  const catList = categories?.length ? categories : DEFAULT_CATEGORIES;

  // ── Create form state ────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newMatchValue, setNewMatchValue] = useState('');
  const [newCategory, setNewCategory] = useState(catList[0]);
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newMatchType, setNewMatchType] = useState<CategoryRule['match_type']>('contains');
  const [isSaving, setIsSaving] = useState(false);

  // ── Edit state ───────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMatchValue, setEditMatchValue] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editMatchType, setEditMatchType] = useState<CategoryRule['match_type']>('contains');

  const handleCreate = async () => {
    if (!userId || !newMatchValue.trim()) return;
    setIsSaving(true);
    const result = await createCategoryRule(
      userId,
      newMatchValue.trim(),
      newCategory,
      newMatchType,
      newSubcategory.trim() || null
    );
    setIsSaving(false);
    if (result.ok) {
      toast.success('Rule created');
      setNewMatchValue('');
      setNewSubcategory('');
      setShowCreate(false);
      onRefresh();
    } else {
      toast.error(result.error || 'Failed to create rule');
    }
  };

  const startEdit = (rule: CategoryRule) => {
    setEditingId(rule.id);
    setEditMatchValue(rule.match_value);
    setEditCategory(rule.category);
    setEditSubcategory(rule.subcategory || '');
    setEditMatchType(rule.match_type);
  };

  const handleSaveEdit = async (ruleId: string) => {
    await onUpdate(ruleId, {
      match_value: editMatchValue.trim().toUpperCase(),
      category: editCategory,
      subcategory: editSubcategory.trim() || null,
      match_type: editMatchType,
    });
    toast.success('Rule updated');
    setEditingId(null);
  };

  const handleDelete = async (ruleId: string) => {
    await onDelete(ruleId);
    toast.success('Rule deleted');
  };

  const handleToggle = async (rule: CategoryRule) => {
    await onUpdate(rule.id, { is_active: !rule.is_active });
    toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Category Rules</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{rules.length} rule{rules.length !== 1 ? 's' : ''} - Tag applies these on every import</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20 transition-colors"
        >
          <Plus className="h-3 w-3" />
          New Rule
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">New Rule</p>
          <div className="flex gap-2">
            <select
              value={newMatchType}
              onChange={(e) => setNewMatchType(e.target.value as CategoryRule['match_type'])}
              className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300"
            >
              {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              value={newMatchValue}
              onChange={(e) => setNewMatchValue(e.target.value)}
              placeholder="Match value (e.g. AMAZON)"
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1.5 text-[11px] text-slate-300"
            >
              {catList.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              placeholder="Subcategory (optional)"
              className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1.5 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleCreate}
              disabled={isSaving || !newMatchValue.trim()}
              className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {isLoading ? (
        <p className="text-[11px] text-slate-500 py-2">Loading rules...</p>
      ) : rules.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-2">No rules yet - create one above or run Auto-Tag to generate starter rules.</p>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl border px-3 py-2 transition-colors ${rule.is_active ? 'border-white/10 bg-white/[0.03]' : 'border-white/5 bg-white/[0.01] opacity-50'}`}
            >
              {editingId === rule.id ? (
                /* Edit mode */
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={editMatchType}
                      onChange={(e) => setEditMatchType(e.target.value as CategoryRule['match_type'])}
                      className="rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {MATCH_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      value={editMatchValue}
                      onChange={(e) => setEditMatchValue(e.target.value)}
                      className="flex-1 rounded-lg border border-violet-500/40 bg-slate-800 px-2 py-1 text-[11px] text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {catList.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      placeholder="Subcategory (optional)"
                      className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-2 py-1 text-[11px] text-white placeholder-slate-600 focus:outline-none"
                    />
                    <button onClick={() => handleSaveEdit(rule.id)} className="text-emerald-400 hover:text-emerald-300">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">{rule.match_type}</span>
                  <span className="flex-1 text-[11px] text-white font-mono truncate">{rule.match_value}</span>
                  <span className="text-[11px] text-violet-300 truncate max-w-[160px]">
                    {rule.subcategory ? `${rule.category} > ${rule.subcategory}` : rule.category}
                  </span>
                  {rule.times_applied > 0 && (
                    <span className="text-[10px] text-slate-500">×{rule.times_applied}</span>
                  )}
                  <button onClick={() => handleToggle(rule)} className="text-slate-500 hover:text-slate-300 shrink-0">
                    {rule.is_active ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => startEdit(rule)} className="text-slate-500 hover:text-violet-300 shrink-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="text-slate-500 hover:text-red-400 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

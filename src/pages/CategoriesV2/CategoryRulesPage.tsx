import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, ChevronLeft, ChevronDown, ChevronRight, Search, FlaskConical } from "lucide-react";
import toast from "react-hot-toast";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { THEME } from "./categoryConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

const CATEGORIES = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Entertainment','Healthcare','Insurance','Education',
  'Travel','Transfers','Bank Fees','Business','Personal Care','Home & Garden',
  'Needs Review',
];

interface Rule {
  id: string;
  merchant_pattern: string;
  category: string;
  subcategory: string | null;
  match_type: string;
  amount_min: number | null;
  amount_max: number | null;
  is_active: boolean;
  created_at: string;
}

function fmt(d: string) {
  try { return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

export default function CategoryRulesPage() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showDupesOnly, setShowDupesOnly] = useState(false);

  // Add form state
  const [newMerchant, setNewMerchant] = useState('');
  const [newCategory, setNewCategory] = useState('Food & Dining');
  const [newSubcategory, setNewSubcategory] = useState('');
  const [newMatchType, setNewMatchType] = useState('contains');

  // Edit state
  const [editCategory, setEditCategory] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');

  // Test state
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const sb = getSupabase(); if (!sb || !userId) return;
    setLoading(true);
    const { data, error } = await sb
      .from('category_rules')
      .select('id, merchant_pattern, category, subcategory, match_type, amount_min, amount_max, is_active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Failed to load rules:', error); toast.error('Failed to load rules'); }
    setRules((data || []) as Rule[]);
    setSelectedIds(new Set());
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const filtered = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter(r =>
      (r.merchant_pattern || '').toLowerCase().includes(q)
      || r.category.toLowerCase().includes(q)
      || (r.subcategory || '').toLowerCase().includes(q)
    );
  }, [rules, search]);

  // Duplicate detection — based on full rules list (not filtered), so the
  // duplicate flag survives a search that hides one of the dup pair.
  // A rule is "duplicated" when its (case-insensitive) merchant_pattern
  // appears more than once across the user's rules. This is the visual
  // signal for the manual cleanup tonight before tomorrow's schema
  // migration adds a real unique constraint.
  const duplicateMerchants = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rules) {
      const key = (r.merchant_pattern || '').toLowerCase().trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const dups = new Set<string>();
    for (const [key, n] of counts) {
      if (n > 1) dups.add(key);
    }
    return dups;
  }, [rules]);

  const isDuplicate = (rule: Rule) =>
    duplicateMerchants.has((rule.merchant_pattern || '').toLowerCase().trim());

  const duplicateCount = duplicateMerchants.size;

  // Filter further to duplicates-only when toggle is on.
  const filteredWithDupFilter = useMemo(() => {
    if (!showDupesOnly) return filtered;
    return filtered.filter(isDuplicate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, showDupesOnly, duplicateMerchants]);

  // Group filtered rules by category
  const grouped = useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const r of filteredWithDupFilter) {
      const cat = r.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    // Sort rules within each group alphabetically by merchant_pattern
    for (const [, group] of map) {
      group.sort((a, b) => (a.merchant_pattern || '').localeCompare(b.merchant_pattern || ''));
    }
    // Sort categories alphabetically
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredWithDupFilter]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWithDupFilter.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWithDupFilter.map(r => r.id)));
    }
  };

  const handleAdd = async () => {
    if (!newMerchant.trim()) { toast.error('Enter a merchant pattern'); return; }
    const sb = getSupabase(); if (!sb || !userId) return;
    const { error } = await sb.from('category_rules').upsert({
      user_id: userId,
      merchant_pattern: newMerchant.trim().toUpperCase(),
      match_type: newMatchType,
      category: newCategory,
      subcategory: newSubcategory.trim() || null,
      is_active: true,
    }, { onConflict: 'user_id,match_type,match_value' });
    if (error) { toast.error(error.message); return; }
    toast.success(`Rule saved for "${newMerchant.trim()}"`);
    setNewMerchant(''); setNewSubcategory(''); setShowAddForm(false);
    fetchRules();
  };

  const handleEdit = async (rule: Rule) => {
    const sb = getSupabase(); if (!sb || !userId) return;
    const { error } = await sb.from('category_rules').update({
      category: editCategory,
      subcategory: editSubcategory.trim() || null,
    }).eq('id', rule.id).eq('user_id', userId);
    if (error) { toast.error(error.message); return; }
    toast.success('Rule updated');
    setEditingId(null);
    fetchRules();
  };

  const handleDelete = async (rule: Rule) => {
    const sb = getSupabase(); if (!sb || !userId) return;
    const { error } = await sb.from('category_rules').delete().eq('id', rule.id).eq('user_id', userId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted rule for "${rule.merchant_pattern}"`);
    setDeleteConfirmId(null);
    fetchRules();
  };

  const handleBulkDelete = async () => {
    const sb = getSupabase(); if (!sb || !userId) return;
    const ids = [...selectedIds];
    const { error } = await sb.from('category_rules').delete().in('id', ids).eq('user_id', userId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Deleted ${ids.length} rule${ids.length !== 1 ? 's' : ''}`);
    setBulkDeleteConfirm(false);
    fetchRules();
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditCategory(rule.category);
    setEditSubcategory(rule.subcategory || '');
  };

  const handleTest = () => {
    if (!testQuery.trim()) { setTestResult(null); return; }
    const q = testQuery.trim().toLowerCase();
    const TYPE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    const sorted = [...rules].filter(r => r.is_active).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
    for (const rule of sorted) {
      const val = (rule.merchant_pattern || '').toLowerCase();
      let matched = false;
      if (rule.match_type === 'exact') matched = q === val;
      else if (rule.match_type === 'starts_with') matched = q.startsWith(val);
      else if (rule.match_type === 'contains') matched = q.includes(val);
      else if (rule.match_type === 'regex') { try { matched = new RegExp(rule.merchant_pattern, 'i').test(testQuery.trim()); } catch { /* skip */ } }
      if (matched) {
        setTestResult(`${rule.category}${rule.subcategory ? ' / ' + rule.subcategory : ''}`);
        return;
      }
    }
    setTestResult('No rule matches - would go to AI categorization');
  };

  const ruleCount = rules.length;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif", maxWidth: 900, margin: '0 auto', padding: '28px 24px', color: THEME.text }}>
      {/* Header */}
      <Reveal delay={0}>
        <button onClick={() => navigate('/dashboard/categories')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: THEME.textDim, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
          <ChevronLeft size={14} /> Back to Categories
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0 }}>Tag Rules</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {selectedIds.size > 0 && (
              bulkDeleteConfirm ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={handleBulkDelete} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: `${THEME.red}20`, border: `1px solid ${THEME.red}40`, color: THEME.red, cursor: 'pointer' }}>
                    Confirm delete {selectedIds.size}
                  </button>
                  <button onClick={() => setBulkDeleteConfirm(false)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: 'none', border: `1px solid ${THEME.border}`, color: THEME.textDim, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => setBulkDeleteConfirm(true)} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: `${THEME.red}15`, border: `1px solid ${THEME.red}30`, color: THEME.red, cursor: 'pointer' }}>
                  <Trash2 size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
                  Delete selected ({selectedIds.size})
                </button>
              )
            )}
            <button onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: THEME.cyan, border: 'none', color: '#0b1220', cursor: 'pointer' }}>
              <Plus size={14} strokeWidth={3} /> Add Rule
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: '0 0 24px 0' }}>
          {ruleCount > 0 ? `Tag has learned ${ruleCount} rule${ruleCount !== 1 ? 's' : ''} for your transactions` : 'No rules yet - Tag learns as you categorize'}
        </p>
      </Reveal>

      {/* Search + Test */}
      <Reveal delay={50}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
            <Search size={14} style={{ color: THEME.textDim, flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: THEME.text, fontSize: 13 }} />
          </div>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
            <FlaskConical size={14} style={{ color: THEME.cyan, flexShrink: 0 }} />
            <input value={testQuery} onChange={e => { setTestQuery(e.target.value); setTestResult(null); }} onKeyDown={e => e.key === 'Enter' && handleTest()} placeholder="Test a merchant name..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: THEME.text, fontSize: 13 }} />
            <button onClick={handleTest} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: `${THEME.cyan}20`, border: `1px solid ${THEME.cyan}40`, color: THEME.cyan, cursor: 'pointer' }}>Test</button>
          </div>
        </div>
        {testResult && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: `${THEME.cyan}08`, border: `1px solid ${THEME.cyan}20`, fontSize: 13, color: THEME.cyan }}>
            <strong>Result:</strong> {testResult}
          </div>
        )}
        {duplicateCount > 0 && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: '#fbbf24' }}>
              <strong>{duplicateCount}</strong> merchant{duplicateCount !== 1 ? 's have' : ' has'} duplicate rules. Same merchant, different rows — clean these up to prevent unpredictable categorization.
            </div>
            <button
              onClick={() => setShowDupesOnly(v => !v)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: showDupesOnly ? '#fbbf24' : 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: showDupesOnly ? '#0b1220' : '#fbbf24', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {showDupesOnly ? 'Show all rules' : 'Show duplicates only'}
            </button>
          </div>
        )}
      </Reveal>

      {/* Add Rule Form */}
      {showAddForm && (
        <Reveal delay={0}>
          <div style={{ marginBottom: 20, padding: 20, borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.borderLight}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 14 }}>New Rule</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: THEME.textDim, marginBottom: 4 }}>Merchant Pattern</label>
                <input value={newMerchant} onChange={e => setNewMerchant(e.target.value)} placeholder="e.g. Petro-Canada" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: THEME.textDim, marginBottom: 4 }}>Match</label>
                <select value={newMatchType} onChange={e => setNewMatchType(e.target.value)} style={{ padding: '8px 6px', borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 12, outline: 'none' }}>
                  <option value="contains">Contains</option>
                  <option value="exact">Exact</option>
                  <option value="starts_with">Starts with</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: THEME.textDim, marginBottom: 4 }}>Category</label>
                <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: 'none' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: THEME.textDim, marginBottom: 4 }}>Subcategory <span style={{ color: THEME.textDim }}>(opt)</span></label>
                <input value={newSubcategory} onChange={e => setNewSubcategory(e.target.value)} placeholder="e.g. Gas & Fuel" style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: THEME.bg, border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddForm(false)} style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'none', border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} style={{ padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: THEME.cyan, border: 'none', color: '#0b1220', cursor: 'pointer' }}>Save Rule</button>
            </div>
          </div>
        </Reveal>
      )}

      {/* Rules - grouped by category */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: THEME.textDim, fontSize: 13 }}>Loading rules...</div>
      ) : filteredWithDupFilter.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: THEME.textDim, fontSize: 13 }}>
          {showDupesOnly
            ? 'No duplicate rules — your data is clean.'
            : search
              ? 'No rules match your search'
              : 'No rules yet - categorize transactions with Tag to start building rules'}
        </div>
      ) : (
        <Reveal delay={100}>
          {/* Select all */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={selectedIds.size === filteredWithDupFilter.length && filteredWithDupFilter.length > 0} onChange={toggleSelectAll} style={{ accentColor: THEME.cyan }} />
            <span style={{ fontSize: 11, color: THEME.textDim }}>Select all ({filteredWithDupFilter.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map(([category, groupRules]) => {
              const isCollapsed = collapsedCategories.has(category);
              return (
                <div key={category} style={{ borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
                  {/* Category header */}
                  <div
                    onClick={() => toggleCategory(category)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: THEME.surface, cursor: 'pointer', userSelect: 'none' }}
                  >
                    {isCollapsed ? <ChevronRight size={14} style={{ color: THEME.textDim }} /> : <ChevronDown size={14} style={{ color: THEME.cyan }} />}
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.cyan }}>{category}</span>
                    <span style={{ fontSize: 11, color: THEME.textDim, background: `${THEME.cyan}12`, border: `1px solid ${THEME.cyan}20`, borderRadius: 8, padding: '1px 8px', fontWeight: 600 }}>
                      {groupRules.length} rule{groupRules.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Rules within category */}
                  {!isCollapsed && (
                    <div>
                      {/* Column headers */}
                      <div style={{ display: 'grid', gridTemplateColumns: '28px 2fr 80px 1fr 90px auto', padding: '6px 16px', borderTop: `1px solid ${THEME.border}`, borderBottom: `1px solid ${THEME.border}`, gap: 8, background: `${THEME.surface}80` }}>
                        <div />
                        {['Merchant', 'Match', 'Subcategory', 'Created', ''].map(h => (
                          <div key={h} style={{ fontSize: 9, fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                        ))}
                      </div>

                      {groupRules.map((rule, i) => (
                        <div key={rule.id} style={{
                          display: 'grid', gridTemplateColumns: '28px 2fr 80px 1fr 90px auto',
                          padding: '10px 16px', gap: 8, alignItems: 'center',
                          background: i % 2 === 0 ? THEME.bg : `${THEME.surface}40`,
                          borderBottom: i === groupRules.length - 1 ? 'none' : `1px solid ${THEME.border}22`,
                        }}>
                          {/* Checkbox */}
                          <input type="checkbox" checked={selectedIds.has(rule.id)} onChange={() => toggleSelect(rule.id)} style={{ accentColor: THEME.cyan }} />

                          {/* Merchant Pattern */}
                          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rule.merchant_pattern}
                            {isDuplicate(rule) && (
                              <span
                                title="Another rule exists for the same merchant pattern. Pick one to keep and delete the others."
                                style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', letterSpacing: 0.5, verticalAlign: 'middle' }}
                              >DUPLICATE</span>
                            )}
                            {rule.amount_min != null && <span style={{ fontSize: 10, color: THEME.textDim, marginLeft: 4 }}>{`>=$${rule.amount_min}`}</span>}
                            {rule.amount_max != null && <span style={{ fontSize: 10, color: THEME.textDim, marginLeft: 4 }}>{`<$${rule.amount_max}`}</span>}
                          </div>

                          {/* Match Type */}
                          <div style={{ fontSize: 11, color: THEME.textDim }}>{rule.match_type}</div>

                          {/* Subcategory (inline edit) */}
                          {editingId === rule.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ padding: '3px 6px', borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.borderLight}`, color: THEME.text, fontSize: 11, outline: 'none' }}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <input value={editSubcategory} onChange={e => setEditSubcategory(e.target.value)} placeholder="subcategory" style={{ padding: '3px 6px', borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.borderLight}`, color: THEME.text, fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: rule.subcategory ? THEME.textMuted : THEME.textDim, cursor: 'pointer' }} onClick={() => startEdit(rule)}>{rule.subcategory || '-'}</div>
                          )}

                          {/* Date */}
                          <div style={{ fontSize: 11, color: THEME.textDim }}>{fmt(rule.created_at)}</div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            {editingId === rule.id ? (
                              <>
                                <button onClick={() => handleEdit(rule)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${THEME.green}20`, border: `1px solid ${THEME.green}40`, color: THEME.green, cursor: 'pointer' }}>Save</button>
                                <button onClick={() => setEditingId(null)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'none', border: `1px solid ${THEME.border}`, color: THEME.textDim, cursor: 'pointer' }}>Cancel</button>
                              </>
                            ) : deleteConfirmId === rule.id ? (
                              <>
                                <button onClick={() => handleDelete(rule)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${THEME.red}20`, border: `1px solid ${THEME.red}40`, color: THEME.red, cursor: 'pointer' }}>Delete</button>
                                <button onClick={() => setDeleteConfirmId(null)} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'none', border: `1px solid ${THEME.border}`, color: THEME.textDim, cursor: 'pointer' }}>Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => setDeleteConfirmId(rule.id)} style={{ background: 'none', border: 'none', color: THEME.textDim, cursor: 'pointer', padding: 4 }} title="Delete rule">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: THEME.textDim, textAlign: 'right' }}>
            {filteredWithDupFilter.length} rule{filteredWithDupFilter.length !== 1 ? 's' : ''} in {grouped.length} categor{grouped.length !== 1 ? 'ies' : 'y'}{search ? ` matching "${search}"` : ''}{showDupesOnly ? ' (duplicates only)' : ''}
          </div>
        </Reveal>
      )}
    </div>
  );
}

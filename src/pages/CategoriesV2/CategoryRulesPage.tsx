import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, ChevronLeft, Search, FlaskConical } from "lucide-react";
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
  match_value: string;
  merchant_pattern: string;
  match_type: string;
  category: string;
  subcategory: string | null;
  min_amount: number | null;
  max_amount: number | null;
  is_active: boolean;
  times_applied: number;
  created_at: string;
  updated_at: string;
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
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Failed to load rules:', error); toast.error('Failed to load rules'); }
    setRules((data || []) as Rule[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const filtered = useMemo(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter(r =>
      (r.merchant_pattern || r.match_value || '').toLowerCase().includes(q)
      || r.category.toLowerCase().includes(q)
      || (r.subcategory || '').toLowerCase().includes(q)
    );
  }, [rules, search]);

  const handleAdd = async () => {
    if (!newMerchant.trim()) { toast.error('Enter a merchant pattern'); return; }
    const sb = getSupabase(); if (!sb || !userId) return;
    const { error } = await sb.from('category_rules').upsert({
      user_id: userId,
      match_value: newMerchant.trim().toUpperCase(),
      merchant_pattern: newMerchant.trim().toUpperCase(),
      match_type: newMatchType,
      category: newCategory,
      subcategory: newSubcategory.trim() || null,
      is_active: true,
      updated_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
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
    toast.success(`Deleted rule for "${rule.merchant_pattern || rule.match_value}"`);
    setDeleteConfirmId(null);
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
    // Mirror the matching logic from tag-categorize-committed.ts
    const TYPE_PRIORITY: Record<string, number> = { exact: 0, starts_with: 1, contains: 2, regex: 3 };
    const sorted = [...rules].filter(r => r.is_active).sort(
      (a, b) => (TYPE_PRIORITY[a.match_type] ?? 9) - (TYPE_PRIORITY[b.match_type] ?? 9)
    );
    for (const rule of sorted) {
      const val = (rule.match_value || rule.merchant_pattern || '').toLowerCase();
      let matched = false;
      if (rule.match_type === 'exact') matched = q === val;
      else if (rule.match_type === 'starts_with') matched = q.startsWith(val);
      else if (rule.match_type === 'contains') matched = q.includes(val);
      else if (rule.match_type === 'regex') { try { matched = new RegExp(rule.match_value, 'i').test(testQuery.trim()); } catch { /* skip */ } }
      if (matched) {
        setTestResult(`${rule.category}${rule.subcategory ? ' / ' + rule.subcategory : ''}`);
        return;
      }
    }
    setTestResult('No rule matches — would go to AI categorization');
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
          <button onClick={() => setShowAddForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: THEME.cyan, border: 'none', color: '#0b1220', cursor: 'pointer' }}>
            <Plus size={14} strokeWidth={3} /> Add Rule
          </button>
        </div>
        <p style={{ fontSize: 13, color: THEME.textMuted, margin: '0 0 24px 0' }}>
          {ruleCount > 0 ? `Tag has learned ${ruleCount} rule${ruleCount !== 1 ? 's' : ''} for your transactions` : 'No rules yet — Tag learns as you categorize'}
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

      {/* Rules Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: THEME.textDim, fontSize: 13 }}>Loading rules...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: THEME.textDim, fontSize: 13 }}>
          {search ? 'No rules match your search' : 'No rules yet — categorize transactions with Tag to start building rules'}
        </div>
      ) : (
        <Reveal delay={100}>
          <div style={{ borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 1.2fr 1fr 60px 90px auto', padding: '10px 16px', background: THEME.surface, borderBottom: `1px solid ${THEME.border}`, gap: 8 }}>
              {['Merchant Pattern', 'Match', 'Category', 'Subcategory', 'Used', 'Created', ''].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {filtered.map((rule, i) => (
              <div key={rule.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 80px 1.2fr 1fr 60px 90px auto',
                padding: '11px 16px', gap: 8, alignItems: 'center',
                background: i % 2 === 0 ? THEME.bg : `${THEME.surface}60`,
                borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${THEME.border}`,
              }}>
                {/* Merchant Pattern */}
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rule.merchant_pattern || rule.match_value}
                  {rule.min_amount != null && <span style={{ fontSize: 10, color: THEME.textDim, marginLeft: 4 }}>{`>=$${rule.min_amount}`}</span>}
                  {rule.max_amount != null && <span style={{ fontSize: 10, color: THEME.textDim, marginLeft: 4 }}>{`<$${rule.max_amount}`}</span>}
                </div>

                {/* Match Type */}
                <div style={{ fontSize: 11, color: THEME.textDim }}>{rule.match_type}</div>

                {/* Category */}
                {editingId === rule.id ? (
                  <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.borderLight}`, color: THEME.text, fontSize: 12, outline: 'none' }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <div style={{ fontSize: 12, color: THEME.cyan, fontWeight: 600, cursor: 'pointer' }} onClick={() => startEdit(rule)}>{rule.category}</div>
                )}

                {/* Subcategory */}
                {editingId === rule.id ? (
                  <input value={editSubcategory} onChange={e => setEditSubcategory(e.target.value)} placeholder="(none)" style={{ padding: '4px 6px', borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.borderLight}`, color: THEME.text, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                ) : (
                  <div style={{ fontSize: 12, color: rule.subcategory ? THEME.textMuted : THEME.textDim, cursor: 'pointer' }} onClick={() => startEdit(rule)}>{rule.subcategory || '—'}</div>
                )}

                {/* Times Applied */}
                <div style={{ fontSize: 11, color: THEME.textDim, textAlign: 'center' }}>{rule.times_applied || 0}x</div>

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

          <div style={{ marginTop: 12, fontSize: 11, color: THEME.textDim, textAlign: 'right' }}>
            {filtered.length} rule{filtered.length !== 1 ? 's' : ''}{search ? ` matching "${search}"` : ''}
          </div>
        </Reveal>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { X, TrendingUp, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';
import { useIsMobile } from '@/hooks/useIsMobile';
import { chatSize } from '@/theme/typography';
import type { CommittedTransaction, PendingTransaction } from '../../types/transactions';

type DrawerTransaction =
  | { kind: 'committed'; transaction: CommittedTransaction }
  | { kind: 'pending'; transaction: PendingTransaction };

interface TransactionInsightDrawerProps {
  open: boolean;
  row: DrawerTransaction | null;
  allCommittedTransactions: CommittedTransaction[];
  onClose: () => void;
  onApprovePending?: (pendingId: string) => Promise<void> | void;
  onRejectPending?: (pendingId: string) => Promise<void> | void;
  onEditCommitted?: (transaction: CommittedTransaction) => void;
  categories?: string[];
  onCommittedCategorySaved?: (txId: string, category: string) => void;
  onPendingCategorySaved?: (pendingId: string, category: string) => void;
  onAskTag?: (row: DrawerTransaction) => void;
  onFlagReview?: (row: DrawerTransaction) => void;
  tagInsight?: { category?: string; categorySource?: string; confidence?: number; message?: string; proactiveInsights?: string[]; merchantSeenCount?: number; isAmountAnomaly?: boolean } | null;
  tagInsightLoading?: boolean;
}

const TAX_INFO: Record<string, { label: string; color: string; bg: string; border: string }> = {
  Transportation:  { label: '✓ Deductible · CRA T2125 Line 9281', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Housing:         { label: '✓ Deductible · home-office % (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Utilities:       { label: '✓ Deductible · business-use % applies', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Healthcare:      { label: '✓ Deductible · medical expense credit', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Education:       { label: '✓ Deductible · training/tuition (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Insurance:       { label: '✓ Deductible · business coverage %', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Subscriptions:   { label: '✓ Likely deductible · if business use', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  'Bank Fees':     { label: '✓ Deductible · bank charges (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Travel:          { label: '~ Partially deductible · business purpose required', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  'Food & Dining': { label: '~ 50% deductible · meals & entertainment rule', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  Shopping:        { label: '~ May be deductible · business use only', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  Income:          { label: '• Taxable income · report on T2125', color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.12)' },
  Transfers:       { label: '• Not deductible', color: '#475569', bg: 'rgba(71,85,105,0.05)', border: 'rgba(71,85,105,0.12)' },
  Savings:         { label: '• Not deductible', color: '#475569', bg: 'rgba(71,85,105,0.05)', border: 'rgba(71,85,105,0.12)' },
  'Debt Payments': { label: '• Principal not deductible; interest may be', color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.12)' },
};
const QUICK_CATS = [
  { label: 'Gas', category: 'Transportation', emoji: '?' },
  { label: 'Groceries', category: 'Groceries', emoji: '??' },
  { label: 'Dining', category: 'Food & Dining', emoji: '???' },
  { label: 'Shopping', category: 'Shopping', emoji: '???' },
  { label: 'Income', category: 'Income', emoji: '??' },
  { label: 'Housing', category: 'Housing', emoji: '??' },
  { label: 'Health', category: 'Healthcare', emoji: '??' },
  { label: 'Transfer', category: 'Transfers', emoji: '??' },
];

const ALL_CATS = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Personal Care','Healthcare','Bank Fees','Transfers',
  'Savings','Debt Payments','Insurance','Education','Travel','Other',
];

function normalizeMerchant(v: string) { return v.toLowerCase().replace(/\s+/g, ' ').trim(); }
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TransactionInsightDrawer({
  open, row, allCommittedTransactions, onClose,
  onApprovePending, onRejectPending, onEditCommitted,
  onCommittedCategorySaved, onPendingCategorySaved,
  onAskTag,
  tagInsight, tagInsightLoading = false,
}: TransactionInsightDrawerProps) {
  const [localCategory, setLocalCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statementLabel, setStatementLabel] = useState<string | null>(null);
  // chatReply is kept because the category-change path ({handleCategoryClick}
  // still calls setChatReply when a rule-save is offered). The inline chat UI
  // that consumed it has been replaced by "Ask Tag about this", which routes
  // to the main Tag panel. setChatReply writes are now effectively no-op for
  // UI but we keep the state to avoid cascading deletions through the
  // rule-save + recategorize flow.
  const [, setChatReply] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState([{ amount: '', category: '' }, { amount: '', category: '' }]);
  const [localSubcategory, setLocalSubcategory] = useState('');
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([]);
  const [addingSubcategory, setAddingSubcategory] = useState(false);
  const [newSubcategoryText, setNewSubcategoryText] = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [linkedReceipt, setLinkedReceipt] = useState<any>(null);
  const [localType, setLocalType] = useState<'income' | 'expense'>('expense');
  const [isFlippingType, setIsFlippingType] = useState(false);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Reset on transaction change
  useEffect(() => {
    setChatReply(null);
    setShowAllCats(false);
    setSplitMode(false);
    setAddingSubcategory(false);
    setPendingRuleCategory(null);
    if (!row) { setLocalCategory(''); setLocalSubcategory(''); return; }
    if (row.kind === 'committed') {
      setLocalCategory(row.transaction.category || 'Uncategorized');
      setLocalSubcategory((row.transaction as any).subcategory || '');
      const rawType = ((row.transaction as any).type || '').toLowerCase();
      setLocalType(rawType === 'income' ? 'income' : 'expense');
    } else {
      const dj = row.transaction.data_json as Record<string, unknown>;
      setLocalCategory(String(row.transaction.tag_category || dj.category || 'Uncategorized'));
      setLocalSubcategory(String((dj as any).subcategory || ''));
      setLocalType('expense');
    }
  }, [row?.kind === 'committed' ? (row as any).transaction.id : null]);

  // Fetch linked receipt
  useEffect(() => {
    setLinkedReceipt(null);
    if (!row || row.kind !== 'committed') return;
    const tx = row.transaction as any;
    if (!tx.has_receipt && !tx.receipt_id) return;
    (async () => {
      try {
        const { getSupabase } = await import('../../lib/supabase');
        const sb = getSupabase(); if (!sb) return;
        const { data } = await sb.from('receipts').select('id, file_url, image_url, merchant_name, amount, receipt_date, suggested_category, match_status').eq('transaction_id', tx.id).maybeSingle();
        setLinkedReceipt(data);
      } catch { /* silent */ }
    })();
  }, [row?.kind === 'committed' ? (row as any).transaction.id : null]);

  // Fetch subcategory options when category changes
  useEffect(() => {
    if (!localCategory || localCategory === 'Uncategorized') { setSubcategoryOptions([]); return; }
    (async () => {
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase!.auth.getSession();
        if (!session) return;
        const res = await fetch(`/.netlify/functions/user-subcategories?category=${encodeURIComponent(localCategory)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSubcategoryOptions([...(data.built_in ?? []), ...(data.custom ?? []).map((c: any) => c.subcategory)]);
        }
      } catch { /* silent */ }
    })();
  }, [localCategory]);

  // Statement label
  useEffect(() => {
    if (!row || row.kind !== 'committed') { setStatementLabel(null); return; }
    const importId = row.transaction.import_id;
    if (!importId) { setStatementLabel(null); return; }
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: imp } = await supabase
          .from('imports')
          .select('statement_breakdown_json, file_url, filename, document_id')
          .eq('id', importId).single();
        const meta = (imp?.statement_breakdown_json as any)?.statement_meta;
        const metaIssuer = String(meta?.issuer || meta?.bank_name || '').trim();
        if (metaIssuer.length > 1) { setStatementLabel(metaIssuer); return; }
        if ((imp as any)?.filename) {
          const clean = String((imp as any).filename).replace(/\.pdf$/i, '').trim();
          if (!/^\d{4}|^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(clean)) {
            setStatementLabel(sanitizeIssuerPillLabel(clean)); return;
          }
        }
        const docId = (imp as any)?.document_id;
        if (docId) {
          const { data: doc } = await supabase.from('user_documents').select('original_name').eq('id', docId).maybeSingle();
          if (doc?.original_name) {
            const name = String(doc.original_name).replace(/\.pdf$/i, '').trim();
            if (!/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i.test(name)) {
              setStatementLabel(sanitizeIssuerPillLabel(name)); return;
            }
          }
        }
        const fileUrl = String((imp as any)?.file_url || '');
        if (fileUrl) {
          const raw = decodeURIComponent(fileUrl.split('/').pop() || '').replace(/\.pdf$/i, '').replace(/[^\x20-\x7E]/g, '').trim();
          const dateMatch = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
          if (dateMatch) {
            const d = new Date(`${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`);
            if (!isNaN(d.getTime())) {
              setStatementLabel(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
              return;
            }
          }
          if (raw && !/^[0-9a-f]{8}/i.test(raw) && raw.length > 2) {
            setStatementLabel(sanitizeIssuerPillLabel(raw)); return;
          }
        }
      } catch { /* ignore */ }
      setStatementLabel(`Statement �${importId.slice(-6)}`);
    })();
  }, [row]);

  // Derived values
  const rawMerchant = useMemo(() => {
    if (!row) return 'Unknown';
    if (row.kind === 'committed') return row.transaction.merchant_name || 'Unknown';
    return String((row.transaction.data_json as any)?.merchant || 'Unknown');
  }, [row]);

  const amount = useMemo(() => {
    if (!row) return 0;
    if (row.kind === 'committed') return Number(row.transaction.amount || 0);
    return Number((row.transaction.data_json as any)?.amount || 0);
  }, [row]);

  const postedAt = useMemo(() => {
    if (!row) return '';
    if (row.kind === 'committed') {
      const t = row.transaction as any;
      return t.posted_at || t.date || t.transaction_date || t.txn_date || '';
    }
    return String((row.transaction.data_json as any)?.date || '');
  }, [row]);

  // localType overrides the static isIncome once the drawer has initialised
  const effectiveIsIncome = localType === 'income';
  const amountColor = effectiveIsIncome ? '#10b981' : '#ef4444';
  const amountPrefix = effectiveIsIncome ? '+' : '-';

  const formattedDate = useMemo(() => {
    if (!postedAt) return null;
    const d = new Date(postedAt + (postedAt.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [postedAt]);

  // Month spend for this merchant
  const merchantMonthSpend = useMemo(() => {
    if (!rawMerchant || rawMerchant === 'Unknown') return 0;
    const norm = normalizeMerchant(rawMerchant);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return allCommittedTransactions
      .filter(t => normalizeMerchant(t.merchant_name || '') === norm)
      .filter(t => new Date(t.posted_at).getTime() >= monthStart)
      .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  }, [allCommittedTransactions, rawMerchant]);

  // Quick category tap
  const [pendingRuleCategory, setPendingRuleCategory] = useState<string | null>(null);

  const applyCategory = async (category: string) => {
    if (!row || row.kind !== 'committed') return;
    setLocalCategory(category);
    setIsSaving(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: row.transaction.id, table: 'transactions', category, applyToVendor: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      onCommittedCategorySaved?.(row.transaction.id, category);
      toast.success('Category updated');
      // Start Tag conversation about this change
      try {
        const chatRes = await fetch('/.netlify/functions/tag-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            message: '__system_category_changed__',
            merchant: rawMerchant,
            category,
            amount: Math.abs(Number(row.transaction.amount || 0)),
            context: 'quick_change',
            transactionId: row.transaction.id,
          }),
        });
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          setChatReply(chatData.reply || `Moved to **${category}**.`);
        }
      } catch { setChatReply(`Moved to **${category}**.`); }
    } catch {
      toast.error('Could not save category');
    } finally { setIsSaving(false); }
  };

  const saveTagRule = async () => {
    if (!pendingRuleCategory || !rawMerchant) return;
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ intent: 'save_rule', matchValue: rawMerchant, targetCategory: pendingRuleCategory, matchType: 'exact' }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Rule saved \u2014 Tag will remember this');
      setChatReply('Done \u2713 I\'ll automatically categorize future **' + rawMerchant + '** transactions as **' + pendingRuleCategory + '**.');
      setPendingRuleCategory(null);
    } catch {
      toast.error('Could not save rule');
    }
  };

  const handleSubcategoryChange = async (value: string) => {
    if (value === '__add_new__') { setAddingSubcategory(true); return; }
    setLocalSubcategory(value);
    if (!row || row.kind !== 'committed') return;
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: row.transaction.id, table: 'transactions', category: localCategory, subcategory: value }),
      });
    } catch { /* silent */ }
  };

  const saveNewSubcategory = async () => {
    const name = newSubcategoryText.trim();
    if (!name) return;
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      await fetch('/.netlify/functions/user-subcategories', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: localCategory, subcategory: name }),
      });
      setSubcategoryOptions(prev => [...prev, name]);
      setLocalSubcategory(name);
      await handleSubcategoryChange(name);
      setNewSubcategoryText('');
      setAddingSubcategory(false);
      toast.success('Subcategory saved');
    } catch { toast.error('Could not save subcategory'); }
  };

  // Type flip (income ↔ expense)
  const flipType = async (newType: 'income' | 'expense') => {
    if (!row || row.kind !== 'committed' || isFlippingType) return;
    if (localType === newType) return;
    setIsFlippingType(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ intent: 'fix_type', transactionId: row.transaction.id, newType }),
      });
      if (!res.ok) throw new Error(await res.text());
      setLocalType(newType);
      // Auto-correct category display when flipping to income
      if (newType === 'income') {
        setLocalCategory('Income');
        onCommittedCategorySaved?.(row.transaction.id, 'Income');
      }
      // Fire refresh event so the transactions list re-fetches without F5
      window.dispatchEvent(new Event('transactions:refresh'));
      toast.success(`Marked as ${newType}`);
    } catch {
      toast.error('Could not update type');
    } finally {
      setIsFlippingType(false);
    }
  };

  if (!open || !row) return null;

  const confidence = tagInsight?.confidence != null ? Math.round(tagInsight.confidence * 100) : null;
  const seenCount = tagInsight?.merchantSeenCount || 0;

  return (
    <>
      <button type="button" aria-label="Close" style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(11,18,32,0.7)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer' }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        zIndex: 1201, width: isMobile ? '100%' : 500,
        display: 'flex', flexDirection: 'column', background: '#080f1e',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '-8px 0 60px rgba(0,0,0,0.5)',
      }}>

        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>
        )}
        {/* HEADER */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? 17 : 22, fontWeight: 800, color: '#e8ecf4', letterSpacing: -0.5, lineHeight: 1.2, wordBreak: 'break-word' }}>{rawMerchant}</div>
            <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: amountColor, marginTop: 6, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{amountPrefix}${fmt(Math.abs(amount))}</div>
            {/* Meta row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {formattedDate && (
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{formattedDate}</span>
              )}
              {statementLabel && !/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(statementLabel) && statementLabel !== formattedDate && (
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{statementLabel}</span>
              )}
              {merchantMonthSpend > 0 && (
                <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{fmt(merchantMonthSpend)} this month</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* TAG CHANGED BANNER */}
          {row.kind === 'committed' && (row.transaction as any).category_source === 'user_chat' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(34,211,153,0.08)', border: '1px solid rgba(34,211,153,0.2)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Tag changed this category</div>
              <div style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>{new Date((row.transaction as any).updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          )}

          {/* TAG RULE BADGE */}
          {row.kind === 'committed' && ['tag_rule', 'user_rule', 'rule'].includes((row.transaction as any).category_source) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)', fontSize: 10, fontWeight: 700, color: '#22d3ee', width: 'fit-content' }}>
              {'\u26A1'} Tag rule
            </div>
          )}

          {/* RECEIPT ATTACHED */}
          {linkedReceipt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
              <span style={{ fontSize: 18 }}>{'\uD83E\uDDFE'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>Receipt attached</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{linkedReceipt.merchant_name}{linkedReceipt.amount ? ` \u00b7 $${Number(linkedReceipt.amount).toFixed(2)}` : ''}</div>
              </div>
              <button onClick={() => window.open(linkedReceipt.file_url || linkedReceipt.image_url, '_blank')} style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>View {'\uD83E\uDDFE'}</button>
            </div>
          )}
          {/* ATTACH RECEIPT */}
          {!linkedReceipt && row?.kind === 'committed' && (
            <div>
              <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} id={`receipt-attach-${(row.transaction as any).id}`} onChange={async (e) => {
                const file = e.target.files?.[0]; if (!file) return;
                const txId = (row.transaction as any).id;
                try {
                  const { getSupabase } = await import('../../lib/supabase');
                  const sb = getSupabase(); if (!sb) return;
                  const { data: { session } } = await sb.auth.getSession(); if (!session) return;
                  const reader = new FileReader();
                  reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const res = await fetch('/.netlify/functions/receipt-upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ image_base64: base64, mime_type: file.type, filename: file.name, transaction_id: txId }) });
                    const data = await res.json();
                    if (data.ok) { setLinkedReceipt({ id: data.receipt_id, merchant_name: data.merchant_name, amount: data.amount, file_url: data.file_url, match_status: 'matched' }); }
                  };
                  reader.readAsDataURL(file);
                } catch { /* silent */ }
                e.target.value = '';
              }} />
              <label htmlFor={`receipt-attach-${(row.transaction as any).id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#475569', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>{'\uD83E\uDDFE'} Attach Receipt</label>
            </div>
          )}

          {/* TAG VERDICT */}
          <div style={{ borderRadius: 14, background: 'rgba(34,211,153,0.05)', border: '1px solid rgba(34,211,153,0.15)' }}>
            {/* Verdict row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(34,211,153,0.08)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', border: '1px solid rgba(34,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{localCategory}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {tagInsightLoading ? 'Analyzing…' : [
                    confidence != null && confidence > 0 && `${confidence}% confidence`,
                    seenCount > 0 && `Seen ${seenCount}x`,
                    tagInsight?.categorySource && tagInsight.categorySource !== 'unknown' && tagInsight.categorySource,
                  ].filter(Boolean).join(' · ') || 'Current category'}
                </div>
                            {TAX_INFO[localCategory] && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: TAX_INFO[localCategory].bg, border: `1px solid ${TAX_INFO[localCategory].border}`, fontSize: 10, fontWeight: 700, color: TAX_INFO[localCategory].color, letterSpacing: '0.03em' }}>
                  {TAX_INFO[localCategory].label}
                </div>
              )}
              </div>
              {tagInsight?.isAmountAnomaly && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>⚠ Unusual</span>
              )}
            </div>
            {/* Tag message */}
            {(tagInsightLoading || tagInsight?.message) && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                {tagInsightLoading ? 'Analyzing this transaction…' : tagInsight?.message}
              </div>
            )}
            {/* Proactive insights */}
            {tagInsight?.proactiveInsights?.map((insight, i) => { const cleanInsight = insight.replace(/[?���?]/g, "�"); return (
              <div key={i} style={{ padding: '8px 14px', borderTop: '1px solid rgba(34,211,153,0.06)', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{cleanInsight}</div>
            ); })}
          </div>

          {/* SUBCATEGORY */}
          {localCategory && localCategory !== 'Uncategorized' && subcategoryOptions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#475569', width: 80, flexShrink: 0 }}>Subcategory</div>
              <select value={localSubcategory} onChange={e => void handleSubcategoryChange(e.target.value)} style={{ flex: 1, padding: '4px 8px', borderRadius: 8, background: '#0b1220', border: '1px solid #1e2d4a', color: localSubcategory ? '#f1f5f9' : '#475569', fontSize: 12, fontFamily: 'inherit' }}>
                <option value="">-- select --</option>
                {subcategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__add_new__">+ Add new...</option>
              </select>
            </div>
          )}
          {addingSubcategory && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input autoFocus placeholder="e.g. Hair & Grooming" value={newSubcategoryText} onChange={e => setNewSubcategoryText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveNewSubcategory(); if (e.key === 'Escape') setAddingSubcategory(false); }} style={{ flex: 1, padding: '6px 10px', borderRadius: 8, background: '#0b1220', border: '1px solid rgba(34,211,238,0.4)', color: '#f1f5f9', fontSize: 12, outline: 'none' }} />
              <button onClick={() => void saveNewSubcategory()} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', cursor: 'pointer' }}>Save</button>
            </div>
          )}

          {/* TYPE TOGGLE */}
          {row.kind === 'committed' && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Transaction type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['expense', 'income'] as const).map(t => {
                  const active = localType === t;
                  const activeColor = t === 'income' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.14)';
                  const activeBorder = t === 'income' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
                  const activeText = t === 'income' ? '#10b981' : '#ef4444';
                  return (
                    <button key={t} type="button" onClick={() => void flipType(t)} disabled={isFlippingType}
                      style={{ padding: '7px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: isFlippingType ? 'not-allowed' : 'pointer', transition: 'all 0.15s', background: active ? activeColor : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? activeBorder : 'rgba(255,255,255,0.08)'}`, color: active ? activeText : '#475569', opacity: isFlippingType ? 0.6 : 1 }}>
                      {t === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUICK CATEGORY CHIPS */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 8 }}>Quick change</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_CATS.map(q => (
                <button key={q.category} type="button" onClick={() => void applyCategory(q.category)} disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: localCategory === q.category ? 'rgba(34,211,153,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${localCategory === q.category ? 'rgba(34,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`, color: localCategory === q.category ? '#22d3ee' : '#cbd5e1' }}>
                  {q.label}
                </button>
              ))}
              <button type="button" onClick={() => setShowAllCats(v => !v)}
                style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}>
                {showAllCats ? 'Less ?' : 'More ?'}
              </button>
            </div>
            {showAllCats && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {ALL_CATS.filter(c => !QUICK_CATS.find(q => q.category === c)).map(c => (
                  <button key={c} type="button" onClick={() => { void applyCategory(c); setShowAllCats(false); }} disabled={isSaving}
                    style={{ padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: localCategory === c ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${localCategory === c ? 'rgba(34,211,153,0.3)' : 'rgba(255,255,255,0.06)'}`, color: localCategory === c ? '#22d3ee' : '#64748b' }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ask Tag CTA — hands off to the main Tag panel with context pre-injected */}
          {row?.kind === 'committed' && onAskTag && (
            <button
              type="button"
              onClick={() => onAskTag(row)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '12px 14px', borderRadius: 12,
                background: 'rgba(34,211,238,0.08)',
                border: '1px solid rgba(34,211,238,0.25)',
                color: '#22d3ee', fontSize: chatSize(isMobile), fontWeight: 700,
                cursor: 'pointer', marginTop: 4,
                transition: 'background 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.14)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.08)'; }}
            >
              <MessageSquare style={{ width: 16, height: 16 }} />
              <span>Ask Tag about this</span>
            </button>
          )}

        </div>

        {/* FOOTER — transaction actions (Split/Close) */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* SPLIT UI */}
          {splitMode && row?.kind === 'committed' && (() => {
            const totalAmt = Math.abs(Number(row.transaction.amount || 0));
            const splitsSum = splits.reduce((s, sp) => s + Math.abs(Number(sp.amount || 0)), 0);
            const remaining = Math.round((totalAmt - splitsSum) * 100) / 100;
            const saveSplit = async () => {
              if (Math.abs(remaining) > 0.02) return;
              try {
                const supabase = getSupabase();
                const { data: { session } } = await supabase!.auth.getSession();
                const token = session?.access_token ?? '';
                const res = await fetch('/.netlify/functions/tx-split', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ originalId: row.transaction.id, splits: splits.map(sp => ({ amount: Number(sp.amount), category: sp.category || localCategory })) }),
                });
                if (res.ok) { toast.success('Transaction split'); setSplitMode(false); onCommittedCategorySaved?.(row.transaction.id, splits[0].category || localCategory); }
                else toast.error('Split failed');
              } catch { toast.error('Split failed'); }
            };
            return (
              <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid #1e2d4a' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>Split ${totalAmt.toFixed(2)}</div>
                {splits.map((sp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <input type="number" value={sp.amount} onChange={e => { const n = [...splits]; n[i] = { ...n[i], amount: e.target.value }; setSplits(n); }} placeholder="$" style={{ width: 72, padding: '5px 8px', borderRadius: 8, background: '#0b1220', border: '1px solid #1e2d4a', color: '#f1f5f9', fontSize: 12 }} />
                    <select value={sp.category} onChange={e => { const n = [...splits]; n[i] = { ...n[i], category: e.target.value }; setSplits(n); }} style={{ flex: 1, padding: '5px 8px', borderRadius: 8, background: '#0b1220', border: '1px solid #1e2d4a', color: '#f1f5f9', fontSize: 12 }}>
                      <option value="">Category</option>
                      {ALL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {splits.length > 2 && <button onClick={() => setSplits(splits.filter((_, j) => j !== i))} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>{"\u2715"}</button>}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: Math.abs(remaining) < 0.02 ? '#34d399' : '#ef4444' }}>
                    {Math.abs(remaining) < 0.02 ? '\u2713 Balanced' : `$${Math.abs(remaining).toFixed(2)} ${remaining > 0 ? 'remaining' : 'over'}`}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setSplits([...splits, { amount: '', category: '' }])} style={{ fontSize: 11, color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
                    <button onClick={() => void saveSplit()} disabled={Math.abs(remaining) > 0.02} style={{ padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 700, background: Math.abs(remaining) < 0.02 ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(34,211,238,0.3)', color: Math.abs(remaining) < 0.02 ? '#22d3ee' : '#475569', cursor: Math.abs(remaining) < 0.02 ? 'pointer' : 'not-allowed' }}>Save Split</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          {row.kind === 'pending' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => void onApprovePending?.(row.transaction.id)} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              <button type="button" onClick={() => void onRejectPending?.(row.transaction.id)} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              <button type="button" onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => setSplitMode(v => !v)} style={{ padding: '10px', borderRadius: 10, border: splitMode ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.08)', background: splitMode ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)', color: splitMode ? '#22d3ee' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{splitMode ? 'Cancel Split' : 'Split'}</button>
              <button type="button" onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

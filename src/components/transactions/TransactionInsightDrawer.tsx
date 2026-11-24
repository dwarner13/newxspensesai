import { useEffect, useMemo, useState } from 'react';
import { factsFromStatementMeta, withDocumentPeriod, accountText, statementText, type StatementFacts } from '@/lib/statementFacts';
import { X, TrendingUp, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';
import { formatCalendarDate } from '../../lib/calendarDate';
import { describeCategorySource, describeMerchantHistory, isPotentiallyTaxRelevant, MERCHANT_HISTORY_CAP, TAX_NOTE } from '../../lib/tagExplanation';
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
  tagInsight?: { category?: string; categorySource?: string; confidence?: number; message?: string; proactiveInsights?: string[]; merchantSeenCount?: number; merchantSeenCapped?: boolean; isAmountAnomaly?: boolean } | null;
  tagInsightLoading?: boolean;
  onBackToChat?: () => void;
  /** D-3: "Done" after a confirmed save; the page returns to this transaction in its list. */
  onDone?: (transactionId: string) => void;
}

const QUICK_CATS = [
  { label: 'Gas', category: 'Transportation', emoji: '⛽' },
  { label: 'Groceries', category: 'Groceries', emoji: '🛒' },
  { label: 'Dining', category: 'Food & Dining', emoji: '🍽️' },
  { label: 'Shopping', category: 'Shopping', emoji: '🛍️' },
  { label: 'Income', category: 'Income', emoji: '💰' },
  { label: 'Housing', category: 'Housing', emoji: '🏠' },
  { label: 'Health', category: 'Healthcare', emoji: '🏥' },
  { label: 'Transfer', category: 'Transfers', emoji: '🔄' },
];

const ALL_CATS = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Personal Care','Healthcare','Bank Fees','Transfers',
  'Savings','Debt Payments','Insurance','Education','Travel','Other',
];

function normalizeMerchant(v: string) { return v.toLowerCase().replace(/\s+/g, ' ').trim(); }
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// LIVE-UI-01: one lookup per import per session; reopening a transaction shows its facts at once.
const STATEMENT_FACTS_CACHE = new Map<string, StatementFacts>();

export function TransactionInsightDrawer({
  open, row, allCommittedTransactions, onClose,
  onApprovePending, onRejectPending, onEditCommitted,
  onCommittedCategorySaved, onPendingCategorySaved,
  onAskTag,
  tagInsight, tagInsightLoading = false,
  onBackToChat,
  onDone,
}: TransactionInsightDrawerProps) {
  const [localCategory, setLocalCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // LIVE-UI-04: verified account / statement-period facts. `undefined` = still loading
  // (cells keep their height), `null` = not a committed transaction.
  const [statementMeta, setStatementMeta] = useState<StatementFacts | null | undefined>(undefined);
  // D-3: shown only after a save was confirmed by the server.
  const [savedNotice, setSavedNotice] = useState<{ kind: 'category' | 'subcategory'; value: string } | null>(null);
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
    setSavedNotice(null);
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
      const pendingAmt = Number((dj as any).amount || 0);
      setLocalType(pendingAmt > 0 ? 'income' : 'expense');
    }
  }, [row?.kind === 'committed' ? (row as any).transaction.id : (row?.transaction?.id ?? null)]);

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
        if (!data) { setLinkedReceipt(null); return; }
        // C2-A2: private bucket - open the file through a short-lived signed URL only.
        const { resolveReceiptFileUrls } = await import('../../lib/receipts/receiptFileUrl');
        const ref = String(data.file_url || data.image_url || '').trim();
        const signed = ref ? await resolveReceiptFileUrls(sb, [ref]) : new Map<string, string>();
        setLinkedReceipt({ ...data, view_url: signed.get(ref) || null });
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

  // LIVE-UI-01 / LIVE-UI-04: statement facts are keyed by the transaction's import, not
  // by the `row` object. The page builds a new row object on every render, so the old
  // [row] dependency cleared and refetched Account / Statement each time Tag's insight
  // loaded or the list refreshed, and the header resized under the Tag category card.
  const committedImportId = row?.kind === 'committed' ? (row.transaction.import_id || null) : null;
  const isCommittedRow = row?.kind === 'committed';
  useEffect(() => {
    if (!isCommittedRow || !committedImportId) { setStatementMeta(null); return; }
    const cached = STATEMENT_FACTS_CACHE.get(committedImportId);
    if (cached) { setStatementMeta(cached); return; }
    setStatementMeta(undefined);
    let cancelled = false;
    (async () => {
      let facts: StatementFacts = { issuer: null, last4: null, period: null };
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data: imp } = await supabase
            .from('imports')
            .select('statement_breakdown_json, document_id')
            .eq('id', committedImportId).maybeSingle();
          facts = factsFromStatementMeta((imp?.statement_breakdown_json as any)?.statement_meta, sanitizeIssuerPillLabel);
          // Next verified sources (agreed order, L-D3): Vision's extracted period, then the period
          // text as printed. Only those two JSON paths are selected (no OCR text); an error
          // leaves the period empty, so the cell reads "Statement period unavailable".
          const docId = (imp as any)?.document_id;
          if (!facts.period && docId) {
            const { data: doc, error: docError } = await supabase
              .from('user_documents')
              .select('period_start, period_end, vision_period:extracted_data->claude_vision->period, printed_period:metadata->statement_summary->>statement_period')
              .eq('id', docId).maybeSingle();
            if (!docError) facts = withDocumentPeriod(facts, doc as any);
          }
          STATEMENT_FACTS_CACHE.set(committedImportId, facts);
        }
      } catch { /* show "unavailable" rather than a guess */ }
      if (!cancelled) setStatementMeta(facts);
    })();
    return () => { cancelled = true; };
  }, [isCommittedRow, committedImportId]);

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

  // D-1: posted_at is stored as UTC midnight; format its calendar day so Mountain-time
  // users see the statement's date (Jun 16), not the previous day. Display only.
  const formattedDate = useMemo(() => formatCalendarDate(postedAt, 'long'), [postedAt]);

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
    if (!row) return;
    // D-3: remember the confirmed value so a failed save can be rolled back on screen.
    const previousCategory = localCategory;
    setSavedNotice(null);
    setLocalCategory(category);
    setIsSaving(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const table = row.kind === 'pending' ? 'transactions_staging' : 'transactions';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: row.transaction.id, table, category, applyToVendor: row.kind === 'committed' }),
      });
      if (!res.ok) throw new Error(await res.text());
      if (row.kind === 'committed') {
        onCommittedCategorySaved?.(row.transaction.id, category);
      } else {
        onPendingCategorySaved?.(row.transaction.id, category);
      }
      toast.success('Category updated');
      // D-3: confirmed only after tx-update-category returned ok.
      setSavedNotice({ kind: 'category', value: category });
      // Start Tag conversation about this change (committed only)
      if (row.kind === 'committed') {
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
      }
    } catch {
      // D-3: the save was not confirmed — show the last saved category again.
      setLocalCategory(previousCategory);
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
    // D-3: previously a failed subcategory save was silent and still looked saved.
    const previousSubcategory = localSubcategory;
    setSavedNotice(null);
    setLocalSubcategory(value);
    if (!row) return;
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const table = row.kind === 'pending' ? 'transactions_staging' : 'transactions';
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: row.transaction.id, table, category: localCategory, subcategory: value }),
      });
      if (!res.ok) throw new Error('subcategory save failed');
      setSavedNotice({ kind: 'subcategory', value: value || 'None' });
    } catch {
      setLocalSubcategory(previousSubcategory);
      toast.error('Could not save subcategory');
    }
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
    if (!row || isFlippingType) return;
    if (localType === newType) return;
    setIsFlippingType(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';

      if (row.kind === 'pending') {
        // Flip sign via tx-update-amount (negates data_json.amount, re-runs recon gate).
        // Category is NOT changed — sign and category are independent facts.
        const currentAmount = Number((row.transaction.data_json as any)?.amount || 0);
        const res = await fetch('/.netlify/functions/tx-update-amount', {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: row.transaction.id, amount: -currentAmount }),
        });
        if (!res.ok) throw new Error(await res.text());
        setLocalType(newType);
        onPendingCategorySaved?.(row.transaction.id, localCategory);
        toast.success(`Marked as ${newType}`);
      } else {
        // Committed path: use tag-action fix_type
        const res = await fetch('/.netlify/functions/tag-action', {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ intent: 'fix_type', transactionId: row.transaction.id, newType }),
        });
        if (!res.ok) throw new Error(await res.text());
        setLocalType(newType);
        if (newType === 'income') {
          setLocalCategory('Income');
          onCommittedCategorySaved?.(row.transaction.id, 'Income');
        }
        window.dispatchEvent(new Event('transactions:refresh'));
        toast.success(`Marked as ${newType}`);
      }
    } catch {
      toast.error('Could not update type');
    } finally {
      setIsFlippingType(false);
    }
  };

  if (!open || !row) return null;

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

        {/* Mobile drag handle + safe-area inset */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'max(10px, env(safe-area-inset-top, 10px))', paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>
        )}

        {/* Back to Conversation bar — only when opened from chat Action Receipt */}
        {onBackToChat && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0 16px' : '0 20px', paddingTop: isMobile ? 0 : 'max(0px, env(safe-area-inset-top, 0px))', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <button
              type="button"
              onClick={onBackToChat}
              aria-label="Back to Conversation"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                minHeight: 44, padding: '8px 4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#fbbf24',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <span aria-hidden="true" style={{ fontSize: 14 }}>{'\u2190'}</span>
              Back to Conversation
            </button>
            <button type="button" onClick={onClose} aria-label="Close transaction details" style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8d0e0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        )}

        {/* HEADER */}
        <div style={{ padding: onBackToChat ? '12px 20px 16px' : '20px 20px 16px', paddingTop: !onBackToChat && !isMobile ? 'max(20px, env(safe-area-inset-top, 20px))' : (onBackToChat ? 12 : 20), borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#e8ecf4', letterSpacing: -0.4, lineHeight: 1.2, wordBreak: 'break-word' }}>{rawMerchant}</h2>
            <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: amountColor, marginTop: 6, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{amountPrefix}${fmt(Math.abs(amount))}</div>
            {/* D-2: facts grid — date, account and statement are prominent and readable */}
            <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px', margin: '14px 0 0' }}>
              {formattedDate && (
                <div style={{ minWidth: 0 }}>
                  <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ba8bc' }}>Date</dt>
                  <dd style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 600, color: '#e8ecf4' }}>{formattedDate}</dd>
                </div>
              )}
              {statementMeta !== null && (
                <div style={{ minWidth: 0 }}>
                  <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ba8bc' }}>Account</dt>
                  <dd style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 600, color: statementMeta && accountText(statementMeta) ? '#e8ecf4' : '#9ba8bc', overflowWrap: 'anywhere', minHeight: 20 }}>
                    {statementMeta === undefined ? <span aria-label="Loading account">…</span> : (accountText(statementMeta) || 'Account not recorded')}
                  </dd>
                </div>
              )}
              {statementMeta !== null && (
                <div style={{ minWidth: 0 }}>
                  <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ba8bc' }}>Statement</dt>
                  <dd style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 600, color: statementMeta?.period ? '#e8ecf4' : '#9ba8bc', overflowWrap: 'anywhere', minHeight: 20 }}>
                    {statementMeta === undefined ? <span aria-label="Loading statement period">…</span> : statementText(statementMeta)}
                  </dd>
                </div>
              )}
              {merchantMonthSpend > 0 && (
                <div style={{ minWidth: 0 }}>
                  <dt style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ba8bc' }}>This month here</dt>
                  <dd style={{ margin: '3px 0 0', fontSize: 15, fontWeight: 600, color: '#e8ecf4' }}>${fmt(merchantMonthSpend)}</dd>
                </div>
              )}
            </dl>
          </div>
          {/* Only show standalone X when Back to Conversation bar is NOT present (avoids double X) */}
          {!onBackToChat && (
            <button type="button" onClick={onClose} aria-label="Close transaction details" style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8d0e0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          )}
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* D-3: SUCCESSFUL CORRECTION — only after the server confirmed the save */}
          {savedNotice && (
            <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.35)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(52,211,153,0.18)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>{'✓'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e8ecf4' }}>
                    {savedNotice.kind === 'category' ? `Saved — category is now ${savedNotice.value}` : `Saved — subcategory is now ${savedNotice.value}`}
                  </div>
                  <div style={{ fontSize: 13, color: '#9ba8bc', marginTop: 2 }}>Saved to this transaction.</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { if (onDone) onDone(row.transaction.id); else onClose(); }} style={{ flex: 1, minHeight: 44, borderRadius: 12, border: 'none', background: '#34d399', color: '#062018', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Done</button>
                <button type="button" onClick={() => setSavedNotice(null)} style={{ flex: 1, minHeight: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#c8d0e0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Keep editing</button>
              </div>
            </div>
          )}

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
              {linkedReceipt.view_url && <button onClick={() => window.open(linkedReceipt.view_url, '_blank', 'noopener,noreferrer')} style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>View {'\uD83E\uDDFE'}</button>}
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
                    if (data.ok) { setLinkedReceipt({ id: data.receipt_id, merchant_name: data.merchant_name, amount: data.amount, file_url: data.file_path ?? null, view_url: data.file_url ?? null, match_status: 'matched' }); }
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
              <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, rgba(34,211,238,0.35) 0%, rgba(34,211,238,0.06) 100%)', border: '1.5px solid rgba(34,211,238,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#67e8f9' }}>Category</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', marginTop: 2 }}>{localCategory}</div>
                {/* D-5: no confidence percentage (often a heuristic); plain-language source and
                    approximate merchant history only. */}
                <div style={{ fontSize: 13, color: '#9ba8bc', marginTop: 2 }}>
                  {tagInsightLoading ? 'Analyzing…' : [
                    describeCategorySource(tagInsight?.categorySource),
                    tagInsight?.merchantSeenCapped ? describeMerchantHistory(MERCHANT_HISTORY_CAP) : describeMerchantHistory(seenCount),
                  ].filter(Boolean).join(' · ') || 'Current category'}
                </div>
                {isPotentiallyTaxRelevant(localCategory) && (
                  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.2)', fontSize: 12, fontWeight: 600, color: '#c8d0e0' }}>
                    {TAX_NOTE}
                  </div>
                )}
              </div>
              {tagInsight?.isAmountAnomaly && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>⚠ Unusual</span>
              )}
            </div>
            {/* Tag message */}
            {(tagInsightLoading || tagInsight?.message) && (
              <div aria-busy={tagInsightLoading || undefined} style={{ padding: '12px 14px', fontSize: 15, color: '#dbe3ef', lineHeight: 1.6, minHeight: 72, boxSizing: 'border-box' }}>
                {tagInsightLoading ? 'Analyzing this transaction…' : tagInsight?.message}
              </div>
            )}
            {/* Proactive insights */}
            {tagInsight?.proactiveInsights?.map((insight, i) => { const cleanInsight = insight.replace(/[\u{1F300}-\u{1F9FF}]/gu, ""); return (
              <div key={i} style={{ padding: '10px 14px', borderTop: '1px solid rgba(34,211,153,0.06)', fontSize: 14, color: '#b7c2d3', lineHeight: 1.55 }}>{cleanInsight}</div>
            ); })}
          </div>

          {/* SUBCATEGORY */}
          {localCategory && localCategory !== 'Uncategorized' && subcategoryOptions.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#9ba8bc' }}>Subcategory</span>
              <select value={localSubcategory} onChange={e => void handleSubcategoryChange(e.target.value)} style={{ minHeight: 44, padding: '0 12px', borderRadius: 10, background: '#0b1220', border: '1px solid #24365a', color: localSubcategory ? '#f1f5f9' : '#9ba8bc', fontSize: 15, fontFamily: 'inherit' }}>
                <option value="">-- select --</option>
                {subcategoryOptions.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__add_new__">+ Add new...</option>
              </select>
            </label>
          )}
          {addingSubcategory && (
            <div style={{ display: 'flex', gap: 6 }}>
              <input autoFocus aria-label="New subcategory name" placeholder="e.g. Hair & Grooming" value={newSubcategoryText} onChange={e => setNewSubcategoryText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveNewSubcategory(); if (e.key === 'Escape') setAddingSubcategory(false); }} style={{ flex: 1, minHeight: 44, padding: '0 12px', borderRadius: 10, background: '#0b1220', border: '1px solid rgba(34,211,238,0.4)', color: '#f1f5f9', fontSize: 16, outline: 'none' }} />
              <button onClick={() => void saveNewSubcategory()} style={{ minHeight: 44, padding: '0 16px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', cursor: 'pointer' }}>Save</button>
            </div>
          )}

          {/* TYPE TOGGLE */}
          {(row.kind === 'committed' || row.kind === 'pending') && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ba8bc', marginBottom: 8 }}>Transaction type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['expense', 'income'] as const).map(t => {
                  const active = localType === t;
                  const activeColor = t === 'income' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.14)';
                  const activeBorder = t === 'income' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
                  const activeText = t === 'income' ? '#10b981' : '#ef4444';
                  return (
                    <button key={t} type="button" onClick={() => void flipType(t)} disabled={isFlippingType}
                      aria-pressed={active}
                      style={{ minHeight: 44, padding: '0 20px', borderRadius: 22, fontSize: 14, fontWeight: 700, cursor: isFlippingType ? 'not-allowed' : 'pointer', transition: 'all 0.15s', background: active ? activeColor : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? activeBorder : 'rgba(255,255,255,0.1)'}`, color: active ? activeText : '#9ba8bc', opacity: isFlippingType ? 0.6 : 1 }}>
                      {t === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUICK CATEGORY CHIPS */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ba8bc', marginBottom: 8 }}>Change category</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {QUICK_CATS.map(q => (
                <button key={q.category} type="button" onClick={() => void applyCategory(q.category)} disabled={isSaving}
                  aria-pressed={localCategory === q.category}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, minHeight: 44, padding: '0 14px', borderRadius: 22, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: localCategory === q.category ? 'rgba(34,211,153,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${localCategory === q.category ? 'rgba(34,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`, color: localCategory === q.category ? '#22d3ee' : '#cbd5e1' }}>
                  {q.label}
                </button>
              ))}
              <button type="button" onClick={() => setShowAllCats(v => !v)} aria-expanded={showAllCats}
                style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#9ba8bc' }}>
                {showAllCats ? 'Fewer categories ▲' : 'All categories ▼'}
              </button>
            </div>
            {showAllCats && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {ALL_CATS.filter(c => !QUICK_CATS.find(q => q.category === c)).map(c => (
                  <button key={c} type="button" onClick={() => { void applyCategory(c); setShowAllCats(false); }} disabled={isSaving}
                    aria-pressed={localCategory === c}
                    style={{ minHeight: 44, padding: '0 14px', borderRadius: 22, fontSize: 14, fontWeight: 600, cursor: 'pointer', background: localCategory === c ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${localCategory === c ? 'rgba(34,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, color: localCategory === c ? '#22d3ee' : '#b7c2d3' }}>
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
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
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
              <button type="button" onClick={() => setSplitMode(v => !v)} aria-expanded={splitMode} style={{ minHeight: 46, padding: '0 10px', borderRadius: 12, border: splitMode ? '1px solid rgba(34,211,238,0.3)' : '1px solid rgba(255,255,255,0.1)', background: splitMode ? 'rgba(34,211,238,0.1)' : 'rgba(255,255,255,0.04)', color: splitMode ? '#22d3ee' : '#c8d0e0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{splitMode ? 'Cancel split' : 'Split'}</button>
              <button type="button" onClick={onClose} style={{ minHeight: 46, padding: '0 10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#c8d0e0', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

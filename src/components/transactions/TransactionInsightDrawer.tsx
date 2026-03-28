import { useEffect, useMemo, useState, useRef } from 'react';
import { X, TrendingUp, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { sanitizeIssuerPillLabel } from '../../lib/transactionUi';
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
  Transportation:  { label: '✓ Deductible — CRA T2125 Line 9281', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Housing:         { label: '✓ Deductible — home-office % (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Utilities:       { label: '✓ Deductible — business-use % applies', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Healthcare:      { label: '✓ Deductible — medical expense credit', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Education:       { label: '✓ Deductible — training/tuition (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Insurance:       { label: '✓ Deductible — business coverage %', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Subscriptions:   { label: '✓ Likely deductible — if business use', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  'Bank Fees':     { label: '✓ Deductible — bank charges (T2125)', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  Travel:          { label: '~ Partially deductible — business purpose required', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  'Food & Dining': { label: '~ 50% deductible — meals & entertainment rule', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  Shopping:        { label: '~ May be deductible — business use only', color: '#fbbf24', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.2)' },
  Income:          { label: '— Taxable income — report on T2125', color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.12)' },
  Transfers:       { label: '— Not deductible', color: '#475569', bg: 'rgba(71,85,105,0.05)', border: 'rgba(71,85,105,0.12)' },
  Savings:         { label: '— Not deductible', color: '#475569', bg: 'rgba(71,85,105,0.05)', border: 'rgba(71,85,105,0.12)' },
  'Debt Payments': { label: '— Principal not deductible; interest may be', color: '#94a3b8', bg: 'rgba(148,163,184,0.05)', border: 'rgba(148,163,184,0.12)' },
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

const INCOME_PAT = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncomeTx(tx: CommittedTransaction): boolean {
  const cat = (tx.category || '').toLowerCase();
  const m = (tx.merchant_name || '').toUpperCase().trim();
  const t = ((tx as any).type || '').toLowerCase();
  return t === 'income' || cat === 'income' || cat === 'business income' || INCOME_PAT.test(m);
}

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
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [chatReply, setChatReply] = useState<string | null>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset on transaction change
  useEffect(() => {
    setChatHistory([]);
    setChatReply(null);
    setChatInput('');
    setShowAllCats(false);
    if (!row) { setLocalCategory(''); return; }
    if (row.kind === 'committed') setLocalCategory(row.transaction.category || 'Uncategorized');
    else {
      const dj = row.transaction.data_json as Record<string, unknown>;
      setLocalCategory(String(row.transaction.tag_category || dj.category || 'Uncategorized'));
    }
  }, [row?.kind === 'committed' ? (row as any).transaction.id : null]);

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
      setStatementLabel(`Statement …${importId.slice(-6)}`);
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

  const isIncome = row?.kind === 'committed' ? isIncomeTx(row.transaction) : false;
  const amountColor = isIncome ? '#10b981' : '#ef4444';
  const amountPrefix = isIncome ? '+' : '-';

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
  const applyCategory = async (category: string) => {
    if (!row || row.kind !== 'committed') return;
    setLocalCategory(category);
    setIsSaving(true);
    try {
      const res = await fetch('/.netlify/functions/tx-update-category', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.transaction.id, table: 'transactions', category, applyToVendor: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      setChatReply(`Done � moved to ${category}. I have updated the rule for all future ${rawMerchant} transactions.`);
      onCommittedCategorySaved?.(row.transaction.id, category);
      toast.success('Category updated');
    } catch {
      toast.error('Could not save category');
    } finally { setIsSaving(false); }
  };

  // AI chat
  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatBusy || !row || row.kind !== 'committed') return;
    const userMsg = { role: 'user', content: text };
    setChatInput('');
    setChatBusy(true);
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/tag-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({ transactionId: row.transaction.id, message: text, history: chatHistory }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply };
      setChatHistory([...newHistory, assistantMsg]);
      setChatReply(data.reply);
      if (data.action?.action === 'recategorize' && data.action?.category) {
        setLocalCategory(data.action.category);
        onCommittedCategorySaved?.(row.transaction.id, data.action.category);
      }
    } catch {
      const errMsg = { role: 'assistant' as const, content: 'Something went wrong — try again.' };
      setChatHistory([...newHistory, errMsg]);
    }
    setChatBusy(false);
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatReply, chatBusy]);

  if (!open || !row) return null;

  const confidence = tagInsight?.confidence != null ? Math.round(tagInsight.confidence * 100) : null;
  const seenCount = tagInsight?.merchantSeenCount || 0;

  return (
    <>
      <button type="button" aria-label="Close" style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(11,18,32,0.7)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer' }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', background: '#080f1e', borderLeft: '1px solid rgba(255,255,255,0.08)', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: '-8px 0 60px rgba(0,0,0,0.5)' }}>

        {/* HEADER */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e8ecf4', letterSpacing: -0.5, lineHeight: 1.2, wordBreak: 'break-word' }}>{rawMerchant}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: amountColor, marginTop: 6, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>{amountPrefix}${fmt(Math.abs(amount))}</div>
            {/* Meta row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {formattedDate && (
                <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{formattedDate}</span>
              )}
              {statementLabel && (
                <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{statementLabel}</span>
              )}
              {merchantMonthSpend > 0 && (
                <span style={{ fontSize: 11, color: '#64748b', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8' }}>{fmt(merchantMonthSpend)} this month</span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* TAG CHANGED BANNER */}
          {row.kind === 'committed' && (row.transaction as any).category_source === 'user_chat' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'rgba(34,211,153,0.08)', border: '1px solid rgba(34,211,153,0.2)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>Tag changed this category</div>
              <div style={{ fontSize: 10, color: '#475569', marginLeft: 'auto' }}>{new Date((row.transaction as any).updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
          )}

          {/* TAG VERDICT */}
          <div style={{ borderRadius: 14, background: 'rgba(34,211,153,0.05)', border: '1px solid rgba(34,211,153,0.15)', overflow: 'hidden' }}>
            {/* Verdict row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid rgba(34,211,153,0.08)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', border: '1px solid rgba(34,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>{localCategory}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                  {tagInsightLoading ? 'Analyzing�' : [
                    confidence != null && confidence > 0 && `${confidence}% confidence`,
                    seenCount > 0 && `Seen ${seenCount}x`,
                    tagInsight?.categorySource && tagInsight.categorySource !== 'unknown' && tagInsight.categorySource,
                  ].filter(Boolean).join(' � ') || 'Current category'}
                </div>
                            {TAX_INFO[localCategory] && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: TAX_INFO[localCategory].bg, border: `1px solid ${TAX_INFO[localCategory].border}`, fontSize: 10, fontWeight: 700, color: TAX_INFO[localCategory].color, letterSpacing: '0.03em' }}>
                  {TAX_INFO[localCategory].label}
                </div>
              )}
              </div>
              {tagInsight?.isAmountAnomaly && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>?? Unusual</span>
              )}
            </div>
            {/* Tag message */}
            {(tagInsightLoading || tagInsight?.message) && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                {tagInsightLoading ? 'Analyzing this transaction�' : tagInsight?.message}
              </div>
            )}
            {/* Proactive insights */}
            {tagInsight?.proactiveInsights?.map((insight, i) => { const cleanInsight = insight.replace(/[◆■• �]/g, "—"); return (
              <div key={i} style={{ padding: '8px 14px', borderTop: '1px solid rgba(34,211,153,0.06)', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{cleanInsight}</div>
            ); })}
          </div>

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

          {/* TAG CHAT HISTORY */}
          {chatHistory.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'assistant' && <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee', flexShrink: 0, marginTop: 2 }}>T</div>}
                  <div style={{ maxWidth: '82%', padding: '8px 11px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role === 'user' ? 'rgba(34,211,153,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${m.role === 'user' ? 'rgba(34,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, fontSize: 12, color: '#e8ecf4', lineHeight: 1.5 }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatBusy && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee' }}>T</div><div style={{ fontSize: 12, color: '#475569' }}>Thinking�</div></div>}
              <div ref={chatEndRef} />
            </div>
          )}

        </div>

        {/* FOOTER � chat input + actions */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Tag chat input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(34,211,153,0.04)', border: '1px solid rgba(34,211,153,0.12)', borderRadius: 10, padding: '6px 8px 6px 12px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && void sendChat()}
              placeholder="Ask Tag anything about this transaction..."
              disabled={row.kind !== 'committed' || chatBusy}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: '#e8ecf4', fontFamily: 'inherit' }} />
            <button type="button" onClick={() => void sendChat()} disabled={!chatInput.trim() || chatBusy || row.kind !== 'committed'}
              style={{ width: 30, height: 30, borderRadius: 8, background: chatInput.trim() ? 'rgba(34,211,153,0.2)' : 'transparent', border: `1px solid ${chatInput.trim() ? 'rgba(34,211,153,0.3)' : 'transparent'}`, cursor: chatInput.trim() ? 'pointer' : 'default', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send style={{ width: 13, height: 13 }} />
            </button>
          </div>
          {/* Action buttons */}
          {row.kind === 'pending' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => void onApprovePending?.(row.transaction.id)} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              <button type="button" onClick={() => void onRejectPending?.(row.transaction.id)} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              <button type="button" onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => onEditCommitted?.(row.transaction)} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Edit / Split</button>
              <button type="button" onClick={onClose} style={{ padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useTypewriter } from '../../pages/PrimeChatV2/useTypewriter';
import type { CommittedTransaction } from '@/types/transactions';

interface TagAction {
  type: 'filter' | 'bulk_change' | 'undo' | 'reclassify_preview';
  search?: string;
  category?: string;
  merchant?: string;
  confirm?: boolean;
}

interface TagCopilotPanelProps {
  transaction?: CommittedTransaction | null;
  onClose: () => void;
  onCategoryUpdated?: () => void;
  onTagAction?: (action: TagAction) => void;
  onToggleActivity?: () => void;
  totalCount?: number;
  firstName?: string;
  totalSpent?: number;
  totalIncome?: number;
  netFlow?: number;
  injectedMessage?: string | null;
  injectedFollowupMerchants?: any[] | null;
  onMerchantCategorize?: (merchantName: string, category: string) => void;
  sharedChatHistory?: { role: string; content: string }[];
  sharedChatReply?: string | null;
  onChatHistoryChange?: (history: { role: string; content: string }[], reply: string | null) => void;
}

function parseTagAction(reply: string): { cleanReply: string; action: TagAction | null } {
  const filterMatch = reply.match(/FILTER:(\{[^\}]+\})/s);
  const bulkMatch = reply.match(/BULK_CHANGE:(\{[^}]*\})/);
  const undoMatch = reply.match(/UNDO:(\{[^}]*\})/);
  let action: TagAction | null = null;
  let cleanReply = reply;
  if (filterMatch) {
    try { action = { type: 'filter', ...JSON.parse(filterMatch[1]) }; } catch {}
    cleanReply = reply.replace(/FILTER:\{[^}]*\}/g, '').trim();
  } else if (bulkMatch) {
    try { action = { type: 'bulk_change', ...JSON.parse(bulkMatch[1]) }; } catch {}
    cleanReply = reply.replace(/BULK_CHANGE:\{[^}]*\}/g, '').trim();
  } else if (undoMatch) {
    action = { type: 'undo' };
    cleanReply = reply.replace(/UNDO:\{[^}]*\}/g, '').trim();
  } else if (/RECLASSIFY_PREVIEW:\{\}/.test(reply)) {
    action = { type: 'reclassify_preview' };
    cleanReply = reply.replace(/RECLASSIFY_PREVIEW:\{\}/g, '').trim();
  }
  return { cleanReply, action };
}

type ChatMsg = { role: 'tag' | 'user'; text: string; merchantQ?: { name: string; count: number; amount: number; options: string[] }; subcategoryQ?: { merchantName: string; category: string; options: string[] }; followupMerchants?: any[] };

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  'Transportation': ['Gas & Fuel', 'Parking', 'Transit', 'Vehicle Insurance', 'Vehicle Services', 'Rideshare'],
  'Food & Dining': ['Restaurants', 'Fast Food', 'Coffee & Drinks', 'Delivery', 'Groceries'],
  'Personal Care': ['Hair & Beauty', 'Massage & Wellness', 'Gym & Fitness', 'Clothing'],
  'Healthcare': ['Dental', 'Chiropractic', 'Pharmacy', 'Medical', 'Vision'],
  'Shopping': ['Electronics', 'Auto & Hardware', 'Home & Garden', 'Clothing', 'General'],
  'Subscriptions': ['Software & AI', 'Streaming', 'Memberships', 'News & Media'],
  'Entertainment': ['Gaming & Lottery', 'Movies & Events', 'Sports', 'Golf', 'Hobbies'],
  'Bank Fees': ['Banking', 'Credit Services', 'Loans', 'ATM'],
  'Income': ['Employment', 'Business Income', 'Government Rebate', 'Tax Refund', 'Investment'],
  'Debt Payments': ['Credit Card', 'Line of Credit', 'Loan Payment'],
};

const SUGGEST_CATS: Record<string, string[]> = {
  food: ['Food & Dining', 'Business Meals'], gas: ['Transportation'], hotel: ['Travel', 'Business Travel'],
  pharma: ['Healthcare'], drug: ['Healthcare'], amazon: ['Shopping', 'Business Supplies'],
  walmart: ['Shopping', 'Groceries'], costco: ['Shopping', 'Groceries'], default: ['Food & Dining', 'Shopping', 'Transportation', 'Personal Care', 'Subscriptions'],
};
function suggestCats(name: string): string[] {
  const n = (name || '').toLowerCase();
  for (const [k, v] of Object.entries(SUGGEST_CATS)) { if (k !== 'default' && n.includes(k)) return v; }
  return SUGGEST_CATS.default;
}

export function TagCopilotPanel({ transaction, onClose, onCategoryUpdated, onTagAction, onToggleActivity, injectedMessage, injectedFollowupMerchants, onMerchantCategorize, totalCount, firstName, totalSpent, totalIncome, netFlow }: TagCopilotPanelProps) {
  const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
    if (transaction) return [];
    try {
      const saved = localStorage.getItem('tag_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastTagIndex = useMemo(() => {
    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].role === 'tag') return i;
    }
    return -1;
  }, [localMessages]);

  const lastTagText = lastTagIndex >= 0 ? localMessages[lastTagIndex]?.text ?? '' : '';
  const [typewriterText, typewriterDone] = useTypewriter(lastTagText ?? '', 18, 150);

  const fetchProactiveGreeting = useCallback(async () => {
    const hi = firstName ? `Hey ${firstName}` : 'Hey';
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const res = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const unresolved = data.unresolved ?? [];
      const unresolvedCount = unresolved.length;
      const totalTxsNR = unresolved.reduce((s: number, m: any) => s + m.transaction_count, 0);
      const totalAmtNR = unresolved.reduce((s: number, m: any) => s + m.total_amount, 0);

      if (unresolvedCount > 0) {
        const topM = unresolved.slice(0, 3).map((m: any) => `\u2022 **${m.merchant_name}** \u00d7${m.transaction_count}`).join('\n');
        setLocalMessages([{
          role: 'tag', text: `${hi} \u2014 you've got **${totalTxsNR} transactions** across ${unresolvedCount} merchants in Needs Review ($${totalAmtNR.toFixed(2)}).\n\nBiggest:\n${topM}\n\nWant to work through them now?`,
          followupMerchants: unresolved,
        }]);
      } else {
        const count = totalCount ?? 0;
        setLocalMessages([{ role: 'tag', text: `${hi} \u2014 your books are looking clean \u2713 All ${count} transactions categorized. Ask me anything about your spending.` }]);
      }
    } catch {
      const count = totalCount ?? 0;
      setLocalMessages([{ role: 'tag', text: `${hi ?? 'Hey'} \u2014 ${count} transactions in view. Tap any row and I'll tell you why I categorized it that way.` }]);
    }
  }, [firstName, totalCount]);

  useEffect(() => {
    if (transaction) {
      const merchant = transaction.merchant_name || 'This transaction';
      const cat = transaction.category || 'Uncategorized';
      setLocalMessages([{ role: 'tag', text: `**${merchant}** \u2014 I put this in **${cat}** because of how it's described. Want to move it somewhere else?` }]);
    } else if (localMessages.length === 0) {
      void fetchProactiveGreeting();
    }
  }, [transaction?.id]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Pick up injected messages from parent
  useEffect(() => {
    if (injectedMessage) {
      if (injectedFollowupMerchants && injectedFollowupMerchants.length > 0) {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: injectedMessage, followupMerchants: injectedFollowupMerchants }]);
      } else {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: injectedMessage }]);
      }
    }
  }, [injectedMessage]);

  // Merchant queue state
  const [merchantQueue, setMerchantQueue] = useState<any[]>([]);
  const [mqIndex, setMqIndex] = useState(0);
  const [pendingSubcategory, setPendingSubcategory] = useState<{ merchantName: string; category: string } | null>(null);

  const startMerchantQueue = (merchants: any[]) => {
    setMerchantQueue(merchants);
    setMqIndex(0);
    if (merchants[0]) askAboutMerchant(merchants[0], 0);
  };

  const askAboutMerchant = (merchant: any, idx: number) => {
    setLocalMessages(m => [...m, {
      role: 'tag' as const,
      text: `${idx > 0 ? 'Next up \u2014 ' : ''}**${merchant.merchant_name}** \u00d7${merchant.transaction_count} ($${merchant.total_amount.toFixed(2)}). What are these usually?`,
      merchantQ: { name: merchant.merchant_name, count: merchant.transaction_count, amount: merchant.total_amount, options: suggestCats(merchant.merchant_name) },
    }]);
  };

  const handleMerchantPick = async (category: string, merchantName: string) => {
    setLocalMessages(m => [...m, { role: 'user' as const, text: category }]);
    // Check if subcategories exist for this category
    const subcats = SUBCATEGORY_OPTIONS[category];
    if (subcats && subcats.length > 0) {
      setPendingSubcategory({ merchantName, category });
      setLocalMessages(m => [...m, {
        role: 'tag' as const,
        text: `Got it \u2014 **${category}**. What type?`,
        subcategoryQ: { merchantName, category, options: subcats },
      }]);
      return;
    }
    await saveWithSubcategory(category, merchantName, null);
  };

  const handleSubcategoryPick = async (subcategory: string) => {
    if (!pendingSubcategory) return;
    const { merchantName, category } = pendingSubcategory;
    setLocalMessages(m => [...m, { role: 'user' as const, text: subcategory }]);
    setPendingSubcategory(null);
    await saveWithSubcategory(category, merchantName, subcategory);
  };

  const saveWithSubcategory = async (category: string, merchantName: string, subcategory: string | null) => {
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('No Supabase');
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('No session');
      const token = session.access_token;

      const { data: matchingTxs } = await sb
        .from('transactions').select('id')
        .ilike('merchant_name', `%${merchantName}%`)
        .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
      const ids = matchingTxs?.map(t => t.id) ?? [];

      if (ids.length > 0) {
        await fetch('/.netlify/functions/tag-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ intent: 'bulk_apply', groups: [{ ids, category, subcategory }] }),
        });
      }

      await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ intent: 'save_rule', matchValue: merchantName, targetCategory: category, matchType: 'contains' }),
      });

      const confirmText = subcategory
        ? `\u2713 ${ids.length > 0 ? `${ids.length} ` : ''}${merchantName} \u2192 **${category}** / **${subcategory}**. Rule saved.`
        : `\u2713 ${ids.length > 0 ? `${ids.length} ` : ''}${merchantName} \u2192 **${category}**. Rule saved.`;
      setLocalMessages(m => [...m, { role: 'tag' as const, text: confirmText }]);
      onMerchantCategorize?.(merchantName, category);
      onCategoryUpdated?.();
    } catch (err) {
      console.error('[Tag] saveWithSubcategory error:', err);
      setLocalMessages(m => [...m, { role: 'tag' as const, text: 'Had trouble saving \u2014 try again.' }]);
      return;
    }

    const next = mqIndex + 1;
    setMqIndex(next);
    if (next < merchantQueue.length) {
      setTimeout(() => askAboutMerchant(merchantQueue[next], next), 1000);
    } else {
      setTimeout(() => {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: 'All done! Every merchant has been handled. Your books are looking clean \u2713' }]);
        setMerchantQueue([]);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!transaction && localMessages.length > 0) {
      localStorage.setItem('tag_chat_history', JSON.stringify(localMessages.slice(-20)));
    }
  }, [localMessages, transaction]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    // If merchant queue is active AND Tag is actively asking about a merchant, treat typed input as category pick
    const lastMsg = localMessages[localMessages.length - 1];
    const tagIsAskingMerchant = lastMsg?.role === 'tag' && lastMsg?.merchantQ;
    if (merchantQueue.length > 0 && mqIndex < merchantQueue.length && tagIsAskingMerchant) {
      setInput('');
      void handleMerchantPick(text, merchantQueue[mqIndex].merchant_name);
      return;
    }
    const txId = transaction?.id ?? null;
    setInput('');
    setLocalMessages(m => [...m, { role: 'user' as const, text }]);
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const history = localMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const res = await fetch('/.netlify/functions/tag-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: txId, message: text, history,
          merchant: transaction?.merchant_name || undefined,
          context: transaction ? undefined : 'page',
          pageContext: {
            totalSpent: totalSpent ?? 0,
            totalIncome: totalIncome ?? 0,
            netFlow: netFlow ?? 0,
            transactionCount: totalCount ?? 0,
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const { cleanReply, action: tagAction } = parseTagAction(data.reply);
      setLocalMessages(m => [...m, { role: 'tag' as const, text: cleanReply }]);
      if (tagAction && onTagAction) onTagAction(tagAction);
      if (data.action?.action && data.action?.category) {
        onCategoryUpdated?.();
      }
    } catch {
      setLocalMessages(m => [...m, { role: 'tag' as const, text: 'Something went wrong — try again.' }]);
    }
    setBusy(false);
  };

  return (
    <>
      
      <div style={{ position:'fixed', bottom:0, right:0, top:0, width:520, background:'#080f1e', borderLeft:'1px solid rgba(34,211,153,0.15)', zIndex:71, display:'flex', flexDirection:'column', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(34,211,153,0.15)', border:'1px solid rgba(34,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#22d3ee', flexShrink:0 }}>T</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#e8ecf4' }}>Tag <span style={{ color:'#c8d0e0', fontWeight:400 }}>Copilot</span></div>
            <div style={{ fontSize:11, color:'#22d3ee' }}>Your categorization assistant</div>
          </div>
          {onToggleActivity && <button onClick={onToggleActivity} title="Tag Activity" style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:14, padding:'2px 6px' }}>{'\uD83D\uDCCB'}</button>}
          <button onClick={async () => {
            localStorage.removeItem('tag_chat_history');
            setLocalMessages([]);
            setMerchantQueue([]);
            setMqIndex(0);
            // Clear Supabase page conversation
            try {
              const sb = getSupabase(); if (sb) {
                const { data: { user } } = await sb.auth.getUser();
                if (user) await sb.from('tag_conversations').delete().eq('user_id', user.id).eq('merchant_name', '__page__');
              }
            } catch { /* silent */ }
            // Re-run proactive greeting
            void fetchProactiveGreeting();
          }} style={{ marginLeft: onToggleActivity ? undefined : 'auto', background:'none', border:'none', cursor:'pointer', color:'#9ba8bc', fontSize:12, display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 }}><Trash2 size={13} /> Clear</button>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#c8d0e0', padding:4, display:'flex' }}><X style={{ width:18, height:18 }} /></button>
        </div>
        {/* ACTIVE TRANSACTION PILL */}
        {transaction && (
          <div style={{ margin:'12px 16px 0', padding:'10px 14px', borderRadius:8, background:'rgba(34,211,153,0.06)', border:'1px solid rgba(34,211,153,0.12)', fontSize:13, color:'#c8d0e0' }}>
            <span style={{ color:'#e8ecf4', fontWeight:600 }}>{transaction.merchant_name || 'Transaction'}</span>
            {' · $'}{Math.abs(transaction.amount).toFixed(2)}
            {' · '}<span style={{ color:'#22d3ee' }}>{transaction.category || 'Uncategorized'}</span>
          </div>
        )}
        {/* MESSAGES */}
        <div ref={messagesContainerRef} style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
          {localMessages.map((m, i) => {
            const isLastTag = m.role === 'tag' && i === lastTagIndex;
            const displayText = isLastTag ? typewriterText : m.text;
            return (
              <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                {m.role==='tag' && (
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee', flexShrink:0, marginTop:2 }}>T</div>
                )}
                <div>
                  <div style={{ maxWidth:'85%', padding:'10px 14px', borderRadius: m.role==='user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role==='user' ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${m.role==='user' ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`, fontSize:15, color:'#e8ecf4', lineHeight:1.7, wordBreak:'break-word', overflowWrap:'break-word', whiteSpace:'pre-wrap' }}>
                    {(displayText ?? '').split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}
                  </div>
                  {m.merchantQ && i === localMessages.length - 1 && (
                    <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
                      {m.merchantQ.options.map(cat => (
                        <button key={cat} onClick={() => void handleMerchantPick(cat, m.merchantQ!.name)} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#cbd5e1', cursor:'pointer' }}>{cat}</button>
                      ))}
                      <button onClick={() => { setLocalMessages(ms => [...ms, { role:'tag', text:`Skipping ${m.merchantQ!.name}.` }]); const next = mqIndex + 1; setMqIndex(next); if (next < merchantQueue.length) setTimeout(() => askAboutMerchant(merchantQueue[next], next), 400); }} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', color:'#475569', cursor:'pointer' }}>Skip {'\u2192'}</button>
                    </div>
                  )}
                  {m.subcategoryQ && i === localMessages.length - 1 && (
                    <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
                      {m.subcategoryQ.options.map(sub => (
                        <button key={sub} onClick={() => void handleSubcategoryPick(sub)} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#22d3ee', cursor:'pointer' }}>{sub}</button>
                      ))}
                      <button onClick={() => { setPendingSubcategory(null); void saveWithSubcategory(m.subcategoryQ!.category, m.subcategoryQ!.merchantName, null); }} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', color:'#475569', cursor:'pointer' }}>Skip {'\u2192'}</button>
                    </div>
                  )}
                  {m.followupMerchants && i === localMessages.length - 1 && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button onClick={() => startMerchantQueue(m.followupMerchants!)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', cursor:'pointer' }}>Yes, let's go {'\u2192'}</button>
                      <button onClick={() => setLocalMessages(ms => [...ms, { role:'tag', text:"No problem \u2014 I'll be here. Check Activity anytime." }])} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'#475569', cursor:'pointer' }}>Later</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {busy && typewriterDone && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee' }}>T</div>
              <div style={{ fontSize:13, color:'#e8ecf4' }}>Thinking…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {/* INPUT */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Ask Tag anything..."
            style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#e8ecf4', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.5 }}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            style={{ width:36, height:36, borderRadius:8, background: busy ? 'rgba(34,211,153,0.1)' : 'rgba(34,211,153,0.2)', border:'1px solid rgba(34,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor: busy ? 'default' : 'pointer', color:'#22d3ee', flexShrink:0 }}
          >
            <Send style={{ width:16, height:16 }} />
          </button>
        </div>
      </div>
    </>
  );
}



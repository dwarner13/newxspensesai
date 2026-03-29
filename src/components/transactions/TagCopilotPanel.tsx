import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useTypewriter } from '../../pages/PrimeChatV2/useTypewriter';
import type { CommittedTransaction } from '@/types/transactions';

interface TagAction {
  type: 'filter' | 'bulk_change' | 'undo';
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
  sharedChatHistory?: { role: string; content: string }[];
  sharedChatReply?: string | null;
  onChatHistoryChange?: (history: { role: string; content: string }[], reply: string | null) => void;
}

function parseTagAction(reply: string): { cleanReply: string; action: TagAction | null } {
  const filterMatch = reply.match(/FILTER:(\{[^}]*\})/);
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
  }
  return { cleanReply, action };
}

export function TagCopilotPanel({ transaction, onClose, onCategoryUpdated, onTagAction, onToggleActivity, totalCount, firstName, totalSpent, totalIncome, netFlow }: TagCopilotPanelProps) {
  const [localMessages, setLocalMessages] = useState<{ role: 'tag' | 'user'; text: string }[]>(() => {
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

  useEffect(() => {
    const hi = firstName ? `Hey ${firstName}, ` : '';
    if (transaction) {
      const merchant = transaction.merchant_name || 'This transaction';
      const cat = transaction.category || 'Uncategorized';
      setLocalMessages([{ role: 'tag', text: `**${merchant}** — I put this in **${cat}** because of how it's described. Want to move it somewhere else?` }]);
    } else if (localMessages.length === 0) {
      const count = totalCount ?? 0;
      setLocalMessages([{ role: 'tag', text: `${hi}${count} transactions in view. Tap any row and I'll tell you exactly why I categorized it that way — or change it on the spot.` }]);
    }
  }, [transaction?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);

  useEffect(() => {
    if (!transaction && localMessages.length > 0) {
      localStorage.setItem('tag_chat_history', JSON.stringify(localMessages.slice(-20)));
    }
  }, [localMessages, transaction]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
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
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <div style={{ position:'fixed', bottom:0, right:0, top:0, width:380, background:'#080f1e', borderLeft:'1px solid rgba(34,211,153,0.15)', zIndex:71, display:'flex', flexDirection:'column', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(34,211,153,0.15)', border:'1px solid rgba(34,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#22d3ee', flexShrink:0 }}>T</div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#e8ecf4' }}>Tag <span style={{ color:'#c8d0e0', fontWeight:400 }}>Copilot</span></div>
            <div style={{ fontSize:11, color:'#22d3ee' }}>Your categorization assistant</div>
          </div>
          {onToggleActivity && <button onClick={onToggleActivity} title="Tag Activity" style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#475569', fontSize:14, padding:'2px 6px' }}>{'\uD83D\uDCCB'}</button>}
          <button onClick={() => { localStorage.removeItem('tag_chat_history'); const hi = firstName ? `Hey ${firstName}, ` : ''; const count = totalCount ?? 0; setLocalMessages([{ role: 'tag', text: `${hi}${count} transactions in view. Tap any row and I'll tell you exactly why I categorized it that way — or change it on the spot.` }]); }} style={{ marginLeft: onToggleActivity ? undefined : 'auto', background:'none', border:'none', cursor:'pointer', color:'#9ba8bc', fontSize:12, display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 }}><Trash2 size={13} /> Clear</button>
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
        <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>
          {localMessages.map((m, i) => {
            const isLastTag = m.role === 'tag' && i === lastTagIndex;
            const displayText = isLastTag ? typewriterText : m.text;
            return (
              <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
                {m.role==='tag' && (
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee', flexShrink:0, marginTop:2 }}>T</div>
                )}
                <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius: m.role==='user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role==='user' ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${m.role==='user' ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`, fontSize:15, color:'#e8ecf4', lineHeight:1.7 }}>
                  {(displayText ?? '').split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}
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
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void send()}
            placeholder="Ask Tag about this transaction…"
            style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 12px', fontSize:14, color:'#e8ecf4', outline:'none', fontFamily:'inherit' }}
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



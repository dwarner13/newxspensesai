import { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import type { CommittedTransaction } from '@/types/transactions';

interface TagCopilotPanelProps {
  transaction?: CommittedTransaction | null;
  onClose: () => void;
  onCategoryUpdated?: () => void;
  sharedChatHistory?: { role: string; content: string }[];
  sharedChatReply?: string | null;
  onChatHistoryChange?: (history: { role: string; content: string }[], reply: string | null) => void;
}

export function TagCopilotPanel({ transaction, onClose, onCategoryUpdated }: TagCopilotPanelProps) {
  const [localMessages, setLocalMessages] = useState<{ role: 'tag' | 'user'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transaction) {
      const cat = transaction.category || 'Uncategorized';
      const amt = Math.abs(transaction.amount).toFixed(2);
      setLocalMessages([{ role: 'tag', text: `I tagged **${transaction.merchant_name || 'this transaction'}** ($${amt}) as **${cat}**. Ask me anything about it, or tell me to recategorize.` }]);
    } else {
      setLocalMessages([{ role: 'tag', text: 'Hey — I am Tag. Tap any transaction row and I will explain my reasoning. Tell me to recategorize and I will do it instantly.' }]);
    }
  }, [transaction?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [localMessages]);

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
        body: JSON.stringify({ transactionId: txId, message: text, history }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLocalMessages(m => [...m, { role: 'tag' as const, text: data.reply }]);
      if (data.action?.action === 'recategorize' && data.action?.category) {
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
          <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9ba8bc', padding:4, display:'flex' }}><X style={{ width:18, height:18 }} /></button>
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
          {localMessages.map((m, i) => (
            <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>
              {m.role==='tag' && (
                <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee', flexShrink:0, marginTop:2 }}>T</div>
              )}
              <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius: m.role==='user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role==='user' ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${m.role==='user' ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`, fontSize:15, color:'#e8ecf4', lineHeight:1.7 }}>
                {m.text.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee' }}>T</div>
              <div style={{ fontSize:13, color:'#c8d0e0' }}>Thinking…</div>
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
            style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#e8ecf4', outline:'none', fontFamily:'inherit' }}
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



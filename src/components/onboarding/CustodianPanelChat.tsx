import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface ChatMsg {
  role: 'user' | 'custodian';
  text: string;
  action?: { type: string; path: string };
}

export function CustodianPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'custodian', text: "Hey — I'm Custodian, your system guide. Ask me how to use any feature, where to find something, or how the AI team works. For financial questions, Prime's your guy." },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const sb = getSupabase(); if (!sb) throw new Error('No client');
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? '';
      const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const res = await fetch('/.netlify/functions/custodian-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, history, currentPath: window.location.pathname }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setMessages(m => [...m, { role: 'custodian', text: data.reply, action: data.action }]);
    } catch {
      setMessages(m => [...m, { role: 'custodian', text: 'Something went wrong — try again.' }]);
    }
    setBusy(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 70 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
        background: '#0b1220', borderLeft: '1px solid rgba(167,139,250,0.2)',
        zIndex: 71, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid #1e2d4a', flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{'\uD83D\uDEE1\uFE0F'}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e8ecf4' }}>Custodian</div>
            <div style={{ fontSize: 13, color: '#7b8ba5' }}>IT Manager</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#c8d0e0', padding: 4, display: 'flex' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12, fontSize: 15, color: '#e8ecf4', lineHeight: 1.6,
                  wordBreak: 'break-word', overflowWrap: 'break-word',
                  ...(m.role === 'custodian'
                    ? { background: 'rgba(167,139,250,0.06)', borderLeft: '3px solid rgba(167,139,250,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }),
                }}>
                  {m.text.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: '#a78bfa' }}>{part}</strong> : <span key={j}>{part}</span>)}
                </div>
                {m.action?.type === 'navigate' && (
                  <button onClick={() => { navigate(m.action!.path); onClose(); }}
                    style={{ marginTop: 8, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                    color: '#a78bfa', cursor: 'pointer' }}>
                    {'\u2192'} Go there
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{'\uD83D\uDEE1\uFE0F'}</div>
              <div style={{ fontSize: 13, color: '#e8ecf4' }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d4a', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void send(); } }}
            placeholder="Ask Custodian anything..."
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 15, color: '#e8ecf4', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={() => void send()} disabled={busy || !input.trim()}
            style={{ width: 36, height: 36, borderRadius: 10, background: busy ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'default' : 'pointer', color: '#a78bfa', flexShrink: 0 }}>
            <Send style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Guardrails footer */}
        <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.03em' }}>Custodian AI {'\u2022'} Guardrails + PII protection active</span>
            </div>
            <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.4, maxWidth: 320, margin: '0 auto' }}>Not financial, tax, or legal advice. Consult your accountant for professional guidance.</div>
          </div>
        </div>
      </div>
    </>
  );
}

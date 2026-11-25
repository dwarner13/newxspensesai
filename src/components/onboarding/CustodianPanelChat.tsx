import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { PANEL } from '../../pages/PrimeChatV2/panelConfig';
import { useEndpointConversation } from '@/hooks/useEndpointConversation';
import { ConversationControls, UnsavedReplyNotice } from '@/components/chat/ConversationControls';
import { ChatIdentity } from '@/components/chat/ChatHeader';

interface ChatMsg {
  role: 'user' | 'custodian';
  text: string;
  action?: { type: string; path: string };
  /** The server could not save this reply (persisted:false). */
  unsaved?: boolean;
  /** Notice for a reply that ran nothing (conflict): ask to resend. */
  resend?: boolean;
}

const GREETING: ChatMsg = { role: 'custodian', text: "Hey - I'm Custodian, your system guide. Ask me how to use any feature, where to find something, or how the AI team works. For financial questions, Prime's your guy." };

export function CustodianPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  // Universal conversation history (owner GO): the shared endpoint-conversation hook —
  // restore, resume across devices, History, New conversation. custodian-chat keeps the
  // conversation; client history is no longer sent.
  const convo = useEndpointConversation('custodian');
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ text: string; clientMessageId: string } | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Restored or switched conversation → show it (the greeting only when it is empty).
  useEffect(() => {
    if (!convo.restored) return;
    const list = convo.restored.messages.map<ChatMsg>(m => ({ role: m.role === 'user' ? 'user' : 'custodian', text: m.content }));
    setMessages(list.length > 0 ? list : [GREETING]);
    setFailed(null);
  }, [convo.restored]);

  // Account-scoped cache of the real turns (not the greeting).
  const { cache } = convo;
  useEffect(() => {
    cache(messages.filter(m => m !== GREETING).map((m, i) => ({ id: `c${i}`, role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text, createdAt: '' })));
  }, [messages, cache]);

  const send = async (retry?: { text: string; clientMessageId: string }) => {
    const text = (retry?.text ?? input).trim();
    if (!text || busy) return;
    const fields = convo.requestFields(retry?.clientMessageId);
    if (!retry) { setInput(''); setMessages(m => [...m, { role: 'user', text }]); }
    setFailed(null);
    setBusy(true);
    try {
      const sb = getSupabase(); if (!sb) throw new Error('No client');
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token ?? '';
      const res = await fetch('/.netlify/functions/custodian-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: text, currentPath: window.location.pathname, ...fields }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const outcome = convo.onReply(data);
      setMessages(m => [...m, {
        role: 'custodian',
        text: data.reply,
        // duplicate / conflict replies are display-only: no navigation action is offered.
        action: outcome.mayApply ? data.action : undefined,
        unsaved: outcome.kind === 'not_saved',
        resend: outcome.kind === 'conflict',
      }]);
    } catch {
      // Never retried automatically; Retry resends the same message with the same id.
      setFailed({ text, clientMessageId: fields.clientMessageId });
    }
    setBusy(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 70 }} />
      <div style={{
        position: 'fixed',
        top: isMobile ? 'auto' : 0,
        bottom: 0, right: 0,
        left: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : PANEL.panelWidthDesktop,
        height: isMobile ? PANEL.panelHeightMobile : '100%',
        borderRadius: isMobile ? '20px 20px 0 0' : 0,
        // H1-C: the mobile panel is a bottom sheet, so it clears the home indicator
        // (bottom inset), not the status bar. env() is 0 on devices without one.
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: '#0b1220',
        borderLeft: isMobile ? 'none' : '1px solid rgba(167,139,250,0.2)',
        borderTop: isMobile ? '1px solid rgba(167,139,250,0.2)' : 'none',
        zIndex: 71, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        {/* TB-4: universal chat header — identity separate from the compact toolbar. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: isMobile ? '10px 6px 10px 12px' : '12px 16px 12px 20px', borderBottom: '1px solid #1e2d4a', flexShrink: 0 }}>
          <ChatIdentity
            isMobile={isMobile}
            renderLogo={(px) => (
              <span style={{ width: px, height: px, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', border: '1.5px solid rgba(167,139,250,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(px * 0.55), lineHeight: 1 }}>{'🛡️'}</span>
            )}
            name="Custodian"
            subtitle={isMobile ? undefined : 'IT Manager'}
          />
          <ConversationControls
            employeeName="Custodian" accent="#a78bfa" isMobile={isMobile}
            items={convo.history.items} loading={convo.history.loading} currentId={convo.sessionId}
            onLoad={convo.history.load} onOpen={convo.openConversation} onNew={convo.startNewConversation}
            onClose={onClose}
          />
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
                    {'→'} Go there
                  </button>
                )}
                {m.unsaved && <UnsavedReplyNotice />}
                {m.resend && (
                  <div role="status" style={{ marginTop: 8, fontSize: 13, color: '#fde68a' }}>Nothing was changed. Please send that again.</div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(167,139,250,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{'🛡️'}</div>
              <div style={{ fontSize: 13, color: '#e8ecf4' }}>Thinking...</div>
            </div>
          )}
          {failed && !busy && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)', fontSize: 14, color: '#fde68a' }}>
              <span style={{ flex: 1 }}>That message didn&apos;t go through.</span>
              <button type="button" onClick={() => void send(failed)}
                style={{ minHeight: 40, padding: '0 12px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.45)', background: 'transparent', color: '#fcd34d', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Retry
              </button>
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
            aria-label="Message Custodian"
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: PANEL.inputFontSize, color: '#e8ecf4', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={() => void send()} disabled={busy || !input.trim()} aria-label="Send message"
            style={{ width: 44, height: 44, borderRadius: 10, background: busy ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: busy ? 'default' : 'pointer', color: '#a78bfa', flexShrink: 0 }}>
            <Send style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Guardrails footer */}
        <div style={{ padding: '6px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(52,211,153,0.5)', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.03em' }}>Custodian AI {'•'} Guardrails + PII protection active</span>
            </div>
            <div style={{ fontSize: 9, color: '#334155', lineHeight: 1.4, maxWidth: 320, margin: '0 auto' }}>Not financial, tax, or legal advice. Consult your accountant for professional guidance.</div>
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EMPLOYEES, findEmployeeByIntent } from '../../data/aiEmployees';

export default function BossBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user'|'prime'|'note'; text: string }[]>([
    { role: 'prime', text: 'I\'m ⭐ Prime — the Boss AI. Ask me anything, and I\'ll route you to the right expert.' }
  ]);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onDoc(e: MouseEvent) {
      if (!open) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onEsc);
    document.addEventListener('mousedown', onDoc);
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  function send() {
    const q = input.trim();
    if (!q) return;
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');

    const match = findEmployeeByIntent(q);
    if (!match) {
      setMessages(m => [...m, { role: 'prime', text: 'Try asking about goals, tax, bills, importing receipts, predictions, or categorization.' }]);
      return;
    }
    const reply = `${match.emoji ?? '🤖'} ${match.name} is best for that.\n→ Opening ${match.name}…`;
    setMessages(m => [...m, { role: 'prime', text: reply }]);

    setTimeout(() => {
      navigate(match.route);
      setOpen(false);
    }, 700);
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open Prime"
        className="fixed z-[70] bottom-5 right-5 md:bottom-7 md:right-7 rounded-full w-14 h-14 bg-gradient-to-br from-cyan-500 to-fuchsia-500 shadow-lg hover:scale-105 active:scale-95 transition"
      >
        <span className="text-2xl">⭐</span>
      </button>

      <div
        ref={panelRef}
        className={`fixed z-[71] right-5 bottom-24 md:right-7 md:bottom-28 w-[92vw] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all ${open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2'}`}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="text-xl">⭐</div>
          <div className="font-semibold text-white">Prime</div>
          <div className="ml-auto text-xs text-white/60">Director</div>
        </div>

        <div className="max-h-72 overflow-y-auto p-3 space-y-2">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : m.role === 'prime' ? 'text-left' : 'text-center text-xs text-white/60'}>
              <div className={
                m.role === 'user'
                  ? 'inline-block bg-cyan-500/20 border border-cyan-400/20 px-3 py-2 rounded-xl'
                  : m.role === 'prime'
                  ? 'inline-block bg-white/5 border border-white/10 px-3 py-2 rounded-xl'
                  : ''
              }>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 flex gap-2 border-t border-white/10">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask me anything…"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            onClick={send}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-3 py-2 text-sm"
          >
            Send
          </button>
        </div>

        <div className="p-3 grid grid-cols-2 gap-2">
          {EMPLOYEES.filter(e => e.key !== 'prime').slice(0, 6).map(e => (
            <Link key={e.key} to={e.route} className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm">
              <span className="mr-1">{e.emoji ?? '🤖'}</span>{e.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

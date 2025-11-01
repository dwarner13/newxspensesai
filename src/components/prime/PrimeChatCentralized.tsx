import React, { useEffect, useRef, useState } from 'react';
import { chat } from '../../lib/api/chat';

type Role = 'user' | 'assistant' | 'system';

interface Message { role: Role; content: string; }

interface PrimeChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrimeChatCentralized({ isOpen, onClose }: PrimeChatCentralizedProps) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: "I'm Prime 👑 — how can I help?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // scroll into view when focusing input (iOS keyboard overlap mitigation)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };
    el.addEventListener('focus', onFocus);
    return () => el.removeEventListener('focus', onFocus);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const next = [...messages, { role: 'user', content: input.trim() } as Message];
    setMessages(next);
    setInput('');
    setIsLoading(true);
    try {
      const res = await chat({ agent: 'prime', messages: next, attachments });
      const reply: Message = { role: 'assistant', content: res.content || '…' };
      setMessages(prev => [...prev, reply]);
    } catch (e) {
      setError('Connection error. Try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    setAttachments(Array.from(files).slice(0, 4));
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-[#0b1220] text-white">
      {/* Header & Quick Actions */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">👑</span>
          <div>
            <div className="text-sm font-semibold">Prime</div>
            <div className="text-[11px] text-white/70">Your AI financial cofounder</div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {['Spending Summary','Analyze Transactions','Save Money','Set Goals'].map((label) => (
            <button
              key={label}
              className="px-3 py-1.5 rounded-full text-[12px] bg-white/10 hover:bg-white/15 whitespace-nowrap"
              onClick={() => {
                setInput(label);
                setTimeout(() => handleSend(), 0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-44">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl shadow ${m.role === 'user' ? 'ml-auto bg-blue-600' : 'mr-auto bg-white/10'}`}>
            <div className="text-sm whitespace-pre-wrap break-words">{sanitize(m.content)}</div>
          </div>
        ))}
        {isLoading && (
          <div className="mr-auto text-sm text-white/70 flex items-center gap-2">
            <span>Prime is typing</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'120ms'}} />
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce" style={{animationDelay:'240ms'}} />
            </span>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto">
          {attachments.map((f, i) => (
            <div key={i} className="text-xs px-2 py-1 rounded-full bg-white/10">{f.name}</div>
          ))}
        </div>
      )}

      {/* Empty state hints */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-3 pb-2 text-[12px] text-white/70">
          Try: "Spending Summary last 30 days", "Where to save $200/mo", or "Set a groceries budget".
        </div>
      )}

      <div className="p-3 border-t border-white/10 sticky bottom-0 left-0 right-0" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center gap-2">
          {/* Actions */}
          <label className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer" title="Attach">
            📎
            <input type="file" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
          </label>
          <label className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center cursor-pointer" title="Image">
            🖼
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
          </label>
          <button
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
            title="Voice"
            onClick={() => window.dispatchEvent(new CustomEvent('prime:voice'))}
          >
            🎤
          </button>

          {/* Input */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message Prime"
            className="flex-1 bg-white/10 rounded-xl px-3 py-3 text-base placeholder-white/50 focus:outline-none"
            ref={inputRef}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        {error && (
          <div className="mt-2 text-[12px] text-red-400" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function sanitize(input: string): string {
  // Basic HTML escaping to prevent XSS in message rendering
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}



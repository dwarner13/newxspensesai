import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { chatWithBoss, ChatMessage } from '../../lib/boss/openaiClient';
import { BOSS_SYSTEM_PROMPT } from '../../lib/boss/prompt';
import { useRouteGate } from '../../lib/boss/useRouteGate';
import { agentBus, makeMsg } from '../../lib/agents/bus';
import { useBossContext } from '../../lib/agents/context';
import { useAgentNav } from '../../lib/agents/nav';
import { RouteSlug } from '../../lib/agents/protocol';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  handoff?: {
    slug: RouteSlug;
    capability?: string;
    payload?: Record<string, any>;
  };
}

const EXAMPLE_QUERIES = [
  'Import a bank PDF',
  'Why is a transaction uncategorized?',
  'Start a financial therapy session',
  'Set a savings goal',
  'Predict my spending next month'
];

const BossIcon = () => (
  <svg viewBox="0 0 64 64" className="h-7 w-7">
    <defs>
      <linearGradient id="bossGrad" x1="0" x2="1">
        <stop offset="0%" stopColor="#9b87f5" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#bossGrad)" opacity="0.2" />
    {/* crown */}
    <path d="M18 24l7 6 7-10 7 10 7-6v14H18z" fill="url(#bossGrad)" />
    {/* bot face */}
    <rect x="20" y="34" width="24" height="14" rx="6" fill="currentColor" />
    <circle cx="28" cy="41" r="2" fill="#0ea5e9" />
    <circle cx="36" cy="41" r="2" fill="#a78bfa" />
  </svg>
);

export default function BossBubble() {
  const { isDashboard } = useRouteGate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { go } = useAgentNav();
  const userContext = useBossContext();

  // Hide on dashboard routes
  if (isDashboard) {
    return null;
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Focus first focusable element
    const firstFocusable = panelRef.current?.querySelector('button, input, textarea');
    if (firstFocusable instanceof HTMLElement) {
      firstFocusable.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Prepare messages for OpenAI (include system prompt)
      const openaiMessages: ChatMessage[] = [
        { role: 'system', content: BOSS_SYSTEM_PROMPT },
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: input.trim() }
      ];

      const response = await chatWithBoss(openaiMessages);

      // Parse handoff from the response
      const handoffMatch = response.content.match(/```handoff\s*(\{.*?\})\s*```/s);
      let handoff;

      if (handoffMatch) {
        try {
          handoff = JSON.parse(handoffMatch[1]);
        } catch (e) {
          console.warn('Failed to parse handoff JSON:', e);
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        handoff
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response from Boss');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    inputRef.current?.focus();
  };

  const handleHandoffAction = (handoff: Message['handoff']) => {
    if (!handoff?.slug) return;
    
    // Publish handoff message to the bus
    agentBus.publish(makeMsg({
      from: 'boss',
      to: handoff.slug,
      text: `Boss handoff: ${handoff.payload?.summary || 'Task assigned'}`,
      handoff: {
        slug: handoff.slug,
        capability: handoff.capability as any,
        payload: handoff.payload
      },
      context: userContext ?? undefined
    }));

    // Navigate to the employee route
    go(handoff.slug);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Boss Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-5 right-5 md:bottom-6 md:right-6 z-[70] h-14 w-14 rounded-full bg-slate-900/80 text-white shadow-xl ring-1 ring-white/10 hover:bg-slate-900/90 transition-all duration-200 hover:scale-105"
        aria-label="Open AI Boss chat"
      >
        <BossIcon />
        <span className="absolute -top-1 -right-1 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 text-[10px] px-1.5 py-0.5 font-semibold shadow">
          Boss
        </span>
      </button>

      {/* Chat Panel Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          {/* Chat Panel */}
          <div 
            ref={panelRef}
            className="fixed bottom-24 right-5 md:right-6 w-[92vw] max-w-[420px] rounded-2xl bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl border border-white/10"
            role="dialog"
            aria-modal="true"
            aria-label="AI Boss Chat"
          >
            {/* Header */}
            <div className="rounded-t-2xl bg-gradient-to-r from-indigo-500 to-cyan-400 p-[2px]">
              <div className="rounded-t-2xl bg-slate-900/95 px-4 py-3 flex items-center gap-3">
                <BossIcon />
                <div className="flex-1">
                  <div className="font-semibold leading-tight">AI Boss</div>
                  <div className="text-xs text-slate-300">Ask what to do — I'll route you.</div>
                </div>
                <button 
                  onClick={handleClose}
                  aria-label="Close"
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="p-4">
              {/* Messages */}
              <div className="space-y-3 mb-4 max-h-[60vh] overflow-y-auto">
                {messages.length === 0 && (
                  <div className="text-center text-slate-400 py-4">
                    <BossIcon />
                    <p className="text-sm mt-2">Ask me anything about your finances or what you want to do next.</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                        message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-white border border-slate-700'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                      
                                         {/* Handoff Action Button */}
                   {message.role === 'assistant' && message.handoff && (
                     <div className="mt-2 pt-2 border-t border-slate-600">
                       <button
                         onClick={() => handleHandoffAction(message.handoff)}
                         className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 transition-colors"
                       >
                         {message.handoff.payload?.cta || `Open ${message.handoff.slug.replace('dashboard.', '')}`}
                       </button>
                     </div>
                   )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-white border border-slate-700 rounded-2xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Boss is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Example Queries */}
              {messages.length === 0 && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-1">
                    {EXAMPLE_QUERIES.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
                  {error}
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                    placeholder="Ask the Boss what you want to do..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-400 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all duration-200 text-sm"
                    rows={2}
                    disabled={isLoading}
                    aria-label="Ask the AI Boss"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white p-2 rounded-xl hover:from-indigo-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 flex-shrink-0"
                  aria-label="Send message"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

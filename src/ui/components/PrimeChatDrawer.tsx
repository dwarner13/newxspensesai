import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

interface PrimeChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  conversationId?: string;
}

const T = {
  bg: '#0b1220',
  surface: '#111a2e',
  border: '#1e2d4a',
  text: '#e8ecf4',
  muted: '#c8d0e0',
  dim: '#9ba8bc',
  gold: '#c8a64e',
};

function buildPageContext(page: string): { label: string; systemPrompt: string } {
  if (page.includes('/reports')) {
    return {
      label: 'Reports',
      systemPrompt: `You are Prime on the REPORTS PAGE. The user is reviewing their statement breakdown for their accountant.
Focus on: accountant readiness, missing statements, category totals, CSV export, tax summary.
Open with a reports-specific briefing. Mention what statements are present, what is missing,
and what the user needs to do next to be accountant-ready.
Be direct and action-oriented. Reference specific numbers if available in prime_context.`,
    };
  }
  if (page.includes('/transactions')) {
    return {
      label: 'Transactions',
      systemPrompt: `You are Prime on the TRANSACTIONS PAGE. The user is reviewing their transaction list.
Focus on: uncategorized transactions, spending patterns, category corrections, merchant insights.
Reference specific transaction counts and amounts if available.
Suggest what Tag can help with if categories need review.`,
    };
  }
  if (page.includes('/categories')) {
    return {
      label: 'Categories',
      systemPrompt: `You are Prime on the CATEGORIES PAGE. The user is reviewing their spending by category.
Focus on: category accuracy, business vs personal split, tax deductibility, top spending areas.
Suggest which categories need review and what Tag can help recategorize.
Reference specific category totals if available in prime_context.`,
    };
  }
  if (page.includes('/upload')) {
    return {
      label: 'Upload',
      systemPrompt: `You are Prime on the UPLOAD PAGE. The user is uploading financial statements.
Focus on: upload status, which statements are needed, pipeline progress.
Be encouraging and guide them through the upload process step by step.
Let them know what Byte is doing and when statements are ready.`,
    };
  }
  if (page.includes('/dashboard') || page === '/') {
    return {
      label: 'Dashboard',
      systemPrompt: `You are Prime on the DASHBOARD. Give the user their complete financial briefing.
Focus on: overall financial health, recent activity, what needs attention today.
Reference total spent, income, top categories, and any missing statements.
Be proactive -- tell them what matters most right now without waiting to be asked.`,
    };
  }
  return {
    label: 'XspensesAI',
    systemPrompt: `You are Prime -- the AI financial CEO of XspensesAI.
Help the user with their finances. Be direct, specific, and action-oriented.`,
  };
}

export function PrimeChatDrawer({ isOpen, onClose, currentPage = '/', conversationId }: PrimeChatDrawerProps) {
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>(() => {
    try {
      const saved = localStorage.getItem('prime_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => {
    const saved = localStorage.getItem('prime_session_id');
    if (saved) return saved;
    const id = 'prime-drawer-' + Date.now();
    localStorage.setItem('prime_session_id', id);
    return id;
  });
  const [primeSnapshot, setPrimeSnapshot] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pageCtx = buildPageContext(currentPage);

  const fetchPrimeSnapshot = useCallback(async () => {
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data: { session } } = await sb.auth.getSession();
      if (!session?.user?.id) return;
      const uid = session.user.id;

      const [txRes, impRes] = await Promise.all([
        sb.from('transactions')
          .select('amount, category, type, posted_at, date, import_id')
          .eq('user_id', uid)
          .order('posted_at', { ascending: false })
          .limit(1500),
        sb.from('imports')
          .select('id, issuer, created_at, status')
          .eq('user_id', uid)
          .eq('status', 'committed')
          .order('created_at', { ascending: false }),
      ]);

      const txs = txRes.data || [];
      const imps = impRes.data || [];

      // Monthly spend (last 30 days, expenses only)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      let monthlySpend = 0;
      let uncategorizedCount = 0;
      const catMap: Record<string, number> = {};

      for (const tx of txs) {
        const amt = Math.abs(Number(tx.amount) || 0);
        const isIncome = tx.type === 'income' || (tx.category || '').toLowerCase() === 'income';
        if (!isIncome) {
          const d = tx.posted_at || tx.date || '';
          if (d >= thirtyDaysAgo) monthlySpend += amt;
          const cat = tx.category || 'Other';
          catMap[cat] = (catMap[cat] || 0) + amt;
          if (!tx.category || tx.category === 'Other' || tx.category === 'Uncategorized') uncategorizedCount++;
        }
      }

      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, amount]) => ({ name, amount: Math.round(amount) }));

      // Per-import summaries
      const txByImport = new Map<string, number>();
      for (const tx of txs) {
        if (tx.import_id) txByImport.set(tx.import_id, (txByImport.get(tx.import_id) || 0) + 1);
      }
      const recentImportSummaries = imps.slice(0, 5).map(imp => ({
        importId: imp.id,
        label: imp.issuer || 'Unknown',
        totalSpend: 0,
        txCount: txByImport.get(imp.id) || 0,
        displayedAt: imp.created_at,
      }));

      setPrimeSnapshot({
        currency: 'CAD',
        currentStage: 'power',
        financialSnapshot: {
          hasTransactions: txs.length > 0,
          uncategorizedCount,
          monthlySpend: Math.round(monthlySpend),
          topCategories,
          hasDebt: false,
          hasGoals: false,
        },
        recentImportSummaries,
      });
    } catch (err) {
      console.warn('[PrimeChatDrawer] snapshot fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    localStorage.setItem('prime_chat_history', JSON.stringify(messages.slice(-20)));
  }, [messages]);

  // Fire opening message when drawer first opens
  useEffect(() => {
    if (isOpen && !primeSnapshot) { fetchPrimeSnapshot(); }
    if (isOpen && messages.length === 0) {
      const openingMessages: Record<string, string> = {
        '/dashboard/reports':
          'I am on the Reports page reviewing my statements for my accountant. What statements do I have committed, which issuers are missing, and what do I need to do to be fully accountant-ready? Be specific.',
        '/dashboard/transactions':
          'I am on the Transactions page. Give me a quick status on my transactions -- are there any that need my attention, any patterns worth flagging, or anything Tag should review?',
        '/dashboard/categories':
          'I am on the Categories page. Walk me through my top spending categories and flag anything that looks wrong or could be optimized for a self-employed Canadian.',
        '/dashboard/upload':
          'I am on the Upload page. What statements should I be uploading right now and what is the current status of my pipeline?',
      };

      const page = currentPage || '/';
      const openingMsg = Object.entries(openingMessages).find(([key]) =>
        page.includes(key.replace('/dashboard', ''))
      )?.[1] || 'I just opened XspensesAI. Give me a quick financial status update based on my current data -- what matters most right now?';

      sendMessage(openingMsg, true);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Re-brief when page changes while Prime is open
  const prevPageRef = useRef<string>(currentPage);
  useEffect(() => {
    if (!isOpen) {
      prevPageRef.current = currentPage;
      return;
    }
    if (currentPage !== prevPageRef.current) {
      prevPageRef.current = currentPage;
      const newCtx = buildPageContext(currentPage);
      const pageChangeMsg = Object.entries({
        '/reports': 'I just navigated to the Reports page. Give me a reports-specific briefing -- statements committed, what is missing, accountant readiness.',
        '/transactions': 'I just navigated to the Transactions page. Give me a quick transaction status -- any patterns or issues worth flagging.',
        '/categories': 'I just navigated to the Categories page. Give me a category overview -- top spending areas and anything that looks wrong.',
        '/upload': 'I just navigated to the Upload page. What should I be uploading right now?',
        '/dashboard': 'I just navigated to the Dashboard. Give me a quick overall financial status.',
      }).find(([key]) => currentPage.includes(key))?.[1]
        || 'I just navigated to a new page. Give me a relevant financial update.';

      setMessages(prev => [
        ...prev,
        {
          id: 'nav-' + Date.now(),
          role: 'assistant' as const,
          content: '-- Now on ' + newCtx.label + ' --',
        },
      ]);

      setTimeout(() => sendMessage(pageChangeMsg, true), 300);
    }
  }, [currentPage, isOpen]);

  const sendMessage = useCallback(async (text?: string, hidden = false) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;
    if (!hidden) setInput('');

    const userMsg = { id: 'user-' + Date.now(), role: 'user' as const, content: msg };
    if (!hidden) setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';

      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          message: msg,
          employeeSlug: 'prime',
          sessionId,
          history,
          hidden,
          systemPromptOverride: pageCtx.systemPrompt,
          prime_context: primeSnapshot,
        }),
      });

      if (!res.ok) throw new Error('Chat failed: ' + res.status);

      const contentType = res.headers.get('content-type') || '';
      let reply = '';

      if (contentType.includes('text/event-stream')) {
        // SSE streaming
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        setMessages(prev => [...prev, { id: 'ai-' + Date.now(), role: 'assistant', content: '' }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text' && data.content) {
                reply += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: reply,
                  };
                  return updated;
                });
              }
              if (data.type === 'done') break;
            } catch { /* skip malformed SSE */ }
          }
        }
      } else {
        // JSON fallback
        const data = await res.json();
        reply = data.content || data.reply || 'Sorry, something went wrong.';
        setMessages(prev => [...prev, { id: 'ai-' + Date.now(), role: 'assistant', content: reply }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: 'ai-err-' + Date.now(),
        role: 'assistant',
        content: 'Something went wrong -- please try again.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isLoading, sessionId, pageCtx, primeSnapshot]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: T.surface, borderLeft: '1px solid ' + T.border,
      zIndex: 50, display: 'flex', flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 18px', borderBottom: '1px solid ' + T.border,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(200,166,78,0.15)', border: '1px solid ' + T.gold,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: T.gold, fontWeight: 800, flexShrink: 0,
        }}>{"\u265B"}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Prime</div>
          <div style={{ fontSize: 11, color: T.gold }}>{pageCtx.label} - Your Financial Advisor</div>
        </div>
        <button onClick={onClose} style={{
          marginLeft: 'auto', background: 'none', border: 'none',
          cursor: 'pointer', color: T.dim, padding: 4, display: 'flex',
        }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map(m => (
          <div key={m.id} style={{
            display: 'flex', gap: 8,
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            {m.role === 'assistant' && (
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: 'rgba(200,166,78,0.12)', border: '1px solid rgba(200,166,78,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: T.gold,
              }}>{"\u265B"}</div>
            )}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', fontSize: 14, color: T.text,
              lineHeight: 1.6, whiteSpace: 'pre-wrap',
              borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: m.role === 'user' ? 'rgba(200,166,78,0.15)' : 'rgba(255,255,255,0.04)',
              border: '1px solid ' + (m.role === 'user' ? 'rgba(200,166,78,0.25)' : 'rgba(255,255,255,0.06)'),
            }}>
              {m.content || (isLoading ? '...' : '')}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(200,166,78,0.12)', border: '1px solid rgba(200,166,78,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: T.gold,
            }}>{"\u265B"}</div>
            <div style={{ fontSize: 12, color: T.dim }}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', borderTop: '1px solid ' + T.border,
        display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
          placeholder={'Ask Prime about ' + pageCtx.label.toLowerCase() + '...'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + T.border, borderRadius: 8,
            padding: '8px 12px', fontSize: 14, color: T.text,
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => void sendMessage()}
          disabled={isLoading || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: isLoading ? 'rgba(200,166,78,0.1)' : 'rgba(200,166,78,0.2)',
            border: '1px solid rgba(200,166,78,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isLoading ? 'default' : 'pointer', color: T.gold,
          }}
        >
          <Send style={{ width: 16, height: 16 }} />
        </button>
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 16px', borderTop: '1px solid ' + T.border,
        fontSize: 11, color: T.dim, textAlign: 'center',
      }}>
        Secured - Guardrails + PII protection active
      </div>
    </div>
  );
}

export default PrimeChatDrawer;


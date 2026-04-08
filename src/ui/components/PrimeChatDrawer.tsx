import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Paperclip, Trash2 } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useTypewriter } from '../../pages/PrimeChatV2/useTypewriter';
import { useProfile } from '../../hooks/useProfile';

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

const PRIME_VOICE = `\n\nKeep every reply to 2-3 sentences maximum. Be direct, warm and confident - you are a senior financial advisor, not a report generator. Always end with one question to keep the conversation going. Never use bullet points, headers, or numbered lists in replies. Speak like a person, not a dashboard. Never list raw transactions. When asked about statements or spending, summarize in 2-3 sentences covering: total spent, top 2-3 categories, and one insight. Then ask one follow-up question. If the user asks about subcategories, tell them: "Tap any transaction to open the drawer - you'll see a subcategory dropdown below the category. You can pick from built-in options or add your own."`;

function buildPageContext(page: string): { label: string; systemPrompt: string } {
  if (page.includes('/reports')) {
    return {
      label: 'Reports',
      systemPrompt: `You are Prime on the REPORTS PAGE. The user is reviewing their statement breakdown for their accountant.
Focus on: accountant readiness, missing statements, category totals, CSV export, tax summary.
Reference specific numbers if available in prime_context.` + PRIME_VOICE,
    };
  }
  if (page.includes('/transactions')) {
    return {
      label: 'Transactions',
      systemPrompt: `You are Prime on the TRANSACTIONS PAGE. The user is reviewing their transaction list.
Focus on: uncategorized transactions, spending patterns, category corrections, merchant insights.
Suggest what Tag can help with if categories need review.` + PRIME_VOICE,
    };
  }
  if (page.includes('/categories')) {
    return {
      label: 'Categories',
      systemPrompt: `You are Prime on the CATEGORIES PAGE. The user is reviewing their spending by category.
Focus on: category accuracy, business vs personal split, tax deductibility, top spending areas.
Suggest which categories need review and what Tag can help recategorize.` + PRIME_VOICE,
    };
  }
  if (page.includes('/upload')) {
    return {
      label: 'Upload',
      systemPrompt: `You are Prime on the UPLOAD PAGE. The user is uploading financial statements.
Focus on: upload status, which statements are needed, pipeline progress.
Be encouraging and guide them through the upload process.` + PRIME_VOICE,
    };
  }
  if (page.includes('/dashboard') || page === '/') {
    return {
      label: 'Dashboard',
      systemPrompt: `You are Prime on the DASHBOARD. The user just opened XspensesAI.
Focus on: overall financial health, what needs attention today.
Reference total spent, income, top categories if available in prime_context.` + PRIME_VOICE,
    };
  }
  return {
    label: 'XspensesAI',
    systemPrompt: `You are Prime -- the AI financial CEO of XspensesAI.
Help the user with their finances.` + PRIME_VOICE,
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
  const { fullName } = useProfile();
  const firstName = fullName?.split(' ')[0] || '';
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCompletedIndex = useRef(-1);

  // Track when loading finishes or a greeting is set to mark the last assistant message as completed
  const prevLoading = useRef(isLoading);
  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') { lastCompletedIndex.current = i; break; }
      }
    }
    // Also catch direct message sets (e.g. greeting) - when not loading and last msg is assistant
    if (!isLoading && !prevLoading.current && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant') {
      lastCompletedIndex.current = messages.length - 1;
    }
    prevLoading.current = isLoading;
  }, [isLoading, messages]);

  const typewriterIndex = lastCompletedIndex.current;
  const typewriterText = !isLoading && typewriterIndex >= 0 ? messages[typewriterIndex]?.content ?? '' : '';
  const [twDisplay, twDone] = useTypewriter(typewriterText, 18, 150);
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

      // Per-import summaries with real totals, categories, merchants
      const importStats = new Map<string, { spend: number; income: number; count: number; cats: Record<string, number>; merchants: Record<string, number> }>();
      for (const tx of txs) {
        if (!tx.import_id) continue;
        let s = importStats.get(tx.import_id);
        if (!s) { s = { spend: 0, income: 0, count: 0, cats: {}, merchants: {} }; importStats.set(tx.import_id, s); }
        const amt = Math.abs(Number(tx.amount) || 0);
        const isInc = tx.type === 'income' || (tx.category || '').toLowerCase() === 'income';
        if (isInc) { s.income += amt; } else { s.spend += amt; }
        s.count++;
        const cat = tx.category || 'Other';
        s.cats[cat] = (s.cats[cat] || 0) + amt;
        const merchant = tx.merchant_name || 'Unknown';
        if (merchant !== 'Unknown') s.merchants[merchant] = (s.merchants[merchant] || 0) + amt;
      }
      const recentImportSummaries = imps.slice(0, 5).map(imp => {
        const s = importStats.get(imp.id);
        const topCats = s ? Object.entries(s.cats).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount: Math.round(amount) })) : [];
        const topMerchants = s ? Object.entries(s.merchants).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount: Math.round(amount) })) : [];
        return {
          importId: imp.id,
          label: imp.issuer || 'Unknown',
          totalSpend: Math.round(s?.spend ?? 0),
          totalIncome: Math.round(s?.income ?? 0),
          txCount: s?.count ?? 0,
          topCategories: topCats,
          topMerchants: topMerchants,
          displayedAt: imp.created_at,
        };
      });

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

  // Fetch snapshot when drawer opens - don't fire opening message yet
  useEffect(() => {
    if (!isOpen) return;
    if (!primeSnapshot) { fetchPrimeSnapshot(); }
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Fire opening greeting once snapshot is ready
  useEffect(() => {
    if (!isOpen || !primeSnapshot || messages.length > 0) return;

    const snap = primeSnapshot.financialSnapshot;
    const stmtCount = primeSnapshot.recentImportSummaries?.length ?? 0;
    const txCount = primeSnapshot.recentImportSummaries?.reduce((s: number, r: any) => s + (r.txCount || 0), 0) ?? 0;
    const hi = firstName ? `Hey ${firstName}` : 'Hey';

    let greeting: string;
    if (snap?.hasTransactions && txCount > 0) {
      greeting = `${hi} - ${stmtCount} statement${stmtCount !== 1 ? 's' : ''} in, ${txCount} transactions processed. What do you want to dig into?`;
    } else {
      greeting = `${hi} - upload your first statement and I'll get to work. What bank are we starting with?`;
    }

    setMessages([{ id: 'greeting-' + Date.now(), role: 'assistant', content: greeting }]);

    // Check for recent Prime briefing (< 24h old)
    (async () => {
      try {
        const sb = getSupabase(); if (!sb) return;
        const { data: { user } } = await sb.auth.getUser(); if (!user) return;
        const { data: briefingNotif } = await sb.from('user_notifications').select('message, created_at')
          .eq('user_id', user.id).eq('employee_slug', 'prime').eq('type', 'daily_briefing')
          .is('read_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (briefingNotif?.message) {
          const age = Date.now() - new Date(briefingNotif.created_at).getTime();
          if (age < 24 * 60 * 60 * 1000) {
            setMessages(prev => [...prev, { id: 'briefing-' + Date.now(), role: 'assistant', content: briefingNotif.message }]);
          }
        }
      } catch { /* silent */ }
    })();
  }, [primeSnapshot]);

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

  const handleFileSelect = useCallback(async (file: File) => {
    setAttachedFile(file);
    setPreviewLoading(true);
    setMessages(prev => [...prev, {
      id: 'upload-' + Date.now(),
      role: 'user' as const,
      content: '\ud83d\udcce ' + file.name,
    }]);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';

      // Read file as base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const res = await fetch('/.netlify/functions/prime-preview-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ fileBase64: base64, filename: file.name }),
      });

      const data = await res.json();
      const txs = data.transactions || [];

      let reply: string;
      if (txs.length === 0) {
        reply = "I couldn't pull transactions from that file - it might not be a bank statement, or the format threw me off. Try a different file?";
      } else {
        const top5 = txs.slice(0, 5);
        const lines = top5.map((t: any) =>
          `${t.merchant} - $${Math.abs(t.amount).toFixed(2)} (${t.type})`
        ).join('\n');
        const total = txs.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
        reply = `I found ${txs.length} transactions in ${file.name}. Here are the biggest:\n\n${lines}\n\nTotal: $${total.toFixed(2)}. Want me to import this statement?`;
      }

      setMessages(prev => [...prev, { id: 'preview-' + Date.now(), role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        id: 'preview-err-' + Date.now(),
        role: 'assistant',
        content: 'Something went wrong previewing that file. Try again?',
      }]);
    } finally {
      setPreviewLoading(false);
      setAttachedFile(null);
    }
  }, []);

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
        <button onClick={() => {
          localStorage.removeItem('prime_chat_history');
          const snap = primeSnapshot?.financialSnapshot;
          const stmtCount = primeSnapshot?.recentImportSummaries?.length ?? 0;
          const txCount = primeSnapshot?.recentImportSummaries?.reduce((s: number, r: any) => s + (r.txCount || 0), 0) ?? 0;
          const hi = firstName ? `Hey ${firstName}` : 'Hey';
          const greeting = snap?.hasTransactions && txCount > 0
            ? `${hi} - ${stmtCount} statement${stmtCount !== 1 ? 's' : ''} in, ${txCount} transactions processed. What do you want to dig into?`
            : `${hi} - upload your first statement and I'll get to work. What bank are we starting with?`;
          setMessages([{ id: 'greeting-' + Date.now(), role: 'assistant', content: greeting }]);
        }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: T.dim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6 }}>
          <Trash2 size={13} /> Clear
        </button>
        <button onClick={onClose} style={{
          background: 'none', border: 'none',
          cursor: 'pointer', color: T.dim, padding: 4, display: 'flex',
        }}>
          <X style={{ width: 18, height: 18 }} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, idx) => {
          const isTypewriterTarget = !isLoading && m.role === 'assistant' && idx === typewriterIndex;
          const displayContent = isTypewriterTarget ? twDisplay : m.content;
          return (
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
                {displayContent || (isLoading ? '...' : '')}
              </div>
            </div>
          );
        })}
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

      {/* Attachment pill */}
      {attachedFile && (
        <div style={{
          margin: '0 16px', padding: '6px 12px', borderRadius: 8,
          background: T.surface, border: '1px solid ' + T.border,
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.text,
        }}>
          <span>{'\ud83d\udcce'} {attachedFile.name}</span>
          {previewLoading && <span style={{ color: T.dim }}>Previewing...</span>}
          {!previewLoading && (
            <button onClick={() => setAttachedFile(null)} style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: T.dim, cursor: 'pointer', fontSize: 14, padding: 0,
            }}>{'\u00d7'}</button>
          )}
        </div>
      )}

      {/* Input */}
      <input ref={fileInputRef} type="file" accept=".pdf,.csv,.png,.jpg,.jpeg" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ''; }} />
      <div style={{
        padding: '12px 16px', borderTop: '1px solid ' + T.border,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={previewLoading}
          style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: previewLoading ? 'default' : 'pointer', color: T.dim,
          }}
        >
          <Paperclip style={{ width: 16, height: 16 }} />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && void sendMessage()}
          placeholder={'Ask Prime about ' + pageCtx.label.toLowerCase() + '...'}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid ' + T.border, borderRadius: 8,
            padding: '12px 16px', minHeight: 48, fontSize: 14, color: T.text,
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



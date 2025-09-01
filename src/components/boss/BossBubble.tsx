import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EMPLOYEES, findEmployeeByIntent } from '../../data/aiEmployees';
import { supabase } from '../../lib/supabase';
import { chatWithBoss, ChatMessage } from '../../lib/boss/openaiClient';

export default function BossBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user'|'prime'|'note'; text: string }[]>([
    { role: 'prime', text: 'I\'m ⭐ Prime — the Boss AI. Ask me anything, and I\'ll route you to the right expert.' }
  ]);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function logInteraction(userQuery: string, matchKey?: string) {
    try {
      await supabase.from('prime_interactions').insert([
        {
          query: userQuery,
          matched_employee: matchKey || null,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (e) {
      console.error('Prime logging error:', e);
    }
  }

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create system prompt for Prime
  const createSystemPrompt = () => {
    const employeeList = EMPLOYEES.map(e => 
      `${e.emoji} ${e.name}: ${e.short} (tags: ${e.tags.join(', ')})`
    ).join('\n');

    return `You are Prime, the Boss AI for XspensesAI. Your job is to understand user requests and route them to the right AI employee.

Available AI Employees:
${employeeList}

Special Instructions:
1. For pricing questions: Route to pricing page or suggest checking the pricing section
2. For account/billing questions: Route to account management or billing features
3. For feature questions: Match to the appropriate AI employee
4. For general questions: Provide helpful guidance and suggest relevant employees

General Instructions:
1. Analyze the user's request carefully
2. Match it to the most appropriate AI employee based on their description and tags
3. Respond naturally and conversationally
4. If you find a good match, format your response as: "I'll connect you with [Employee Name] who specializes in [their expertise]. [Brief explanation of why they're perfect for this request]"
5. If no clear match, suggest a few options or ask for clarification
6. Be helpful, friendly, and professional

Always respond in a conversational tone as Prime, the helpful AI boss.`;
  };

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

  async function send() {
    const q = input.trim();
    if (!q) return;
    
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setIsLoading(true);

    try {
      // Try AI-powered understanding first
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: createSystemPrompt() },
        { role: 'user', content: q }
      ];

      const aiResponse = await chatWithBoss(aiMessages);
      
      // Extract employee name from AI response
      const employeeMatch = EMPLOYEES.find(e => 
        aiResponse.content.toLowerCase().includes(e.name.toLowerCase())
      );

      if (employeeMatch) {
        // AI found a good match
        setMessages(m => [...m, { role: 'prime', text: aiResponse.content }]);
        logInteraction(q, employeeMatch.key);
        
        setTimeout(() => {
          navigate(employeeMatch.route);
          setOpen(false);
        }, 1500);
      } else {
        // AI didn't find a clear match, fall back to keyword matching
        const keywordMatch = findEmployeeByIntent(q);
        logInteraction(q, keywordMatch?.key);
        
        if (keywordMatch) {
          const reply = `${keywordMatch.emoji ?? '🤖'} ${keywordMatch.name} is best for that.\n→ Opening ${keywordMatch.name}…`;
          setMessages(m => [...m, { role: 'prime', text: reply }]);
          
          setTimeout(() => {
            navigate(keywordMatch.route);
            setOpen(false);
          }, 700);
        } else {
          // No match found, use AI's response as fallback
          setMessages(m => [...m, { role: 'prime', text: aiResponse.content }]);
        }
      }
    } catch (error) {
      console.error('AI error, falling back to keyword matching:', error);
      
      // Fallback to keyword matching if AI fails
      const match = findEmployeeByIntent(q);
      logInteraction(q, match?.key);
      
      if (!match) {
        // Check if it's a pricing question
        if (q.toLowerCase().includes('price') || q.toLowerCase().includes('cost') || q.toLowerCase().includes('pricing')) {
          setMessages(m => [...m, { role: 'prime', text: 'For pricing information, I\'ll take you to our pricing page where you can see all our plans and features.' }]);
          setTimeout(() => {
            navigate('/pricing');
            setOpen(false);
          }, 1500);
        } else {
          setMessages(m => [...m, { role: 'prime', text: 'Try asking about goals, tax, bills, importing receipts, predictions, or categorization.' }]);
        }
      } else {
        const reply = `${match.emoji ?? '🤖'} ${match.name} is best for that.\n→ Opening ${match.name}…`;
        setMessages(m => [...m, { role: 'prime', text: reply }]);
        
        setTimeout(() => {
          navigate(match.route);
          setOpen(false);
        }, 700);
      }
    } finally {
      setIsLoading(false);
    }
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
          
          {isLoading && (
            <div className="text-left">
              <div className="inline-block bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                  <span className="text-sm">Prime is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 flex gap-2 border-t border-white/10">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isLoading && send()}
            placeholder="Ask me anything…"
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40"
            disabled={isLoading}
          />
          <button
            onClick={send}
            disabled={isLoading}
            className="rounded-lg bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Thinking...' : 'Send'}
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

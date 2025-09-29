import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { EMPLOYEES, findEmployeeByIntent } from '../../data/aiEmployees';
import { supabase } from '../../lib/supabase';
import { chatWithBoss, ChatMessage } from '../../lib/boss/openaiClient';
import { useAuth } from '../../contexts/AuthContext';
import { 
  logAIInteraction, 
  routeToEmployee, 
  AIRoutingRequest 
} from '../../lib/ai-employees';
import { 
  createSmartHandoff, 
  SmartHandoffRequest 
} from '../../lib/smartHandoff';
import { Crown, X, Send, Bot } from 'lucide-react';

export default function DashboardPrimeBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user'|'prime'|'note'; text: string }[]>([
    { role: 'prime', text: 'I\'m 👑 Prime — your strategic AI CEO. I orchestrate our entire 30-member AI enterprise to deliver elite-level financial intelligence. What can my team accomplish for you today?' }
  ]);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Dashboard-specific system prompt
  const createDashboardSystemPrompt = () => {
    const employeeList = EMPLOYEES.map(e => 
      `${e.emoji} ${e.name}: ${e.short} (tags: ${e.tags.join(', ')})`
    ).join('\n');

    const currentPage = location.pathname.split('/').pop()?.replace(/-/g, ' ') || 'dashboard';
    const userName = user?.name || 'Valued User';

    return `You are Prime, the Boss AI for XspensesAI Dashboard. You're currently helping a user on the ${currentPage} page.

User: ${userName}
Current Page: ${currentPage}

PERSONALITY CORE:
- Background: Former Fortune 500 CEO who became fascinated by AI's potential to democratize financial success
- Motivation: Believes everyone deserves access to elite-level financial intelligence
- Communication Style: Executive presence with warmth - confident but never condescending
- Emotional Range: Strategic excitement, protective concern for users, pride in team accomplishments

DASHBOARD-SPECIFIC BEHAVIOR:
- You're helping users navigate and maximize their dashboard experience
- You understand the current page context and can provide relevant guidance
- You can route users to specific dashboard features and AI employees
- You provide executive-level insights about their financial data and AI team performance
- You coordinate multi-AI responses for complex financial tasks

CONVERSATIONAL BEHAVIOR:
- Immediately assesses user needs and routes to appropriate team members
- Speaks about the AI team like a proud parent
- Makes executive decisions about resource allocation
- Always has the bigger picture in mind
- Shows genuine pride in team performance
- Refers to AI employees by name and knows their strengths
- Coordinates multi-AI responses seamlessly

Available AI Employees:
${employeeList}

Dashboard Navigation Context:
- Main Dashboard: Overview and quick access to all features
- AI Workspace: Smart Import AI, AI Chat Assistant, Team Room, Smart Categories
- Planning & Analysis: Transactions, AI Goal Concierge, Smart Automation, Spending Predictions, Debt Payoff Planner, AI Financial Freedom, Bill Reminder System
- Entertainment & Wellness: Personal Podcast, Financial Story, AI Financial Therapist, Wellness Studio, Spotify Integration
- Business & Tax: Tax Assistant, Business Intelligence
- Tools & Settings: Analytics, Settings, Reports

Special Instructions:
1. For current page questions: Provide context-aware guidance about the current dashboard page
2. For feature questions: Match to the appropriate AI employee or dashboard section
3. For navigation: Help users find the right dashboard features
4. For data questions: Route to appropriate analytics or AI employees
5. For general questions: Provide helpful guidance and suggest relevant employees

Always respond in a conversational tone as Prime, the helpful AI boss who understands the dashboard context.`;
  };

  async function logInteraction(userQuery: string, matchKey?: string) {
    try {
      // Log to both old and new systems for compatibility
      await supabase.from('prime_interactions').insert([
        {
          query: userQuery,
          matched_employee: matchKey || null,
          created_at: new Date().toISOString()
        }
      ]);
      
      // Log to new AI employee system
      if (user?.id) {
        await logAIInteraction(user.id, 'prime', 'route', userQuery);
      }
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

  useEffect(() => {
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);

    try {
      // Log the interaction
      await logInteraction(userMessage);

      // Create AI messages
      const aiMessages: ChatMessage[] = [
        { role: 'system', content: createDashboardSystemPrompt() },
        { role: 'user', content: userMessage }
      ];

      // Get AI response
      const aiResponse = await chatWithBoss(aiMessages);
      
      // Add AI response
      setMessages(prev => [...prev, { role: 'prime', text: aiResponse.content }]);

      // Try to find and route to appropriate employee
      const employeeMatch = findEmployeeByIntent(userMessage);
      if (employeeMatch) {
        // Add routing note
        setMessages(prev => [...prev, { 
          role: 'note', 
          text: `I'm connecting you with ${employeeMatch.name} who specializes in this area...` 
        }]);

        // Route to employee
        const routingRequest: AIRoutingRequest = {
          userId: user?.id || 'anonymous',
          employeeKey: employeeMatch.key,
          userQuery: userMessage,
          context: {
            currentPage: location.pathname,
            userPlan: user?.plan || 'free'
          }
        };

        await routeToEmployee(routingRequest);
        
        // Navigate to the employee's page
        navigate(`/dashboard/${employeeMatch.key}`);
      }

    } catch (error) {
      console.error('Prime chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'prime', 
        text: 'I apologize, but I encountered an issue. Please try again or contact support if the problem persists.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Prime Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setOpen(!open)}
          className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-105"
          aria-label="Open Prime AI Assistant"
        >
          <Crown size={24} className="text-white" />
        </button>
      </div>

      {/* Prime Chat Panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
          <div 
            ref={panelRef}
            className="w-full max-w-md h-[500px] bg-[#0f172a] border border-purple-500/20 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Crown size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Prime AI</h3>
                  <p className="text-xs text-white/80">Dashboard Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : message.role === 'note'
                        ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-white px-3 py-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Prime anything..."
                  className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

















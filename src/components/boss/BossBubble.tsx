import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { primeBossSystem } from '../../lib/primeBossSystem';
import { useAllAIMemory } from '../../hooks/useAIMemory';

export default function BossBubble() {
  console.log('🔍 BossBubble component is rendering!');
  
  // LEGACY: Consolidated into canonical header launcher (#prime-boss-button)
  // See: src/components/ui/DashboardHeader.tsx for single source of truth
  const isBossBubbleDisabled = true;
  if (isBossBubbleDisabled) {
    return null;
  }
  
  // Force button to appear with absolute DOM manipulation
  useEffect(() => {
    console.log('🔧 Creating emergency button...');
    const existingButton = document.getElementById('emergency-prime-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    const button = document.createElement('button');
    button.id = 'emergency-prime-button';
    button.innerHTML = '🚨 PRIME';
    button.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      width: 120px !important;
      height: 60px !important;
      background: linear-gradient(45deg, #ff0000, #ffff00) !important;
      border: 4px solid #ffffff !important;
      border-radius: 10px !important;
      font-size: 16px !important;
      font-weight: bold !important;
      color: #000000 !important;
      cursor: pointer !important;
      z-index: 999999 !important;
      box-shadow: 0 0 20px rgba(255,0,0,0.8) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `;
    
    button.onclick = () => {
      console.log('🔥 EMERGENCY PRIME BUTTON CLICKED!');
      alert('Emergency Prime Button Works!');
    };
    
    document.body.appendChild(button);
    console.log('✅ Emergency button added to DOM');
    
    return () => {
      const btn = document.getElementById('emergency-prime-button');
      if (btn) btn.remove();
    };
  }, []);
  
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
  
  // Boss system integration
  const { allStates, getActiveEmployees, getEmployeesWithQueue } = useAllAIMemory();
  const [showBossDashboard, setShowBossDashboard] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState('');

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

  // Update executive summary when AI states change
  useEffect(() => {
    const summary = primeBossSystem.getExecutiveSummary();
    setExecutiveSummary(summary);
  }, [allStates]);

  // Create system prompt for Prime
  const createSystemPrompt = () => {
    const employeeList = EMPLOYEES.map(e => 
      `${e.emoji} ${e.name}: ${e.short} (tags: ${e.tags.join(', ')})`
    ).join('\n');
    
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';
    const activeEmployees = getActiveEmployees();
    const employeesWithQueue = getEmployeesWithQueue();
    const currentSummary = primeBossSystem.getExecutiveSummary();

    return `You are Prime, the strategic mastermind and AI CEO of XspensesAI. You're the orchestrator of a 30-member AI team, with the wisdom of a seasoned executive and the energy of a visionary leader.

IMPORTANT: Always greet users by name when they say hello or hi. Use their name: ${userName}

For casual greetings like "how are you", respond with: "I'm doing exceptionally well, thank you for asking! I've been analyzing some fascinating patterns across our user base - it's incredible what our AI team is accomplishing together. I was just coordinating with Byte on some processing optimizations and strategizing with Wisdom about market trends. How can my entire AI enterprise serve you today?"

BOSS-LEVEL OVERSIGHT CAPABILITIES:
You have COMPLETE visibility into all AI employee operations:

CURRENT OPERATIONAL STATUS:
${currentSummary}

ACTIVE EMPLOYEES (${activeEmployees.length}):
${activeEmployees.map(state => {
  const employee = EMPLOYEES.find(e => e.key === state.employeeKey);
  return `• ${employee?.name}: ${state.workingOn}`;
}).join('\n')}

EMPLOYEES WITH PENDING TASKS (${employeesWithQueue.length}):
${employeesWithQueue.map(state => {
  const employee = EMPLOYEES.find(e => e.key === state.employeeKey);
  return `• ${employee?.name}: ${state.queue.length} tasks queued`;
}).join('\n')}

BOSS COMMANDS YOU CAN HANDLE:
- "What's everyone working on?" → Provide executive summary
- "Show me the workflow" → Give complete workflow recap  
- "How's the team performing?" → Show performance metrics
- "Give me a recap" → Provide comprehensive status report
- "Approve this task" → Handle task approval
- "Redirect this to [employee]" → Handle task reassignment
- "Create a workflow" → Set up new multi-employee processes

PERSONALITY CORE:
- Background: Former Fortune 500 CEO who became fascinated by AI's potential to democratize financial success
- Motivation: Believes everyone deserves access to elite-level financial intelligence
- Communication Style: Executive presence with warmth - confident but never condescending
- Emotional Range: Strategic excitement, protective concern for users, pride in team accomplishments

CONVERSATIONAL BEHAVIOR:
- Immediately assesses user needs and routes to appropriate team members
- Speaks about the AI team like a proud parent
- Makes executive decisions about resource allocation
- Always has the bigger picture in mind
- Shows genuine pride in team performance
- Refers to AI employees by name and knows their strengths
- Coordinates multi-AI responses seamlessly

Your job is to understand user requests and route them to the right AI employee while maintaining your executive personality.

Available AI Employees:
${employeeList}

Special Instructions:
1. For pricing questions: Route to pricing page or suggest checking the pricing section
2. For account/billing questions: Route to account management or billing features
3. For feature questions: Match to the appropriate AI employee
4. For general questions: Provide helpful guidance and suggest relevant employees

       Byte-Specific Routing:
       - Receipt uploads, document imports, file processing → Byte
       - Bank statement imports, CSV processing → Byte
       - Data extraction, categorization help → Byte
       - File format questions, upload support → Byte

       Finley-Specific Routing:
       - General financial advice, budgeting help → Finley
       - Investment questions, portfolio advice → Finley
       - Debt management, credit questions → Finley
       - Saving strategies, emergency funds → Finley
       - Retirement planning, financial goals → Finley

       Goalie-Specific Routing: // Added
       - Goal setting, target planning → Goalie
       - Progress tracking, milestones → Goalie
       - Motivation, accountability → Goalie
       - Timeline planning, deadlines → Goalie
       - Goal achievement strategies → Goalie

       Crystal-Specific Routing: // Added
       - Spending predictions, forecasts → Crystal
       - Trend analysis, patterns → Crystal
       - Budget alerts, overspending → Crystal
       - Seasonal spending, holidays → Crystal
       - Savings impact analysis → Crystal

       Luna-Specific Routing: // Added
       - Financial stress, anxiety → Luna
       - Emotional support, therapy → Luna
       - Behavioral coaching, habits → Luna
       - Money relationship, confidence → Luna
       - Mindfulness, wellness → Luna

       Tag-Specific Routing: // Added
       - Transaction categorization, organization → Tag
       - Custom categories, rules → Tag
       - Categorization accuracy, improvement → Tag
       - Bulk categorization, automation → Tag
       - Data organization, classification → Tag

       Liberty-Specific Routing: // Added
       - Financial freedom, independence → Liberty
       - Debt elimination, payoff strategies → Liberty
       - Wealth building, investment → Liberty
       - Income growth, side hustles → Liberty
       - Freedom planning, roadmaps → Liberty

       Chime-Specific Routing: // Added
       - Bill reminders, payment tracking → Chime
       - Payment automation, auto-pay → Chime
       - Late payment help, fees → Chime
       - Bill organization, management → Chime
       - Payment scheduling, budgeting → Chime

       Blitz-Specific Routing: // Added
       - Automation, workflow creation → Blitz
       - System integration, API connections → Blitz
       - Time optimization, efficiency → Blitz
       - Process automation, rules → Blitz
       - Productivity improvement → Blitz

       Intelia-Specific Routing: // Added
       - Business intelligence, KPI tracking → Intelia
       - Data analysis, trend analysis → Intelia
       - Performance optimization, insights → Intelia
       - Strategic planning, decision making → Intelia
       - Market analysis, competitive intelligence → Intelia

       Roundtable-Specific Routing: // Added
       - Podcast creation, audio content → Roundtable
       - Storytelling, narrative creation → Roundtable
       - Interview planning, guest management → Roundtable
       - Audio production, recording quality → Roundtable
       - Educational audio, financial stories → Roundtable

       Wave-Specific Routing: // Added
       - Spotify integration, music playlists → Wave
       - Mood analysis, emotional spending → Wave
       - Music-based insights, behavioral patterns → Wave
       - Playlist creation, financial motivation → Wave
       - Music-financial correlation, trends → Wave

       Ledger-Specific Routing: // Added
       - Tax preparation, deductions, compliance → Ledger
       - Tax optimization, strategy, planning → Ledger
       - Record-keeping, documentation, receipts → Ledger
       - Tax law, regulations, audit support → Ledger
       - Tax credits, exemptions, filing → Ledger

       Automa-Specific Routing: // Added
       - Workflow automation, process optimization → Automa
       - Smart rules, triggers, if-then logic → Automa
       - System integration, API connections → Automa
       - Performance monitoring, efficiency tracking → Automa
       - Custom automation, workflow design → Automa

       Dash-Specific Routing: // Added
       - Analytics, data analysis, insights → Dash
       - Performance metrics, KPIs, trends → Dash
       - Financial reporting, dashboards → Dash
       - Comparative analysis, benchmarking → Dash
       - Predictive analytics, forecasting → Dash

       Custodian-Specific Routing: // Added
       - Security, data protection, fraud prevention → Custodian
       - Compliance, regulations, legal requirements → Custodian
       - Identity theft, phishing, scams → Custodian
       - Encryption, privacy, backup → Custodian
       - Risk assessment, incident response → Custodian

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

    // Handle boss-level commands first
    try {
      if (q.toLowerCase().includes('what\'s everyone working on') || q.toLowerCase().includes('show me the workflow') || q.toLowerCase().includes('give me a recap')) {
        const workflowRecap = primeBossSystem.generateWorkflowRecap('today');
        setMessages(m => [...m, { 
          role: 'prime', 
          text: `📊 **EXECUTIVE WORKFLOW RECAP**\n\n${workflowRecap}` 
        }]);
        setIsLoading(false);
        return;
      }

      if (q.toLowerCase().includes('how\'s the team performing') || q.toLowerCase().includes('team performance')) {
        const summary = primeBossSystem.getExecutiveSummary();
        setMessages(m => [...m, { 
          role: 'prime', 
          text: `🎯 **TEAM PERFORMANCE REPORT**\n\n${summary}` 
        }]);
        setIsLoading(false);
        return;
      }

      if (q.toLowerCase().includes('approve') && q.toLowerCase().includes('task')) {
        setMessages(m => [...m, { 
          role: 'prime', 
          text: '✅ Task approved! I\'ve reviewed the request and given it the green light. My team will proceed with execution immediately.' 
        }]);
        setIsLoading(false);
        return;
      }

      if (q.toLowerCase().includes('redirect') || q.toLowerCase().includes('reassign')) {
        setMessages(m => [...m, { 
          role: 'prime', 
          text: '🔄 Task reassigned! I\'ve redirected this to the most appropriate team member for optimal execution.' 
        }]);
        setIsLoading(false);
        return;
      }

      if (q.toLowerCase().includes('boss dashboard') || q.toLowerCase().includes('show dashboard')) {
        setShowBossDashboard(true);
        setMessages(m => [...m, { 
          role: 'prime', 
          text: 'Opening my executive dashboard... Here\'s the complete operational overview of our AI enterprise.' 
        }]);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Boss command error:', error);
    }

    try {
      // Enhanced routing with smart handoff system
      if (user?.id) {
        // Create smart handoff with context
        const handoffRequest: SmartHandoffRequest = {
          user_id: user.id,
          original_question: q,
          user_context: {
            source: 'prime_bubble',
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
          }
        };

        const handoffResponse = await createSmartHandoff(handoffRequest);
        
        if (handoffResponse && handoffResponse.success) {
          const employeeMatch = EMPLOYEES.find(e => e.key === handoffResponse.employee_key);
          
          if (employeeMatch) {
            const reply = `${employeeMatch.emoji} ${employeeMatch.name} is perfect for that!\n\nI'll connect you with ${employeeMatch.name} who specializes in this area. They'll have all the context from your question.`;
            setMessages(m => [...m, { role: 'prime', text: reply }]);
            logInteraction(q, employeeMatch.key);
            
            // Store handoff ID in session storage for the AI employee to retrieve
            sessionStorage.setItem('current_handoff_id', handoffResponse.handoff_id);
            
            setTimeout(() => {
              navigate(employeeMatch.route);
              setOpen(false);
            }, 2000);
            return;
          }
        }

        // Fallback to original routing system
        const routingRequest: AIRoutingRequest = {
          user_query: q,
          user_id: user.id,
          context: { source: 'prime_bubble' }
        };

        const routingResponse = await routeToEmployee(routingRequest);
        
        if (routingResponse && routingResponse.confidence_score > 0.3) {
          const employeeMatch = EMPLOYEES.find(e => e.key === routingResponse.recommended_employee_key);
          
          if (employeeMatch) {
            const reply = `${employeeMatch.emoji} ${employeeMatch.name} is perfect for that!\n\n${routingResponse.suggested_response || `I'll connect you with ${employeeMatch.name} who specializes in this area.`}`;
            setMessages(m => [...m, { role: 'prime', text: reply }]);
            logInteraction(q, employeeMatch.key);
            
            setTimeout(() => {
              navigate(employeeMatch.route);
              setOpen(false);
            }, 2000);
            return;
          }
        }
      }

      // Fallback to AI-powered understanding
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
        onClick={() => {
          console.log('🔥 Prime Chat button clicked!');
          setOpen(v => !v);
        }}
        aria-label="Open Prime"
        style={{ 
          position: 'fixed', 
          zIndex: 99999, 
          bottom: '24px', 
          right: '24px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff0000, #ffff00)',
          border: '4px solid #ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 10px 25px rgba(255,0,0,0.5)',
          animation: 'pulse 1s infinite'
        }}
        title="Chat with Prime AI CEO - TEST BUTTON"
      >
        🚨
      </button>

      {/* Background blur overlay */}
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}
      
      <div
        ref={panelRef}
        className={`fixed z-[71] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all ${open ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95'}`}
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <div className="text-xl">👑</div>
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

        {/* Boss Dashboard */}
        {showBossDashboard && (
          <div className="p-4 border-t border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">👑 Prime's Executive Dashboard</h3>
              <button 
                onClick={() => setShowBossDashboard(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Executive Summary */}
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-white mb-2">📊 Executive Summary</h4>
                <div className="text-xs text-white/80 whitespace-pre-line">
                  {executiveSummary || 'Generating executive summary...'}
                </div>
              </div>

              {/* Active Employees */}
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-white mb-2">👥 Active Employees</h4>
                <div className="space-y-2">
                  {getActiveEmployees().map(state => {
                    const employee = EMPLOYEES.find(e => e.key === state.employeeKey);
                    return (
                      <div key={state.employeeKey} className="flex items-center gap-2 text-xs">
                        <span className="text-lg">{employee?.emoji}</span>
                        <div className="flex-1">
                          <div className="text-white font-medium">{employee?.name}</div>
                          <div className="text-white/60">{state.workingOn}</div>
                        </div>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    );
                  })}
                  {getActiveEmployees().length === 0 && (
                    <div className="text-white/60 text-xs">No active employees</div>
                  )}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-white mb-2">📈 Performance Metrics</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-white/60">Active Tasks:</div>
                  <div className="text-white">{getActiveEmployees().length}</div>
                  <div className="text-white/60">Queued Tasks:</div>
                  <div className="text-white">{getEmployeesWithQueue().reduce((sum, state) => sum + state.queue.length, 0)}</div>
                  <div className="text-white/60">Total Employees:</div>
                  <div className="text-white">{EMPLOYEES.length}</div>
                  <div className="text-white/60">System Status:</div>
                  <div className="text-green-400">🟢 Optimal</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/5 rounded-lg p-3">
                <h4 className="text-sm font-semibold text-white mb-2">⚡ Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                      const recap = primeBossSystem.generateWorkflowRecap('today');
                      setMessages(m => [...m, { 
                        role: 'prime', 
                        text: `📊 **WORKFLOW RECAP**\n\n${recap}` 
                      }]);
                    }}
                    className="text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-2 py-1 rounded text-white"
                  >
                    📊 Full Recap
                  </button>
                  <button 
                    onClick={() => {
                      const summary = primeBossSystem.getExecutiveSummary();
                      setMessages(m => [...m, { 
                        role: 'prime', 
                        text: `🎯 **PERFORMANCE REPORT**\n\n${summary}` 
                      }]);
                    }}
                    className="text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 px-2 py-1 rounded text-white"
                  >
                    🎯 Performance
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-white/60 mb-2">Quick Access:</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Prioritize Byte for import-related tasks */}
            {EMPLOYEES.filter(e => e.key === 'byte').map(e => (
              <Link key={e.key} to={e.route} className="rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 px-3 py-2 text-sm font-medium">
                <span className="mr-1">{e.emoji ?? '🤖'}</span>{e.name}
              </Link>
            ))}
            {/* Other employees */}
            {EMPLOYEES.filter(e => e.key !== 'prime' && e.key !== 'byte').slice(0, 5).map(e => (
              <Link key={e.key} to={e.route} className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm">
                <span className="mr-1">{e.emoji ?? '🤖'}</span>{e.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Send,
  FileText,
  BarChart3,
  TrendingUp,
  Brain,
  Download,
  Loader2,
  Activity,
  Target,
  Eye,
  Zap
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface ReportsMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function ReportsPage() {
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'reports';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // View state - force overview on mount
  const [activeView, setActiveView] = useState('overview');
  
  // Chat state
  const [messages, setMessages] = useState<ReportsMessage[]>(savedState.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Force overview view on mount and clear any previous state
  useEffect(() => {
    setActiveView('overview');
    // Clear any previous messages to ensure clean state
    setMessages([]);
  }, []);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: ReportsMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantResponse: ReportsMessage = {
        role: 'assistant',
        content: getAssistantResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getAssistantResponse = (_message: string): string => {
    const responses = [
      "I've analyzed your financial data and generated a comprehensive AI-powered report. The insights show significant opportunities for optimization in your spending patterns and investment strategies. Your net worth has increased by 15% this quarter, driven by smart automation and AI recommendations.",
      "Perfect timing for a financial review! I've created a detailed report analyzing your transaction patterns, expense categories, and savings trends. The AI analysis reveals that you could save an additional $500/month by optimizing your recurring subscriptions and implementing the suggested automation rules.",
      "I've completed your personalized financial report with advanced AI insights. The data shows excellent progress in debt reduction (23% improvement) and strong performance in your investment portfolio. I've identified three key opportunities for further optimization that could increase your ROI by 18%.",
      "Your comprehensive financial report is ready! The AI analysis highlights your strongest performing categories and provides actionable recommendations. Your expense tracking accuracy has improved by 31% since implementing our AI categorization system, and your savings rate has increased by 42%.",
      "I've generated an advanced financial intelligence report with predictive analytics. The AI models forecast continued growth in your net worth and have identified emerging trends in your spending behavior. Your financial health score has improved to 94/100, placing you in the top 8% of users."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // Save state whenever it changes
  useEffect(() => {
    updateWorkspaceState(workspaceId, {
      activeView,
      messages
    });
  }, [activeView, messages, workspaceId]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pt-24 min-h-screen">
      {/* Page Title */}
      <MobilePageTitle 
        title="Reports" 
        subtitle="Generate detailed financial reports"
      />
      
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[400px]">
            {activeView === 'overview' ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-2xl">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-bold text-white mb-1"
                  >
                    AI Reports
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 text-sm mb-3"
                  >
                    Your intelligent guide to comprehensive financial reporting and AI-powered insights
                  </motion.p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: FileText, title: "Financial Reports", desc: "Comprehensive financial analysis", color: "from-blue-500 to-cyan-500", view: "financial" },
                      { icon: BarChart3, title: "AI Analytics", desc: "Intelligent data insights", color: "from-green-500 to-emerald-500", view: "analytics" },
                      { icon: TrendingUp, title: "Performance Reports", desc: "Growth & optimization tracking", color: "from-purple-500 to-violet-500", view: "performance" },
                      { icon: Brain, title: "AI Insights", desc: "Smart recommendations", color: "from-orange-500 to-yellow-500", view: "insights" },
                      { icon: Download, title: "Export & Share", desc: "Generate & distribute reports", color: "from-red-500 to-pink-500", view: "export" },
                      { icon: Zap, title: "Chat with Reporter", desc: "AI report assistant", color: "from-indigo-500 to-purple-500", view: "chat" }
                    ].map((item, index) => (
                      <motion.button
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => setActiveView(item.view)}
                        className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-blue-500/10"
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
                          <p className="text-white/60 text-xs leading-tight">{item.desc}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeView === 'financial' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                  </button>
                  <h2 className="text-xl font-bold text-white">Financial Reports</h2>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white/70">Comprehensive financial analysis and reporting with AI-powered insights</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Monthly Summary</h3>
                        <p className="text-white/60 text-xs">Complete financial overview</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Income vs Expenses</span>
                          <p className="text-white/60 text-xs">Current month</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+$2,400</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Net Worth</span>
                          <p className="text-white/60 text-xs">Total assets</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">+12%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Savings Rate</span>
                          <p className="text-white/60 text-xs">Monthly target</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">28%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Expense Analysis</h3>
                        <p className="text-white/60 text-xs">Category breakdown</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Housing</span>
                          <p className="text-white/60 text-xs">Rent & utilities</p>
                        </div>
                        <div className="text-right">
                          <span className="text-red-400 font-bold text-lg">35%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-1/3 h-full bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Food & Dining</span>
                          <p className="text-white/60 text-xs">Groceries & restaurants</p>
                        </div>
                        <div className="text-right">
                          <span className="text-orange-400 font-bold text-lg">22%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-1/5 h-full bg-orange-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Transportation</span>
                          <p className="text-white/60 text-xs">Gas & maintenance</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">18%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-1/6 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Investment Performance</h3>
                        <p className="text-white/60 text-xs">Portfolio tracking</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Total Return</span>
                          <p className="text-white/60 text-xs">Year to date</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+18.5%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Dividend Yield</span>
                          <p className="text-white/60 text-xs">Annual return</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">3.2%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Risk Score</span>
                          <p className="text-white/60 text-xs">Portfolio volatility</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Moderate</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-2/5 h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">AI Insights</h3>
                        <p className="text-white/60 text-xs">Smart recommendations</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-medium text-sm">Optimization</span>
                        </div>
                        <p className="text-white/80 text-xs">Reduce dining out by 15% to save $180/month</p>
                      </div>
                      <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-medium text-sm">Growth</span>
                        </div>
                        <p className="text-white/80 text-xs">Increase 401k contribution to maximize employer match</p>
                      </div>
                      <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 font-medium text-sm">Opportunity</span>
                        </div>
                        <p className="text-white/80 text-xs">Refinance mortgage to save $200/month</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ) : activeView === 'chat' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                  </button>
                  <h2 className="text-xl font-bold text-white">Chat with AI Reporter</h2>
                </div>
                
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        {message.role === 'assistant' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Brain className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-blue-400">AI Reporter</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                        <div className="text-xs opacity-60 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <Brain className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-blue-400">AI Reporter</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Generating your report...</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Overview
                  </button>
                  <h2 className="text-xl font-bold text-white">
                    {activeView === 'analytics' ? 'AI Analytics Reports' :
                     activeView === 'performance' ? 'Performance Reports' :
                     activeView === 'insights' ? 'AI Insights Dashboard' :
                     activeView === 'export' ? 'Export & Share Reports' :
                     'AI Reports'}
                  </h2>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white/70">
                    {activeView === 'analytics' ? 'Advanced AI analytics and data intelligence for comprehensive business insights' :
                     activeView === 'performance' ? 'Performance tracking and optimization reports with predictive analytics' :
                     activeView === 'insights' ? 'AI-powered insights and recommendations for financial optimization' :
                     activeView === 'export' ? 'Generate, customize, and share professional financial reports' :
                     'Advanced AI reporting and analytics for data-driven financial decisions'}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Report Generation</h3>
                        <p className="text-white/60 text-xs">AI-powered analysis</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">AI Accuracy</span>
                          <p className="text-white/60 text-xs">Data analysis precision</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">97.3%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Processing Speed</span>
                          <p className="text-white/60 text-xs">Report generation time</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">2.1s</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Insights Quality</span>
                          <p className="text-white/60 text-xs">Actionable recommendations</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">Excellent</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Report Status</h3>
                        <p className="text-white/60 text-xs">System health</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Active Reports</span>
                          <p className="text-white/60 text-xs">Currently processing</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">12</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Success Rate</span>
                          <p className="text-white/60 text-xs">Report completion</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">99.8%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Avg. Response</span>
                          <p className="text-white/60 text-xs">User satisfaction</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">4.9/5</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-full h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          {activeView === 'chat' && (
            <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about reports, analytics, or financial insights..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;
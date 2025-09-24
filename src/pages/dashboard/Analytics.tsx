import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { 
  Send,
  BarChart3,
  TrendingUp,
  Target,
  DollarSign,
  Users,
  Brain,
  Loader2,
  Activity,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface AnalyticsMessage {
  role: 'user' | 'crystal';
  content: string;
  timestamp: string;
}

function AnalyticsPage() {
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'analytics';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // View state - force overview on mount
  const [activeView, setActiveView] = useState('overview');
  
  // Chat state
  const [messages, setMessages] = useState<AnalyticsMessage[]>(savedState.messages || []);
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

    const userMessage: AnalyticsMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const crystalResponse: AnalyticsMessage = {
        role: 'crystal',
        content: getCrystalResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, crystalResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getCrystalResponse = (_message: string): string => {
    const responses = [
      "I've analyzed your financial data and identified key trends. Your revenue is showing strong growth patterns, with a 15% increase projected for next quarter based on current spending behaviors.",
      "Excellent question! I've processed your analytics data and found some interesting patterns. Your expense categorization is 94% accurate, and I've identified three optimization opportunities that could save you $2,400 annually.",
      "I've generated a comprehensive analytics report for you. The data shows your cash flow is healthy with a 12% improvement over last month. I've also detected some seasonal spending patterns that could help with future planning.",
      "Perfect! I've analyzed your financial metrics and created actionable insights. Your investment returns are outperforming the market by 8%, and I've identified two new opportunities for portfolio optimization.",
      "I've completed a deep dive into your financial analytics. Your debt-to-income ratio has improved by 23% this quarter, and I've prepared recommendations for accelerating your debt payoff strategy."
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
    <div className="max-w-7xl mx-auto p-6 pt-4">
      {/* Page Title */}
      <MobilePageTitle 
        title="Analytics" 
        subtitle="Comprehensive financial analytics and insights"
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
                    Analytics
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 text-sm mb-3"
                  >
                    Comprehensive financial analytics and insights for data-driven decisions
                  </motion.p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time financial insights", color: "from-blue-500 to-cyan-500", view: "dashboard" },
                      { icon: TrendingUp, title: "Trend Analysis", desc: "Pattern recognition & forecasting", color: "from-green-500 to-emerald-500", view: "trends" },
                      { icon: Target, title: "Performance Metrics", desc: "KPI tracking & optimization", color: "from-purple-500 to-violet-500", view: "performance" },
                      { icon: DollarSign, title: "Financial Analytics", desc: "Revenue & expense analysis", color: "from-orange-500 to-yellow-500", view: "financial" },
                      { icon: Users, title: "AI Analysis Team", desc: "Meet your analytics experts", color: "from-red-500 to-pink-500", view: "team" },
                      { icon: Brain, title: "Chat with Crystal", desc: "AI analytics assistant", color: "from-indigo-500 to-purple-500", view: "chat" }
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
            ) : activeView === 'dashboard' ? (
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
                  <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                </div>
                
                <div className="text-center mb-6">
                  <p className="text-white/70">Real-time financial analytics and performance insights</p>
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
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Monthly Revenue</h3>
                        <p className="text-white/60 text-xs">Revenue tracking & growth</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Current Month</span>
                          <p className="text-white/60 text-xs">December 2024</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+12.5%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Quarterly Growth</span>
                          <p className="text-white/60 text-xs">Q4 2024</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">+18.2%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Annual Growth</span>
                          <p className="text-white/60 text-xs">Year to date</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">+156%</span>
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
                        <h3 className="text-white font-bold text-lg mb-1">Expense Analysis</h3>
                        <p className="text-white/60 text-xs">Spending patterns & optimization</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Total Expenses</span>
                          <p className="text-white/60 text-xs">This month</p>
                        </div>
                        <div className="text-right">
                          <span className="text-red-400 font-bold text-lg">-3.2%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-2/5 h-full bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Budget Utilization</span>
                          <p className="text-white/60 text-xs">Monthly budget</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">87.3%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Savings Rate</span>
                          <p className="text-white/60 text-xs">Monthly savings</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+12.1%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-2/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Net Profit</h3>
                        <p className="text-white/60 text-xs">Profitability analysis</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Current Profit</span>
                          <p className="text-white/60 text-xs">This month</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+28.7%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Profit Margin</span>
                          <p className="text-white/60 text-xs">Net margin</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">23.4%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">ROI</span>
                          <p className="text-white/60 text-xs">Return on investment</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">+187%</span>
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
                    transition={{ delay: 0.4 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20 h-[280px] flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Cash Flow</h3>
                        <p className="text-white/60 text-xs">Liquidity & cash management</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Operating Cash</span>
                          <p className="text-white/60 text-xs">Current period</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+8.9%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Free Cash Flow</span>
                          <p className="text-white/60 text-xs">Available cash</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-lg">94.2%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Cash Conversion</span>
                          <p className="text-white/60 text-xs">Efficiency rate</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-lg">78%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Spending Categories</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Business Expenses</span>
                        <span className="text-green-400 font-semibold">+45%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Personal Expenses</span>
                        <span className="text-blue-400 font-semibold">+23%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Investments</span>
                        <span className="text-purple-400 font-semibold">+18%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">AI Insights & Predictions</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <p className="text-blue-400 text-sm font-medium">Revenue Forecast</p>
                        <p className="text-white/80 text-xs">Next quarter: +28% growth expected</p>
                      </div>
                      <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <p className="text-green-400 text-sm font-medium">Expense Optimization</p>
                        <p className="text-white/80 text-xs">Potential savings: $2,400 annually</p>
                      </div>
                    </div>
                  </div>
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
                  <h2 className="text-xl font-bold text-white">Chat with Crystal AI</h2>
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
                        {message.role === 'crystal' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                              <Brain className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-blue-400">Crystal</span>
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
                          <span className="text-xs font-semibold text-blue-400">Crystal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing your financial data...</span>
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
                    {activeView === 'trends' ? 'Trend Analysis' :
                     activeView === 'performance' ? 'Performance Metrics' :
                     activeView === 'financial' ? 'Financial Analytics' :
                     activeView === 'team' ? 'AI Analysis Team' :
                     'Analytics'}
                  </h2>
                </div>
                
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {activeView === 'trends' ? 'Advanced Trend Analysis' :
                       activeView === 'performance' ? 'Performance Metrics Dashboard' :
                       activeView === 'financial' ? 'Financial Analytics Hub' :
                       activeView === 'team' ? 'AI Analysis Team' :
                       'Advanced Analytics'}
                    </h3>
                    <p className="text-white/70 mb-6">
                      {activeView === 'trends' ? 'AI-powered trend recognition, pattern analysis, and predictive forecasting for your financial data.' :
                       activeView === 'performance' ? 'Comprehensive KPI tracking, performance optimization, and benchmark analysis for continuous improvement.' :
                       activeView === 'financial' ? 'Deep financial analysis, revenue optimization, and comprehensive expense management with AI insights.' :
                       activeView === 'team' ? 'Meet your specialized AI analytics team - Crystal, Byte, Tag, and Ledger working together for your financial success.' :
                       'Advanced analytics and insights for data-driven financial decisions and strategic optimization.'}
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                      <h4 className="text-lg font-semibold text-white mb-3">Coming Soon Features:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Real-time data visualization</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Predictive analytics</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Custom reporting</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Automated insights</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Advanced forecasting</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Export capabilities</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                  placeholder="Ask Crystal about your financial analytics, trends, and insights..."
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

export default AnalyticsPage;
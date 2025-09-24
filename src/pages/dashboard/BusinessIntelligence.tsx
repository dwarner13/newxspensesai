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
  Loader2
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import AIEmployeeHeader from '../../components/ai/AIEmployeeHeader';

interface InteliaMessage {
  role: 'user' | 'intelia';
  content: string;
  timestamp: string;
}

function BusinessIntelligencePage() {
  // Business Intelligence Dashboard with 6-box layout and Intelia AI
  const { updateWorkspaceState, getWorkspaceState } = useWorkspace();
  const workspaceId = 'business-intelligence';
  
  // Load saved state
  const savedState = getWorkspaceState(workspaceId);
  
  // View state - force overview on mount
  const [activeView, setActiveView] = useState('overview');
  
  // Chat state
  const [messages, setMessages] = useState<InteliaMessage[]>(savedState.messages || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Force overview view on mount
  useEffect(() => {
    setActiveView('overview');
  }, []);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: InteliaMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const inteliaResponse: InteliaMessage = {
        role: 'intelia',
        content: getInteliaResponse(message),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, inteliaResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const getInteliaResponse = (_message: string): string => {
    const responses = [
      "I've analyzed your business data and identified key growth opportunities. Based on current trends, I recommend focusing on customer retention strategies and optimizing your operational efficiency.",
      "Excellent question! I've processed your business metrics and created a comprehensive analysis. The data shows strong performance in revenue growth, but there are opportunities to improve customer acquisition costs.",
      "I've generated a detailed business intelligence report for you. The analysis reveals that your profit margins are above industry average, and I've identified three strategic recommendations for further optimization.",
      "Perfect! I've analyzed your operational data and created actionable insights. The metrics show that automation could improve your efficiency by 35% and reduce costs by 22% within the next quarter.",
      "I've completed a comprehensive business analysis. Your key performance indicators are trending positively, and I've prepared strategic recommendations to accelerate growth and maximize profitability."
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
        title="Business Intelligence" 
        subtitle="AI-powered business insights and strategic analysis"
      />
      
      <AIEmployeeHeader
        employeeKey="intelia"
        pageTitle="Business Intelligence"
        pageDescription="AI-powered business insights and strategic analysis"
        activities={[
          "Analyzing revenue trends and growth patterns...",
          "Processing customer engagement data...",
          "Generating strategic recommendations..."
        ]}
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
                    Business Intelligence
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/60 text-sm mb-3"
                  >
                    Your intelligent guide to data-driven insights, strategic planning, and business optimization
                  </motion.p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-w-3xl mx-auto">
                    {[
                      { icon: BarChart3, title: "Analytics Dashboard", desc: "Real-time business insights", color: "from-blue-500 to-cyan-500", view: "analytics" },
                      { icon: TrendingUp, title: "Performance Metrics", desc: "Track KPIs and growth", color: "from-green-500 to-emerald-500", view: "performance" },
                      { icon: Target, title: "Strategic Planning", desc: "AI-powered business strategy", color: "from-purple-500 to-violet-500", view: "strategy" },
                      { icon: DollarSign, title: "Financial Intelligence", desc: "Revenue and cost analysis", color: "from-orange-500 to-yellow-500", view: "financial" },
                      { icon: Users, title: "Customer Insights", desc: "Behavior and engagement data", color: "from-red-500 to-pink-500", view: "customers" },
                      { icon: Brain, title: "Chat with Intelia", desc: "AI business intelligence", color: "from-indigo-500 to-purple-500", view: "chat" }
                    ].map((item, index) => (
                      <motion.button
                        key={item.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => setActiveView(item.view)}
                        className="group flex flex-col items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl text-center transition-all duration-300 border border-white/10 hover:border-white/20 min-h-[120px] hover:shadow-lg hover:shadow-purple-500/10"
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
            ) : activeView === 'analytics' ? (
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
                  <p className="text-white/70">Real-time business insights and data visualization for informed decision-making</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[280px] flex flex-col relative"
                  >
                    {/* AI Processing Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-400 font-medium">AI Processing</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Revenue Growth</h3>
                        <p className="text-white/60 text-xs">Monthly performance tracking</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">This Month</span>
                          <p className="text-white/60 text-xs">Current period</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-lg">+24.5%</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Quarterly</span>
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
                          <span className="text-white font-medium text-sm">Annual</span>
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
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 h-[280px] flex flex-col relative"
                  >
                    {/* AI Processing Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-lg px-2 py-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-medium">AI Processing</span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg mb-1">Customer Metrics</h3>
                        <p className="text-white/60 text-xs">Engagement & retention analysis</p>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Active Users</span>
                          <p className="text-white/60 text-xs">Monthly active</p>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-bold text-lg">12,847</span>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <span className="text-white font-medium text-sm">Retention Rate</span>
                          <p className="text-white/60 text-xs">Monthly retention</p>
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
                          <span className="text-white font-medium text-sm">Growth Rate</span>
                          <p className="text-white/60 text-xs">User acquisition</p>
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
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <DollarSign className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-xl mb-1">Financial Health</h3>
                        <p className="text-white/60 text-sm">Profitability & cost analysis</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">Profit Margin</span>
                          <p className="text-white/60 text-xs">Net profit ratio</p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400 font-bold text-xl">23.4%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-green-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">Cost Ratio</span>
                          <p className="text-white/60 text-xs">Operating costs</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-xl">76.6%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">ROI</span>
                          <p className="text-white/60 text-xs">Return on investment</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-xl">+187%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
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
                    className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-xl mb-1">Operational Efficiency</h3>
                        <p className="text-white/60 text-sm">Productivity & automation metrics</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">Process Time</span>
                          <p className="text-white/60 text-xs">Time reduction</p>
                        </div>
                        <div className="text-right">
                          <span className="text-red-400 font-bold text-xl">-34%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
                            <div className="w-3/5 h-full bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">Quality Score</span>
                          <p className="text-white/60 text-xs">Performance rating</p>
                        </div>
                        <div className="text-right">
                          <span className="text-blue-400 font-bold text-xl">94.2%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
                            <div className="w-5/6 h-full bg-blue-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-white font-medium text-sm">Automation</span>
                          <p className="text-white/60 text-xs">Process automation</p>
                        </div>
                        <div className="text-right">
                          <span className="text-purple-400 font-bold text-xl">78%</span>
                          <div className="w-20 h-2 bg-white/10 rounded-full mt-1">
                            <div className="w-4/5 h-full bg-purple-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Top Performing Channels</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Digital Marketing</span>
                        <span className="text-green-400 font-semibold">+45%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Direct Sales</span>
                        <span className="text-blue-400 font-semibold">+23%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white/70">Referrals</span>
                        <span className="text-purple-400 font-semibold">+18%</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🧠</span>
                      <h3 className="text-lg font-semibold text-white">Intelia's AI Insights</h3>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-blue-400 text-sm font-medium">Revenue Forecast</span>
                          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-white/80 text-xs">Next quarter: +28% growth expected</p>
                      </div>
                      <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-green-400 text-sm font-medium">Customer Acquisition</span>
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-white/80 text-xs">Cost reduction opportunity: -15%</p>
                      </div>
                      <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 text-sm font-medium">Strategic Recommendation</span>
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-white/80 text-xs">Focus on automation to improve efficiency by 35%</p>
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
                  <h2 className="text-xl font-bold text-white">Chat with Intelia AI</h2>
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
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-white/10 text-white border border-white/20'
                      }`}>
                        {message.role === 'intelia' && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                              <Brain className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-purple-400">Intelia</span>
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
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Brain className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold text-purple-400">Intelia</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Analyzing your business data...</span>
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
                    {activeView === 'performance' ? 'Performance Metrics' :
                     activeView === 'strategy' ? 'Strategic Planning' :
                     activeView === 'financial' ? 'Financial Intelligence' :
                     activeView === 'customers' ? 'Customer Insights' :
                     'Business Intelligence'}
                  </h2>
                </div>
                
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-2xl">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {activeView === 'performance' ? 'Performance Metrics Dashboard' :
                       activeView === 'strategy' ? 'Strategic Planning Center' :
                       activeView === 'financial' ? 'Financial Intelligence Hub' :
                       activeView === 'customers' ? 'Customer Insights Analytics' :
                       'Advanced Business Intelligence'}
                    </h3>
                    <p className="text-white/70 mb-6">
                      {activeView === 'performance' ? 'Track KPIs, growth metrics, and performance indicators with real-time analytics and AI-powered insights.' :
                       activeView === 'strategy' ? 'AI-powered business strategy development, market analysis, and strategic planning tools for growth optimization.' :
                       activeView === 'financial' ? 'Comprehensive financial analysis, revenue optimization, and cost management with predictive insights.' :
                       activeView === 'customers' ? 'Deep customer behavior analysis, engagement metrics, and personalized insights for better customer relationships.' :
                       'Advanced analytics and insights for data-driven business decisions and strategic growth.'}
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
                            <span className="text-white/80 text-sm">AI-powered predictions</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Custom dashboard builder</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Automated reporting</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-white/80 text-sm">Advanced analytics</span>
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
                  placeholder="Ask Intelia about analytics, strategy, performance metrics..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
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

export default BusinessIntelligencePage;
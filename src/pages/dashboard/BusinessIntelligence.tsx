import React, { useState, useRef, useEffect } from 'react';
import { 
  TrendingUp, 
  Send, Bot, FileSpreadsheet, Download, AlertTriangle, 
  Brain, ExternalLink,
  ArrowUpRight, ArrowDownRight, Activity,
  Target as GoalIcon, Lightbulb, BookOpen, ChevronUp, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BusinessMetric {
  id: string;
  name: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  target?: number;
}

interface BusinessAlert {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionText?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
}

interface BusinessGoal {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  timeframe: string;
  progress: number;
  status: 'on-track' | 'behind' | 'ahead';
  aiTip?: string;
}

interface ForecastData {
  month: string;
  projectedRevenue: number;
  projectedExpenses: number;
  projectedProfit: number;
}

const BusinessIntelligence = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hello! I'm BizBot, your AI business analyst. I can help you analyze your financial performance, track KPIs, optimize cash flow, and provide strategic insights. What would you like to know about your business?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showScenarioPlanner, setShowScenarioPlanner] = useState(false);
  const [scenarioSalesChange, setScenarioSalesChange] = useState(0);
  const [scenarioExpenseChange, setScenarioExpenseChange] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock business data - replace with real data from your app
  const businessMetrics: BusinessMetric[] = [
    { id: '1', name: 'Revenue YTD', value: 125000, change: 12.5, changeType: 'increase', unit: '$' },
    { id: '2', name: 'Profit Margin', value: 18.2, change: -2.1, changeType: 'decrease', unit: '%' },
    { id: '3', name: 'Cash on Hand', value: 45000, change: 8.3, changeType: 'increase', unit: '$' },
    { id: '4', name: 'Monthly Burn', value: 8500, change: 5.2, changeType: 'increase', unit: '$' },
    { id: '5', name: 'Runway', value: 5.3, change: -0.8, changeType: 'decrease', unit: 'months' }
  ];

  const businessAlerts: BusinessAlert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Client Concentration Risk',
      message: '70% of your revenue comes from one client. Consider diversifying your customer base.',
      priority: 'high',
      actionable: true,
      actionText: 'View Diversification Strategy'
    },
    {
      id: '2',
      type: 'opportunity',
      title: 'Ad Spend Optimization',
      message: 'Your ad spend is up 30% compared to last month. Review ROI and consider reallocating budget.',
      priority: 'medium',
      actionable: true,
      actionText: 'Analyze Ad Performance'
    },
    {
      id: '3',
      type: 'info',
      title: 'Software Cost Increase',
      message: 'Recurring software expenses have increased 10% this quarter. Review subscriptions.',
      priority: 'low',
      actionable: true,
      actionText: 'Review Subscriptions'
    },
    {
      id: '4',
      type: 'success',
      title: 'Cash Flow Improvement',
      message: 'Net 30 clients are paying 15% faster than last quarter. Great job on collections!',
      priority: 'medium',
      actionable: false
    }
  ];

  const businessGoals: BusinessGoal[] = [
    {
      id: '1',
      name: 'Q3 Revenue Target',
      current: 125000,
      target: 150000,
      unit: '$',
      timeframe: 'Q3 2024',
      progress: 83,
      status: 'on-track',
      aiTip: 'You need $25,000 more in sales this quarter to hit your target. Consider upselling existing clients.'
    },
    {
      id: '2',
      name: 'Profit Margin Goal',
      current: 18.2,
      target: 22,
      unit: '%',
      timeframe: 'Q3 2024',
      progress: 83,
      status: 'behind',
      aiTip: 'To reach 22% margin, focus on reducing COGS by 15% or increasing prices by 8%.'
    },
    {
      id: '3',
      name: 'Customer Acquisition',
      current: 45,
      target: 60,
      unit: 'customers',
      timeframe: 'Q3 2024',
      progress: 75,
      status: 'behind',
      aiTip: 'You need 15 more customers this quarter. Consider referral programs and partnerships.'
    }
  ];

  const forecastData: ForecastData[] = [
    { month: 'Oct', projectedRevenue: 42000, projectedExpenses: 32000, projectedProfit: 10000 },
    { month: 'Nov', projectedRevenue: 45000, projectedExpenses: 33000, projectedProfit: 12000 },
    { month: 'Dec', projectedRevenue: 48000, projectedExpenses: 34000, projectedProfit: 14000 }
  ];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(),
      type: 'user', 
      message: userMessage,
      timestamp: new Date().toISOString()
    }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateBizBotResponse(userMessage);
      setChatHistory(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        type: 'ai', 
        message: aiResponse,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const generateBizBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('cash flow') || lowerMessage.includes('cashflow')) {
      return "Your current cash flow analysis shows: Monthly burn rate is $8,500 with 5.3 months of runway. To improve cash flow, consider: 1) Negotiate longer payment terms with suppliers, 2) Offer early payment discounts to customers, 3) Reduce monthly burn by 15% through expense optimization. Your current cash position of $45,000 is healthy but could be improved.";
    }
    
    if (lowerMessage.includes('sales target') || lowerMessage.includes('revenue target')) {
      return "You're currently at $125,000 YTD revenue, which is 83% of your Q3 target of $150,000. You need $25,000 more in sales this quarter to hit your target. Based on your current growth rate of 12.5%, you're on track. Consider: 1) Upselling existing clients (typically 20% success rate), 2) Accelerating new customer acquisition, 3) Increasing average order value by 15%.";
    }
    
    if (lowerMessage.includes('break-even') || lowerMessage.includes('breakeven')) {
      return "Your break-even analysis: Fixed costs: $8,500/month, Average contribution margin: 18.2%. Break-even point: $46,703 monthly revenue. You're currently above break-even at $125,000 YTD. To improve margins, focus on: 1) Reducing variable costs by 10%, 2) Increasing prices by 5-8%, 3) Optimizing operational efficiency.";
    }
    
    if (lowerMessage.includes('expense') || lowerMessage.includes('cost')) {
      return "Your top expense categories this quarter: 1) Software subscriptions (25% of expenses), 2) Marketing/advertising (20%), 3) Payroll (35%), 4) Office/operational (20%). Recommendations: 1) Review unused software subscriptions (potential 15% savings), 2) Optimize ad spend ROI (currently 30% increase), 3) Consider remote work to reduce office costs.";
    }
    
    if (lowerMessage.includes('benchmark') || lowerMessage.includes('industry')) {
      return "Your performance vs industry benchmarks: Profit margin (18.2% vs 15% industry avg) - ABOVE AVERAGE, Revenue growth (12.5% vs 8% industry avg) - ABOVE AVERAGE, Customer concentration (70% from one client) - NEEDS IMPROVEMENT. You're performing well overall, but should diversify your customer base to reduce risk.";
    }
    
    return "I can help you analyze your business performance, track KPIs, optimize cash flow, and provide strategic insights. What specific aspect of your business would you like me to analyze?";
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase': return <ArrowUpRight size={16} className="text-green-400" />;
      case 'decrease': return <ArrowDownRight size={16} className="text-red-400" />;
      default: return <TrendingUp size={16} className="text-blue-400" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase': return 'text-green-400';
      case 'decrease': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'opportunity': return 'bg-blue-500/20 border-blue-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'success': return 'bg-green-500/20 border-green-500/30';
      case 'info': return 'bg-purple-500/20 border-purple-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'text-green-400';
      case 'behind': return 'text-red-400';
      case 'ahead': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] text-white">
      <header className="p-6">
        <h1 className="text-4xl font-bold mb-2">Business Intelligence Assistant</h1>
        <p className="text-lg text-gray-300">See your numbers. Grow your business. Ask AI for help.</p>
      </header>
      <main className="flex-1 overflow-y-auto p-6">

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-8">
        <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all">
          <Download size={20} />
          Export Report
        </button>
      </div>

      <div className="space-y-8">
            
            {/* Business Health Overview */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Activity size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Business Health Overview</h3>
                  <p className="text-white/60 text-sm">Key performance indicators and financial metrics</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {businessMetrics.map((metric) => (
                  <div key={metric.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/60 text-sm">{metric.name}</span>
                      {getChangeIcon(metric.changeType)}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {metric.unit}{typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                    </div>
                    <div className={`text-sm ${getChangeColor(metric.changeType)}`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}% from last period
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts & Opportunities */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Alerts & Opportunities</h3>
                  <p className="text-white/60 text-sm">AI-generated insights and actionable recommendations</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {businessAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-white">{alert.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            alert.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            alert.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {alert.priority}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm">{alert.message}</p>
                        {alert.actionable && alert.actionText && (
                          <button className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                            {alert.actionText} →
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* AI Business Analyst Chatbot */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ask BizBot: Your Business Analyst</h3>
                  <p className="text-white/60 text-sm">Get AI-powered business insights and strategic advice</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Chat History */}
                <div className="max-h-64 overflow-y-auto space-y-3 bg-black/20 rounded-lg p-4">
                  {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs p-3 rounded-lg ${
                        msg.type === 'user' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white/10 text-white'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 text-white p-3 rounded-lg">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about cash flow, sales targets, expenses..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || isLoading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    <Send size={20} />
                  </button>
                </div>
                
                {/* Quick Questions */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setChatMessage("How can I improve my cash flow?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Cash flow tips
                  </button>
                  <button 
                    onClick={() => setChatMessage("Am I on track to hit my sales target?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Sales target
                  </button>
                  <button 
                    onClick={() => setChatMessage("What's my break-even point?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Break-even
                  </button>
                  <button 
                    onClick={() => setChatMessage("Which expenses can I reduce?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Expense reduction
                  </button>
                  <button 
                    onClick={() => setChatMessage("How do I compare to industry benchmarks?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Industry benchmarks
                  </button>
                </div>
              </div>
            </div>

            {/* Business Trends & Forecasting */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue & Expense Trends */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Business Trends</h3>
                    <p className="text-white/60 text-sm">Revenue and expense analysis</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60">Revenue Growth</span>
                    <span className="text-green-400 font-semibold">+12.5%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60">Expense Growth</span>
                    <span className="text-red-400 font-semibold">+8.2%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                    <span className="text-white/60">Profit Margin</span>
                    <span className="text-blue-400 font-semibold">18.2%</span>
                  </div>
                </div>
              </div>

              {/* AI Forecasting */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Brain size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">AI Forecasting</h3>
                    <p className="text-white/60 text-sm">Next 90 days projection</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {forecastData.map((forecast) => (
                    <div key={forecast.month} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <span className="text-white/60">{forecast.month}</span>
                      <div className="text-right">
                        <div className="text-white font-semibold">${forecast.projectedProfit.toLocaleString()}</div>
                        <div className="text-white/60 text-xs">Profit</div>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={() => setShowScenarioPlanner(!showScenarioPlanner)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-between"
                  >
                    <span>Scenario Planner</span>
                    {showScenarioPlanner ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  
                  {showScenarioPlanner && (
                    <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                      <div>
                        <label className="text-white/60 text-sm">Sales Change (%)</label>
                        <input
                          type="number"
                          value={scenarioSalesChange}
                          onChange={(e) => setScenarioSalesChange(Number(e.target.value))}
                          className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-white/60 text-sm">Expense Change (%)</label>
                        <input
                          type="number"
                          value={scenarioExpenseChange}
                          onChange={(e) => setScenarioExpenseChange(Number(e.target.value))}
                          className="w-full bg-white/10 border border-white/20 rounded px-3 py-2 text-white mt-1"
                        />
                      </div>
                      <div className="text-center p-3 bg-white/10 rounded">
                        <div className="text-white font-semibold">
                          Projected Impact: ${(125000 * (1 + scenarioSalesChange/100) - 8500 * (1 + scenarioExpenseChange/100)).toLocaleString()}
                        </div>
                        <div className="text-white/60 text-sm">Monthly Revenue</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Goal Tracking & Recommendations */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                  <GoalIcon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Goal Tracking & Recommendations</h3>
                  <p className="text-white/60 text-sm">Track progress and get AI-powered tips</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {businessGoals.map((goal) => (
                  <div key={goal.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white">{goal.name}</h4>
                        <p className="text-white/60 text-sm">{goal.timeframe}</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getGoalStatusColor(goal.status)}`}>
                          {goal.current.toLocaleString()}{goal.unit} / {goal.target.toLocaleString()}{goal.unit}
                        </div>
                        <div className="text-white/60 text-sm">{goal.progress}% complete</div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/20 rounded-full h-2 mb-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                    
                    {goal.aiTip && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Lightbulb size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-blue-300 text-sm">{goal.aiTip}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Export & Reports */}
            <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <FileSpreadsheet size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Export & Reports</h3>
                    <p className="text-white/60 text-sm">Generate comprehensive business reports</p>
                  </div>
                </div>
                <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all">
                  <Download size={20} />
                  Download Business Summary
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Financial Summary</h4>
                  <p className="text-white/60 text-sm mb-3">KPI overview and performance metrics</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Export PDF
                  </button>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Business Plan</h4>
                  <p className="text-white/60 text-sm mb-3">Strategic analysis and recommendations</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Export PDF
                  </button>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">CSV Data</h4>
                  <p className="text-white/60 text-sm mb-3">Raw data for spreadsheet analysis</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Resources & Tips */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <BookOpen size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Resources & Tips</h3>
                  <p className="text-white/60 text-sm">Helpful guides and industry benchmarks</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Business Benchmarks</h4>
                  <div className="space-y-2">
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>SBA Small Business Benchmarks</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>Industry Performance Standards</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>Profit Margin Calculator</span>
                    </a>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-white font-semibold">Business Guides</h4>
                  <div className="space-y-2">
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>Cash Flow Management</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>Pricing Strategy Guide</span>
                    </a>
                    <a href="#" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink size={16} />
                      <span>Business Loan Preparation</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
  );
};

export default BusinessIntelligence; 
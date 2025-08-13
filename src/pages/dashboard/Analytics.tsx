import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, TrendingUp, Target, 
  Send, FileSpreadsheet, AlertTriangle, CheckCircle, Clock, 
  Users, Zap, Brain, PieChart,
  ArrowUpRight, ArrowDownRight,
  Filter, Share2, RefreshCw, Download as DownloadIcon,
  Receipt, Building2
} from 'lucide-react';
import { motion } from 'framer-motion';
// import SpecializedChatBot from '../../components/chat/SpecializedChatBot';


interface KeyMetric {
  id: string;
  name: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'danger';
}

interface TrendData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
  cashFlow: number;
}

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

interface AIInsight {
  id: string;
  type: 'positive' | 'warning' | 'opportunity' | 'alert';
  title: string;
  message: string;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface DeepDiveData {
  id: string;
  name: string;
  value: number;
  change: number;
  category: string;
  status: 'active' | 'pending' | 'overdue';
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  message: string;
  timestamp: string;
}

interface AutomationStat {
  id: string;
  name: string;
  runs: number;
  timeSaved: number;
  successRate: number;
  lastRun: string;
}

interface TaxStatus {
  receiptsMatched: number;
  receiptsUnmatched: number;
  taxReadinessScore: number;
  outstandingTasks: number;
  nextDeadline: string;
}

const Analytics = () => {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      message: "Hello! I'm AnalyticsBot, your AI analytics assistant. I can help you understand your financial data, identify trends, and answer questions about your business performance. What would you like to know?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('ytd');
  const [selectedFilter, setSelectedFilter] = useState('all');
  // const [showFilters, setShowFilters] = useState(false);
  // const [isMobileOpen, setIsMobileOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock key metrics data
  const keyMetrics: KeyMetric[] = [
    { id: '1', name: 'Total Income YTD', value: 185000, change: 12.5, changeType: 'increase', unit: '$', trend: 'up', status: 'good' },
    { id: '2', name: 'Total Expenses YTD', value: 125000, change: 8.2, changeType: 'increase', unit: '$', trend: 'up', status: 'warning' },
    { id: '3', name: 'Net Profit', value: 60000, change: 18.3, changeType: 'increase', unit: '$', trend: 'up', status: 'good' },
    { id: '4', name: 'Profit Margin', value: 32.4, change: 5.1, changeType: 'increase', unit: '%', trend: 'up', status: 'good' },
    { id: '5', name: 'Cash Flow', value: 45000, change: -2.1, changeType: 'decrease', unit: '$', trend: 'down', status: 'warning' },
    { id: '6', name: 'Tax Readiness', value: 85, change: 10, changeType: 'increase', unit: '%', trend: 'up', status: 'good' },
    { id: '7', name: 'Active Automations', value: 4, change: 1, changeType: 'increase', unit: '', trend: 'up', status: 'good' },
    { id: '8', name: 'Goal Progress', value: 78, change: 8, changeType: 'increase', unit: '%', trend: 'up', status: 'good' }
  ];

  // Mock trend data
  const trendData: TrendData[] = [
    { month: 'Jan', income: 15000, expenses: 12000, profit: 3000, cashFlow: 8000 },
    { month: 'Feb', income: 16000, expenses: 12500, profit: 3500, cashFlow: 8500 },
    { month: 'Mar', income: 18000, expenses: 13000, profit: 5000, cashFlow: 9000 },
    { month: 'Apr', income: 17000, expenses: 12800, profit: 4200, cashFlow: 8700 },
    { month: 'May', income: 19000, expenses: 13500, profit: 5500, cashFlow: 9500 },
    { month: 'Jun', income: 20000, expenses: 14000, profit: 6000, cashFlow: 10000 },
    { month: 'Jul', income: 18500, expenses: 13800, profit: 4700, cashFlow: 9200 },
    { month: 'Aug', income: 21000, expenses: 14500, profit: 6500, cashFlow: 10500 },
    { month: 'Sep', income: 19500, expenses: 14200, profit: 5300, cashFlow: 9800 },
    { month: 'Oct', income: 22000, expenses: 15000, profit: 7000, cashFlow: 11000 },
    { month: 'Nov', income: 20500, expenses: 14800, profit: 5700, cashFlow: 10200 },
    { month: 'Dec', income: 23000, expenses: 15500, profit: 7500, cashFlow: 11500 }
  ];

  // Mock category breakdown
  const expenseCategories: CategoryData[] = [
    { name: 'Software & Tools', value: 25000, percentage: 20, color: '#3B82F6' },
    { name: 'Marketing & Ads', value: 30000, percentage: 24, color: '#10B981' },
    { name: 'Office & Supplies', value: 15000, percentage: 12, color: '#F59E0B' },
    { name: 'Travel & Meals', value: 20000, percentage: 16, color: '#EF4444' },
    { name: 'Professional Services', value: 15000, percentage: 12, color: '#8B5CF6' },
    { name: 'Other', value: 20000, percentage: 16, color: '#6B7280' }
  ];

  // const incomeCategories: CategoryData[] = [
  //   { name: 'Client Projects', value: 120000, percentage: 65, color: '#3B82F6' },
  //   { name: 'Consulting', value: 35000, percentage: 19, color: '#10B981' },
  //   { name: 'Product Sales', value: 20000, percentage: 11, color: '#F59E0B' },
  //   { name: 'Other', value: 10000, percentage: 5, color: '#EF4444' }
  // ];

  // Mock AI insights
  const aiInsights: AIInsight[] = [
    {
      id: '1',
      type: 'positive',
      title: 'Strong Revenue Growth',
      message: 'Your income is up 12.5% YTD, outpacing your 10% growth target. You\'re on track to hit your annual revenue goal.',
      priority: 'high'
    },
    {
      id: '2',
      type: 'warning',
      title: 'Cash Flow Attention Needed',
      message: 'Cash flow decreased 2.1% this month. Consider reviewing payment terms with clients and optimizing expense timing.',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'opportunity',
      title: 'Automation Opportunity',
      message: 'You could save 5 hours/week by automating expense categorization and receipt matching. 3 new automation opportunities detected.',
      action: 'Set up automations',
      priority: 'medium'
    },
    {
      id: '4',
      type: 'alert',
      title: 'Client Concentration Risk',
      message: '65% of revenue comes from client projects. Consider diversifying income sources to reduce risk.',
      priority: 'high'
    }
  ];

  // Mock deep dive data
  const topClients: DeepDiveData[] = [
    { id: '1', name: 'TechCorp Inc.', value: 45000, change: 15, category: 'Client Projects', status: 'active' },
    { id: '2', name: 'StartupXYZ', value: 32000, change: 8, category: 'Client Projects', status: 'active' },
    { id: '3', name: 'Enterprise Solutions', value: 28000, change: 22, category: 'Consulting', status: 'active' },
    { id: '4', name: 'Digital Agency', value: 25000, change: -5, category: 'Client Projects', status: 'pending' },
    { id: '5', name: 'Freelance Platform', value: 18000, change: 12, category: 'Product Sales', status: 'active' }
  ];

  const topVendors: DeepDiveData[] = [
    { id: '1', name: 'Adobe Creative Suite', value: 8000, change: 0, category: 'Software & Tools', status: 'active' },
    { id: '2', name: 'Google Ads', value: 12000, change: 25, category: 'Marketing & Ads', status: 'active' },
    { id: '3', name: 'Office Supplies Co.', value: 5000, change: -10, category: 'Office & Supplies', status: 'active' },
    { id: '4', name: 'Travel Agency', value: 8000, change: 15, category: 'Travel & Meals', status: 'active' },
    { id: '5', name: 'Legal Services', value: 6000, change: 0, category: 'Professional Services', status: 'active' }
  ];

  // Mock automation stats
  const automationStats: AutomationStat[] = [
    { id: '1', name: 'Auto-Categorize Expenses', runs: 47, timeSaved: 180, successRate: 94, lastRun: '2 hours ago' },
    { id: '2', name: 'Receipt Matching', runs: 23, timeSaved: 120, successRate: 89, lastRun: '1 hour ago' },
    { id: '3', name: 'Budget Alert System', runs: 156, timeSaved: 240, successRate: 98, lastRun: '30 minutes ago' },
    { id: '4', name: 'Weekly Report Generator', runs: 4, timeSaved: 60, successRate: 100, lastRun: '1 week ago' }
  ];

  // Mock tax status
  const taxStatus: TaxStatus = {
    receiptsMatched: 156,
    receiptsUnmatched: 23,
    taxReadinessScore: 85,
    outstandingTasks: 5,
    nextDeadline: 'March 15, 2024'
  };

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
      const aiResponse = generateAnalyticsBotResponse(userMessage);
      setChatHistory(prev => [...prev, { 
        id: (Date.now() + 1).toString(),
        type: 'ai', 
        message: aiResponse,
        timestamp: new Date().toISOString()
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const generateAnalyticsBotResponse = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('highest') && lowerMessage.includes('profit')) {
      return "Based on your data, December had the highest net profit at $7,500, followed by October at $7,000. Your profit trend has been consistently improving throughout the year, with an average monthly growth of 8.3%.";
    }
    
    if (lowerMessage.includes('software') && lowerMessage.includes('q2')) {
      return "In Q2 (April-June), you spent $3,800 on software and tools. This includes Adobe Creative Suite ($800), project management tools ($1,200), and other software subscriptions ($1,800). This represents 12% of your total Q2 expenses.";
    }
    
    if (lowerMessage.includes('client') && lowerMessage.includes('payment')) {
      return "Your average client payment time is 28 days, which is slightly above the industry average of 25 days. Your fastest-paying client is TechCorp Inc. (15 days average), while Digital Agency takes the longest at 45 days.";
    }
    
    if (lowerMessage.includes('margin') || lowerMessage.includes('profit')) {
      return "To increase your profit margin (currently 32.4%), focus on: 1) Reducing software costs by 15% through subscription optimization, 2) Increasing consulting rates by 10%, 3) Automating more processes to reduce time costs. Your margin has improved 5.1% this year already!";
    }
    
    if (lowerMessage.includes('cash flow') || lowerMessage.includes('cashflow')) {
      return "Your cash flow decreased 2.1% this month to $45,000. This is due to increased expenses in marketing and travel. To improve cash flow: 1) Negotiate longer payment terms with vendors, 2) Accelerate client payments with early payment discounts, 3) Optimize expense timing.";
    }
    
    if (lowerMessage.includes('revenue') || lowerMessage.includes('income')) {
      return "Your total income YTD is $185,000, up 12.5% from last year. You're on track to exceed your annual target. Top income sources: Client Projects (65%), Consulting (19%), Product Sales (11%). Consider diversifying to reduce client concentration risk.";
    }
    
    return "I can help you analyze your financial data, identify trends, and answer questions about your business performance. Ask me about profits, expenses, cash flow, client payments, or any other financial metrics!";
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

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'good': return 'text-green-400';
  //     case 'warning': return 'text-yellow-400';
  //     case 'danger': return 'text-red-400';
  //     default: return 'text-gray-400';
  //   }
  // };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive': return 'bg-green-500/20 border-green-500/30';
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'opportunity': return 'bg-blue-500/20 border-blue-500/30';
      case 'alert': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  // const totalIncome = keyMetrics.find(m => m.name === 'Total Income YTD')?.value as number || 0;
  // const totalExpenses = keyMetrics.find(m => m.name === 'Total Expenses YTD')?.value as number || 0;
  // const netProfit = keyMetrics.find(m => m.name === 'Net Profit')?.value as number || 0;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Analytics Dashboard</h1>
      <p className="text-lg text-gray-300 mb-8">See all your numbers, trends, and insights at a glance.</p>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 mb-8">
        <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
          <Filter size={20} />
          Filters
        </button>
        <button className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all">
          <DownloadIcon size={20} />
          Export Report
        </button>
      </div>

      <div className="space-y-8">
            
            {/* Date Range & Filters */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <select 
                    value={selectedDateRange}
                    onChange={(e) => setSelectedDateRange(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="ytd">Year to Date</option>
                    <option value="this-month">This Month</option>
                    <option value="last-month">Last Month</option>
                    <option value="q1">Q1</option>
                    <option value="q2">Q2</option>
                    <option value="q3">Q3</option>
                    <option value="q4">Q4</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  <select 
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="business">Business</option>
                    <option value="freelance">Freelance</option>
                    <option value="income">Income</option>
                    <option value="expenses">Expenses</option>
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-all">
                    <RefreshCw size={16} />
                  </button>
                  <button className="bg-white/10 hover:bg-white/20 text-white p-2 rounded transition-all">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Key Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {keyMetrics.map((metric) => (
                <div key={metric.id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
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

            {/* AI-Powered Insights & Alerts Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Brain size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI-Powered Insights</h3>
                  <p className="text-white/60 text-sm">Smart analysis of your financial data</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiInsights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold text-white">{insight.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            insight.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                            insight.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }`}>
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-white/80 text-sm mb-3">{insight.message}</p>
                        {insight.action && (
                          <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                            {insight.action} →
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses Chart */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Income vs Expenses</h3>
                    <p className="text-white/60 text-sm">Monthly trend analysis</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {trendData.slice(-6).map((data) => (
                    <div key={data.month} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <span className="text-white/60">{data.month}</span>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">${data.income.toLocaleString()}</div>
                          <div className="text-white/60 text-xs">Income</div>
                        </div>
                        <div className="text-right">
                          <div className="text-red-400 font-semibold">${data.expenses.toLocaleString()}</div>
                          <div className="text-white/60 text-xs">Expenses</div>
                        </div>
                        <div className="text-right">
                          <div className="text-blue-400 font-semibold">${data.profit.toLocaleString()}</div>
                          <div className="text-white/60 text-xs">Profit</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <PieChart size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Expense Categories</h3>
                    <p className="text-white/60 text-sm">Breakdown by category</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {expenseCategories.map((category) => (
                    <div key={category.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <span className="text-white/80">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${category.value.toLocaleString()}</div>
                        <div className="text-white/60 text-xs">{category.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Deep Dives & Drilldowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clients */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Top Clients</h3>
                    <p className="text-white/60 text-sm">Revenue by client</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {topClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{client.name}</div>
                        <div className="text-white/60 text-sm">{client.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${client.value.toLocaleString()}</div>
                        <div className={`text-sm ${client.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {client.change >= 0 ? '+' : ''}{client.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Vendors */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <Building2 size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Top Vendors</h3>
                    <p className="text-white/60 text-sm">Expenses by vendor</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {topVendors.map((vendor) => (
                    <div key={vendor.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold text-white">{vendor.name}</div>
                        <div className="text-white/60 text-sm">{vendor.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${vendor.value.toLocaleString()}</div>
                        <div className={`text-sm ${vendor.change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {vendor.change >= 0 ? '+' : ''}{vendor.change}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Automation Stats */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Zap size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Automation Statistics</h3>
                  <p className="text-white/60 text-sm">Usage and performance metrics</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {automationStats.map((stat) => (
                  <div key={stat.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Zap size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{stat.name}</h4>
                        <p className="text-white/60 text-xs">{stat.lastRun}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-white font-semibold">{stat.runs}</div>
                        <div className="text-white/60 text-xs">Runs</div>
                      </div>
                      <div>
                        <div className="text-green-400 font-semibold">{stat.timeSaved}</div>
                        <div className="text-white/60 text-xs">Min Saved</div>
                      </div>
                      <div>
                        <div className="text-blue-400 font-semibold">{stat.successRate}%</div>
                        <div className="text-white/60 text-xs">Success</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax/Receipt Status */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                  <Receipt size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Tax & Receipt Status</h3>
                  <p className="text-white/60 text-sm">Document organization and readiness</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3 mb-2">
                    <CheckCircle size={20} className="text-green-400" />
                    <span className="text-white font-semibold">Receipts Matched</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{taxStatus.receiptsMatched}</div>
                  <div className="text-white/60 text-sm">Successfully processed</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3 mb-2">
                    <AlertTriangle size={20} className="text-yellow-400" />
                    <span className="text-white font-semibold">Unmatched</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{taxStatus.receiptsUnmatched}</div>
                  <div className="text-white/60 text-sm">Need attention</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3 mb-2">
                    <Target size={20} className="text-blue-400" />
                    <span className="text-white font-semibold">Tax Readiness</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{taxStatus.taxReadinessScore}%</div>
                  <div className="text-white/60 text-sm">Ready for filing</div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock size={20} className="text-orange-400" />
                    <span className="text-white font-semibold">Next Deadline</span>
                  </div>
                  <div className="text-lg font-bold text-white">{taxStatus.nextDeadline}</div>
                  <div className="text-white/60 text-sm">Quarterly estimate</div>
                </div>
              </div>
            </div>

            {/* Ask AnalyticsBot */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ask AnalyticsBot</h3>
                  <p className="text-white/60 text-sm">Get instant answers about your financial data</p>
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
                    placeholder="Ask about profits, expenses, trends..."
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
                    onClick={() => setChatMessage("Which month had the highest net profit?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Highest profit month
                  </button>
                  <button 
                    onClick={() => setChatMessage("How much did I spend on software in Q2?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Q2 software costs
                  </button>
                  <button 
                    onClick={() => setChatMessage("What's my average client payment time?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Payment time
                  </button>
                  <button 
                    onClick={() => setChatMessage("Where should I focus to increase my margin?")}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-sm transition-all"
                  >
                    Margin optimization
                  </button>
                </div>
              </div>
            </div>

            {/* Export/Share Section */}
            <div className="bg-gradient-to-br from-green-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                    <FileSpreadsheet size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Export & Share</h3>
                    <p className="text-white/60 text-sm">Download reports and share insights</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                    <DownloadIcon size={16} />
                    PDF Report
                  </button>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                    <FileSpreadsheet size={16} />
                    CSV Data
                  </button>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                    <Share2 size={16} />
                    Share Snapshot
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Financial Summary</h4>
                  <p className="text-white/60 text-sm mb-3">Complete financial overview with charts</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Download PDF
                  </button>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Raw Data</h4>
                  <p className="text-white/60 text-sm mb-3">All transaction data in spreadsheet format</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Download CSV
                  </button>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">Share with Advisor</h4>
                  <p className="text-white/60 text-sm mb-3">Generate shareable link for accountant</p>
                  <button className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-sm transition-all">
                    Create Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
};

export default Analytics; 
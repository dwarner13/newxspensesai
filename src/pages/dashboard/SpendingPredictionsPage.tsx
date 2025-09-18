import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  BarChart3, 
  AlertTriangle, 
  Send, 
  Loader2,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  Brain,
  Search,
  XCircle,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Minus,
  MessageCircle
} from 'lucide-react';

// Prediction Data Interfaces
interface SpendingPrediction {
  id: string;
  category: string;
  currentMonth: number;
  predictedNextMonth: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  lastUpdated: string;
}

interface PatternInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  category: string;
  discovered: string;
}

interface PredictionAlert {
  id: string;
  type: 'budget' | 'trend' | 'anomaly' | 'seasonal';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  predictedDate: string;
  confidence: number;
}

interface CrystalInsight {
  id: string;
  title: string;
  content: string;
  type: 'prediction' | 'pattern' | 'recommendation' | 'warning';
  confidence: number;
  category: string;
  timestamp: string;
}

export default function SpendingPredictionsPage() {
  // View state
  const [activeView, setActiveView] = useState('overview');
  const [showCrystalChat, setShowCrystalChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Crystal AI Chat
  const [messages, setMessages] = useState<Array<{
    role: 'user' | 'crystal';
    content: string;
    timestamp: string;
  }>>([
    {
      role: 'crystal',
      content: "🔮 Hello! I'm Crystal, your AI Spending Predictions specialist. I analyze your financial patterns to predict future spending with 90%+ accuracy. I can forecast expenses, identify trends, and help you avoid budget surprises. What would you like to know about your spending future?",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live prediction data (simulated)
  const [livePredictions, setLivePredictions] = useState({
    totalPredicted: 3240,
    accuracy: 92.3,
    patternsFound: 47,
    alertsActive: 3,
    moneySaved: 1270,
    timeHorizon: '30 days'
  });

  // Mock prediction data
  const spendingPredictions: SpendingPrediction[] = [
    {
      id: 'groceries',
      category: 'Groceries',
      currentMonth: 450,
      predictedNextMonth: 485,
      confidence: 94,
      trend: 'up',
      changePercent: 7.8,
      lastUpdated: '2 hours ago'
    },
    {
      id: 'dining',
      category: 'Dining Out',
      currentMonth: 320,
      predictedNextMonth: 280,
      confidence: 89,
      trend: 'down',
      changePercent: -12.5,
      lastUpdated: '1 hour ago'
    },
    {
      id: 'entertainment',
      category: 'Entertainment',
      currentMonth: 180,
      predictedNextMonth: 195,
      confidence: 91,
      trend: 'up',
      changePercent: 8.3,
      lastUpdated: '30 minutes ago'
    },
    {
      id: 'utilities',
      category: 'Utilities',
      currentMonth: 220,
      predictedNextMonth: 225,
      confidence: 98,
      trend: 'stable',
      changePercent: 2.3,
      lastUpdated: '15 minutes ago'
    },
    {
      id: 'transportation',
      category: 'Transportation',
      currentMonth: 150,
      predictedNextMonth: 165,
      confidence: 87,
      trend: 'up',
      changePercent: 10.0,
      lastUpdated: '45 minutes ago'
    },
    {
      id: 'shopping',
      category: 'Shopping',
      currentMonth: 280,
      predictedNextMonth: 310,
      confidence: 85,
      trend: 'up',
      changePercent: 10.7,
      lastUpdated: '1 hour ago'
    }
  ];

  const patternInsights: PatternInsight[] = [
    {
      id: 'weekend-spending',
      title: 'Weekend Spending Spike',
      description: 'You spend 40% more on weekends, especially on dining and entertainment',
      confidence: 92,
      impact: 'high',
      category: 'Lifestyle',
      discovered: '2 days ago'
    },
    {
      id: 'payday-effect',
      title: 'Payday Spending Pattern',
      description: 'Spending increases by 25% in the first week after payday',
      confidence: 88,
      impact: 'medium',
      category: 'Income',
      discovered: '1 week ago'
    },
    {
      id: 'seasonal-holiday',
      title: 'Holiday Season Preparation',
      description: 'Historical data shows 35% spending increase in December',
      confidence: 95,
      impact: 'high',
      category: 'Seasonal',
      discovered: '3 days ago'
    }
  ];

  const predictionAlerts: PredictionAlert[] = [
    {
      id: 'budget-groceries',
      type: 'budget',
      title: 'Grocery Budget Alert',
      message: 'Predicted to exceed grocery budget by $85 next month',
      severity: 'medium',
      predictedDate: '2024-02-15',
      confidence: 94
    },
    {
      id: 'trend-dining',
      type: 'trend',
      title: 'Dining Trend Change',
      message: 'Dining out spending predicted to decrease by 12.5%',
      severity: 'low',
      predictedDate: '2024-02-01',
      confidence: 89
    },
    {
      id: 'seasonal-holiday',
      type: 'seasonal',
      title: 'Holiday Season Warning',
      message: 'December spending predicted to increase by 35%',
      severity: 'high',
      predictedDate: '2024-12-01',
      confidence: 95
    }
  ];

  const crystalInsights: CrystalInsight[] = [
    {
      id: 'savings-opportunity',
      title: 'Savings Opportunity Detected',
      content: 'Based on your dining pattern, you could save $200/month by cooking at home 2 more times per week',
      type: 'recommendation',
      confidence: 87,
      category: 'Dining',
      timestamp: '1 hour ago'
    },
    {
      id: 'budget-optimization',
      title: 'Budget Optimization Suggestion',
      content: 'Your grocery spending is trending upward. Consider meal planning to stay within budget',
      type: 'recommendation',
      confidence: 92,
      category: 'Groceries',
      timestamp: '2 hours ago'
    },
    {
      id: 'anomaly-detected',
      title: 'Unusual Spending Pattern',
      content: 'Detected 3x normal entertainment spending last week. This may indicate a special event',
      type: 'warning',
      confidence: 78,
      category: 'Entertainment',
      timestamp: '3 hours ago'
    }
  ];

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLivePredictions(prev => ({
        ...prev,
        totalPredicted: prev.totalPredicted + Math.floor(Math.random() * 10 - 5),
        accuracy: Math.min(99, prev.accuracy + (Math.random() * 0.2 - 0.1)),
        patternsFound: prev.patternsFound + Math.floor(Math.random() * 2),
        moneySaved: prev.moneySaved + Math.floor(Math.random() * 5)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      role: 'user' as const,
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response with better logic
    setTimeout(() => {
      const query = content.toLowerCase();
      let crystalResponse = '';

      if (query.includes('next month') || query.includes('forecast') || query.includes('predict')) {
        crystalResponse = `🔮 **Spending Forecast for Next Month:**

**Total Predicted Spending:** $3,240 (92% confidence)
**Key Changes:**
• Groceries: +7.8% ($485)
• Dining Out: -12.5% ($280) 
• Entertainment: +8.3% ($195)
• Shopping: +10.7% ($310)

**Budget Impact:** You're on track to stay within budget with a $160 buffer.

**Recommendation:** Consider meal planning to optimize grocery spending.`;
      } else if (query.includes('pattern') || query.includes('trend') || query.includes('analysis')) {
        crystalResponse = `📊 **Spending Pattern Analysis:**

**Key Patterns Discovered:**
• **Weekend Spike:** 40% higher spending on weekends
• **Payday Effect:** 25% increase in first week after payday
• **Seasonal Trend:** 35% increase expected in December

**Confidence Levels:**
• Weekend Pattern: 92% confidence
• Payday Pattern: 88% confidence
• Seasonal Pattern: 95% confidence

**Insight:** Your spending follows predictable cycles that I can use for accurate forecasting.`;
      } else if (query.includes('budget') || query.includes('alert') || query.includes('warning')) {
        crystalResponse = `⚠️ **Budget Alert Analysis:**

**Current Alerts:**
• Grocery budget at risk (+$85 predicted overage)
• Entertainment spending trending up
• Holiday season preparation needed

**Prevention Strategies:**
• Set daily spending limits for discretionary categories
• Plan meals to reduce grocery costs
• Start holiday savings now

**My Accuracy:** 92% for budget breach predictions with 2-3 week advance warning.`;
      } else if (query.includes('save') || query.includes('optimize') || query.includes('reduce')) {
        crystalResponse = `💰 **Savings Optimization:**

**Potential Monthly Savings:**
• Dining out reduction: $200/month
• Grocery optimization: $85/month
• Entertainment adjustment: $50/month

**Total Potential:** $335/month = $4,020/year

**Quick Wins:**
• Cook 2 more meals at home weekly
• Use grocery shopping lists
• Set entertainment budget limits

**Impact:** These changes could accelerate your savings goals by 6 months!`;
      } else {
        crystalResponse = `🔮 **Hello! I'm Crystal, your AI Spending Predictions specialist.**

I can help you with:
• **Spending Forecasts** - Predict next month's expenses
• **Pattern Analysis** - Discover your spending trends
• **Budget Alerts** - Get early warnings about overspending
• **Savings Optimization** - Find ways to save more money
• **Seasonal Planning** - Prepare for holiday spending

**My Accuracy:** 92%+ for all predictions
**Data Sources:** Your transaction history, spending patterns, and financial behavior

What would you like to know about your spending future?`;
      }

      const crystalMessage = {
        role: 'crystal' as const,
        content: crystalResponse,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, crystalMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const filteredPredictions = spendingPredictions.filter(prediction => 
    prediction.category.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === 'all' || prediction.trend === filterCategory)
  );

  const categories = ['all', 'up', 'down', 'stable'];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUpIcon className="w-4 h-4 text-red-400" />;
      case 'down': return <TrendingDownIcon className="w-4 h-4 text-green-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'recommendation': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'warning': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'prediction': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default: return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
    }
  };

  return (
    <div className="w-full pt-32 pb-72 px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome to Crystal's Prediction Lab
        </h2>
        <p className="text-white/60 text-sm mb-3">
          Your intelligent guide to predicting spending patterns and avoiding budget surprises
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-purple-400 text-sm font-medium">Crystal AI Active</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'predictions', label: 'Predictions', icon: TrendingUp },
          { key: 'patterns', label: 'Patterns', icon: Activity },
          { key: 'alerts', label: 'Alerts', icon: AlertTriangle },
          { key: 'insights', label: 'Crystal Insights', icon: Brain }
        ].map(({ key, label, icon: Icon }) => (
          <motion.button
            key={key}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === key
                ? 'bg-purple-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Overview Section */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Live Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Predicted Spending</p>
                  <p className="text-2xl font-bold text-white">${livePredictions.totalPredicted.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Prediction Accuracy</p>
                  <p className="text-2xl font-bold text-white">{livePredictions.accuracy.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Patterns Found</p>
                  <p className="text-2xl font-bold text-white">{livePredictions.patternsFound}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Money Saved</p>
                  <p className="text-2xl font-bold text-white">${livePredictions.moneySaved.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-32">
            <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <button
                onClick={() => setActiveView('predictions')}
                className="flex items-center gap-3 p-5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-white transition-all duration-200 hover:scale-105 min-h-[80px]"
              >
                <TrendingUp className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium">View Predictions</span>
              </button>
              <button
                onClick={() => setActiveView('patterns')}
                className="flex items-center gap-3 p-5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-white transition-all duration-200 hover:scale-105 min-h-[80px]"
              >
                <Activity className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium">Analyze Patterns</span>
              </button>
              <button
                onClick={() => setActiveView('alerts')}
                className="flex items-center gap-3 p-5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-white transition-all duration-200 hover:scale-105 min-h-[80px]"
              >
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium">Check Alerts</span>
              </button>
              <button
                onClick={() => setShowCrystalChat(true)}
                className="flex items-center gap-3 p-5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-xl text-white transition-all duration-200 hover:scale-105 min-h-[80px]"
              >
                <MessageCircle className="w-6 h-6 flex-shrink-0" />
                <span className="font-medium">Chat with Crystal</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Predictions Section */}
      {activeView === 'predictions' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Search predictions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {categories.map(category => (
                <option key={category} value={category} className="bg-slate-800">
                  {category === 'all' ? 'All Trends' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Predictions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPredictions.map((prediction) => (
              <div key={prediction.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{prediction.category}</h3>
                    <p className="text-white/70 text-sm">Updated {prediction.lastUpdated}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(prediction.trend)}
                    <span className={`text-sm font-medium ${
                      prediction.trend === 'up' ? 'text-red-400' : 
                      prediction.trend === 'down' ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {prediction.changePercent > 0 ? '+' : ''}{prediction.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-white/70 text-sm">Current Month</p>
                    <p className="text-white font-semibold">${prediction.currentMonth}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Predicted Next Month</p>
                    <p className="text-white font-semibold">${prediction.predictedNextMonth}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Confidence</p>
                    <p className="text-white font-semibold">{prediction.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">Trend</p>
                    <p className="text-white font-semibold capitalize">{prediction.trend}</p>
                  </div>
                </div>

                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${prediction.confidence}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Patterns Section */}
      {activeView === 'patterns' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {patternInsights.map((insight) => (
              <div key={insight.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{insight.title}</h3>
                    <p className="text-white/70 text-sm">Discovered {insight.discovered}</p>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    insight.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                    insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {insight.impact.toUpperCase()}
                  </div>
                </div>

                <p className="text-white/80 mb-4">{insight.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Confidence: {insight.confidence}%</span>
                  <span className="text-white/70 text-sm">Category: {insight.category}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Alerts Section */}
      {activeView === 'alerts' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            {predictionAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-xl border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{alert.title}</h3>
                  <span className="text-xs opacity-70">{alert.predictedDate}</span>
                </div>
                <p className="text-sm opacity-80 mb-2">{alert.message}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70">Confidence: {alert.confidence}%</span>
                  <span className="opacity-70">Type: {alert.type}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Crystal Insights Section */}
      {activeView === 'insights' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="space-y-4">
            {crystalInsights.map((insight) => (
              <div key={insight.id} className={`p-4 rounded-xl border ${getInsightTypeColor(insight.type)}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold">{insight.title}</h3>
                  <span className="text-xs opacity-70">{insight.timestamp}</span>
                </div>
                <p className="text-sm opacity-80 mb-2">{insight.content}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="opacity-70">Confidence: {insight.confidence}%</span>
                  <span className="opacity-70">Category: {insight.category}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Chat Section */}
      {activeView === 'chat' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">🔮</div>
              <div>
                <h3 className="text-xl font-semibold text-white">Chat with Crystal</h3>
                <p className="text-white/70">AI Spending Predictions Specialist</p>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Crystal is analyzing...</span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                placeholder="Ask Crystal about spending predictions..."
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Crystal Chat Modal */}
      <AnimatePresence>
        {showCrystalChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowCrystalChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-xl border border-white/20 p-6 w-full max-w-2xl h-[600px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔮</div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Chat with Crystal</h3>
                    <p className="text-white/70 text-sm">AI Spending Predictions Specialist</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCrystalChat(false)}
                  className="text-white/70 hover:text-white"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/5 rounded-lg mb-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/10 text-white border border-white/20'
                    }`}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-60 mt-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white/10 text-white border border-white/20 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Crystal is analyzing...</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
                  placeholder="Ask Crystal about spending predictions..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
} 





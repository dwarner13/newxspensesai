import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Brain, 
  Lightbulb, 
  Target, 
  Calendar,
  ShoppingCart,
  Coffee,
  Car,
  Home,
  Utensils,
  Wifi,
  Zap,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';

interface Insight {
  id: string;
  type: 'spending' | 'saving' | 'trend' | 'recommendation' | 'alert';
  title: string;
  description: string;
  value?: string;
  change?: string;
  changeType?: 'increase' | 'decrease';
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
  category?: string;
}

export default function AIInsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState<string>('');

  // Preload insights data for faster loading
  const preloadInsights = (): Insight[] => {
    const mockInsights: Insight[] = [
      {
        id: '1',
        type: 'spending' as const,
        title: 'Spending Increase Detected',
        description: 'Your dining out expenses increased by 45% this month compared to last month.',
        value: '$847',
        change: '+45%',
        changeType: 'increase' as const,
        icon: <Utensils className="w-6 h-6" />,
        priority: 'high' as const,
        category: 'dining'
      },
      {
        id: '2',
        type: 'saving' as const,
        title: 'Great Savings Opportunity',
        description: 'You could save $120/month by switching to a different coffee shop.',
        value: '$120',
        change: 'potential',
        changeType: 'decrease' as const,
        icon: <Coffee className="w-6 h-6" />,
        priority: 'medium' as const,
        category: 'dining'
      },
      {
        id: '3',
        type: 'trend' as const,
        title: 'Transportation Costs Stable',
        description: 'Your gas and transportation expenses have remained consistent for 3 months.',
        value: '$245',
        change: '0%',
        changeType: 'decrease' as const,
        icon: <Car className="w-6 h-6" />,
        priority: 'low' as const,
        category: 'transportation'
      },
      {
        id: '4',
        type: 'recommendation' as const,
        title: 'Budget Optimization',
        description: 'Consider allocating more to savings - you\'re under your target by 15%.',
        value: '15%',
        change: 'under target',
        changeType: 'decrease' as const,
        icon: <Target className="w-6 h-6" />,
        priority: 'medium' as const,
        category: 'savings'
      },
      {
        id: '5',
        type: 'alert' as const,
        title: 'Unusual Transaction Pattern',
        description: 'Multiple small transactions detected - review for potential fraud.',
        value: '12',
        change: 'transactions',
        changeType: 'increase' as const,
        icon: <AlertTriangle className="w-6 h-6" />,
        priority: 'high' as const,
        category: 'security'
      },
      {
        id: '6',
        type: 'trend' as const,
        title: 'Subscription Spending',
        description: 'You have 8 active subscriptions totaling $89/month.',
        value: '$89',
        change: 'monthly',
        changeType: 'increase' as const,
        icon: <Wifi className="w-6 h-6" />,
        priority: 'medium' as const,
        category: 'subscriptions'
      }
    ];
    return mockInsights;
  };

  useEffect(() => {
    // Simulate loading AI insights - reduced delay for better UX
    const timer = setTimeout(() => {
      setInsights(preloadInsights());
      setLoading(false);
    }, 500); // Further reduced to 500ms for even faster loading

    return () => clearTimeout(timer);
  }, []);

  const categories = [
    { id: 'all', name: 'All Insights', icon: <Brain className="w-4 h-4" /> },
    { id: 'spending', name: 'Spending', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'saving', name: 'Savings', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'trend', name: 'Trends', icon: <LineChart className="w-4 h-4" /> },
    { id: 'recommendation', name: 'Recommendations', icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'alert', name: 'Alerts', icon: <AlertTriangle className="w-4 h-4" /> }
  ];

  const filteredInsights = selectedCategory === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === selectedCategory);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-green-500 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getChangeIcon = (changeType?: string) => {
    if (changeType === 'increase') return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    if (changeType === 'decrease') return <ArrowDownRight className="w-4 h-4 text-green-500" />;
    return null;
  };

  const handleAskAI = async (type: 'explain' | 'recommend' | 'analyze' | 'custom', customQuery?: string) => {
    setAiLoading(true);
    setAiResponse('');
    
    try {
      // Simulate AI response - reduced delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const responses = {
        explain: 'Based on your financial data, here are the key insights:\n\n• **Spending Increase**: Your dining expenses increased 45% this month. This could be due to more social activities or inflation.\n\n• **Savings Opportunity**: You could save $120/month by optimizing your coffee shop visits.\n\n• **Stable Transportation**: Your gas costs have remained consistent, which is good for budgeting.\n\n• **Subscription Review**: You have 8 active subscriptions totaling $89/month. Consider reviewing which ones you actually use.',
        
        recommend: 'Here are my top recommendations for improving your financial health:\n\n1. **Reduce Dining Out**: Try cooking at home 2 more days per week to save ~$200/month.\n\n2. **Coffee Optimization**: Switch to a cheaper coffee shop or make coffee at home to save $120/month.\n\n3. **Subscription Audit**: Review your 8 subscriptions and cancel unused ones to save up to $50/month.\n\n4. **Emergency Fund**: With these savings, you could build a 3-month emergency fund in 6 months.\n\n5. **Budget Categories**: Set specific budgets for dining, entertainment, and subscriptions.',
        
        analyze: 'Deep Analysis of Your Financial Patterns:\n\n**Trends Identified:**\n• Dining expenses show seasonal patterns with higher spending in social months\n• Transportation costs are well-controlled and predictable\n• Subscription creep: gradual increase in recurring payments\n\n**Risk Factors:**\n• High dining-to-income ratio (15% of income)\n• Multiple small transactions that could indicate impulse spending\n• No clear savings strategy visible in the data\n\n**Opportunities:**\n• 23% potential savings through lifestyle optimization\n• Strong foundation for automated savings\n• Good credit utilization patterns',
        
        custom: `Based on your question "${customQuery || 'your finances'}", here's my analysis:\n\nYour financial data shows a healthy mix of income and expenses, but there are several optimization opportunities. The AI has identified specific areas where you could save money and improve your financial habits.\n\nWould you like me to dive deeper into any particular aspect of your finances?`
      };
      
      setAiResponse(responses[type] || responses.custom);
      if (type === 'custom') {
        setCustomQuery('');
      }
    } catch (error) {
      setAiResponse('Sorry, I encountered an error while analyzing your data. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-[50vh]"
      >
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full mx-auto mb-4"
          />
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600"
          >
            AI is analyzing your financial data...
          </motion.p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeader />
      <div className="space-y-6">
        {/* Description */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="text-gray-600">
              Intelligent analysis of your spending patterns and financial recommendations
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-3 py-2 bg-primary-50 rounded-lg">
              <Zap className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">AI Powered</span>
            </div>
          </div>
        </motion.div>

        {/* Category Filters */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {category.icon}
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInsights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card border-l-4 ${getPriorityColor(insight.priority)} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    insight.priority === 'high' ? 'bg-red-100 text-red-600' :
                    insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {insight.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {insight.value && (
                    <span className="text-lg font-bold text-gray-900">{insight.value}</span>
                  )}
                  {insight.change && (
                    <div className="flex items-center space-x-1">
                      {getChangeIcon(insight.changeType)}
                      <span className={`text-sm font-medium ${
                        insight.changeType === 'increase' ? 'text-red-600' :
                        insight.changeType === 'decrease' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>
                        {insight.change}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                  insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {insight.priority}
                </div>
              </div>
              
              {/* Ask AI button for this specific insight */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleAskAI('custom', `Explain this insight: ${insight.title} - ${insight.description}`)}
                  className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                >
                  <Brain size={14} />
                  <span>Ask AI about this insight</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI Assistant Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="card bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <Brain size={24} className="text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Need Help Understanding Your Insights?
              </h3>
              <p className="text-gray-600 mb-4">
                Ask our AI assistant to explain any insight, get personalized recommendations, or dive deeper into your financial patterns.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <button 
                  onClick={() => handleAskAI('explain')}
                  className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
                >
                  <Lightbulb className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Explain Insights</span>
                </button>
                
                <button 
                  onClick={() => handleAskAI('recommend')}
                  className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
                >
                  <Target className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Get Recommendations</span>
                </button>
                
                <button 
                  onClick={() => handleAskAI('analyze')}
                  className="flex items-center space-x-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left"
                >
                  <BarChart3 className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">Deep Analysis</span>
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="Ask AI anything about your finances..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    onKeyPress={(e) => e.key === 'Enter' && handleAskAI('custom', customQuery)}
                  />
                </div>
                <button 
                  onClick={() => handleAskAI('custom', customQuery)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Ask AI</span>
                </button>
              </div>
              
              {/* AI Response Display */}
              {aiLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-blue-50 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-200 border-t-primary-500 rounded-full"
                    />
                    <span className="text-sm text-blue-700">AI is analyzing your request...</span>
                  </div>
                </motion.div>
              )}
              
              {aiResponse && !aiLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Brain size={16} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">AI Analysis</h4>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{aiResponse}</pre>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Savings Potential</p>
                <p className="text-2xl font-bold">$320</p>
              </div>
              <TrendingDown className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">High Priority</p>
                <p className="text-2xl font-bold">{insights.filter(i => i.priority === 'high').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-200" />
            </div>
          </div>
          
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">AI Score</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <Zap className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
} 

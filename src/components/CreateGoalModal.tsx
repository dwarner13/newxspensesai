import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Target, 
  PiggyBank, 
  TrendingDown, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Brain, 
  Zap, 
  Lightbulb, 
  Star, 
  Crown, 
  Flame, 
  Heart, 
  Shield, 
  Users, 
  Building, 
  Home, 
  Car, 
  Plane, 
  GraduationCap, 
  Briefcase, 
  Utensils, 
  Wifi, 
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Award,
  Edit3,
  Trash2,
  Share2,
  Download,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Search,
  Grid,
  List,
  Globe,
  Calculator,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Calendar as CalendarIcon,
  DollarSign as DollarSignIcon,
  PiggyBank as PiggyBankIcon,
  ShoppingBag as ShoppingBagIcon,
  Target as TargetIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  type: 'savings' | 'debt' | 'investment' | 'income' | 'expense' | 'custom';
  category: string;
  icon: React.ReactNode;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  estimatedTime: string;
  tags: string[];
  aiSuggestions: string[];
}

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: (goal: any) => void;
}

const goalTemplates: GoalTemplate[] = [
  {
    id: 'emergency-fund',
    title: 'Emergency Fund',
    description: 'Build a 3-6 month emergency fund for financial security',
    type: 'savings',
    category: 'Emergency',
    icon: <Shield className="text-blue-600" />,
    difficulty: 'medium',
    xpReward: 500,
    estimatedTime: '6-12 months',
    tags: ['emergency', 'security', 'priority'],
    aiSuggestions: [
      'Start with 1 month of expenses, then gradually increase',
      'Keep in a high-yield savings account for easy access',
      'Automate monthly contributions to stay consistent'
    ]
  },
  {
    id: 'debt-payoff',
    title: 'Debt Payoff',
    description: 'Eliminate high-interest debt using snowball or avalanche method',
    type: 'debt',
    category: 'Debt Reduction',
    icon: <TrendingDown className="text-red-600" />,
    difficulty: 'hard',
    xpReward: 750,
    estimatedTime: '12-24 months',
    tags: ['debt', 'credit-card', 'high-interest'],
    aiSuggestions: [
      'Focus on highest interest rate debts first (avalanche method)',
      'Consider balance transfer cards to reduce interest',
      'Set up automatic payments to avoid late fees'
    ]
  },
  {
    id: 'investment-portfolio',
    title: 'Investment Portfolio',
    description: 'Start building a diversified investment portfolio',
    type: 'investment',
    category: 'Investing',
    icon: <TrendingUp className="text-green-600" />,
    difficulty: 'expert',
    xpReward: 1000,
    estimatedTime: 'Long-term',
    tags: ['investing', 'portfolio', 'long-term'],
    aiSuggestions: [
      'Start with index funds for broad market exposure',
      'Consider your risk tolerance and time horizon',
      'Diversify across different asset classes'
    ]
  },
  {
    id: 'vacation-fund',
    title: 'Vacation Fund',
    description: 'Save for your dream vacation or travel experiences',
    type: 'savings',
    category: 'Travel',
    icon: <Plane className="text-purple-600" />,
    difficulty: 'easy',
    xpReward: 300,
    estimatedTime: '3-12 months',
    tags: ['travel', 'vacation', 'fun'],
    aiSuggestions: [
      'Research destination costs to set realistic targets',
      'Consider travel rewards credit cards for additional savings',
      'Plan for both fixed costs and spending money'
    ]
  },
  {
    id: 'home-down-payment',
    title: 'Home Down Payment',
    description: 'Save for a down payment on your first home',
    type: 'savings',
    category: 'Housing',
    icon: <Home className="text-indigo-600" />,
    difficulty: 'hard',
    xpReward: 800,
    estimatedTime: '24-60 months',
    tags: ['housing', 'real-estate', 'major-purchase'],
    aiSuggestions: [
      'Aim for 20% down to avoid PMI insurance',
      'Consider first-time homebuyer programs',
      'Factor in closing costs and moving expenses'
    ]
  },
  {
    id: 'car-purchase',
    title: 'Car Purchase',
    description: 'Save for a new or used car purchase',
    type: 'savings',
    category: 'Transportation',
    icon: <Car className="text-orange-600" />,
    difficulty: 'medium',
    xpReward: 400,
    estimatedTime: '12-36 months',
    tags: ['transportation', 'vehicle', 'major-purchase'],
    aiSuggestions: [
      'Consider total cost of ownership, not just purchase price',
      'Research financing options and interest rates',
      'Factor in insurance, maintenance, and fuel costs'
    ]
  },
  {
    id: 'education-fund',
    title: 'Education Fund',
    description: 'Save for education expenses or student loan payoff',
    type: 'savings',
    category: 'Education',
    icon: <GraduationCap className="text-teal-600" />,
    difficulty: 'medium',
    xpReward: 600,
    estimatedTime: '12-48 months',
    tags: ['education', 'student-loans', 'learning'],
    aiSuggestions: [
      'Consider 529 plans for tax-advantaged education savings',
      'Prioritize high-interest student loans first',
      'Look into loan forgiveness programs if eligible'
    ]
  },
  {
    id: 'business-startup',
    title: 'Business Startup',
    description: 'Save capital to start your own business',
    type: 'savings',
    category: 'Business',
    icon: <Building className="text-gray-600" />,
    difficulty: 'expert',
    xpReward: 1200,
    estimatedTime: '24-60 months',
    tags: ['business', 'entrepreneurship', 'startup'],
    aiSuggestions: [
      'Create a detailed business plan before starting',
      'Consider starting small and scaling gradually',
      'Research funding options and grants available'
    ]
  }
];

const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ isOpen, onClose, onGoalCreated }) => {
  const [step, setStep] = useState<'template' | 'customize' | 'ai-suggestions'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [goalData, setGoalData] = useState({
    title: '',
    description: '',
    type: 'savings' as const,
    category: '',
    targetAmount: 0,
    deadline: '',
    priority: 'medium' as const,
    difficulty: 'medium' as const,
    isPublic: false,
    tags: [] as string[]
  });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      setGoalData(prev => ({
        ...prev,
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        type: selectedTemplate.type,
        category: selectedTemplate.category,
        difficulty: selectedTemplate.difficulty,
        tags: selectedTemplate.tags
      }));
      setAiSuggestions(selectedTemplate.aiSuggestions);
    }
  }, [selectedTemplate]);

  const filteredTemplates = goalTemplates.filter(template =>
    template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'expert':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'hard':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings':
        return <PiggyBank className="text-green-600" />;
      case 'debt':
        return <TrendingDown className="text-red-600" />;
      case 'investment':
        return <TrendingUp className="text-blue-600" />;
      case 'income':
        return <DollarSign className="text-yellow-600" />;
      case 'expense':
        return <ShoppingBag className="text-purple-600" />;
      default:
        return <Target className="text-gray-600" />;
    }
  };

  const handleCreateGoal = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newGoal = {
        id: Date.now().toString(),
        ...goalData,
        currentAmount: 0,
        progress: 0,
        status: 'active',
        milestones: [],
        aiInsights: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        xpReward: selectedTemplate?.xpReward || 300,
        streak: 0,
        collaborators: []
      };
      
      onGoalCreated(newGoal);
      toast.success('Goal created successfully! 🎯');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('template');
    setSelectedTemplate(null);
    setGoalData({
      title: '',
      description: '',
      type: 'savings',
      category: '',
      targetAmount: 0,
      deadline: '',
      priority: 'medium',
      difficulty: 'medium',
      isPublic: false,
      tags: []
    });
    setAiSuggestions([]);
    setSearchQuery('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Target className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Create New Goal</h2>
                  <p className="text-sm text-gray-600">Set up your financial target with AI assistance</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-4">
                {[
                  { key: 'template', label: 'Choose Template', icon: <Grid className="h-4 w-4" /> },
                  { key: 'customize', label: 'Customize Goal', icon: <Edit3 className="h-4 w-4" /> },
                  { key: 'ai-suggestions', label: 'AI Insights', icon: <Brain className="h-4 w-4" /> }
                ].map((stepItem, index) => (
                  <div key={stepItem.key} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      step === stepItem.key 
                        ? 'bg-primary-100 text-primary-700' 
                        : index < ['template', 'customize', 'ai-suggestions'].indexOf(step)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {stepItem.icon}
                      <span className="text-sm font-medium">{stepItem.label}</span>
                    </div>
                    {index < 2 && (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[60vh]">
              {step === 'template' && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose a Goal Template</h3>
                    <p className="text-gray-600 mb-4">Select from our AI-curated templates or search for specific goals</p>
                    
                    {/* Search */}
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search goal templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Templates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {template.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{template.title}</h4>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(template.difficulty)}`}>
                                {template.difficulty}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>{template.xpReward} XP</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{template.estimatedTime}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {template.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Custom Goal Option */}
                  <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                    <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 mb-1">Create Custom Goal</h4>
                    <p className="text-sm text-gray-600 mb-3">Build a goal from scratch with our AI assistant</p>
                    <button
                      onClick={() => {
                        setSelectedTemplate({
                          id: 'custom',
                          title: 'Custom Goal',
                          description: 'Create your own personalized financial goal',
                          type: 'custom',
                          category: 'Custom',
                          icon: <Target className="text-gray-600" />,
                          difficulty: 'medium',
                          xpReward: 300,
                          estimatedTime: 'Varies',
                          tags: ['custom', 'personalized'],
                          aiSuggestions: []
                        });
                        setStep('customize');
                      }}
                      className="btn-outline"
                    >
                      Start Custom Goal
                    </button>
                  </div>
                </div>
              )}

              {step === 'customize' && selectedTemplate && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Customize Your Goal</h3>
                    <p className="text-gray-600">Fine-tune your goal settings and parameters</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Goal Title</label>
                        <input
                          type="text"
                          value={goalData.title}
                          onChange={(e) => setGoalData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Enter your goal title"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={goalData.description}
                          onChange={(e) => setGoalData(prev => ({ ...prev, description: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Describe your goal in detail"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <input
                          type="text"
                          value={goalData.category}
                          onChange={(e) => setGoalData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="e.g., Emergency, Travel, Investment"
                        />
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Amount</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            value={goalData.targetAmount}
                            onChange={(e) => setGoalData(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="0"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Enter the total amount you want to achieve</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                        <input
                          type="date"
                          value={goalData.deadline}
                          onChange={(e) => setGoalData(prev => ({ ...prev, deadline: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                        <select
                          value={goalData.priority}
                          onChange={(e) => setGoalData(prev => ({ ...prev, priority: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                        <select
                          value={goalData.difficulty}
                          onChange={(e) => setGoalData(prev => ({ ...prev, difficulty: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                          <option value="expert">Expert</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Additional Settings</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={goalData.isPublic}
                          onChange={(e) => setGoalData(prev => ({ ...prev, isPublic: e.target.checked }))}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Make this goal public (share with friends/family)</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {step === 'ai-suggestions' && selectedTemplate && (
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
                    <p className="text-gray-600">Get personalized recommendations to help you achieve your goal faster</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* AI Suggestions */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        Smart Recommendations
                      </h4>
                      <div className="space-y-3">
                        {aiSuggestions.map((suggestion, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-blue-800">{suggestion}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Goal Preview */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Eye className="h-5 w-5 text-gray-600" />
                        Goal Preview
                      </h4>
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3 mb-3">
                          {getTypeIcon(goalData.type)}
                          <div>
                            <h5 className="font-semibold text-gray-900">{goalData.title}</h5>
                            <p className="text-sm text-gray-600">{goalData.category}</p>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-3">{goalData.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Target:</span>
                            <span className="font-medium">{formatCurrency(goalData.targetAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Deadline:</span>
                            <span className="font-medium">{goalData.deadline || 'Not set'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Priority:</span>
                            <span className="font-medium capitalize">{goalData.priority}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Difficulty:</span>
                            <span className="font-medium capitalize">{goalData.difficulty}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  if (step === 'customize') setStep('template');
                  else if (step === 'ai-suggestions') setStep('customize');
                }}
                disabled={step === 'template'}
                className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="btn-outline"
                >
                  Cancel
                </button>
                
                {step === 'template' && selectedTemplate && (
                  <button
                    onClick={() => setStep('customize')}
                    className="btn-primary"
                  >
                    Continue
                  </button>
                )}
                
                {step === 'customize' && (
                  <button
                    onClick={() => setStep('ai-suggestions')}
                    className="btn-primary"
                    disabled={!goalData.title || !goalData.targetAmount}
                  >
                    Continue
                  </button>
                )}
                
                {step === 'ai-suggestions' && (
                  <button
                    onClick={handleCreateGoal}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Create Goal
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateGoalModal; 

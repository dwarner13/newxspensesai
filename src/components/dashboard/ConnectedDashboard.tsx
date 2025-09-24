import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  MessageCircle, 
  Heart, 
  Target, 
  TrendingUp, 
  Mic, 
  Music, 
  Zap,
  Banknote,
  FileText,
  BarChart3,
  Settings,
  Loader2,
  Tag,
  BookOpen
} from 'lucide-react';
import { UniversalAIController } from '../../services/UniversalAIController';
import { UniversalChatInterface } from '../chat/UniversalChatInterface';
import { MobileChatInterface } from '../chat/MobileChatInterface';
import { MockProcessingModal } from '../upload/MockProcessingModal';
import { useAuth } from '../../contexts/AuthContext';
import { ProcessingResult } from '../../services/MockDocumentProcessor';
import { useNavigate } from 'react-router-dom';
import MobilePageTitle from '../ui/MobilePageTitle';

interface ConnectedDashboardProps {
  className?: string;
  isSidebarCollapsed?: boolean;
}

export function ConnectedDashboard({ className = '', isSidebarCollapsed = false }: ConnectedDashboardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [aiController] = useState(new UniversalAIController());
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showNotification, setShowNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingFileName, setProcessingFileName] = useState('');

  // Debug logging
  console.log('ConnectedDashboard render:', { user: !!user, loading, aiController: !!aiController });

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Safety check for user - but allow rendering with mock user for now
  if (!user) {
    console.log('No user found, using mock user');
    // For now, let's render the dashboard even without a real user
    // This will help us see if the issue is with user auth or something else
  }

  // Safety check for aiController - but allow rendering without it
  if (!aiController) {
    console.log('No aiController found, using mock controller');
    // For now, let's render the dashboard even without the AI controller
  }

  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => setShowNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [showNotification]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Smart Import AI Connection
  const handleImportNow = async () => {
    if (!user) return;
    
    // Create file input programmatically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.jpg,.png,.jpeg';
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      
      if (files.length === 0) {
        return;
      }
      
      // Show mock processing modal for the first file
      const firstFile = files[0];
      setProcessingFileName(firstFile.name);
      setShowProcessingModal(true);
    };
    
    input.click();
  };

  // Handle processing completion
  const handleProcessingComplete = (result: ProcessingResult) => {
    setShowProcessingModal(false);
    setShowNotification({ 
      type: 'success', 
      message: `Byte processed ${result.totalProcessed} transactions! Redirecting to transactions page...` 
    });
    
    // Navigate to transactions page after a short delay
    setTimeout(() => {
      navigate('/dashboard/transactions');
    }, 1500);
  };

  // AI Financial Assistant Connection
  const handleChatNow = async () => {
    if (!user) return;
    
    // Navigate to AI Chat Assistant page
    navigate('/dashboard/ai-financial-assistant');
  };

  // AI Financial Therapist Connection
  const handleStartSession = async () => {
    if (!user) return;
    setActiveChat('financial-therapist');
  };

  // Goal Concierge Connection
  const handleSetGoals = async () => {
    if (!user) return;
    navigate('/dashboard/goal-concierge');
  };

  // Spending Predictions Connection
  const handleViewPredictions = async () => {
    if (!user) return;
    navigate('/dashboard/spending-predictions');
  };

  // Personal Podcast Connection
  const handleListenNow = async () => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Generating your personalized podcast...');
      
      // Simulate podcast generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setShowNotification({ type: 'success', message: 'Your personalized podcast is ready! Check the podcast dashboard.' });
      
    } catch (error) {
      setShowNotification({ type: 'error', message: 'Error generating podcast. Please try again.' });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };


  // Debt Elimination Connection
  const handleDebtElimination = async () => {
    if (!user) return;
    navigate('/dashboard/debt-payoff-planner');
  };

  // Investment Strategy Connection
  const handleInvestmentStrategy = async () => {
    if (!user) return;
    navigate('/dashboard/ai-financial-freedom');
  };

  // Budget Reality Connection
  const handleBudgetReality = async () => {
    if (!user) return;
    navigate('/dashboard/analytics');
  };


  // AI WORKSPACE cards
  const aiWorkspaceCards = [
    {
      id: 'smart-import',
      title: 'Smart Import AI',
      description: 'Upload receipts and bank statements. Byte processes them instantly and you can chat about your data in real-time.',
      icon: <Upload className="w-6 h-6" />,
      stats: { lastUsed: "2 hours ago", documentsProcessed: 247 },
      buttonText: 'Import & Chat',
      onClick: handleImportNow,
      color: 'from-blue-500 to-blue-600',
      isLoading: isProcessing && processingStatus.includes('Byte')
    },
    {
      id: 'financial-assistant',
      title: 'AI Chat Assistant',
      description: 'Chat with our AI assistant for personalized financial advice, insights, and real-time analysis of your data.',
      icon: <MessageCircle className="w-6 h-6" />,
      stats: { available: "24/7", accuracy: "99.7%" },
      buttonText: 'Chat Now',
      onClick: () => handleChatNow(),
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'smart-categorization',
      title: 'Smart Categories',
      description: 'Automatically categorize your transactions with AI. Learn from your corrections and improve over time.',
      icon: <Tag className="w-6 h-6" />,
      stats: { accuracy: "96%", categoriesLearned: 47 },
      buttonText: 'Categorize Now',
      onClick: () => navigate('/dashboard/ai-categorization'),
      color: 'from-orange-500 to-orange-600'
    }
  ];

  // PLANNING & ANALYSIS cards
  const planningAnalysisCards = [
    {
      id: 'transactions',
      title: 'Transactions',
      description: 'View and manage all your financial transactions with detailed insights.',
      icon: <FileText className="w-6 h-6" />,
      stats: { total: "1,247", thisMonth: 89 },
      buttonText: 'View All',
      onClick: () => navigate('/dashboard/transactions'),
      color: 'from-blue-500 to-blue-600',
      isLoading: false
    },
    {
      id: 'goal-concierge',
      title: 'AI Goal Concierge',
      description: 'Set and track your financial goals with personalized coaching.',
      icon: <Target className="w-6 h-6" />,
      stats: { activeGoals: 3, completionRate: "87%" },
      buttonText: 'Set Goals',
      onClick: handleSetGoals,
      color: 'from-purple-500 to-purple-600',
      isLoading: false
    },
    {
      id: 'smart-automation',
      title: 'Smart Automation',
      description: 'Automate repetitive financial tasks with AI-powered workflows.',
      icon: <Zap className="w-6 h-6" />,
      stats: { automations: 12, timeSaved: "8h/week" },
      buttonText: 'Configure',
      onClick: () => navigate('/dashboard/smart-automation'),
      color: 'from-yellow-500 to-yellow-600',
      isLoading: false
    },
    {
      id: 'spending-predictions',
      title: 'Spending Predictions',
      description: 'AI-powered forecasts of your future spending patterns and trends.',
      icon: <TrendingUp className="w-6 h-6" />,
      stats: { accuracy: "94%", predictions: 156 },
      buttonText: 'View Predictions',
      onClick: handleViewPredictions,
      color: 'from-indigo-500 to-indigo-600',
      isLoading: false
    },
    {
      id: 'debt-elimination',
      title: 'Debt Payoff Planner',
      description: 'Military-style debt destruction strategies and motivation.',
      icon: <Zap className="w-6 h-6" />,
      stats: { debtReduced: "$12,847", monthsSaved: 18 },
      buttonText: 'Attack Debt',
      onClick: handleDebtElimination,
      color: 'from-red-500 to-red-600',
      isLoading: false
    },
    {
      id: 'investment-strategy',
      title: 'AI Financial Freedom',
      description: 'Wise investment advice and long-term wealth building strategies.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { portfolioGrowth: "23%", riskLevel: "Moderate" },
      buttonText: 'Get Strategy',
      onClick: handleInvestmentStrategy,
      color: 'from-emerald-500 to-emerald-600',
      isLoading: false
    },
    {
      id: 'budget-reality',
      title: 'Bill Reminder System',
      description: 'Never miss a payment with smart reminders and automated tracking.',
      icon: <Banknote className="w-6 h-6" />,
      stats: { reminders: 5, saved: "$47" },
      buttonText: 'Set Reminders',
      onClick: handleBudgetReality,
      color: 'from-orange-500 to-orange-600',
      isLoading: false
    }
  ];

  // ENTERTAINMENT & WELLNESS cards
  const entertainmentWellnessCards = [
    {
      id: 'personal-podcast',
      title: 'Personal Podcast',
      description: 'AI-generated podcasts about your financial journey and money story.',
      icon: <Mic className="w-6 h-6" />,
      stats: { lastEpisode: "2 days ago", totalEpisodes: 24 },
      buttonText: 'Listen Now',
      onClick: handleListenNow,
      color: 'from-violet-500 to-violet-600',
      isLoading: isProcessing && processingStatus.includes('podcast')
    },
    {
      id: 'financial-story',
      title: 'Financial Story',
      description: 'Transform your financial data into engaging stories with AI storytellers.',
      icon: <BookOpen className="w-6 h-6" />,
      stats: { stories: 4, lastCreated: "1 hour ago" },
      buttonText: 'Create Story',
      onClick: () => navigate('/dashboard/financial-story'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'financial-therapist',
      title: 'AI Financial Therapist',
      description: 'Emotional and behavioral coaching to improve your financial wellness. Chat about money stress and get support.',
      icon: <Heart className="w-6 h-6" />,
      stats: { lastSession: "3 days ago", stressLevel: "Low" },
      buttonText: 'Start Session',
      onClick: handleStartSession,
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'wellness-studio',
      title: 'Wellness Studio',
      description: 'Educational content and guided sessions for financial health and wellness.',
      icon: <Heart className="w-6 h-6" />,
      stats: { sessions: 12, wellnessScore: "85%" },
      buttonText: 'Start Session',
      onClick: () => navigate('/dashboard/wellness-studio'),
      color: 'from-pink-500 to-pink-600',
      isLoading: false
    },
    {
      id: 'spotify-integration',
      title: 'Spotify Integration',
      description: 'Curated playlists for focus, relaxation, and financial motivation.',
      icon: <Music className="w-6 h-6" />,
      stats: { status: "Connected", playlists: 8 },
      buttonText: 'Connect',
      onClick: () => window.open('/dashboard/spotify-integration', '_blank'),
      color: 'from-green-500 to-green-600',
      isLoading: false
    }
  ];

  // BUSINESS & TAX cards
  const businessTaxCards = [
    {
      id: 'tax-assistant',
      title: 'Tax Assistant',
      description: 'AI-powered tax preparation and optimization for maximum savings.',
      icon: <FileText className="w-6 h-6" />,
      stats: { savings: "$2,400", accuracy: "99%" },
      buttonText: 'Get Started',
      onClick: () => navigate('/dashboard/tax-assistant'),
      color: 'from-blue-500 to-blue-600',
      isLoading: false
    },
    {
      id: 'business-intelligence',
      title: 'Business Intelligence',
      description: 'Advanced analytics and insights for business growth and optimization.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { reports: 8, insights: 156 },
      buttonText: 'View Reports',
      onClick: () => navigate('/dashboard/business-intelligence'),
      color: 'from-indigo-500 to-indigo-600',
      isLoading: false
    }
  ];

  // TOOLS & SETTINGS cards
  const toolsSettingsCards = [
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Comprehensive financial reports and detailed analytics dashboard.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { metrics: 24, lastUpdate: "1 hour ago" },
      buttonText: 'View Analytics',
      onClick: () => navigate('/dashboard/analytics'),
      color: 'from-purple-500 to-purple-600',
      isLoading: false
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Manage your account, preferences, and integrations.',
      icon: <Settings className="w-6 h-6" />,
      stats: { lastUpdated: "2 days ago", integrations: 5 },
      buttonText: 'Open Settings',
      onClick: () => navigate('/dashboard/settings'),
      color: 'from-gray-500 to-gray-600',
      isLoading: false
    },
    {
      id: 'reports',
      title: 'Reports',
      description: 'Generate and view comprehensive financial reports.',
      icon: <FileText className="w-6 h-6" />,
      stats: { generated: 12, lastReport: "1 week ago" },
      buttonText: 'View Reports',
      onClick: () => navigate('/dashboard/reports'),
      color: 'from-cyan-500 to-cyan-600',
      isLoading: false
    }
  ];


  return (
    <div className={`space-y-8 ${className}`}>
      {/* Processing Status */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-500 text-white p-4 rounded-lg flex items-center space-x-3"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{processingStatus}</span>
        </motion.div>
      )}

      {/* Notification */}
      {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-lg flex items-center space-x-3 ${
                showNotification.type === 'success' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-red-500 text-white'
              }`}
            >
              <span>{showNotification.message}</span>
            </motion.div>
          )}

      {/* Page Title */}
      <MobilePageTitle 
        title="FinTech Entertainment Platform" 
        subtitle="Welcome back, John! Here's your financial overview."
      />


      {/* CORE AI TOOLS Section */}
      <div className="space-y-3 mt-8 md:mt-12">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">CORE AI TOOLS</h2>
          <p className="text-white/60 text-sm">Essential AI-powered features for your financial management</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {aiWorkspaceCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[240px] flex flex-col"
            >
              {/* Header with icon and stats */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className="text-right text-sm h-[40px] flex flex-col justify-center">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-white/60 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-white/90 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2">
                {card.title}
              </h3>
              
              {/* Description */}
              <p className="text-white/70 text-sm mb-4 h-[60px] overflow-hidden">
                {card.description}
              </p>
              
              {/* Button - always at bottom */}
              <div className="mt-auto">
                <button
                  onClick={card.onClick}
                  disabled={card.isLoading}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
                >
                  {card.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{card.buttonText}</span>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PLANNING & ANALYSIS Section */}
      <div className="space-y-3 mt-8 md:mt-12">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">PLANNING & ANALYSIS</h2>
          <p className="text-white/60 text-sm">Advanced tools for financial planning and strategic analysis</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {planningAnalysisCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 3) * 0.1 }}
              className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 h-[240px] flex flex-col"
            >
              {/* Header with icon and stats */}
              <div className="flex items-start justify-between mb-3">
                <div className={`w-8 h-8 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className="text-right text-sm h-[40px] flex flex-col justify-center">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-white/60 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-white/90 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2">
                {card.title}
              </h3>
              
              {/* Description */}
              <p className="text-white/70 text-sm mb-4 h-[60px] overflow-hidden">
                {card.description}
              </p>
              
              {/* Button - always at bottom */}
              <div className="mt-auto">
                <button
                  onClick={card.onClick}
                  disabled={card.isLoading}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
                >
                  {card.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{card.buttonText}</span>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ENTERTAINMENT & WELLNESS Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">ENTERTAINMENT & WELLNESS</h2>
          <p className="text-white/60 text-sm">Fun and engaging features to make finance enjoyable</p>
        </div>
        <div className={`grid gap-4 ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          {entertainmentWellnessCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 10) * 0.1 }}
                             className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 flex flex-col h-[240px]"
            >
              {/* Header with icon and stats */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className="text-right h-[2.5rem] flex flex-col justify-start">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-sm text-white/60 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-white/90 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2">
                {card.title}
              </h3>
              
              {/* Description */}
              <p className="text-white/70 text-sm mb-4 h-[60px] overflow-hidden">
                {card.description}
              </p>
              
              {/* Button - always at bottom */}
              <div className="mt-auto">
                <button
                  onClick={card.onClick}
                  disabled={card.isLoading}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
              >
                {card.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{card.buttonText}</span>
                )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* BUSINESS & TAX Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">BUSINESS & TAX</h2>
          <p className="text-white/60 text-sm">Professional tools for business and tax management</p>
        </div>
        <div className={`grid gap-4 ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          {businessTaxCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 15) * 0.1 }}
                             className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 flex flex-col h-[240px]"
            >
              {/* Header with icon and stats */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className="text-right h-[2.5rem] flex flex-col justify-start">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-sm text-white/60 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-white/90 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2">
                {card.title}
              </h3>
              
              {/* Description */}
              <p className="text-white/70 text-sm mb-4 h-[60px] overflow-hidden">
                {card.description}
              </p>
              
              {/* Button - always at bottom */}
              <div className="mt-auto">
                <button
                  onClick={card.onClick}
                  disabled={card.isLoading}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
              >
                {card.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{card.buttonText}</span>
                )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* TOOLS & SETTINGS Section */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">TOOLS & SETTINGS</h2>
          <p className="text-white/60 text-sm">System tools and configuration options</p>
        </div>
        <div className={`grid gap-4 ${isSidebarCollapsed ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          {toolsSettingsCards.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 17) * 0.1 }}
                             className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300 flex flex-col h-[240px]"
            >
              {/* Header with icon and stats */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center text-white`}>
                  {card.icon}
                </div>
                <div className="text-right h-[2.5rem] flex flex-col justify-start">
                  {Object.entries(card.stats).map(([key, value]) => (
                    <div key={key} className="text-sm text-white/60 leading-tight">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: <span className="text-white/90 font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-white font-bold text-base mb-2">
                {card.title}
              </h3>
              
              {/* Description */}
              <p className="text-white/70 text-sm mb-4 h-[60px] overflow-hidden">
                {card.description}
              </p>
              
              {/* Button - always at bottom */}
              <div className="mt-auto">
                <button
                  onClick={card.onClick}
                  disabled={card.isLoading}
                  className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-3 py-2 transition-all duration-200 flex items-center justify-center space-x-2 text-sm`}
              >
                {card.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{card.buttonText}</span>
                )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>


      {/* Chat Interface */}
      {activeChat && (
        isMobile ? (
          <MobileChatInterface
            employeeId={activeChat}
            aiController={aiController}
            userId={user?.id || ''}
            onClose={() => setActiveChat(null)}
          />
        ) : (
          <UniversalChatInterface
            employeeId={activeChat}
            aiController={aiController}
            userId={user?.id || ''}
            onClose={() => setActiveChat(null)}
          />
        )
      )}

      {/* Mock Processing Modal */}
      <MockProcessingModal
        isOpen={showProcessingModal}
        onClose={() => setShowProcessingModal(false)}
        onComplete={handleProcessingComplete}
        fileName={processingFileName}
      />
    </div>
  );
}

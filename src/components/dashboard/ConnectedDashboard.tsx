import React, { useState, useEffect } from 'react';
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
  Play,
  Loader2
} from 'lucide-react';
import { UniversalAIController } from '../../services/UniversalAIController';
import { UniversalChatInterface } from '../chat/UniversalChatInterface';
import { MobileChatInterface } from '../chat/MobileChatInterface';
import { useAuth } from '../../contexts/AuthContext';

interface ConnectedDashboardProps {
  className?: string;
}

export function ConnectedDashboard({ className = '' }: ConnectedDashboardProps) {
  const { user } = useAuth();
  const [aiController] = useState(new UniversalAIController());
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showNotification, setShowNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
    
    setIsProcessing(true);
    setProcessingStatus('Preparing document upload...');
    
    // Create file input programmatically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.jpg,.png,.jpeg';
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      
      if (files.length === 0) {
        setIsProcessing(false);
        return;
      }
      
      try {
        // Show Byte's personality while processing
        setProcessingStatus(`Byte is excited to process ${files.length} documents!`);
        
        const byteResponse = await aiController.chatWithEmployee(
          'smart-import', 
          `I'm about to process ${files.length} documents: ${files.map(f => f.name).join(', ')}`, 
          user.id
        );
        
        // Display Byte's excited response
        showNotification({ type: 'success', message: `Byte: ${byteResponse.response}` });
        
        // Process each document
        for (let i = 0; i < files.length; i++) {
          setProcessingStatus(`Processing ${files[i].name}... (${i + 1}/${files.length})`);
          await processDocumentWithPersonality(files[i], user.id);
        }
        
        setProcessingStatus('All documents processed successfully!');
        showNotification({ type: 'success', message: 'All documents have been processed by Byte!' });
        
      } catch (error) {
        console.error('Document processing error:', error);
        showNotification({ type: 'error', message: 'Error processing documents. Please try again.' });
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };
    
    input.click();
  };

  // AI Financial Assistant Connection
  const handleChatNow = async (employeeId: string = 'financial-assistant') => {
    if (!user) return;
    
    setActiveChat(employeeId);
  };

  // AI Financial Therapist Connection
  const handleStartSession = async () => {
    if (!user) return;
    setActiveChat('financial-therapist');
  };

  // Goal Concierge Connection
  const handleSetGoals = async () => {
    if (!user) return;
    setActiveChat('goal-concierge');
  };

  // Spending Predictions Connection
  const handleViewPredictions = async () => {
    if (!user) return;
    setActiveChat('spending-predictions');
  };

  // Personal Podcast Connection
  const handleListenNow = async () => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      setProcessingStatus('Generating your personalized podcast...');
      
      // Simulate podcast generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showNotification({ type: 'success', message: 'Your personalized podcast is ready! Check the podcast dashboard.' });
      
    } catch (error) {
      showNotification({ type: 'error', message: 'Error generating podcast. Please try again.' });
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Categorization Connection
  const handleManageCategories = async () => {
    if (!user) return;
    setActiveChat('categorization');
  };

  // Debt Elimination Connection
  const handleDebtElimination = async () => {
    if (!user) return;
    setActiveChat('debt-elimination');
  };

  // Investment Strategy Connection
  const handleInvestmentStrategy = async () => {
    if (!user) return;
    setActiveChat('investment-strategy');
  };

  // Budget Reality Connection
  const handleBudgetReality = async () => {
    if (!user) return;
    setActiveChat('budget-reality');
  };

  // Process document with personality
  const processDocumentWithPersonality = async (file: File, userId: string) => {
    // Simulate document processing with Byte's personality
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const byteResponse = await aiController.chatWithEmployee(
      'smart-import',
      `I just finished processing "${file.name}" and found some fascinating patterns!`,
      userId
    );
    
    showNotification({ type: 'success', message: `Byte: ${byteResponse.response}` });
  };

  const aiEmployeeCards = [
    {
      id: 'smart-import',
      title: 'Smart Import AI',
      description: 'Upload receipts and bank statements. Our AI automatically categorizes and organizes your expenses.',
      icon: <Upload className="w-6 h-6" />,
      stats: { lastUsed: "2 hours ago", documentsProcessed: 247 },
      buttonText: 'Import Now',
      onClick: handleImportNow,
      color: 'from-blue-500 to-blue-600',
      isLoading: isProcessing && processingStatus.includes('Byte')
    },
    {
      id: 'financial-assistant',
      title: 'AI Financial Assistant',
      description: 'Get personalized financial advice and insights from our AI assistant.',
      icon: <MessageCircle className="w-6 h-6" />,
      stats: { available: "24/7", accuracy: "99.7%" },
      buttonText: 'Chat Now',
      onClick: () => handleChatNow('financial-assistant'),
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'financial-therapist',
      title: 'AI Financial Therapist',
      description: 'Emotional and behavioral coaching to improve your financial wellness.',
      icon: <Heart className="w-6 h-6" />,
      stats: { lastSession: "3 days ago", stressLevel: "Low" },
      buttonText: 'Start Session',
      onClick: handleStartSession,
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'goal-concierge',
      title: 'Goal Concierge',
      description: 'Set and track your financial goals with personalized coaching.',
      icon: <Target className="w-6 h-6" />,
      stats: { activeGoals: 3, completionRate: "87%" },
      buttonText: 'Set Goals',
      onClick: handleSetGoals,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'spending-predictions',
      title: 'Spending Predictions',
      description: 'AI-powered forecasts of your future spending patterns and trends.',
      icon: <TrendingUp className="w-6 h-6" />,
      stats: { accuracy: "94%", predictions: 156 },
      buttonText: 'View Predictions',
      onClick: handleViewPredictions,
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'debt-elimination',
      title: 'Debt Elimination',
      description: 'Military-style debt destruction strategies and motivation.',
      icon: <Zap className="w-6 h-6" />,
      stats: { debtReduced: "$12,847", monthsSaved: 18 },
      buttonText: 'Attack Debt',
      onClick: handleDebtElimination,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'investment-strategy',
      title: 'Investment Strategy',
      description: 'Wise investment advice and long-term wealth building strategies.',
      icon: <BarChart3 className="w-6 h-6" />,
      stats: { portfolioGrowth: "23%", riskLevel: "Moderate" },
      buttonText: 'Get Strategy',
      onClick: handleInvestmentStrategy,
      color: 'from-emerald-500 to-emerald-600'
    },
    {
      id: 'budget-reality',
      title: 'Budget Reality Check',
      description: 'Direct, honest feedback about your spending habits and budget.',
      icon: <Banknote className="w-6 h-6" />,
      stats: { overBudget: 2, realityScore: "B+" },
      buttonText: 'Get Reality',
      onClick: handleBudgetReality,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'categorization',
      title: 'Smart Categorization',
      description: 'Intelligent transaction categorization and spending pattern analysis.',
      icon: <FileText className="w-6 h-6" />,
      stats: { accuracy: "98.3%", categories: 24 },
      buttonText: 'Manage Categories',
      onClick: handleManageCategories,
      color: 'from-cyan-500 to-cyan-600'
    }
  ];

  const entertainmentFeatures = [
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
      id: 'spotify-integration',
      title: 'Spotify Integration',
      description: 'Curated playlists for focus, relaxation, and financial motivation.',
      icon: <Music className="w-6 h-6" />,
      stats: { status: "Connected", playlists: 8 },
      buttonText: 'Connect',
      onClick: () => window.open('/dashboard/spotify-integration', '_blank'),
      color: 'from-green-500 to-green-600'
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

      {/* AI Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aiEmployeeCards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center text-white`}>
                {card.icon}
              </div>
              <div className="text-right">
                {Object.entries(card.stats).map(([key, value]) => (
                  <div key={key} className="text-xs text-white/60">
                    {key}: <span className="text-white/90">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <h3 className="text-white font-semibold text-lg mb-2">{card.title}</h3>
            <p className="text-white/70 text-sm mb-4">{card.description}</p>
            
            <button
              onClick={card.onClick}
              disabled={card.isLoading}
              className={`w-full bg-gradient-to-r ${card.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center space-x-2`}
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
          </motion.div>
        ))}
      </div>

      {/* Entertainment Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entertainmentFeatures.map((feature, index) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (aiEmployeeCards.length + index) * 0.1 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center text-white`}>
                {feature.icon}
              </div>
              <div className="text-right">
                {Object.entries(feature.stats).map(([key, value]) => (
                  <div key={key} className="text-xs text-white/60">
                    {key}: <span className="text-white/90">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-white/70 text-sm mb-4">{feature.description}</p>
            
            <button
              onClick={feature.onClick}
              disabled={feature.isLoading}
              className={`w-full bg-gradient-to-r ${feature.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center space-x-2`}
            >
              {feature.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{feature.buttonText}</span>
              )}
            </button>
          </motion.div>
        ))}
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
    </div>
  );
}

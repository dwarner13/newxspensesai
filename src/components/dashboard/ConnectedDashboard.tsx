/**
 * ConnectedDashboard Component
 * 
 * Main dashboard content orchestrator that:
 * - Fetches dashboard stats from Supabase
 * - Generates card configs using dashboardCardsConfig.tsx
 * - Renders dashboard sections (Overview, Core AI Tools, Planning & Analysis, etc.)
 * - Handles processing states and notifications
 * 
 * PHASE 2B NOTE:
 * - Desktop dashboard visual/UX upgrade (MultipurposeThemes style)
 * - New Prime floating action button (FAB) on desktop
 * - No changes to mobile layout or chat behavior in this phase
 * - Uses theme tokens from src/theme/dashboardTheme.ts
 * - Card styling updated via DashboardStatCard.tsx
 * - Sections use consistent typography and spacing
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MockProcessingModal } from '../upload/MockProcessingModal';
import { useAuth } from '../../contexts/AuthContext';
import { ProcessingResult } from '../../services/MockDocumentProcessor';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import {
  getCoreAIToolsCards,
  getPlanningAnalysisCards,
  getEntertainmentWellnessCards,
  getBusinessTaxCards,
  getToolsSettingsCards,
  DashboardStats,
  CardConfigHelpers,
} from './dashboardCardsConfig';
import { OverviewSection } from './sections/OverviewSection';
import { CoreAIToolsSection } from './sections/CoreAIToolsSection';
import { PlanningAnalysisSection } from './sections/PlanningAnalysisSection';
import { WellnessEntertainmentSection } from './sections/WellnessEntertainmentSection';
import { BusinessTaxSection } from './sections/BusinessTaxSection';
import { ToolsSettingsSection } from './sections/ToolsSettingsSection';

interface ConnectedDashboardProps {
  className?: string;
  isSidebarCollapsed?: boolean;
}

export function ConnectedDashboard({ className = '', isSidebarCollapsed = false }: ConnectedDashboardProps) {
  const { user, userId, isDemoUser, loading } = useAuth();
  const navigate = useNavigate();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showNotification, setShowNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingFileName, setProcessingFileName] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    documentsProcessed: 0,
    lastDocumentUpload: null,
    totalTransactions: 0,
    categoriesLearned: 0,
    aiAccuracy: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Debug logging
  console.log('ConnectedDashboard render:', { user: !!user, userId, isDemoUser, loading });

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Debug auth state
  if (isDemoUser) {
    console.log('Using demo user:', userId);
  } else {
    console.log('Using real user:', userId);
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

  // Fetch dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!userId) {
        setIsLoadingStats(false);
        return;
      }

      try {
        setIsLoadingStats(true);

        // Fetch receipts count and last upload
        const { data: receiptsData, error: receiptsError } = await supabase!
          .from('receipts')
          .select('id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false});

        if (receiptsError) {
          console.error('Error fetching receipts:', receiptsError);
        }

        // Fetch transactions count
        const { data: transactionsData, error: transactionsError } = await supabase!
          .from('transactions')
          .select('id, category')
          .eq('user_id', userId);

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
        }

        // Calculate unique categories
        const uniqueCategories = new Set(
          (transactionsData || []).map(tx => tx.category).filter(Boolean)
        );

        // Calculate last upload time
        const lastUpload = receiptsData && receiptsData.length > 0 
          ? receiptsData[0].created_at 
          : null;

        // Calculate time ago for last upload
        const getTimeAgo = (dateString: string) => {
          const now = new Date();
          const uploadDate = new Date(dateString);
          const diffInHours = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60));
          
          if (diffInHours < 1) return 'Just now';
          if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
          
          const diffInDays = Math.floor(diffInHours / 24);
          if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
          
          const diffInWeeks = Math.floor(diffInDays / 7);
          return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
        };

        setDashboardStats({
          documentsProcessed: receiptsData?.length || 0,
          lastDocumentUpload: lastUpload ? getTimeAgo(lastUpload) : null,
          totalTransactions: transactionsData?.length || 0,
          categoriesLearned: uniqueCategories.size,
          aiAccuracy: 96.5 // This could be calculated based on user corrections vs AI suggestions
        });

      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, [userId]);

  // Listen for stats refresh events
  useEffect(() => {
    const handleRefreshStats = () => {
      // Re-fetch stats when documents are uploaded
      const fetchDashboardStats = async () => {
        if (!userId) return;

        try {
          // Fetch receipts count and last upload
          const { data: receiptsData, error: receiptsError } = await supabase!
            .from('receipts')
            .select('id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false});

          if (receiptsError) {
            console.error('Error fetching receipts:', receiptsError);
            return;
          }

          // Fetch transactions count
          const { data: transactionsData, error: transactionsError } = await supabase!
            .from('transactions')
            .select('id, category')
            .eq('user_id', userId);

          if (transactionsError) {
            console.error('Error fetching transactions:', transactionsError);
            return;
          }

          // Calculate unique categories
          const uniqueCategories = new Set(
            (transactionsData || []).map(tx => tx.category).filter(Boolean)
          );

          // Calculate last upload time
          const lastUpload = receiptsData && receiptsData.length > 0 
            ? receiptsData[0].created_at 
            : null;

          // Calculate time ago for last upload
          const getTimeAgo = (dateString: string) => {
            const now = new Date();
            const uploadDate = new Date(dateString);
            const diffInHours = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60));
            
            if (diffInHours < 1) return 'Just now';
            if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
            
            const diffInDays = Math.floor(diffInHours / 24);
            if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
            
            const diffInWeeks = Math.floor(diffInDays / 7);
            return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
          };

          setDashboardStats(prev => ({
            ...prev,
            documentsProcessed: receiptsData?.length || 0,
            lastDocumentUpload: lastUpload ? getTimeAgo(lastUpload) : null,
            totalTransactions: transactionsData?.length || 0,
            categoriesLearned: uniqueCategories.size
          }));

        } catch (error) {
          console.error('Error refreshing dashboard stats:', error);
        }
      };

      fetchDashboardStats();
    };

    window.addEventListener('refreshDashboardStats', handleRefreshStats);
    return () => window.removeEventListener('refreshDashboardStats', handleRefreshStats);
  }, [userId]);

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

  // Handler functions for card actions
  const handleSetGoals = async () => {
    if (!user) return;
    navigate('/dashboard/goal-concierge');
  };

  const handleViewPredictions = async () => {
    if (!user) return;
    navigate('/dashboard/spending-predictions');
  };

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

  const handleDebtElimination = async () => {
    if (!user) return;
    navigate('/dashboard/debt-payoff-planner');
  };

  const handleInvestmentStrategy = async () => {
    if (!user) return;
    navigate('/dashboard/ai-financial-freedom');
  };

  const handleBudgetReality = async () => {
    if (!user) return;
    navigate('/dashboard/analytics');
  };

  const handleStartSession = async () => {
    if (!user) return;
    navigate('/dashboard/ai-chat-assistant');
  };

  // Prepare card config helpers
  const cardHelpers: CardConfigHelpers = {
    navigate,
    handleSetGoals,
    handleViewPredictions,
    handleDebtElimination,
    handleInvestmentStrategy,
    handleBudgetReality,
    handleListenNow,
    handleStartSession,
    isProcessing,
    processingStatus,
  };

  // Generate card configs from central config
  const coreAIToolsCards = getCoreAIToolsCards(dashboardStats, isLoadingStats, cardHelpers);
  const planningAnalysisCards = getPlanningAnalysisCards(dashboardStats, isLoadingStats, cardHelpers);
  const entertainmentWellnessCards = getEntertainmentWellnessCards(cardHelpers);
  const businessTaxCards = getBusinessTaxCards(cardHelpers);
  const toolsSettingsCards = getToolsSettingsCards(cardHelpers);

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <OverviewSection
        isProcessing={isProcessing}
        processingStatus={processingStatus}
        showNotification={showNotification}
        isDemoUser={isDemoUser}
        userId={userId}
        dashboardStats={{
          documentsProcessed: dashboardStats.documentsProcessed,
          lastDocumentUpload: dashboardStats.lastDocumentUpload,
          totalTransactions: dashboardStats.totalTransactions,
        }}
      />

      <CoreAIToolsSection cards={coreAIToolsCards} />

      <PlanningAnalysisSection cards={planningAnalysisCards} />

      <WellnessEntertainmentSection 
        cards={entertainmentWellnessCards}
      />

      <BusinessTaxSection cards={businessTaxCards} />

      <ToolsSettingsSection cards={toolsSettingsCards} />

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

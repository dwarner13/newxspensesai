/**
 * OverviewSection Component
 * 
 * Main dashboard overview section matching OverviewPage pattern
 * Uses DashboardStatCard components for consistent styling
 * 
 * NOTE: This section layout is intentionally kept in sync with AnalyticsPage and ReportsPage.
 * All dashboard tabs use <div className="space-y-6"> + header + grid gap-6 md:grid-cols-2 xl:grid-cols-3.
 * 
 * Updated to match OverviewPage.tsx layout pattern
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Crown, Upload, MessageCircle } from 'lucide-react';
import SyncStatusPulse from '../SyncStatusPulse';
import { DashboardStatCard } from '../DashboardStatCard';
import { useAuth } from '../../../contexts/AuthContext';

interface OverviewSectionProps {
  isProcessing: boolean;
  processingStatus: string;
  showNotification: { type: 'success' | 'error'; message: string } | null;
  isDemoUser: boolean;
  userId: string | null;
  dashboardStats?: {
    documentsProcessed: number;
    lastDocumentUpload: string | null;
    totalTransactions: number;
  };
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  isProcessing,
  processingStatus,
  showNotification,
  isDemoUser,
  userId,
  dashboardStats,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get user's first name for personalization
  const userName = user?.user_metadata?.first_name || 
                   user?.user_metadata?.full_name?.split(' ')[0] || 
                   'there';

  // Dashboard cards matching OverviewPage pattern
  const dashboardCards = [
    {
      id: 'prime-command',
      title: 'Prime Command Center',
      description: 'Chat with Prime, your AI CEO. Get strategic financial insights and coordinate with your AI team.',
      icon: <Crown className="w-6 h-6" />,
      stats: { 
        status: 'Active', 
        team: '8 AI employees' 
      },
      buttonText: 'Open Workspace',
      color: 'from-purple-500 to-purple-600',
      onClick: () => navigate('/dashboard/prime-chat'),
      navigateTo: '/dashboard/prime-chat',
    },
    {
      id: 'smart-import',
      title: 'Smart Import AI',
      description: 'Upload receipts and bank statements. Byte processes them instantly and you can chat about your data in real-time.',
      icon: <Upload className="w-6 h-6" />,
      stats: { 
        processed: dashboardStats?.documentsProcessed || 0, 
        lastUpload: dashboardStats?.lastDocumentUpload || 'Never' 
      },
      buttonText: 'Open Workspace',
      color: 'from-blue-500 to-blue-600',
      onClick: () => navigate('/dashboard/smart-import-ai'),
      navigateTo: '/dashboard/smart-import-ai',
    },
    {
      id: 'ai-chat',
      title: 'AI Chat Assistant',
      description: 'Get personalized financial advice anytime. Chat with your AI financial assistant for insights and planning.',
      icon: <MessageCircle className="w-6 h-6" />,
      stats: { 
        available: '24/7', 
        accuracy: '94%' 
      },
      buttonText: 'Open Workspace',
      color: 'from-green-500 to-green-600',
      onClick: () => navigate('/dashboard/ai-chat-assistant'),
      navigateTo: '/dashboard/ai-chat-assistant',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-orange-500 text-white p-4 rounded-lg flex items-center space-x-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{processingStatus}</span>
        </div>
      )}

      {/* Notification */}
      {showNotification && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 ${
            showNotification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}
        >
          <span>{showNotification.message}</span>
        </div>
      )}

      {/* Hero Cards Row - Three cards: Prime Command Center, Smart Import AI, AI Chat Assistant */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
        {dashboardCards.map((card) => (
          <DashboardStatCard key={card.id} {...card} />
        ))}
      </div>

      {/* Gmail Sync Status */}
      {!isDemoUser && userId && (
        <div>
          <SyncStatusPulse userId={userId} />
        </div>
      )}
    </div>
  );
};

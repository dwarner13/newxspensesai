/**
 * OverviewSection Component
 * 
 * Main dashboard overview section with Prime-branded welcome hero
 * Replaces generic AI Assistant hero with Prime welcome card
 * 
 * NOTE: This section layout is intentionally kept in sync with AnalyticsPage and ReportsPage.
 * All dashboard tabs use <div className="space-y-6"> + header + grid gap-6 md:grid-cols-2 xl:grid-cols-3.
 * 
 * Updated to match OverviewPage.tsx layout pattern
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import SyncStatusPulse from '../SyncStatusPulse';
import { useAuth } from '../../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { PrimeLogoBadge } from '../../branding/PrimeLogoBadge';

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
  const { openChat } = useUnifiedChatLauncher();

  // Get user's first name for personalization
  const userName = user?.user_metadata?.first_name || 
                   user?.user_metadata?.full_name?.split(' ')[0] || 
                   'Darrell';

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

      {/* Prime Welcome Hero Card */}
      <section className="mt-6 rounded-3xl bg-slate-900/70 backdrop-blur-xl border border-white/5 shadow-[0_0_60px_rgba(252,211,77,0.25)] px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <PrimeLogoBadge size={64} showGlow={true} />

          <div className="flex-1 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">
              Welcome back, {userName}. I'm Prime, your AI financial CEO.
            </h1>
            <p className="max-w-xl text-sm sm:text-base text-slate-200/80">
              I can review your latest imports, explain your spending, and help you plan debt payoff and savings goals. What would you like to focus on first?
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            className="
              inline-flex items-center justify-center
              px-6 py-3 rounded-full
              bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500
              text-slate-900 font-semibold text-sm
              shadow-lg shadow-amber-500/30
              hover:shadow-amber-400/50 hover:brightness-110
              hover:-translate-y-0.5
              transition-all duration-200
              gap-2
            "
            onClick={() => openChat({ initialEmployeeSlug: 'prime-boss' })}
          >
            <span className="text-base">📣</span>
            <span>Open Prime Chat</span>
          </button>
          <button
            type="button"
            className="
              inline-flex items-center justify-center
              px-6 py-3 rounded-full
              bg-slate-900/60
              border border-slate-500/30
              text-slate-100 font-medium text-sm
              shadow-md shadow-sky-500/10
              hover:bg-slate-900/80 hover:border-sky-400/60
              hover:shadow-sky-400/30
              hover:-translate-y-0.5
              transition-all duration-200
              gap-2
            "
            onClick={() => navigate('/dashboard/smart-import-ai')}
          >
            <span className="text-base">📄</span>
            <span>Review my latest imports</span>
          </button>
          <button
            type="button"
            className="
              inline-flex items-center justify-center
              px-6 py-3 rounded-full
              bg-slate-900/60
              border border-slate-500/30
              text-slate-100 font-medium text-sm
              shadow-md shadow-sky-500/10
              hover:bg-slate-900/80 hover:border-sky-400/60
              hover:shadow-sky-400/30
              hover:-translate-y-0.5
              transition-all duration-200
              gap-2
            "
            onClick={() => navigate('/dashboard/analytics')}
          >
            <span className="text-base">📊</span>
            <span>Show my top insights</span>
          </button>
        </div>
      </section>

      {/* Gmail Sync Status */}
      {!isDemoUser && userId && (
        <div>
          <SyncStatusPulse userId={userId} />
        </div>
      )}
    </div>
  );
};

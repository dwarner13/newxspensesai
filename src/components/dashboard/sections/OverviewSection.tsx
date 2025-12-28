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
import { usePrimeState } from '../../../contexts/PrimeContext';
import { PrimeLogoBadge } from '../../branding/PrimeLogoBadge';
import { cn } from '../../../lib/utils';

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
  className?: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  isProcessing,
  processingStatus,
  showNotification,
  isDemoUser,
  userId,
  dashboardStats,
  className,
}) => {
  const navigate = useNavigate();
  const { user, profile, firstName } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  const primeState = usePrimeState(); // Get Prime state for suggested next action

  // Use display_name from profile, fallback to full_name, firstName, then email prefix
  const displayName = profile?.display_name?.trim() || 
    profile?.full_name?.trim() || 
    firstName || 
    (user?.email ? user.email.split('@')[0] : null) || 
    'there';
  
  // Get account type and currency from profile
  const accountType = profile?.account_type as string | undefined;
  const currency = profile?.currency || 'CAD';
  
  // Format account type for display
  const accountTypeDisplay = accountType === 'both' 
    ? 'personal and business' 
    : accountType === 'personal' 
    ? 'personal' 
    : accountType === 'business' 
    ? 'business' 
    : null;

  // Hero button styles - Equal size, smaller buttons
  const baseButton =
    "group flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs md:text-sm font-medium bg-[#050816]/90 text-slate-50 whitespace-nowrap transition-all duration-200";

  const primeGlow =
    "border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.5)] hover:shadow-[0_0_26px_rgba(251,191,36,0.7)]";

  const normalGlow =
    "border-slate-500/60 shadow-[0_0_0_1px_rgba(148,163,184,0.3)] hover:shadow-[0_0_18px_rgba(15,23,42,0.8)]";

  const getButtonClasses = (isPrime: boolean) =>
    cn(
      baseButton,
      "hover:bg-[#020617]",
      isPrime ? primeGlow : normalGlow
    );

  const getIconCircleClasses = (isPrime: boolean) =>
    cn(
      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
      isPrime
        ? "bg-gradient-to-br from-amber-400 via-orange-400 to-pink-500 shadow-[0_0_14px_rgba(251,191,36,0.7)]"
        : "bg-slate-800/80"
    );

  return (
    <div className="w-full h-full flex flex-col space-y-6">
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
      <section className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121728] via-[#141a30] to-[#101522] shadow-xl border border-white/5 h-full flex flex-col", className)}>
        <div className="flex flex-col gap-6 px-8 py-8 lg:py-10 flex-1">
          {/* TEXT BLOCK */}
          <div className="max-w-2xl">
            <p className="text-sm text-slate-400 mb-2">
              Welcome back, {displayName}.
            </p>
            <h1 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
              I'm Prime, your AI financial CEO.
            </h1>
            <p className="text-slate-300 text-sm lg:text-base">
              {accountTypeDisplay && currency ? (
                <>
                  You're set up for <span className="font-medium text-white">{accountTypeDisplay}</span> expenses in <span className="font-medium text-white">{currency}</span>. 
                  I can review your latest imports, explain your spending, and help you plan debt payoff and savings goals. What would you like to focus on first?
                </>
              ) : (
                <>
                  I can review your latest imports, explain your spending, and help you
                  plan debt payoff and savings goals. What would you like to focus on first?
                </>
              )}
            </p>
          </div>

          {/* CTA BUTTON ROW */}
          <div className="flex flex-wrap gap-4">
            {/* Primary CTA: Prime-driven suggested next action (if available) */}
            {primeState?.suggestedNextAction ? (
              <button
                type="button"
                className={getButtonClasses(true)}
                onClick={() => navigate(primeState.suggestedNextAction!.route)}
              >
                <span className={getIconCircleClasses(true)}>
                  {primeState.suggestedNextAction.icon || '🎯'}
                </span>
                <span className="tracking-tight">{primeState.suggestedNextAction.ctaText}</span>
              </button>
            ) : (
              // Fallback: Default primary CTA (existing behavior)
              <>
                {/* Primary: Open Prime Chat */}
                <button
                  type="button"
                  className={getButtonClasses(true)}
                  onClick={() => openChat({ initialEmployeeSlug: 'prime-boss' })}
                >
                  <span className={getIconCircleClasses(true)}>
                    👑
                  </span>
                  <span className="tracking-tight">Open Prime Chat</span>
                </button>

                {/* Primary: Upload Receipt/Statement */}
                <button
                  type="button"
                  className={getButtonClasses(false)}
                  onClick={() => navigate('/dashboard/smart-import-ai?auto=upload')}
                >
                  <span className={getIconCircleClasses(false)}>
                    📤
                  </span>
                  <span className="tracking-tight">Upload Receipt/Statement</span>
                </button>
              </>
            )}

            {/* Secondary: Review my latest imports */}
            <button
              type="button"
              className={getButtonClasses(false)}
              onClick={() => navigate('/dashboard/smart-import-ai')}
            >
              <span className={getIconCircleClasses(false)}>
                📄
              </span>
              <span className="tracking-tight">Review my latest imports</span>
            </button>

            {/* Secondary: Show my top insights */}
            <button
              type="button"
              className={getButtonClasses(false)}
              onClick={() => navigate('/dashboard/analytics')}
            >
              <span className={getIconCircleClasses(false)}>
                📊
              </span>
              <span className="tracking-tight">Show my top insights</span>
            </button>
          </div>
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

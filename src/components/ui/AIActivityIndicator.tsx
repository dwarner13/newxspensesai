import { useEffect, useState } from 'react';
import { Sparkles, Zap, Brain, TrendingUp, FileText, Target, DollarSign, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AIActivityIndicatorProps {
  page: string; // Current page/route to determine context
}

// AI employee avatars/icons
const AI_EMPLOYEES = {
  prime: { name: 'Prime', emoji: '👑', color: 'from-orange-500 to-yellow-500' },
  byte: { name: 'Byte', emoji: '🤖', color: 'from-blue-500 to-cyan-500' },
  tag: { name: 'Tag', emoji: '🏷️', color: 'from-green-500 to-emerald-500' },
  crystal: { name: 'Crystal', emoji: '💎', color: 'from-purple-500 to-pink-500' },
  sage: { name: 'Sage', emoji: '🧙', color: 'from-indigo-500 to-blue-500' },
  nova: { name: 'Nova', emoji: '✨', color: 'from-pink-500 to-rose-500' },
};

// Page-specific AI activities with variety
const PAGE_ACTIVITIES: Record<string, Array<{
  ai: keyof typeof AI_EMPLOYEES;
  action: string;
  icon: typeof Sparkles;
  metric?: string;
}>> = {
  dashboard: [
    { ai: 'crystal', action: 'Found $247 in savings', icon: DollarSign, metric: '$247' },
    { ai: 'byte', action: 'Processed 12 receipts', icon: FileText, metric: '12' },
    { ai: 'tag', action: 'Categorized 18 transactions', icon: Target, metric: '18' },
    { ai: 'prime', action: 'Updated financial overview', icon: TrendingUp },
    { ai: 'sage', action: 'Optimized budget allocation', icon: Brain },
  ],
  overview: [
    { ai: 'crystal', action: 'Analyzing spending trends', icon: TrendingUp },
    { ai: 'prime', action: 'Generated insights', icon: Brain },
    { ai: 'sage', action: 'Updated forecasts', icon: Sparkles },
  ],
  planning: [
    { ai: 'sage', action: 'Calculated goal progress', icon: Target, metric: '78%' },
    { ai: 'prime', action: 'Optimized savings plan', icon: DollarSign },
    { ai: 'crystal', action: 'Predicted cash flow', icon: TrendingUp },
  ],
  analytics: [
    { ai: 'crystal', action: 'Deep analysis complete', icon: Brain },
    { ai: 'sage', action: 'Pattern detected: Coffee', icon: TrendingUp, metric: '+23%' },
    { ai: 'prime', action: 'Refreshed all metrics', icon: Zap },
  ],
  business: [
    { ai: 'sage', action: 'Tax opportunity: $1.2k', icon: DollarSign, metric: '$1.2k' },
    { ai: 'crystal', action: 'Q4 report ready', icon: FileText },
    { ai: 'prime', action: 'Business intel updated', icon: Brain },
  ],
  entertainment: [
    { ai: 'nova', action: 'New story chapter ready', icon: Sparkles },
    { ai: 'crystal', action: 'Wellness score: 92%', icon: Target, metric: '92%' },
    { ai: 'prime', action: 'Podcast episode ready', icon: Brain },
  ],
  transactions: [
    { ai: 'byte', action: 'OCR processed 8 receipts', icon: FileText, metric: '8' },
    { ai: 'tag', action: 'Auto-categorized 15 items', icon: Target, metric: '15' },
    { ai: 'crystal', action: 'Duplicate check passed', icon: Zap },
  ],
  'smart-import-ai': [
    { ai: 'byte', action: 'Processing documents...', icon: Zap },
    { ai: 'byte', action: 'OCR accuracy: 99.7%', icon: Target, metric: '99.7%' },
    { ai: 'tag', action: 'Ready to categorize', icon: Brain },
  ],
  'prime-chat': [
    { ai: 'prime', action: 'Coordinating AI team', icon: Brain },
    { ai: 'prime', action: 'Routing your request', icon: Zap },
    { ai: 'crystal', action: 'Standing by for analysis', icon: Sparkles },
  ],
};

export function AIActivityIndicator({ page }: AIActivityIndicatorProps) {
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Get page key from route
  const getPageKey = (route: string): string => {
    const cleanRoute = route.replace('/dashboard/', '').replace('/dashboard', 'dashboard');
    return cleanRoute || 'dashboard';
  };

  const pageKey = getPageKey(page);
  const activities = PAGE_ACTIVITIES[pageKey] || PAGE_ACTIVITIES.dashboard;

  // Safety check: ensure activities array is not empty
  if (!activities || activities.length === 0) {
    return null;
  }

  // Rotate activities every 5 seconds with smooth animation
  useEffect(() => {
    if (activities.length <= 1) return; // No need to rotate if only one activity

    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentActivityIndex((prev) => (prev + 1) % activities.length);
        setIsAnimating(false);
      }, 300); // Quick fade out/in
    }, 5000);

    return () => clearInterval(interval);
  }, [activities.length]);

  const currentActivity = activities[currentActivityIndex] || activities[0];
  if (!currentActivity || !currentActivity.ai || !currentActivity.icon) {
    return null;
  }

  const aiEmployee = AI_EMPLOYEES[currentActivity.ai];
  if (!aiEmployee) return null;

  const Icon = currentActivity.icon;

  return (
    <div className={cn(
      "relative flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0",
      "bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10",
      "border border-purple-500/30",
      "hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20",
      "transition-all duration-300",
      isAnimating && "opacity-70"
    )}>
      {/* AI Avatar with glow effect */}
      <div className={cn(
        "w-5 h-5 rounded-full bg-gradient-to-r flex items-center justify-center text-sm flex-shrink-0 relative",
        aiEmployee.color,
        "shadow-lg shadow-purple-500/30",
        isAnimating && "scale-90 opacity-50",
        "transition-all duration-300"
      )}>
        {aiEmployee.emoji}
      </div>

      {/* Icon */}
      <Icon className={cn(
        "w-3.5 h-3.5 text-purple-400 flex-shrink-0",
        isAnimating && "opacity-50",
        "transition-all duration-300"
      )} />

      {/* Activity text */}
      <span className={cn(
        "text-xs font-medium text-purple-100 truncate",
        isAnimating && "opacity-0 translate-y-1",
        "transition-all duration-300"
      )}>
        {currentActivity.action}
      </span>

      {/* Metric badge (if present) */}
      {currentActivity.metric && (
        <div className={cn(
          "px-1.5 py-0.5 rounded-full bg-purple-500/20 flex-shrink-0",
          isAnimating && "scale-90 opacity-50",
          "transition-all duration-300"
        )}>
          <span className="text-[10px] font-bold text-purple-200">
            {currentActivity.metric}
          </span>
        </div>
      )}

      {/* Green pulse dot in top-right corner */}
      <div className="absolute right-1.5 top-1.5">
        <div className="w-1.5 h-1.5 bg-green-400 rounded-full relative">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75"></div>
        </div>
      </div>
    </div>
  );
}

















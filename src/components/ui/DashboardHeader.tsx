import React from 'react';
import { useLocation } from 'react-router-dom';
import { User, Music } from 'lucide-react';

interface DashboardHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
}

// Page title mapping for automatic detection
const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'FinTech Entertainment Platform',
    subtitle: 'Welcome back, John! Here\'s your financial overview.'
  },
  '/dashboard/analytics': {
    title: 'Analytics Dashboard',
    subtitle: 'See all your numbers, trends, and insights at a glance.'
  },
  '/dashboard/smart-import-ai': {
    title: 'Smart Import AI Workspace',
    subtitle: 'Upload, scan, and process your financial documents with AI.'
  },
  '/dashboard/settings': {
    title: 'Settings',
    subtitle: 'Manage your account, preferences, and integrations.'
  },
  '/dashboard/ai-financial-assistant': {
    title: 'AI Financial Assistant',
    subtitle: 'Get personalized financial advice and insights from AI.'
  },
  '/dashboard/financial-therapist': {
    title: 'AI Financial Therapist',
    subtitle: 'Emotional and behavioral coaching for financial wellness.'
  },
  '/dashboard/goal-concierge': {
    title: 'AI Goal Concierge',
    subtitle: 'Plan savings, debt payoff, and life milestones with AI.'
  },
  '/dashboard/spending-predictions': {
    title: 'Spending Predictions',
    subtitle: 'See future trends and spending forecasts based on your data.'
  },
  '/dashboard/personal-podcast': {
    title: 'Personal Podcast',
    subtitle: 'AI-generated podcasts about your financial journey.'
  },
  '/dashboard/spotify-integration': {
    title: 'Spotify Integration',
    subtitle: 'Curated playlists for focus, relaxation, and motivation.'
  },
  '/dashboard/wellness-studio': {
    title: 'Financial Wellness Studio',
    subtitle: 'Educational content and guided sessions for financial health.'
  },
  '/dashboard/ai-categorization': {
    title: 'AI Categorization',
    subtitle: 'Automatically categorize transactions and learn from corrections.'
  },
  '/dashboard/business-intelligence': {
    title: 'Business Intelligence',
    subtitle: 'Advanced analytics and insights for business growth.'
  },
  '/dashboard/smart-automation': {
    title: 'Smart Automation',
    subtitle: 'Automate repetitive financial tasks with AI.'
  },
  '/dashboard/tax-assistant': {
    title: 'Tax Assistant',
    subtitle: 'AI-powered tax preparation and optimization.'
  },
  '/dashboard/debt-payoff-planner': {
    title: 'Debt Payoff Planner',
    subtitle: 'Strategic debt elimination strategies and tracking.'
  },
  '/dashboard/bill-reminders': {
    title: 'Bill Reminders',
    subtitle: 'Never miss a payment with smart reminders.'
  },
  '/dashboard/ai-financial-freedom': {
    title: 'AI Financial Freedom',
    subtitle: 'Pathway to financial independence with AI guidance.'
  }
};

export default function DashboardHeader({ customTitle, customSubtitle }: DashboardHeaderProps) {
  const location = useLocation();
  
  // Get page info - use custom props if provided, otherwise auto-detect
  const pageInfo = customTitle && customSubtitle 
    ? { title: customTitle, subtitle: customSubtitle }
    : pageTitles[location.pathname] || {
        title: 'Dashboard',
        subtitle: 'Welcome to your financial dashboard.'
      };

  return (
    <header className="mb-8 p-6 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/2 rounded-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            {pageInfo.title}
          </h1>
          <p className="text-slate-400 text-lg">{pageInfo.subtitle}</p>
        </div>
        <div className="hidden md:flex items-center gap-4">
          {/* Profile and Music Icons */}
          <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
            <User className="w-5 h-5 text-slate-300" />
          </button>
          <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200">
            <Music className="w-5 h-5 text-slate-300" />
          </button>
        </div>
      </div>
    </header>
  );
}

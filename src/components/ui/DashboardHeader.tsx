import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Music, Settings, LogOut, ChevronDown, Bell } from 'lucide-react';

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
  },
  '/dashboard/reports': {
    title: 'Reports',
    subtitle: 'Comprehensive financial reports and analytics.'
  }
};

export default function DashboardHeader({ customTitle, customSubtitle }: DashboardHeaderProps) {
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Sample notifications data
  const notifications = [
    {
      id: 1,
      title: "New transaction categorized",
      message: "Byte processed your bank statement",
      timestamp: "2 minutes ago",
      read: false,
      type: "success"
    },
    {
      id: 2,
      title: "Savings goal reached!",
      message: "Congratulations! You've hit your monthly savings target",
      timestamp: "1 hour ago",
      read: false,
      type: "achievement"
    },
    {
      id: 3,
      title: "Bill reminder",
      message: "Your credit card payment is due in 3 days",
      timestamp: "3 hours ago",
      read: true,
      type: "reminder"
    }
  ];
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get page info - use custom props if provided, otherwise auto-detect
  const pageInfo = customTitle && customSubtitle 
    ? { title: customTitle, subtitle: customSubtitle }
    : pageTitles[location.pathname] || {
        title: 'Dashboard',
        subtitle: 'Welcome to your financial dashboard.'
      };

  return (
    <header className="w-full p-6 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-cyan-500/2">
      {/* Top Row - Page Title and Action Icons */}
      <div className="flex justify-between items-start mb-4">
        {/* Page Title */}
        <div className="flex-1">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent mb-2">
            {pageInfo.title}
          </h1>
        </div>
        
        {/* Action Icons - Desktop Version */}
        <div className="hidden md:flex items-center gap-3 ml-6">
          {/* Spotify Icon */}
          <button className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group">
            <svg 
              className="w-7 h-7 text-slate-300 group-hover:text-green-400 transition-colors duration-200" 
              viewBox="0 0 24 24" 
              fill="currentColor"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-9.54-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 3.6-1.08 7.56-.6 10.68 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.24 12.6c.361.181.54.78.301 1.44zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </button>
          
          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group relative"
            >
              <Bell className="w-7 h-7 text-slate-300 group-hover:text-purple-400 transition-colors duration-200" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
                <div className="p-4 border-b border-purple-500/20">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                  <p className="text-sm text-slate-400">{unreadCount} unread</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`p-4 border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors duration-200 ${
                        !notification.read ? 'bg-purple-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          notification.type === 'success' ? 'bg-green-400' :
                          notification.type === 'achievement' ? 'bg-yellow-400' :
                          'bg-blue-400'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white truncate">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-purple-500/20">
                  <button className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Profile Icon with Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group flex items-center gap-2"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-300 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-200">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Profile</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Account Settings</span>
                  </button>
                  <div className="border-t border-purple-500/20 my-1"></div>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200">
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Subtitle */}
      <div>
        <p className="text-xl text-white/80">
          {pageInfo.subtitle}
        </p>
      </div>
    </header>
  );
}

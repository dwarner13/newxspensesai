/**
 * DashboardHeader Component
 * 
 * Unified two-row header for all dashboard pages:
 * - Row 1: Page title (left) + Search bar (center) + Spotify/Notifications/Profile icons (right)
 * - Row 2: Tab strip for workspace navigation
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Search, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { HeaderAIStatus } from './HeaderAIStatus';
import { CommandPalette } from './CommandPalette';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface DashboardHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
  // Note: statusBadges and secondaryStatusLabel removed - all pages now use HeaderAIStatus in tabs row
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'FinTech Entertainment Platform', subtitle: 'Welcome back, John! Here\'s your financial overview.' },
  '/dashboard/overview': { title: 'Overview', subtitle: 'Preview shell for your financial overview. Coming soon: AI-powered trend analysis and insights.' },
  '/dashboard/planning': { title: 'Planning', subtitle: 'Plan ahead with AI-powered forecasts, goals, and what-if scenarios.' },
  '/dashboard/analytics': { title: 'Analytics', subtitle: 'Preview shell for comprehensive financial analytics. Coming soon: Interactive charts and AI-powered insights.' },
  '/dashboard/business': { title: 'Business', subtitle: 'Business and tax AI workspace for professional financial management.' },
  '/dashboard/entertainment': { title: 'Entertainment', subtitle: 'Wellness, entertainment, and financial "fun" tools to make money management enjoyable.' },
  '/dashboard/reports': { title: 'Reports', subtitle: 'Preview shell for financial reports. Coming soon: Custom report generation and export functionality.' },
  '/dashboard/transactions': { title: 'Transactions', subtitle: 'View and manage your financial transactions.' },
  '/dashboard/ai-financial-assistant': { title: 'AI Financial Assistant', subtitle: 'Get personalized financial advice from AI.' },
  '/dashboard/smart-import-ai': { title: 'Smart Import AI', subtitle: 'Automatically import and categorize your financial data.' },
  '/dashboard/prime-chat': { title: 'Prime Chat', subtitle: 'Chat directly with Prime, your AI CEO.' },
  '/dashboard/ai-chat-assistant': { title: 'AI Chat Assistant', subtitle: 'Chat with your AI financial assistant.' },
  '/dashboard/team-room': { title: 'Team Room', subtitle: 'Collaborate with your AI financial team.' },
  '/dashboard/ai-categorization': { title: 'AI Categorization', subtitle: 'Smart categorization of your transactions.' },
  '/dashboard/goal-concierge': { title: 'AI Goal Concierge', subtitle: 'Set and track your financial goals.' },
  '/dashboard/smart-automation': { title: 'Smart Automation', subtitle: 'Automate your financial workflows.' },
  '/dashboard/spending-predictions': { title: 'Spending Predictions', subtitle: 'Predict and analyze your spending patterns.' },
  '/dashboard/debt-payoff-planner': { title: 'Debt Payoff Planner', subtitle: 'Plan and track your debt payoff strategy.' },
  '/dashboard/ai-financial-freedom': { title: 'AI Financial Freedom', subtitle: 'Achieve financial independence with AI guidance.' },
  '/dashboard/bill-reminders': { title: 'Bill Reminder System', subtitle: 'Never miss a payment with smart reminders.' },
  '/dashboard/podcast': { title: 'Personal Podcast', subtitle: 'Your personalized financial podcast.' },
  '/dashboard/financial-story': { title: 'Financial Story', subtitle: 'Your financial journey visualized.' },
  '/dashboard/financial-therapist': { title: 'AI Financial Therapist', subtitle: 'Get emotional support for financial decisions.' },
  '/dashboard/wellness-studio': { title: 'Wellness Studio', subtitle: 'Mindful money management and wellness.' },
  '/dashboard/spotify': { title: 'Spotify Integration', subtitle: 'Connect your music and financial wellness.' },
  '/dashboard/spotify-integration': { title: 'Spotify Integration', subtitle: 'Connect your music and financial wellness.' },
  '/dashboard/tax-assistant': { title: 'Tax Assistant', subtitle: 'AI-powered tax preparation and planning.' },
  '/dashboard/business-intelligence': { title: 'Business Intelligence', subtitle: 'Advanced analytics for your business.' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Customize your dashboard preferences.' },
};

// Tab configuration for workspace navigation
const tabs = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    match: (path: string) => path === '/dashboard',
    navigate: '/dashboard'
  },
  { 
    id: 'overview', 
    label: 'Overview', 
    match: (path: string) => path.startsWith('/dashboard/overview'),
    navigate: '/dashboard/overview'
  },
  { 
    id: 'planning', 
    label: 'Planning', 
    match: (path: string) => 
      path.startsWith('/dashboard/planning') ||
      path.startsWith('/dashboard/transactions') ||
      path.startsWith('/dashboard/bank-accounts') ||
      path.startsWith('/dashboard/goal-concierge') ||
      path.startsWith('/dashboard/smart-automation') ||
      path.startsWith('/dashboard/spending-predictions') ||
      path.startsWith('/dashboard/debt-payoff-planner') ||
      path.startsWith('/dashboard/ai-financial-freedom') ||
      path.startsWith('/dashboard/bill-reminders'),
    navigate: '/dashboard/planning'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    match: (path: string) => path.startsWith('/dashboard/analytics'),
    navigate: '/dashboard/analytics'
  },
  { 
    id: 'business', 
    label: 'Business', 
    match: (path: string) => 
      path.startsWith('/dashboard/business') ||
      path.startsWith('/dashboard/tax-assistant') ||
      path.startsWith('/dashboard/business-intelligence'),
    navigate: '/dashboard/business'
  },
  { 
    id: 'entertainment', 
    label: 'Entertainment', 
    match: (path: string) => 
      path.startsWith('/dashboard/entertainment') ||
      path.startsWith('/dashboard/personal-podcast') ||
      path.startsWith('/dashboard/financial-story') ||
      path.startsWith('/dashboard/financial-therapist') ||
      path.startsWith('/dashboard/wellness-studio') ||
      path.startsWith('/dashboard/spotify') ||
      path.startsWith('/dashboard/spotify-integration'),
    navigate: '/dashboard/entertainment'
  },
  { 
    id: 'reports', 
    label: 'Reports', 
    match: (path: string) => path.startsWith('/dashboard/reports'),
    navigate: '/dashboard/reports'
  },
] as const;

export default function DashboardHeader({ customTitle, customSubtitle }: DashboardHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [unreadCount] = useState(4);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get page info based on current route
  const pageInfo = useMemo(() => {
    if (customTitle && customSubtitle) {
      return { title: customTitle, subtitle: customSubtitle };
    }
    
    const match = Object.keys(pageTitles)
      .sort((a, b) => b.length - a.length)
      .find(p => location.pathname.startsWith(p));
    return match
      ? pageTitles[match]
      : { title: 'FinTech Entertainment Platform', subtitle: 'Welcome back, John! Here\'s your financial overview.' };
  }, [customTitle, customSubtitle, location.pathname]);

  // Determine active tab
  const activeTabId = useMemo(() => {
    const activeTab = tabs.find(tab => tab.match(location.pathname));
    return activeTab?.id || 'dashboard';
  }, [location.pathname]);

  // Handle tab click
  const handleTabClick = (tab: typeof tabs[number]) => {
    if (tab.navigate && location.pathname !== tab.navigate) {
      navigate(tab.navigate);
    }
  };

  // Keyboard shortcut handler (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      const isModifierPressed = e.ctrlKey || e.metaKey;
      const isKKey = e.key === 'k' || e.key === 'K';
      
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isModifierPressed && isKKey && !isInputFocused) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header 
      id="dashboard-header" 
      className={cn(
        "w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur sticky top-0 z-30"
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-4 flex flex-col gap-4 pr-24 md:pr-28 min-w-0">
        {/* Row 1: Title + subtitle + search + utilities */}
        <div className="flex items-center gap-4 min-w-0 w-full">
          {/* Left: title + subtitle */}
          <div className="flex items-start gap-3 min-w-0 shrink-0">
            <div className="flex flex-col min-w-0 shrink-0 max-w-xl">
              <h1 className="text-xl font-semibold text-white truncate">
                {pageInfo.title}
              </h1>
              {pageInfo.subtitle && (
                <p className="text-sm text-slate-400 truncate">
                  {pageInfo.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Center: search - takes remaining space */}
          <div className="hidden md:flex min-w-0 flex-1">
            <div className="w-full min-w-0 max-w-[260px] flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 mr-3">
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  // TODO: Wire global search functionality - connect to search API/endpoint
                  setSearchQuery(e.target.value);
                }}
                className="bg-transparent outline-none text-sm text-slate-100 placeholder:text-slate-500 flex-1 min-w-0 w-full"
              />
            </div>
          </div>

          {/* Right: icons */}
          <div className="flex items-center gap-3 flex-none">
            {/* Command Palette Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-100 hover:bg-slate-800/80 hover:border-slate-700 transition group"
                    aria-label="Command Palette"
                    onClick={() => setIsCommandPaletteOpen(true)}
                  >
                    <Command className="w-4 h-4 text-slate-300 group-hover:text-purple-400 transition-colors duration-200" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-slate-900 text-slate-100 border-slate-800">
                  Command (Ctrl+K)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Spotify Icon */}
            <button 
              className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-100 hover:bg-slate-800/80 hover:border-slate-700 transition group"
              aria-label="Spotify Integration"
              onClick={() => navigate('/dashboard/spotify-integration')}
            >
            <svg 
              className="w-4 h-4 text-slate-300 group-hover:text-green-400 transition-colors duration-200" 
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
              className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-100 hover:bg-slate-800/80 hover:border-slate-700 transition relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium border-2 border-[#050816]">
                  {unreadCount}
                </span>
              )}
            </button>
              
            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-[#0b1220]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">AI Team Activity</h3>
                    <span className="text-xs text-slate-400">{unreadCount} active</span>
                  </div>
                  
                  {/* AI Workers Status */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white text-sm">🤖</div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">Byte</p>
                        <p className="text-xs text-slate-400">Document Processing Wizard</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">● Active</div>
                        <div className="text-xs text-slate-400">Processing</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 cursor-pointer transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-sm">💎</div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">Crystal</p>
                        <p className="text-xs text-slate-400">Data Analysis Expert</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">● Active</div>
                        <div className="text-xs text-slate-400">Analyzing</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 cursor-pointer transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white text-sm">🏷️</div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">Tag</p>
                        <p className="text-xs text-slate-400">Smart Categorization</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">● Active</div>
                        <div className="text-xs text-slate-400">Categorizing</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 cursor-pointer transition-colors">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center text-white text-sm">👑</div>
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">Prime</p>
                        <p className="text-xs text-slate-400">Team Coordinator</p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-green-400">● Active</div>
                        <div className="text-xs text-slate-400">Coordinating</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="border-t border-purple-500/20 pt-3">
                    <button 
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        window.dispatchEvent(new CustomEvent('openWatchMeWork', { 
                          detail: { feature: 'AI Team Overview' } 
                        }));
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
                    >
                      <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-xs">👁️</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm text-white font-medium">Watch Me Work</p>
                        <p className="text-xs text-slate-400">See AI team in action</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Icon with Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="h-10 w-10 rounded-full border border-slate-800 bg-slate-900/80 flex items-center justify-center text-slate-100 hover:bg-slate-800/80 hover:border-slate-700 transition group"
              aria-label="Profile menu"
            >
              <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-purple-500/20 mb-2">
                    <div className="text-sm font-medium text-white">John Doe</div>
                    <div className="text-xs text-slate-400">Premium Plan</div>
                  </div>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
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

        {/* Row 2: Tabs + AI Active indicator */}
        <div className="flex items-center gap-4 min-w-0 w-full pr-[96px]">
          {/* Left: main tabs - scrollable container */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    disabled={!tab.navigate}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-slate-200 whitespace-nowrap transition",
                      "flex-none",
                      isActive && "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/30",
                      !isActive && "hover:bg-slate-900/80",
                      !tab.navigate && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Right: AI Active indicator */}
          <div className="flex items-center gap-2 flex-none">
            <HeaderAIStatus />
          </div>
        </div>
      </div>

      {/* Command Palette Modal */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
      />
    </header>
  );
}

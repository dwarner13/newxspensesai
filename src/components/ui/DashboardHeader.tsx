/**
 * DashboardHeader Component
 * 
 * Unified two-row header for all dashboard pages:
 * - Row 1: Page title (left) + Spotify/Notifications/Profile icons + AI Active (right)
 * - Row 2: Tab strip for workspace navigation
 * 
 * NOTE: Search bar temporarily removed - can be re-enabled via ENABLE_HEADER_SEARCH flag below
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Bell, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CommandPalette } from './CommandPalette';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { GuestModeBadge } from './GuestModeBadge';
import { useControlCenterDrawer } from '../settings/ControlCenterDrawer';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';

interface DashboardHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
  // Note: statusBadges and secondaryStatusLabel removed - all pages now use HeaderAIStatus in tabs row
}

// Route-based fallback title helper - ALWAYS returns a valid title/subtitle
function getFallbackTitle(pathname: string): { title: string; subtitle: string } {
  // Exact route matches first
  if (pathname === '/dashboard') {
    return { 
      title: 'FinTech Entertainment Platform', 
      subtitle: 'Welcome back! Here\'s your financial overview.' 
    };
  }
  if (pathname.startsWith('/dashboard/smart-import-ai')) {
    return { 
      title: 'Smart Import AI', 
      subtitle: 'Automatically import and categorize your financial data.' 
    };
  }
  if (pathname.startsWith('/dashboard/settings')) {
    return { 
      title: 'Settings', 
      subtitle: 'Manage your account and XspensesAI experience.' 
    };
  }
  if (pathname.startsWith('/dashboard/prime-chat')) {
    return { 
      title: 'Prime Chat', 
      subtitle: 'Talk to Prime and your AI employee team.' 
    };
  }
  
  // Default fallback
  return { 
    title: 'XspensesAI Dashboard', 
    subtitle: 'Your financial command center.' 
  };
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'FinTech Entertainment Platform', subtitle: 'Welcome back! Here\'s your financial overview.' },
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
  '/dashboard/bill-reminders': { title: 'Chime — Bill Reminders', subtitle: 'Never miss a bill again — Chime keeps you on time and in control.' },
  '/dashboard/podcast': { title: 'Personal Podcast', subtitle: 'Your personalized financial podcast.' },
  '/dashboard/financial-story': { title: 'The Roundtable — Financial Story', subtitle: 'Turn your financial journey into a story — milestones, insights, and weekly highlights.' },
  '/dashboard/financial-therapist': { title: 'Serenity — Financial Therapist', subtitle: 'Emotional support for money decisions — reduce stress and build healthier habits.' },
  '/dashboard/wellness-studio': { title: 'Harmony — Wellness Studio', subtitle: 'Mindful money practices to balance your financial health and reduce stress.' },
  '/dashboard/spotify': { title: 'Wave — Spotify Integration', subtitle: 'Connect your music to your workflow — playlists, focus, and motivation.' },
  '/dashboard/spotify-integration': { title: 'Wave — Spotify Integration', subtitle: 'Connect your music to your workflow — playlists, focus, and motivation.' },
  '/dashboard/tax-assistant': { title: 'Ledger — Tax Assistant', subtitle: 'Maximize deductions and minimize tax stress — guidance and organization.' },
  '/dashboard/business-intelligence': { title: 'Business Intelligence', subtitle: 'Advanced analytics for your business.' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Manage your account and XspensesAI experience.' },
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
  const { openDrawer } = useControlCenterDrawer();
  const { user } = useAuth();
  const { profile, displayName, avatarUrl } = useProfileContext();
  
  // Compute display name with fallbacks: display_name → first_name → full_name → email prefix → "Account"
  const computedDisplayName = useMemo(() => {
    if (profile?.display_name) return profile.display_name;
    if (profile?.first_name) return profile.first_name;
    if (profile?.full_name) return profile.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'Account';
  }, [profile, user]);
  
  // Get avatar initials for fallback
  const avatarInitials = useMemo(() => {
    if (avatarUrl) return null; // Has avatar, no initials needed
    const name = computedDisplayName || 'A';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [avatarUrl, computedDisplayName]);
  // Feature flag: Set to true to re-enable search bar
  const ENABLE_HEADER_SEARCH = false;
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

  // Get page info based on current route - ALWAYS returns valid title/subtitle
  const pageInfo = useMemo(() => {
    // Custom props take precedence
    if (customTitle) {
      return { 
        title: customTitle, 
        subtitle: customSubtitle || getFallbackTitle(location.pathname).subtitle 
      };
    }
    
    // Find matching route in pageTitles (longest match first)
    const match = Object.keys(pageTitles)
      .sort((a, b) => b.length - a.length)
      .find(p => location.pathname.startsWith(p));
    
    // Return matched route title or use fallback helper
    if (match && pageTitles[match]) {
      return pageTitles[match];
    }
    
    // Use route-based fallback helper - ALWAYS returns valid title/subtitle
    return getFallbackTitle(location.pathname);
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
      {/* DEV MARKER: Confirm this is the active header */}
      <div data-header-marker="ACTIVE_HEADER" className="hidden">ACTIVE_HEADER</div>
      
      <div className="w-full px-4 md:px-6 md:pr-10 py-4 flex flex-col gap-3">
        {/* Row 1: Title + subtitle + utilities */}
        {/* Locked grid: Mobile [Title(minmax(280px,1fr)) Icons(auto)], Desktop [Title(minmax(280px,1fr)) Search(minmax(360px,560px)) Icons(auto)] */}
        {/* CRITICAL: Title has guaranteed 280px minimum, search is right-aligned and capped, icons pinned far right */}
        <div className="grid grid-cols-[minmax(280px,1fr)_auto] md:grid-cols-[minmax(280px,1fr)_minmax(360px,560px)_auto] items-center gap-4">
          {/* Column 1: Title + subtitle - ALWAYS VISIBLE, NEVER HIDDEN */}
          {/* min-w-0 (NOT w-0) allows truncation but prevents collapse to zero */}
          <div data-header-left="true" className="min-w-0 flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold text-slate-50 truncate" title={pageInfo.title}>
              {pageInfo.title}
            </h1>
            <p className="text-sm text-slate-400 truncate" title={pageInfo.subtitle || ''}>
              {pageInfo.subtitle || 'Your financial command center.'}
            </p>
          </div>

          {/* Column 2: Search Bar - Right-aligned, capped width, does not expand left */}
          <div className="hidden md:flex justify-self-end w-full max-w-[560px]">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search transactions, employees, pages..."
                className="w-full h-11 pl-11 pr-4 rounded-full border border-white/20 bg-white/8 shadow-lg backdrop-blur-xl text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
                onFocus={() => setIsCommandPaletteOpen(true)}
              />
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Column 3: Glass Utility Pill - Icons + AI Active grouped */}
          {/* Auto column width, pinned to far right with justify-self-end */}
          <div className="justify-self-end relative z-[60]">
            {/* Glass Utility Pill Container */}
            <div
              className="
                inline-flex items-center gap-4
                rounded-2xl border border-white/10
                bg-white/5 backdrop-blur-xl
                px-3 py-2
                shadow-[0_10px_40px_rgba(0,0,0,0.35)]
                md:translate-x-[-12px]
              "
            >
              {/* AI Active chip - hidden on mobile */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 hover:bg-black/30 transition"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                AI Active
              </button>

              {/* Command Palette Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="h-10 w-10 rounded-full border border-white/10 bg-white/6 hover:bg-white/10 transition active:scale-[0.98] flex items-center justify-center text-white/80 hover:text-white"
                      aria-label="Command Palette"
                      onClick={() => setIsCommandPaletteOpen(true)}
                    >
                      <Command className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-slate-900 text-slate-100 border-slate-800">
                    Command (Ctrl+K)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Spotify Icon */}
              <button 
                className="h-10 w-10 rounded-full border border-white/10 bg-white/6 hover:bg-white/10 transition active:scale-[0.98] flex items-center justify-center text-white/80 hover:text-white"
                aria-label="Spotify Integration"
                onClick={() => navigate('/dashboard/spotify-integration')}
              >
                <svg 
                  className="w-4 h-4" 
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
                  className="h-10 w-10 rounded-full border border-white/10 bg-white/6 hover:bg-white/10 transition active:scale-[0.98] flex items-center justify-center text-white/80 hover:text-white relative"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-rose-500 text-[11px] leading-5 font-semibold text-white flex items-center justify-center">
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

              {/* Profile Icon - Opens Control Center Drawer */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => {
                    setIsProfileOpen(false);
                    openDrawer('profile');
                  }}
                  className="h-10 w-10 rounded-full border border-white/10 bg-white/6 hover:bg-white/10 transition active:scale-[0.98] flex items-center justify-center text-white/80 hover:text-white overflow-hidden"
                  aria-label={`Profile menu - ${computedDisplayName}`}
                  title={computedDisplayName}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={computedDisplayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {avatarInitials}
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Tabs + Status pills (Guest Mode + AI Active + 24/7) */}
        {/* Flex-wrap ensures status pills wrap below tabs on narrow screens instead of overlapping */}
        <div className="flex items-center justify-between gap-4 min-w-0 w-full flex-wrap">
          {/* Left: main tabs - scrollable container */}
          <div className="min-w-0 flex-1 overflow-hidden shrink-0">
            <div 
              className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar"
              style={{
                scrollbarWidth: 'none' as const,
                msOverflowStyle: 'none' as const,
                WebkitOverflowScrolling: 'touch' as const
              }}
            >
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
          
          {/* Right: Status pills (Guest Mode only) - AI Active moved to Row 1 icons column */}
          {/* No padding-right needed: floating rail is fixed to viewport right, header aligns with content padding */}
          <div className="flex items-center gap-3 flex-none shrink-0 justify-end relative z-[60]">
            <GuestModeBadge />
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

import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Bell } from 'lucide-react';

interface DashboardHeaderProps {
  customTitle?: string;
  customSubtitle?: string;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'FinTech Entertainment Platform', subtitle: 'Welcome back, John! Here\'s your financial overview.' },
  '/dashboard/transactions': { title: 'Transactions', subtitle: 'View and manage your financial transactions.' },
  '/dashboard/ai-financial-assistant': { title: 'AI Financial Assistant', subtitle: 'Get personalized financial advice from AI.' },
  '/dashboard/smart-import-ai': { title: 'Smart Import AI', subtitle: 'Automatically import and categorize your financial data.' },
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
  '/dashboard/analytics': { title: 'Analytics', subtitle: 'Comprehensive financial analytics and insights.' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Customize your dashboard preferences.' },
  '/dashboard/reports': { title: 'Reports', subtitle: 'Generate detailed financial reports.' },
};

export default function DashboardHeader({ customTitle, customSubtitle }: DashboardHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadCount] = useState(3);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

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

  return (
    <header id="dashboard-header" className="fixed top-0 left-64 right-0 bg-[#0f172a] z-40 border-b border-white/10">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-1">
        <div className="flex items-center justify-between">
          {/* Title on the left - Hidden for main dashboard to avoid duplication */}
          {location.pathname !== '/dashboard' && (
            <div className="flex-1">
              <h1
                className="font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-[#ff4db2] via-[#c084fc] to-[#38bdf8] text-left"
                style={{ fontSize: "48px", lineHeight: 1.1, letterSpacing: "-0.02em" }}
              >
                {pageInfo.title}
              </h1>
              <p className="mt-0.5 text-slate-300/90 text-[17px] text-left">
                {pageInfo.subtitle}
              </p>
            </div>
          )}
          
          {/* Icons on the right */}
          <div className="flex items-center gap-3 ml-6">
        {/* Spotify Icon */}
        <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group">
          <svg 
            className="w-5 h-5 text-slate-300 group-hover:text-green-400 transition-colors duration-200" 
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
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group relative"
          >
            <Bell className="w-5 h-5 text-slate-300 group-hover:text-purple-400 transition-colors duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#0f172a]/95 backdrop-blur-md border border-purple-500/20 rounded-xl shadow-2xl z-50">
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
                      // This will be handled by the parent component
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
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-all duration-200 group flex items-center gap-1.5"
          >
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <ChevronDown className={`w-2.5 h-2.5 text-slate-300 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
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
      </div>
    </header>
  );
}
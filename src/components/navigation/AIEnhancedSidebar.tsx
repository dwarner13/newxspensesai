import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Upload, 
  Brain, 
  Heart, 
  Target, 
  TrendingUp, 
  Mic, 
  Music, 
  Briefcase, 
  Calculator, 
  Zap, 
  FileText, 
  Settings, 
  User, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bot,
  Bell,
  CreditCard,
  Award,
  Building2,
  Headphones,
  Banknote,
  Star,
  Sparkles,
  Crown,
  BookOpen,
  Users,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import Logo from '../common/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from "../../contexts/UserContext";
import { EMPLOYEES } from '../../data/aiEmployees';

// AI Employee Status Component
const AIEmployeeStatus = ({ employeeKey, isActive }: { employeeKey: string, isActive: boolean }) => {
  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);
  
  if (!employee) return null;

  return (
    <div className="ai-employee-status">
      <div className="flex items-center gap-2">
        <div className="ai-avatar text-lg">{employee.emoji}</div>
        <div className="ai-info">
          <div className="ai-name text-xs font-medium text-white/80">{employee.name}</div>
          <div className="ai-status flex items-center gap-1">
            <div className={`status-dot w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-white/60">{isActive ? 'Active' : 'Standby'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Activity Indicator Component
const AIActivityIndicator = ({ isProcessing }: { isProcessing: boolean }) => {
  if (!isProcessing) return null;

  return (
    <motion.div 
      className="ai-activity-indicator"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <div className="flex items-center gap-2 px-2 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <span className="text-xs text-blue-400 font-medium">AI Processing...</span>
      </div>
    </motion.div>
  );
};

// Enhanced NavLink Component
const AINavLink = ({ 
  to, 
  icon, 
  children, 
  employeeKey, 
  isActive, 
  onClick,
  shouldShowLabels 
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  employeeKey: string;
  isActive: boolean;
  onClick: () => void;
  shouldShowLabels: boolean;
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const employee = EMPLOYEES.find(emp => emp.key === employeeKey);

  // Simulate AI processing when clicking
  const handleClick = () => {
    setIsProcessing(true);
    onClick();
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <li>
      <NavLink 
        to={to} 
        className={({ isActive: navActive }) => 
          `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 group ${
            navActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
          }`
        }
        style={{ minHeight: '48px' }}
        onClick={handleClick}
      >
        <div className="flex-shrink-0 relative">
          {icon}
          {/* AI Employee Badge */}
          {employee && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs">
              {employee.emoji}
            </div>
          )}
        </div>
        
        {shouldShowLabels && (
          <div className="flex-1 flex flex-col">
            <span className="font-medium text-white/90">{children}</span>
            {employee && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white/60">{employee.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
              </div>
            )}
          </div>
        )}

        {/* AI Activity Indicator */}
        <AIActivityIndicator isProcessing={isProcessing} />
      </NavLink>
    </li>
  );
};

export default function AIEnhancedSidebar({ 
  isMobileOpen, 
  setIsMobileOpen, 
  isCollapsed, 
  setIsCollapsed 
}: { 
  isMobileOpen: boolean; 
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [shouldShowLabels, setShouldShowLabels] = useState(true);
  const [aiSystemStatus, setAiSystemStatus] = useState({
    totalEmployees: EMPLOYEES.length,
    activeEmployees: EMPLOYEES.length,
    systemHealth: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor'
  });
  
  // Use external collapsed state if provided, otherwise use internal
  const collapsedState = isCollapsed !== undefined ? isCollapsed : internalCollapsed;
  const setCollapsedState = setIsCollapsed || setInternalCollapsed;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const user = useUser();

  // CORRECT LOGIC: Only show sidebar on dashboard routes
  if (!location.pathname.startsWith('/dashboard')) {
    return null;
  }

  // Ensure shouldShowLabels is properly set based on collapsed state
  useEffect(() => {
    setShouldShowLabels(!collapsedState || isMobileOpen);
  }, [collapsedState, isMobileOpen]);

  const toggleSidebar = () => {
    const newCollapsedState = !collapsedState;
    setCollapsedState(newCollapsedState);
    setShouldShowLabels(!newCollapsedState);
  };

  return (
    <aside className={`${isMobileOpen ? 'h-full w-full' : 'h-full'} flex flex-col bg-[rgba(15,23,42,0.95)] border-r border-purple-500/20 mobile-sidebar-menu`} ref={sidebarRef}>
      {/* Header with Logo and Toggle Button */}
      <div className="sticky top-0 border-b border-white/10 backdrop-blur-md bg-[rgba(15,23,42,0.95)] p-4">
        <div className="flex items-center justify-between">
          {isMobileOpen ? (
            // Mobile state - Logo with text (no toggle button)
            <div className="flex items-center gap-4 flex-1">
              <Logo size="lg" showText={false} />
              <div>
                <span className="font-black text-2xl leading-tight tracking-tight text-white">XspensesAI</span>
              </div>
            </div>
          ) : shouldShowLabels ? (
            // Expanded state - Logo with text and toggle button
            <div className="flex items-center gap-4 flex-1">
              <Logo size="lg" showText={false} />
              <div>
                <span className="font-black text-2xl leading-tight tracking-tight text-white">XspensesAI</span>
              </div>
            </div>
          ) : (
            // Collapsed state - Same crown as logo
            <div className="flex items-center justify-center flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Crown size={28} className="text-white font-bold" />
              </div>
            </div>
          )}
          
          {/* Toggle Button - Always visible */}
          {!isMobileOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {collapsedState ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>

        {/* AI System Status */}
        {shouldShowLabels && (
          <div className="mt-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">AI System</span>
              </div>
              <span className="text-xs text-green-400 font-bold">{aiSystemStatus.activeEmployees}/{aiSystemStatus.totalEmployees}</span>
            </div>
            <div className="text-xs text-white/60 mt-1">All AI employees active</div>
          </div>
        )}
      </div>

      {/* Navigation with Independent Scrolling */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <nav className="px-4 py-4 overflow-y-auto flex-1 sidebar-nav-scroll" style={{ maxHeight: 'calc(100vh - 200px)' }} onWheel={(e) => e.stopPropagation()}>
          
          {/* Main Dashboard */}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard" 
              icon={<BarChart3 size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="prime"
              isActive={location.pathname === '/dashboard'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Main Dashboard
            </AINavLink>
          </ul>

          {/* CORE AI TOOLS */}
          {shouldShowLabels && (
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              AI Workspace
            </div>
          )}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard/smart-import-ai" 
              icon={<Upload size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="byte"
              isActive={location.pathname === '/dashboard/smart-import-ai'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Smart Import AI
            </AINavLink>
            <AINavLink 
              to="/dashboard/ai-financial-assistant" 
              icon={<Bot size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="finley"
              isActive={location.pathname === '/dashboard/ai-financial-assistant'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              AI Chat Assistant
            </AINavLink>
            <AINavLink 
              to="/dashboard/team-room" 
              icon={<Users size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="prime"
              isActive={location.pathname === '/dashboard/team-room'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Team Room
            </AINavLink>
            <AINavLink 
              to="/dashboard/ai-categorization" 
              icon={<Brain size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="tag"
              isActive={location.pathname === '/dashboard/ai-categorization'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Smart Categories
            </AINavLink>
          </ul>

          {/* PLANNING & ANALYSIS */}
          {shouldShowLabels && (
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              Planning & Analysis
            </div>
          )}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard/transactions" 
              icon={<FileText size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="byte"
              isActive={location.pathname === '/dashboard/transactions'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Transactions
            </AINavLink>
            <AINavLink 
              to="/dashboard/goal-concierge" 
              icon={<Target size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="goalie"
              isActive={location.pathname === '/dashboard/goal-concierge'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              AI Goal Concierge
            </AINavLink>
            <AINavLink 
              to="/dashboard/smart-automation" 
              icon={<Zap size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="automa"
              isActive={location.pathname === '/dashboard/smart-automation'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Smart Automation
            </AINavLink>
            <AINavLink 
              to="/dashboard/spending-predictions" 
              icon={<TrendingUp size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="crystal"
              isActive={location.pathname === '/dashboard/spending-predictions'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Spending Predictions
            </AINavLink>
            <AINavLink 
              to="/dashboard/debt-payoff-planner" 
              icon={<CreditCard size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="liberty"
              isActive={location.pathname === '/dashboard/debt-payoff-planner'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Debt Payoff Planner
            </AINavLink>
            <AINavLink 
              to="/dashboard/ai-financial-freedom" 
              icon={<Award size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="liberty"
              isActive={location.pathname === '/dashboard/ai-financial-freedom'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              AI Financial Freedom
            </AINavLink>
            <AINavLink 
              to="/dashboard/bill-reminders" 
              icon={<Bell size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="chime"
              isActive={location.pathname === '/dashboard/bill-reminders'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Bill Reminder System
            </AINavLink>
          </ul>

          {/* ENTERTAINMENT & WELLNESS */}
          {shouldShowLabels && (
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              Entertainment & Wellness
            </div>
          )}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard/podcast" 
              icon={<Mic size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="roundtable"
              isActive={location.pathname === '/dashboard/podcast'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Personal Podcast
            </AINavLink>
            <AINavLink 
              to="/dashboard/financial-story" 
              icon={<BookOpen size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="roundtable"
              isActive={location.pathname === '/dashboard/financial-story'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Financial Story
            </AINavLink>
            <AINavLink 
              to="/dashboard/financial-therapist" 
              icon={<Heart size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="harmony"
              isActive={location.pathname === '/dashboard/financial-therapist'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              AI Financial Therapist
            </AINavLink>
            <AINavLink 
              to="/dashboard/wellness-studio" 
              icon={<Heart size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="harmony"
              isActive={location.pathname === '/dashboard/wellness-studio'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Wellness Studio
            </AINavLink>
            <AINavLink 
              to="/dashboard/spotify-integration" 
              icon={<Music size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="wave"
              isActive={location.pathname === '/dashboard/spotify-integration'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Spotify Integration
            </AINavLink>
          </ul>

          {/* BUSINESS & TAX */}
          {shouldShowLabels && (
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              Business & Tax
            </div>
          )}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard/tax-assistant" 
              icon={<Calculator size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="ledger"
              isActive={location.pathname === '/dashboard/tax-assistant'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Tax Assistant
            </AINavLink>
            <AINavLink 
              to="/dashboard/business-intelligence" 
              icon={<Building2 size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="intelia"
              isActive={location.pathname === '/dashboard/business-intelligence'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Business Intelligence
            </AINavLink>
          </ul>

          {/* TOOLS & SETTINGS */}
          {shouldShowLabels && (
            <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
              Tools & Settings
            </div>
          )}
          <ul className="space-y-1 mb-4">
            <AINavLink 
              to="/dashboard/analytics" 
              icon={<BarChart3 size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="dash"
              isActive={location.pathname === '/dashboard/analytics'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Analytics
            </AINavLink>
            <AINavLink 
              to="/dashboard/settings" 
              icon={<Settings size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="prime"
              isActive={location.pathname === '/dashboard/settings'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Settings
            </AINavLink>
            <AINavLink 
              to="/dashboard/reports" 
              icon={<FileText size={20} className="flex-shrink-0 text-white/90" />}
              employeeKey="prism"
              isActive={location.pathname === '/dashboard/reports'}
              onClick={() => isMobileOpen && setIsMobileOpen(false)}
              shouldShowLabels={shouldShowLabels}
            >
              Reports
            </AINavLink>
          </ul>
        </nav>

        {/* Premium User Badge at the very bottom */}
        <div className="border-t border-white/10 px-4 py-4 mt-auto w-full box-border bg-[rgba(15,23,42,0.95)]">
          {shouldShowLabels && (
            <div className="p-4 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl border border-purple-500/30 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white text-sm">{user?.name || 'John Doe'}</div>
                  <div className="text-xs text-white/80">{user?.plan || 'Premium Plan'}</div>
                </div>
              </div>
              <div className="bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                Level 8 Money Master
              </div>
            </div>
          )}
          {!shouldShowLabels && (
            <div className="flex justify-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}




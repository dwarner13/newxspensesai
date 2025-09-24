import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  X,
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
  Bot,
  Bell,
  CreditCard,
  Award,
  Building2,
  BookOpen,
  Users,
  Crown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { EMPLOYEES } from '../../data/aiEmployees';

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

// Map routes to AI employees
const getAIEmployeeForRoute = (route: string) => {
  const routeToEmployee: Record<string, string> = {
    '/dashboard': 'prime',
    '/dashboard/smart-import-ai': 'byte',
    '/dashboard/ai-financial-assistant': 'finley',
    '/dashboard/smart-categories': 'tag',
    '/dashboard/transactions': 'byte',
    '/dashboard/goal-concierge': 'goalie',
    '/dashboard/smart-automation': 'automa',
    '/dashboard/spending-predictions': 'crystal',
    '/dashboard/debt-payoff-planner': 'liberty',
    '/dashboard/ai-financial-freedom': 'liberty',
    '/dashboard/bill-reminders': 'chime',
    '/dashboard/podcast': 'roundtable',
    '/dashboard/financial-story': 'roundtable',
    '/dashboard/financial-therapist': 'harmony',
    '/dashboard/wellness-studio': 'harmony',
    '/dashboard/spotify-integration': 'wave',
    '/dashboard/tax-assistant': 'ledger',
    '/dashboard/business-intelligence': 'intelia',
    '/dashboard/analytics': 'dash',
    '/dashboard/settings': 'prime',
    '/dashboard/reports': 'prism'
  };
  
  return routeToEmployee[route] || 'prime';
};

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const location = useLocation();

  if (!open) return null;

  return (
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ 
        type: 'spring', 
        damping: 30, 
        stiffness: 300,
        mass: 0.6,
        duration: 0.3
      }}
      className="fixed left-0 top-0 h-full w-80 bg-[rgba(15,23,42,0.95)] border-r border-purple-500/20 flex flex-col z-50 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
            <Crown size={20} className="text-white font-bold" />
          </div>
          <span className="font-black text-xl text-white">XspensesAI</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
        >
          <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-2">
        {/* Main Dashboard */}
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <BarChart3 size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Main Dashboard</span>
            </NavLink>
          </li>
        </ul>

        {/* AI WORKSPACE */}
        <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
          AI Workspace
        </div>
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard/smart-import-ai" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Upload size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Smart Import AI</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/ai-financial-assistant" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Bot size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">AI Chat Assistant</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/team-room" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Users size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Team Room</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/ai-categorization" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Brain size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Smart Categories</span>
            </NavLink>
          </li>
        </ul>

        {/* PLANNING & ANALYSIS */}
        <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
          Planning & Analysis
        </div>
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard/transactions" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <FileText size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Transactions</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/goal-concierge" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Target size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">AI Goal Concierge</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/smart-automation" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Zap size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Smart Automation</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/spending-predictions" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <TrendingUp size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Spending Predictions</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/debt-payoff-planner" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <CreditCard size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Debt Payoff Planner</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/ai-financial-freedom" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Award size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">AI Financial Freedom</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/bill-reminders" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Bell size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Bill Reminder System</span>
            </NavLink>
          </li>
        </ul>

        {/* ENTERTAINMENT & WELLNESS */}
        <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
          Entertainment & Wellness
        </div>
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard/podcast" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Mic size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Personal Podcast</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/financial-story" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <BookOpen size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Financial Story</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/financial-therapist" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Heart size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">AI Financial Therapist</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/wellness-studio" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Heart size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Wellness Studio</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/spotify-integration" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Music size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Spotify Integration</span>
            </NavLink>
          </li>
        </ul>

        {/* BUSINESS & TAX */}
        <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
          Business & Tax
        </div>
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard/tax-assistant" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Calculator size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Tax Assistant</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/business-intelligence" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Building2 size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Business Intelligence</span>
            </NavLink>
          </li>
        </ul>

        {/* TOOLS & SETTINGS */}
        <div className="text-xs uppercase tracking-wider text-white/50 mt-4 mb-2 font-bold px-3">
          Tools & Settings
        </div>
        <ul className="space-y-1 mb-4">
          <li>
            <NavLink 
              to="/dashboard/analytics" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <BarChart3 size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Analytics</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/settings" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <Settings size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Settings</span>
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/dashboard/reports" 
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
                  isActive ? 'bg-purple-500/20 border-l-4 border-purple-400' : ''
                }`
              }
            >
              <FileText size={20} className="flex-shrink-0 text-white/90" />
              <span className="font-medium text-white/90">Reports</span>
            </NavLink>
          </li>
        </ul>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-4 pb-6">
        <div className="p-4 bg-gradient-to-br from-purple-600 to-cyan-500 rounded-xl border border-purple-500/30 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">John Doe</div>
              <div className="text-xs text-white/80">Premium Plan</div>
            </div>
          </div>
          <div className="bg-white/20 text-white px-2 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
            Level 8 Money Master
          </div>
        </div>
      </div>
    </motion.div>
  );
}
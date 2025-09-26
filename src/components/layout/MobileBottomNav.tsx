import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Upload, Mic, Bot, Settings, Bell, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { EMPLOYEES } from '../../data/aiEmployees';
import MobileChatbotModal from './MobileChatbotModal';
import { ByteDocumentChat } from '../chat/ByteDocumentChat';

interface MobileBottomNavProps {
  activeEmployee?: string;
  onEmployeeSelect?: (employeeId: string) => void;
  onUpload?: () => void;
  notifications?: number;
  onViewChange?: (view: string) => void;
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

export default function MobileBottomNav({ 
  activeEmployee, 
  onEmployeeSelect, 
  onUpload, 
  notifications = 0, 
  onViewChange 
}: MobileBottomNavProps) {
  const location = useLocation();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isByteChatOpen, setIsByteChatOpen] = useState(false);
  
  // Get current AI employee based on route
  const currentEmployeeKey = getAIEmployeeForRoute(location.pathname);
  const currentEmployee = EMPLOYEES.find(emp => emp.key === currentEmployeeKey);

  const navItems = [
    { icon: Home, label: "Dashboard", to: "/dashboard" },
    { icon: Upload, label: "Import", to: "/dashboard/smart-import-ai", isByteChat: true },
    { icon: Mic, label: "Podcast", to: "/dashboard/podcast" },
    { 
      icon: MessageCircle, 
      label: currentEmployee ? currentEmployee.name : "AI Chat", 
      to: "/dashboard/ai-financial-assistant",
      employee: currentEmployee,
      isChatbot: true
    },
    { icon: Bell, label: "Alerts", to: "/dashboard/settings" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f172a] border-t border-white/10">
      <div className="flex items-center justify-between px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          
          const handleClick = (e: React.MouseEvent) => {
            if (item.isChatbot) {
              e.preventDefault();
              setIsChatbotOpen(true);
            } else if (item.isByteChat) {
              e.preventDefault();
              setIsByteChatOpen(true);
            }
          };
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleClick}
              className={`flex flex-col items-center gap-1 px-1 py-1 rounded-lg transition-all duration-200 relative min-w-0 flex-1 ${
                isActive 
                  ? 'bg-purple-500/20 text-purple-400' 
                  : 'text-white/60 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                {/* Show AI employee emoji for AI Chat, otherwise show icon */}
                {item.employee ? (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-sm">{item.employee.emoji}</span>
                  </div>
                ) : (
                  <item.icon size={18} />
                )}
                
                {/* Notification badge for AI Chat */}
                {(item.label === "AI Chat" || item.employee) && notifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </div>
                )}
                {/* Notification badge for Alerts */}
                {item.label === "Alerts" && notifications > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </div>
                )}
              </motion.div>
              <span className="text-xs font-medium text-center truncate">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full"
                />
              )}
            </NavLink>
          );
        })}
      </div>
      
      {/* Chatbot Modal */}
      <MobileChatbotModal 
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        employeeKey={currentEmployeeKey}
      />

      {/* Byte Document Chat Modal */}
      <ByteDocumentChat
        isOpen={isByteChatOpen}
        onClose={() => setIsByteChatOpen(false)}
      />
    </div>
  );
}

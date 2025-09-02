import { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Menu, 
  X, 
  LogOut, 
  User, 
  Settings, 
  Banknote, 
  Search,
  Moon,
  Sun,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { getProfile } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom, isNotificationsOpenAtom, isUserMenuOpenAtom } from '../../lib/uiStore';

interface HeaderProps {
  darkMode?: boolean;
  toggleDarkMode?: () => void;
}

const Header = ({ 
  darkMode = false,
  toggleDarkMode
}: HeaderProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [isNotificationsOpen, setIsNotificationsOpen] = useAtom(isNotificationsOpenAtom);
  const [isUserMenuOpen, setIsUserMenuOpen] = useAtom(isUserMenuOpenAtom);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const getPageTitle = () => {
    switch(location.pathname) {
      case '/':
        return 'Dashboard';
      case '/upload':
        return 'Upload Statements';
      case '/ai-categorizer':
        return 'AI Categorizer';
      case '/transactions':
        return 'Transactions';
              case '/dashboard/reports':
        return 'Reports';
      case '/settings':
        return 'Settings';
      case '/settings/profile':
        return 'Account & Users';
      case '/pricing':
        return 'Subscription & Billing';
      case '/badges':
        return 'Achievements';
      case '/receipts':
        return 'Receipt History';
      case '/scan-receipt':
        return 'Scan Receipt';
      case '/admin':
        return 'Admin Panel';
      case '/gamification':
        return 'XP & Gamification';
      case '/credit':
        return 'Credit Score';
      case '/credit-builder':
        return 'Credit Builder';
      default:
        return 'XspensesAI';
    }
  };

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close notifications panel when clicking outside
      if (
        isNotificationsOpen && 
        notificationsRef.current && 
        !notificationsRef.current.contains(event.target as Node) &&
        bellRef.current && 
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      
      // Close user menu when clicking outside
      if (
        isUserMenuOpen && 
        userMenuRef.current && 
        !userMenuRef.current.contains(event.target as Node) &&
        userButtonRef.current && 
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen, isUserMenuOpen, setIsNotificationsOpen, setIsUserMenuOpen]);

  // Close menus when location changes
  useEffect(() => {
    setIsNotificationsOpen(false);
    setIsUserMenuOpen(false);
  }, [location, setIsNotificationsOpen, setIsUserMenuOpen]);

  return (
    <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-16 z-30`}>
      <div className={`flex items-center justify-between ${isMobile ? 'h-20 px-4 pt-4' : 'h-16 px-4 md:px-6'}`}>
        <div className="flex items-center">
          <h1 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{getPageTitle()}</h1>
        </div>
        
        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center mx-4 flex-1">
          <div className="relative w-full">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} size={18} />
            <input 
              type="text" 
              placeholder="Search transactions..." 
              className={`pl-10 pr-4 py-2 rounded-lg w-full ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-500'
              } border focus:outline-none focus:ring-2 focus:ring-primary-500`}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications - Temporarily Disabled */}
          <div className="relative">
            <div 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative cursor-help"
              title="Notifications coming soon"
            >
              <HelpCircle size={20} />
            </div>
          </div>
          
          {toggleDarkMode && (
            <button 
              onClick={toggleDarkMode}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
          
          {/* AI Assistant */}
          <button 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-primary-600' : 'bg-green-400'}`}
            aria-label="AI Assistant"
          >
            <span className="text-white text-sm">🤖</span>
          </button>
          
          {/* User Menu */}
          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className={`flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-700'} hover:${darkMode ? 'text-gray-300' : 'text-gray-900'} focus:outline-none`}
              aria-label="User menu"
            >
              <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                <User size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
              </div>
              <span className="hidden md:block text-sm font-medium">
                {user?.email?.split('@')[0] || 'User'}
              </span>
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  ref={userMenuRef}
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute right-0 mt-2 w-64 rounded-lg shadow-lg border py-2 z-50 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} flex items-center justify-center`}>
                        <User size={20} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                          {user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                          {user?.email || 'user@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      to="/settings/security-access"
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User size={16} className="mr-3" />
                      Profile Settings
                    </Link>
                    <Link
                      to="/settings"
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Settings size={16} className="mr-3" />
                      General Settings
                    </Link>
                    <Link
                      to="/pricing"
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Banknote size={16} className="mr-3" />
                      Pricing Plans
                    </Link>
                    <div className={`border-t my-1 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}></div>
                    <button
                      onClick={handleSignOut}
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

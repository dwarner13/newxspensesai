import { useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { 
  Bell, 
  Search, 
  Menu, 
  User, 
  Settings, 
  LogOut,
  HelpCircle,
  DollarSign,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  isMobileMenuOpenAtom, 
  isNotificationsOpenAtom, 
  isUserMenuOpenAtom,
  isDarkModeAtom
} from '../../lib/uiStore';
import toast from 'react-hot-toast';

interface TopNavProps {
  toggleDarkMode?: () => void;
}

const TopNav = ({ toggleDarkMode }: TopNavProps) => {
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [isNotificationsOpen, setIsNotificationsOpen] = useAtom(isNotificationsOpenAtom);
  const [isUserMenuOpen, setIsUserMenuOpen] = useAtom(isUserMenuOpenAtom);
  const [darkMode] = useAtom(isDarkModeAtom);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);

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

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className={`flex items-center justify-between h-16 px-4 md:px-6 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center">
        <button 
          className="mr-4 md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <Menu size={24} />
        </button>
        
        {/* Mobile Logo */}
        <Link to="/" className="flex items-center md:hidden mr-4">
          <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center mr-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>XspensesAI</span>
        </Link>
        
        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center mx-4 flex-1 ">
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
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative">
          <button 
            ref={bellRef}
            className={`text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative`}
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsUserMenuOpen(false);
            }}
            aria-label="Notifications"
          >
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary-500 rounded-full"></span>
          </button>
          
          <AnimatePresence>
            {isNotificationsOpen && (
              <motion.div
                ref={notificationsRef}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`absolute right-0 mt-2 w-80 rounded-lg shadow-lg border py-2 z-50 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {/* Sample notifications */}
                  <div className={`px-4 py-3 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors cursor-pointer`}>
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-primary-700' : 'bg-primary-100'} flex items-center justify-center mr-3`}>
                        <DollarSign size={16} className={darkMode ? 'text-primary-300' : 'text-primary-600'} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>New transaction categorized</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI categorized 15 transactions</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-4 py-3 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors cursor-pointer`}>
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-success-700' : 'bg-success-100'} flex items-center justify-center mr-3`}>
                        <User size={16} className={darkMode ? 'text-success-300' : 'text-success-600'} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Profile updated</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Your profile was updated successfully</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>1 day ago</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`px-4 py-3 hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} transition-colors cursor-pointer`}>
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-warning-700' : 'bg-warning-100'} flex items-center justify-center mr-3`}>
                        <HelpCircle size={16} className={darkMode ? 'text-warning-300' : 'text-warning-600'} />
                      </div>
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>New features available</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check out the new AI categorization</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>3 days ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`px-4 py-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'} text-center`}>
                  <button className={`text-sm ${darkMode ? 'text-primary-400 hover:text-primary-300' : 'text-primary-600 hover:text-primary-700'}`}>
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                    <DollarSign size={16} className="mr-3" />
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
  );
};

export default TopNav;

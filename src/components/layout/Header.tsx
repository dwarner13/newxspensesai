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
  HelpCircle,
  Bell,
  Music
} from 'lucide-react';
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
  const [notifications, setNotifications] = useState([
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
  ]);
  
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

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
    <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-16 z-30`} style={{paddingRight: 'var(--scrollbar-width, 0px)'}}>
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
        
        <div className="flex items-center space-x-3">
          {/* Notifications Bell */}
          <div className="relative">
            <button
              ref={bellRef}
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsUserMenuOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-white/80" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            
              {isNotificationsOpen && (
                <div
                  ref={notificationsRef}
                  className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg border border-white/10 bg-[rgba(15,23,42,0.95)] backdrop-blur-md py-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-white/60">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors ${
                            !notification.read ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'achievement' ? 'bg-yellow-500' :
                              'bg-orange-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{notification.title}</p>
                              <p className="text-white/70 text-xs mt-1">{notification.message}</p>
                              <p className="text-white/50 text-xs mt-1">{notification.timestamp}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            
          </div>

          {/* Spotify Icon */}
          <button 
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all duration-200"
            aria-label="Spotify Integration"
          >
            <Music size={20} className="text-white/80" />
          </button>
          
          {/* Profile Icon */}
          <div className="relative">
            <button
              ref={userButtonRef}
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 flex items-center justify-center transition-all duration-200"
              aria-label="User menu"
            >
              <User size={20} className="text-white" />
            </button>

            
              {isUserMenuOpen && (
                <div
                  ref={userMenuRef}
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
                </div>
              )}
            
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown,
  User,
  Settings,
  LogOut,
  Crown,
  Search,
  Moon,
  Sun,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom, isNotificationsOpenAtom, isUserMenuOpenAtom, isDarkModeAtom } from '../../lib/uiStore';
import FeaturesDropdown from './FeaturesDropdown';


const MainHeader = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const [mobileFeaturesDropdownOpen, setMobileFeaturesDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useAtom(isNotificationsOpenAtom);
  const [isUserMenuOpen, setIsUserMenuOpen] = useAtom(isUserMenuOpenAtom);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [darkMode] = useAtom(isDarkModeAtom);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
      
      if (
        featuresDropdownOpen &&
        featuresDropdownRef.current &&
        !featuresDropdownRef.current.contains(event.target as Node)
      ) {
        setFeaturesDropdownOpen(false);
      }

      // Only close mobile features dropdown if clicking outside the entire mobile menu
      if (
        mobileFeaturesDropdownOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileFeaturesDropdownOpen(false);
      }

      if (
        profileDropdownOpen &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, featuresDropdownOpen, mobileFeaturesDropdownOpen, profileDropdownOpen]);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileFeaturesDropdownOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Determine if we're on a dashboard/authenticated page
  const isDashboardPage = location.pathname.startsWith('/dashboard');

  // Public navigation items for marketing pages
  const publicNavigationItems = [
    { name: 'Features', path: '/features', hasDropdown: true },
    { name: 'Pricing', path: '/pricing', hasDropdown: false },
    { name: 'AI Employees', path: '/ai-employees', hasDropdown: false },
    { name: 'Reviews', path: '/reviews', hasDropdown: false },
    { name: 'Contact', path: '/contact', hasDropdown: false },
  ];

  // Dashboard navigation items for authenticated pages
  const dashboardNavigationItems = [
    { name: 'Home', path: '/dashboard', hasDropdown: false },
            { name: 'Reports', path: '/dashboard/reports', hasDropdown: false },
    { name: 'Upload', path: '/upload', hasDropdown: false },
    { name: 'Transactions', path: '/transactions', hasDropdown: false },
    { name: 'Receipts', path: '/receipts', hasDropdown: false },
  ];

  // Use the appropriate navigation items based on the route
  const navigationItems = isDashboardPage ? dashboardNavigationItems : publicNavigationItems;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center mr-2">
                <span className="text-white text-lg">💰</span>
              </div>
              <span className="font-bold text-gray-900">XspensesAI</span>
            </Link>
          </div>

          {/* Desktop Navigation and Profile - Grouped on the right */}
          <div className="hidden md:flex items-center space-x-8">
            {/* Navigation Links */}
            {navigationItems.map((item) => (
              <div key={item.name}>
                {item.hasDropdown ? (
                  <div className="relative" ref={featuresDropdownRef}>
                    <button
                      onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                      className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <span>{item.name}</span>
                      <ChevronDown size={16} className={`transition-transform ${featuresDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <FeaturesDropdown 
                      open={featuresDropdownOpen} 
                      onLinkClick={() => setFeaturesDropdownOpen(false)} 
                    />
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className="text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
            
            {/* Profile/Login Area - At the far right */}
            {user ? (
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User size={16} className="text-primary-600" />
                  </div>
                  <span className="text-sm font-medium">{user.email?.split('@')[0] || 'User'}</span>
                  <ChevronDown size={16} className={`transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {profileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border border-gray-200 bg-white z-10"
                    >
                      <div className="py-1" role="menu" aria-orientation="vertical">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <User size={20} className="text-primary-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.email?.split('@')[0] || 'User'}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg px-3 py-2 text-white text-xs font-semibold">
                            <Crown size={14} />
                            Level 8 Money Master
                          </div>
                        </div>
                        
                        <Link
                          to="/settings"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setProfileDropdownOpen(false)}
                        >
                          <Settings size={16} className="mr-3" />
                          Settings
                        </Link>
                        
                        <button
                          onClick={() => {
                            handleSignOut();
                            setProfileDropdownOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <LogOut size={16} className="mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Menu Button - Only visible on mobile */}
          <div className="md:hidden">
            <button 
              ref={menuButtonRef}
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop - Separate from menu content */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Content - Positioned relative to backdrop */}
          <div className="relative h-full bg-white flex flex-col" ref={mobileMenuRef}>
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center mr-2">
                  <span className="text-white text-lg">💰</span>
                </div>
                <span className="font-bold text-gray-900">XspensesAI</span>
              </div>
              <button 
                className="text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <div className="flex-1 overflow-y-auto py-6">
              <div className="px-6 space-y-4">
                {/* Navigation Items */}
                {navigationItems.map((item) => (
                  <div key={item.name}>
                    {item.hasDropdown ? (
                      <div>
                        <button
                          onClick={() => {
                            console.log('Features dropdown toggle clicked');
                            setMobileFeaturesDropdownOpen(!mobileFeaturesDropdownOpen);
                          }}
                          className="flex items-center justify-between w-full text-gray-700 hover:text-primary-600 py-2"
                        >
                          <span>{item.name}</span>
                          <ChevronDown size={16} className={`transition-transform ${mobileFeaturesDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {mobileFeaturesDropdownOpen && (
                          <div className="pl-4 space-y-4 border-l-2 border-gray-100 mt-2">
                            {/* Personal Finance AI Section */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Personal Finance AI</h4>
                              <div className="space-y-1">
                                <Link 
                                  to="/features/smart-import-ai"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Smart Import AI Link clicked');
                                  }}
                                >
                                  <span className="text-sm">📄</span>
                                  <span>Smart Import AI</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">NEW</span>
                                </Link>
                                <Link 
                                  to="/features/ai-assistant"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('AI Assistant Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🧠</span>
                                  <span>AI Financial Assistant</span>
                                </Link>
                                <Link 
                                  to="/features/ai-therapist"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('AI Therapist Link clicked');
                                  }}
                                >
                                  <span className="text-sm">💚</span>
                                  <span>AI Financial Therapist</span>
                                </Link>
                                <Link 
                                  to="/features/goal-concierge"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Goal Concierge Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🎯</span>
                                  <span>AI Goal Concierge</span>
                                </Link>
                                <Link 
                                  to="/features/spending-predictions"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Spending Predictions Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🔮</span>
                                  <span>Spending Predictions</span>
                                </Link>
                              </div>
                            </div>

                            {/* Audio Entertainment Section */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-pink-600 uppercase tracking-wide">Audio Entertainment</h4>
                              <div className="space-y-1">
                                <Link 
                                  to="/features/podcast-generator"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Podcast Generator Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🎙️</span>
                                  <span>Personal Podcast Generator</span>
                                </Link>
                                <Link 
                                  to="/features/spotify-integration"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Spotify Integration Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🎵</span>
                                  <span>Spotify Integration</span>
                                </Link>
                                <Link 
                                  to="/features/wellness-studio"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Wellness Studio Link clicked');
                                  }}
                                >
                                  <span className="text-sm">🎧</span>
                                  <span>Financial Wellness Studio</span>
                                </Link>
                              </div>
                            </div>

                            {/* Business & Tax Section */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Business & Tax</h4>
                              <div className="space-y-1">
                                <Link 
                                  to="/features/freelancer-tax"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Freelancer Tax Link clicked');
                                  }}
                                >
                                  <span className="text-sm">📊</span>
                                  <span>Freelancer Tax Assistant</span>
                                </Link>
                                <Link 
                                  to="/features/business-expense-intelligence"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Business Intelligence Link clicked');
                                  }}
                                >
                                  <span className="text-sm">💼</span>
                                  <span>Business Intelligence Assistant</span>
                                </Link>
                                <Link 
                                  to="/features/smart-automation"
                                  className="flex items-center space-x-2 text-gray-600 hover:text-primary-600 py-1 w-full text-left border border-transparent hover:border-gray-300"
                                  onClick={() => {
                                    console.log('Smart Automation Link clicked');
                                  }}
                                >
                                  <span className="text-sm">⚡</span>
                                  <span>Smart Automation</span>
                                </Link>
                              </div>
                            </div>

                            {/* Mobile CTA Section */}
                            <div className="pt-4 border-t border-gray-200 mt-4">
                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-1">Ready to revolutionize your finances?</h5>
                                  <p className="text-xs text-gray-600">Try all features free - no credit card required</p>
                                </div>
                                <div className="flex gap-2">
                                  <Link 
                                    to="/ai-employees"
                                    className="flex-1 px-3 py-2 rounded-md border border-pink-500 text-pink-600 font-semibold hover:bg-pink-50 text-xs text-center"
                                    onClick={() => {
                                      console.log('Meet AI Team Link clicked');
                                    }}
                                  >
                                    Meet AI Team
                                  </Link>
                                  <Link 
                                    to="/pricing"
                                    className="flex-1 px-3 py-2 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow hover:from-purple-600 hover:to-pink-600 text-xs text-center"
                                    onClick={() => {
                                      console.log('Start Free Trial Link clicked');
                                    }}
                                  >
                                    Start Free Trial
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        className="block text-gray-700 hover:text-primary-600 py-2 w-full text-left"
                        onClick={() => {
                          console.log(`${item.name} Link clicked`);
                        }}
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                ))}

                {/* User Profile Section */}
                {user && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.email?.split('@')[0] || 'User'}</div>
                        <div className="text-sm text-gray-500">Premium Member</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 rounded-lg px-3 py-2 text-white text-sm font-semibold mb-3">
                      <Crown size={16} />
                      Level 8 Money Master
                    </div>
                    
                    <Link
                      to="/settings"
                      className="flex items-center text-gray-700 hover:text-primary-600 py-2 w-full text-left"
                      onClick={() => {
                        console.log('Settings Link clicked');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      <Settings size={16} className="mr-3" />
                      Settings
                    </Link>
                    
                    <button
                      onClick={() => {
                        console.log('Sign Out clicked');
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center w-full text-gray-700 hover:text-primary-600 py-2"
                    >
                      <LogOut size={16} className="mr-3" />
                      Sign Out
                    </button>
                  </div>
                )}

                {/* Login Button for Non-Authenticated Users */}
                {!user && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <Link
                      to="/login"
                      className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-center w-full"
                      onClick={() => {
                        console.log('Login Link clicked');
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      Login
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default MainHeader; 

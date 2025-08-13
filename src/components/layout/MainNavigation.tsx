import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown,
  User,
  Settings,
  LogOut,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom } from '../../lib/uiStore';
import FeaturesDropdown from './FeaturesDropdown';
import MobileMenu from './MobileMenu';

const navLinks = [
  { label: 'Features', to: '#', dropdown: true },
  { label: 'Pricing', to: '/pricing' },
  { label: 'AI Employees', to: '/ai-employees' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Contact', to: '/contact' },
];

const MainNavigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Update scrolled state on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
        setFeaturesOpen(false);
  }, [location.pathname, setIsMobileMenuOpen]);

  // Debug mobile menu state
  useEffect(() => {
    console.log('Mobile menu state changed:', isMobileMenuOpen);
  }, [isMobileMenuOpen]);

  const handleDropdownLinkClick = () => setFeaturesOpen(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleSidebar = () => {
    console.log('Toggle sidebar clicked, current collapsed state:', isSidebarCollapsed);
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-white'
    }`}>
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <div key={link.label}>
                {link.dropdown ? (
                  <div className="relative" ref={mobileMenuRef}>
                <button
                      onClick={() => setFeaturesOpen(!featuresOpen)}
                      className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
                    >
                      <span>{link.label}</span>
                      <ChevronDown size={16} className={`transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
                </button>
                    
                    <FeaturesDropdown 
                      open={featuresOpen} 
                      onLinkClick={handleDropdownLinkClick} 
                    />
              </div>
            ) : (
              <Link
                to={link.to}
                    className="text-gray-700 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </Link>
          )}
              </div>
            ))}
          
          {/* Login Button */}
          <Link
            to="/dashboard"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Login
          </Link>
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="md:hidden">
        <button
              ref={menuButtonRef}
              className="text-primary-600 hover:text-primary-700 transition-colors duration-200"
              onClick={() => {
                console.log('Hamburger clicked, current state:', isMobileMenuOpen);
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
            >
              <Menu size={24} />
        </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Sidebar Content */}
          <div className={`absolute left-0 top-0 h-full bg-gradient-to-b from-purple-600 via-purple-700 to-blue-900 flex flex-col transition-all duration-300 dashboard-mobile-sidebar ${isSidebarCollapsed ? 'w-16' : 'w-80'}`} ref={mobileMenuRef}>
            {/* Debug Info - Remove this later */}
            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs p-1 z-10">
              {isSidebarCollapsed ? 'Collapsed' : 'Expanded'}
            </div>
            
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-purple-500/30 dashboard-sidebar-header">
              {!isSidebarCollapsed && (
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white/20 rounded-md flex items-center justify-center mr-2 backdrop-blur-sm">
                    <span className="text-white text-lg">💰</span>
                  </div>
                  <span className="font-bold text-white">XspensesAI</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <button 
                  className="text-white hover:text-purple-200 transition-colors duration-200 p-1"
                  onClick={toggleSidebar}
                >
                  <Menu size={20} />
                </button>
                <button 
                  className="text-white hover:text-purple-200 transition-colors duration-200 p-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>
              </div>



            {/* User Profile Section - Only show when expanded */}
            {!isSidebarCollapsed && (
              <div className="px-4 mt-4 dashboard-user-section">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <User size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">Darrell Warner</p>
                    <p className="text-purple-200 text-xs">Premium Member</p>
                  </div>
                </div>
                <div className="bg-orange-500 rounded-lg p-2 flex items-center space-x-2 mb-4">
                  <Crown size={14} className="text-white" />
                  <span className="text-white font-semibold text-xs">Level 8 Money Master</span>
                </div>
              </div>
            )}

            {/* Financial Intelligence Section - Only show when expanded */}
            {!isSidebarCollapsed && (
              <div className="px-4 mb-4 dashboard-intelligence-section">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">🧠</span>
                  </div>
                  <h3 className="text-white font-semibold text-sm">Financial Intelligence</h3>
                </div>
              </div>
            )}

            {/* Sidebar Navigation */}
            <div className="flex-1 overflow-y-auto dashboard-sidebar-content">
              <div className="px-4 space-y-2">
                {/* Navigation Links */}
                  {navLinks.map((link) => (
                    <div key={link.label}>
                      {link.dropdown ? (
                        <div>
                          <button
                            onClick={() => setFeaturesOpen(!featuresOpen)}
                          className={`flex items-center justify-between w-full text-white hover:text-purple-200 py-2 px-3 rounded-lg hover:bg-white/10 transition-colors dashboard-sidebar-item ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-sm">📋</span>
                            {!isSidebarCollapsed && <span className="font-medium">{link.label}</span>}
                          </div>
                          {!isSidebarCollapsed && (
                            <ChevronDown size={16} className={`transition-transform text-purple-200 ${featuresOpen ? 'rotate-180' : ''}`} />
                          )}
                          </button>
                          
                        {featuresOpen && !isSidebarCollapsed && (
                          <div className="pl-4 space-y-2 border-l-2 border-purple-400/30 mt-2 ml-3 dashboard-dropdown">
                              {/* Personal Finance AI Section */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold text-purple-200 uppercase tracking-wide">Personal Finance AI</h4>
                                <div className="space-y-1">
                                <Link to="/features/smart-import-ai" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">📄</span>
                                  <span className="text-xs">Smart Import AI</span>
                                  <span className="text-xs bg-purple-500 text-white px-1 py-0.5 rounded-full">NEW</span>
                                </Link>
                                <Link to="/features/ai-assistant" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🧠</span>
                                  <span className="text-xs">AI Financial Assistant</span>
                                </Link>
                                <Link to="/features/ai-therapist" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">💚</span>
                                  <span className="text-xs">AI Financial Therapist</span>
                                </Link>
                                <Link to="/features/goal-concierge" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🎯</span>
                                  <span className="text-xs">AI Goal Concierge</span>
                                </Link>
                                <Link to="/features/spending-predictions" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🔮</span>
                                  <span className="text-xs">Spending Predictions</span>
                                </Link>
                              </div>
                              </div>

                              {/* Audio Entertainment Section */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold text-pink-300 uppercase tracking-wide">Audio Entertainment</h4>
                                <div className="space-y-1">
                                <Link to="/features/podcast-generator" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🎙️</span>
                                  <span className="text-xs">Personal Podcast Generator</span>
                                </Link>
                                <Link to="/features/spotify-integration" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🎵</span>
                                  <span className="text-xs">Spotify Integration</span>
                                </Link>
                                <Link to="/features/wellness-studio" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">🎧</span>
                                  <span className="text-xs">Financial Wellness Studio</span>
                                </Link>
                              </div>
                              </div>

                              {/* Business & Tax Section */}
                            <div className="space-y-1">
                              <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">Business & Tax</h4>
                                <div className="space-y-1">
                                <Link to="/features/freelancer-tax" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">📊</span>
                                  <span className="text-xs">Freelancer Tax Assistant</span>
                                </Link>
                                <Link to="/features/business-expense-intelligence" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">💼</span>
                                  <span className="text-xs">Business Intelligence Assistant</span>
                                </Link>
                                <Link to="/features/smart-automation" onClick={handleDropdownLinkClick} className="flex items-center space-x-2 text-white hover:text-purple-200 py-1 px-2 rounded hover:bg-white/10 transition-colors dashboard-dropdown-item">
                                  <span className="text-xs">⚡</span>
                                  <span className="text-xs">Smart Automation</span>
                                </Link>
                              </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                      <Link
                        to={link.to}
                        className={`flex items-center space-x-3 text-white hover:text-purple-200 py-2 px-3 rounded-lg hover:bg-white/10 transition-colors dashboard-sidebar-link ${isSidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <span className="text-sm">
                          {link.label === 'Pricing' && '💰'}
                          {link.label === 'AI Demo' && '🤖'}
                          {link.label === 'Reviews' && '⭐'}
                          {link.label === 'Contact' && '📞'}
                        </span>
                        {!isSidebarCollapsed && <span className="font-medium">{link.label}</span>}
                      </Link>
                      )}
                    </div>
                  ))}
                  
                {/* Settings & Logout - Only show when expanded */}
                {!isSidebarCollapsed && (
                  <div className="border-t border-purple-400/30 pt-3 mt-4 dashboard-settings-section">
                    <Link
                      to="/settings"
                      className="flex items-center text-white hover:text-purple-200 py-2 px-3 rounded-lg hover:bg-white/10 transition-colors dashboard-settings-link"
                    >
                      <Settings size={14} className="mr-2" />
                      <span className="text-sm">Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full text-white hover:text-purple-200 py-2 px-3 rounded-lg hover:bg-white/10 transition-colors dashboard-logout-btn"
                    >
                      <LogOut size={14} className="mr-2" />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
    </nav>
  );
};

export default MainNavigation; 

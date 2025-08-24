import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown,
  Home,
  Bot,
  DollarSign,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FeaturesDropdown from './FeaturesDropdown';
import MobileFeaturesDropdown from './MobileFeaturesDropdown';


export default function SimpleNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force close features dropdown on mount
  useEffect(() => {
    setIsFeaturesOpen(false);
    console.log('Features dropdown forced closed on mount, state:', isFeaturesOpen);
  }, []);

  // Debug dropdown state changes
  useEffect(() => {
    console.log('Features dropdown state changed to:', isFeaturesOpen);
  }, [isFeaturesOpen]);

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
        setIsFeaturesOpen(false);
      }
      
      // Close features dropdown when clicking outside
      if (isFeaturesOpen) {
        const target = event.target as Node;
        const featuresButton = document.querySelector('[data-features-button]');
        const featuresDropdown = document.querySelector('[data-features-dropdown]');
        
        if (featuresButton && !featuresButton.contains(target) && 
            featuresDropdown && !featuresDropdown.contains(target)) {
          setIsFeaturesOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isFeaturesOpen]);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsFeaturesOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);



  const navigationItems = [
    { name: 'Home', path: '/', hasDropdown: false },
    { name: 'Features', path: '#', hasDropdown: true },
    { name: 'Pricing', path: '/pricing', hasDropdown: false },
    { name: 'AI Employees', path: '/ai-employees', hasDropdown: false },
    { name: 'Reviews', path: '/reviews', hasDropdown: false },
    { name: 'Contact', path: '/contact', hasDropdown: false }
  ];

  const mobileFeatures = [
    // FEATURED TOOLS
    { name: 'Smart Import AI', path: '/features/smart-import-ai' },
    { name: 'AI Financial Assistant', path: '/features/ai-assistant' },
    { name: 'AI Financial Therapist', path: '/features/ai-therapist' },
    { name: 'AI Goal Concierge', path: '/features/goal-concierge' },
    { name: 'Spending Predictions', path: '/features/spending-predictions' },
    // ENTERTAINMENT
    { name: 'Personal Podcast', path: '/features/personal-podcast' },
    { name: 'Financial Wellness Studio', path: '/features/wellness-studio' },
    { name: 'Spotify Integration', path: '/features/spotify-integration' },
    // BUSINESS
    { name: 'Business Intelligence', path: '/features/business-expense-intelligence' },
    { name: 'Freelancer Tax Assistant', path: '/features/freelancer-tax' },
    { name: 'Smart Automation', path: '/features/smart-automation' },
    { name: 'Receipt Scanner', path: '/features/receipt-scanner' },
    { name: 'Document Upload', path: '/features/document-upload' },
    { name: 'API & Webhooks', path: '/features/api-webhooks' },
    { name: 'Security & Privacy', path: '/features/security-privacy' }
  ];

  return (
    <header className="bg-black/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-cyan-500 rounded-md flex items-center justify-center mr-2 shadow-lg">
                <DollarSign size={20} className="text-white" />
              </div>
              <span className="font-bold text-white text-xl font-['Montserrat']">XspensesAI</span>
            </Link>
          </div>

          {/* Desktop Navigation - HIDDEN ON MOBILE */}
          <nav className="hidden md:flex items-center space-x-8 desktop-navigation">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative">
                {item.hasDropdown ? (
                  <div className="relative">
                    <button
                      data-features-button
                      onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                      className="text-gray-200 hover:text-cyan-400 py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5 font-['Montserrat']"
                    >
                      {item.name}
                    </button>
                    <FeaturesDropdown open={isFeaturesOpen} onLinkClick={() => setIsFeaturesOpen(false)} />
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className="text-gray-200 hover:text-cyan-400 py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5 font-['Montserrat']"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Right side - Navigation Buttons */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation Buttons - HIDDEN ON MOBILE */}
            <div className="hidden md:flex items-center space-x-3 desktop-cta-buttons">
                             <Link
                 to="/dashboard"
                 className="text-gray-200 hover:text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-white/20 hover:border-white/30 hover:bg-white/5 font-['Montserrat']"
               >
                 Dashboard
               </Link>
              
              <Link
                to="/signup"
                                 className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105 font-['Montserrat']"
              >
                Get Started
              </Link>
            </div>
            
            {/* Mobile Hamburger Menu Button - VISIBLE ONLY ON MOBILE */}
            <div className="md:hidden">
              <button 
                ref={menuButtonRef}
                className="text-gray-300 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay - VISIBLE ONLY ON MOBILE */}
      {isMobile && (
        <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
          <div className="mobile-menu-content">
            <ul className="mobile-menu-items">
              <li className="font-['Montserrat']">
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                  Home
                </Link>
              </li>
              
              <li className="mobile-submenu font-['Montserrat']">
                <button 
                  className="mobile-submenu-trigger"
                  onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
                >
                  Features {isFeaturesOpen ? '▾' : '▸'}
                </button>
                <ul className={`mobile-submenu-items ${isFeaturesOpen ? 'open' : ''}`}>
                  {mobileFeatures.map((feature) => (
                    <li key={feature.name}>
                      <Link 
                        to={feature.path} 
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          setIsFeaturesOpen(false);
                        }}
                      >
                        {feature.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className="font-['Montserrat']">
                <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>
                  Pricing
                </Link>
              </li>
              
              <li className="font-['Montserrat']">
                <Link to="/ai-employees" onClick={() => setIsMobileMenuOpen(false)}>
                  AI Employees
                </Link>
              </li>
              
              <li className="font-['Montserrat']">
                <Link to="/reviews" onClick={() => setIsMobileMenuOpen(false)}>
                  Reviews
                </Link>
              </li>
              
              <li className="font-['Montserrat']">
                <Link to="/contact" onClick={() => setIsMobileMenuOpen(false)}>
                  Contact
                </Link>
              </li>
              
              <li className="mobile-cta-section">
                <Link 
                  to="/dashboard" 
                  className="mobile-login-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/signup" 
                  className="mobile-cta-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Get Started
                </Link>
              </li>
              
              {/* Mobile Header Icons - Added to mobile nav menu */}
              <li className="mobile-header-icons border-t border-white/20 pt-4 mt-4">
                <div className="flex items-center justify-center gap-4">
                  {/* Spotify Icon */}
                  <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group">
                    <svg 
                      className="w-6 h-6 text-slate-300 group-hover:text-green-400 transition-colors duration-200" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-9.54-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 3.6-1.08 7.56-.6 10.68 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.24 12.6c.361.181.54.78.301 1.44zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                  </button>
                  
                  {/* Profile Icon */}
                  <button className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      )}


     </header>
   );
 };

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  ChevronDown,
  Home,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FeaturesMegaMenu from '../nav/FeaturesMegaMenu';
import '../../styles/mobile-navigation.css';

const SimpleNavigation = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
        setMobileFeaturesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMobileFeaturesOpen(false);
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
    { name: 'Freelancer Assistant', path: '/features/freelancer-tax' },
    { name: 'Tax Optimization', path: '/features/tax-optimization' },
    { name: 'Compliance & Audit', path: '/features/compliance-audit' },
    // TECHNICAL
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
                <span className="text-white text-lg">💰</span>
              </div>
              <span className="font-bold text-white text-xl">XspensesAI</span>
            </Link>
          </div>

          {/* Desktop Navigation - HIDDEN ON MOBILE */}
          <nav className="hidden md:flex items-center space-x-8 desktop-navigation">
            {navigationItems.map((item) => (
              <div key={item.name} className="relative">
                {item.hasDropdown ? (
                  <FeaturesMegaMenu />
                ) : (
                  <Link
                    to={item.path}
                    className="text-gray-200 hover:text-cyan-400 py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5"
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
                 className="text-gray-200 hover:text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 border border-white/20 hover:border-white/30 hover:bg-white/5"
               >
                 Dashboard
               </Link>
              
              <Link
                to="/signup"
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:shadow-cyan-500/25 transform hover:scale-105"
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
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`} ref={mobileMenuRef}>
        <div className="mobile-menu-content">
          <ul className="mobile-menu-items">
            <li>
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                Home
              </Link>
            </li>
            
            <li className="mobile-submenu">
              <button 
                className="mobile-submenu-trigger"
                onClick={() => setMobileFeaturesOpen(!mobileFeaturesOpen)}
              >
                Features {mobileFeaturesOpen ? '▾' : '▸'}
              </button>
              <ul className={`mobile-submenu-items ${mobileFeaturesOpen ? 'open' : ''}`}>
                {mobileFeatures.map((feature) => (
                  <li key={feature.name}>
                    <Link 
                      to={feature.path} 
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setMobileFeaturesOpen(false);
                      }}
                    >
                      {feature.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            
            <li>
              <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)}>
                Pricing
              </Link>
            </li>
            
            <li>
              <Link to="/ai-employees" onClick={() => setIsMobileMenuOpen(false)}>
                AI Employees
              </Link>
            </li>
            
            <li>
              <Link to="/reviews" onClick={() => setIsMobileMenuOpen(false)}>
                Reviews
              </Link>
            </li>
            
            <li>
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
          </ul>
        </div>
      </div>


    </header>
  );
};

export default SimpleNavigation;

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  DollarSign,
  User
} from 'lucide-react';

export default function SimpleNavigation() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
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

  // Close mobile menu when clicking outside
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
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const navigationItems = [
    { name: 'Home', path: '/', hasDropdown: false },
    { name: 'Features', path: '/features', hasDropdown: false },
    { name: 'Pricing', path: '/pricing', hasDropdown: false },
    { name: 'AI Employees', path: '/ai-employees', hasDropdown: false },
    { name: 'Reviews', path: '/reviews', hasDropdown: false },
    { name: 'Contact', path: '/contact', hasDropdown: false }
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
              <Link
                key={item.name}
                to={item.path}
                className="text-gray-200 hover:text-cyan-400 py-2 px-3 rounded-md text-sm font-medium transition-colors hover:bg-white/5 font-['Montserrat']"
              >
                {item.name}
              </Link>
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
                className="mobile-menu-toggle text-gray-300 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
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
            {/* Mobile Menu Header with Close Button */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">XspensesAI</h2>
                  <p className="text-white/80 text-xs">Financial Management</p>
                </div>
              </div>
              <button 
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close mobile menu"
              >
                <X size={24} />
              </button>
            </div>
            
            <ul className="mobile-menu-items">
              {navigationItems.map((item) => (
                <li key={item.name} className="font-['Montserrat']">
                  <Link 
                    to={item.path} 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Mobile CTA Section - Separate from menu items */}
            <div className="mobile-cta-section">
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

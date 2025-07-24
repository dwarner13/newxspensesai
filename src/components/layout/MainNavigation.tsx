import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import FeaturesDropdown from './FeaturesDropdown';
import MobileMenu from './MobileMenu';

const navLinks = [
  { label: 'Features', to: '#', dropdown: true },
  { label: 'Pricing', to: '/pricing' },
  { label: 'AI Demo', to: '/ai-demo' },
  { label: 'Reviews', to: '/reviews' },
  { label: 'Contact', to: '/contact' },
];

const MainNavigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const featuresRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (featuresRef.current && !(featuresRef.current as any).contains(event.target)) {
        setFeaturesOpen(false);
      }
    };
    if (featuresOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [featuresOpen]);

  // Handler to close menu when a link is clicked
  const handleDropdownLinkClick = () => setFeaturesOpen(false);

  return (
    <header className={`fixed top-0 left-0 w-full z-50 transition-shadow bg-white ${scrolled ? 'shadow-lg' : ''}`}
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3" aria-label="XspensesAI Home">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xl">💰</span>
          </div>
          <span className="text-xl font-bold text-gray-900">XspensesAI</span>
        </Link>
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6" aria-label="Primary">
          {navLinks.map((link, i) =>
            link.dropdown ? (
              <div
                key={link.label}
                className="relative"
                ref={featuresRef}
              >
                <button
                  className="dropdown-trigger flex items-center space-x-1 px-3 py-2 rounded-md font-medium text-gray-800 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition z-50"
                  aria-haspopup="true"
                  aria-expanded={featuresOpen}
                  tabIndex={0}
                  onClick={() => setFeaturesOpen((v) => !v)}
                >
                  <span>Features</span>
                  <ChevronDown className={`w-4 h-4 transform transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
                </button>
                <FeaturesDropdown open={featuresOpen} onLinkClick={handleDropdownLinkClick} />
              </div>
            ) : (
              <Link
                key={link.label}
                to={link.to}
                className="px-3 py-2 rounded-md font-medium text-gray-800 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition"
              >
                {link.label}
              </Link>
            )
          )}
          
          {/* Login Button */}
          <Link
            to="/dashboard"
            className="ml-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            Login
          </Link>
        </nav>
        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 transition-all duration-200 shadow-lg"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      </div>
    </header>
  );
};

export default MainNavigation; 
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ open, onClose }) => {
  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Handle window resize to close menu on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && open) {
        onClose();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, onClose]);

  const navigationItems = [
    { icon: '🏠', label: 'Home', to: '/' },
    { icon: '🤖', label: 'AI Assistant', to: '/ai-assistant' },
    { icon: '🎩', label: 'AI Concierge', to: '/ai-concierge' },
    { icon: '💚', label: 'Financial Wellness', to: '/financial-wellness' },
    { icon: '⚡', label: 'Smart Automation', to: '/smart-automation' },
    { icon: '📊', label: 'Business Intelligence', to: '/business-intelligence' },
    { icon: '📋', label: 'Freelancer Tax Assistant', to: '/freelancer-tax' },
    { icon: '💰', label: 'Pricing', to: '/pricing' },
    { icon: '📞', label: 'Contact', to: '/contact' },
    { icon: '📖', label: 'About', to: '/about' },
  ];

  const featureHighlights = [
    { icon: '🎧', label: 'Personal Finance Podcasts' },
    { icon: '🎵', label: 'Spotify Integration' },
    { icon: '🧠', label: 'AI That Learns You' },
    { icon: '🔒', label: 'Bank-Level Security' },
  ];

  const handleLinkClick = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, visibility: 'hidden' }}
          animate={{ opacity: 1, visibility: 'visible' }}
          exit={{ opacity: 0, visibility: 'hidden' }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50"
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          />

          {/* Menu Content */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">💰</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">XspensesAI</h2>
                  <p className="text-white/80 text-xs">World's First FinTech Entertainment Platform</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto py-6">
              <nav className="px-6 space-y-2">
                {navigationItems.map((item, index) => (
                  <motion.div
                    key={item.to}
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Link
                      to={item.to}
                      onClick={handleLinkClick}
                      className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl text-white hover:bg-white/20 transition-all duration-200 group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                        {item.icon}
                      </span>
                      <span className="font-medium text-lg">{item.label}</span>
                      <svg className="w-5 h-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              {/* Feature Highlights */}
              <div className="px-6 mt-8">
                <h3 className="text-white/80 font-semibold text-sm uppercase tracking-wider mb-4">
                  Platform Features
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {featureHighlights.map((feature, index) => (
                    <motion.div
                      key={feature.label}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: (navigationItems.length * 0.1) + (index * 0.1), duration: 0.3 }}
                      className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center"
                    >
                      <div className="text-2xl mb-2">{feature.icon}</div>
                      <p className="text-white/90 text-xs font-medium leading-tight">
                        {feature.label}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="p-6 border-t border-white/20 space-y-3">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <Link
                  to="/dashboard"
                  onClick={handleLinkClick}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg"
                >
                  <span>🔐</span>
                  <span>Login to Dashboard</span>
                </Link>
              </motion.div>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className="w-full bg-white text-purple-600 font-bold py-4 px-6 rounded-xl hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>🚀</span>
                <span>Start Free Trial</span>
              </motion.button>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.3 }}
                className="w-full bg-transparent border-2 border-white/30 text-white font-medium py-4 px-6 rounded-xl hover:bg-white/10 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>▶️</span>
                <span>Watch AI Demo</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;

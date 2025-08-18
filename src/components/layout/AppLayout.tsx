import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom, isDarkModeAtom } from '../../lib/uiStore';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import SimpleNavigation from './SimpleNavigation';
import { X } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [darkMode] = useAtom(isDarkModeAtom);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      
      // Close mobile menu when switching to desktop
      if (!mobile && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, setIsMobileMenuOpen]);

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen, isMobile]);

  // Check if we're on a dashboard/authenticated page (which has its own layout)
  const isDashboardPage = location.pathname.startsWith('/dashboard') || 
                         location.pathname.startsWith('/settings') ||
                         location.pathname.startsWith('/upload') ||
                         location.pathname.startsWith('/transactions') ||
                         location.pathname.startsWith('/receipts') ||
                         location.pathname.startsWith('/dashboard/reports');

  return (
    <div className={`app-layout ${darkMode ? 'dark' : ''}`}>
      {/* Main Header - Only render if not dashboard page */}
      {!isDashboardPage && <SimpleNavigation />}
      
      {/* Main Content Area */}
      <div className={`main-content ${isDashboardPage ? 'dashboard-fullscreen-container' : 'ml-0'}`}>
        {/* Page Header - Only render if not dashboard page */}
        {!isDashboardPage && <Header />}
        
        {/* Page Content */}
        <main className={`page-content ${isDashboardPage ? 'dashboard-fullscreen-content' : ''}`}>
          {children}
        </main>
        
        {/* Footer - Only render if not dashboard page */}
        {!isDashboardPage && <Footer />}
      </div>
      
      {/* Full-Screen Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Menu Header */}
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
            
            {/* Mobile Menu Content */}
            <MobileMenu />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;

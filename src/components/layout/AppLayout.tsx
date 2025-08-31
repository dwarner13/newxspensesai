import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom, isDarkModeAtom } from '../../lib/uiStore';
import Header from './Header';


import SimpleNavigation from './SimpleNavigation';


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
        

      </div>
      
      {/* Mobile menu is handled by SimpleNavigation component */}
    </div>
  );
};

export default AppLayout;

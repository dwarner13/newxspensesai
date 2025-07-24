import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isMobileMenuOpenAtom, isDarkModeAtom } from '../../lib/uiStore';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import { X } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useAtom(isMobileMenuOpenAtom);
  const [darkMode] = useAtom(isDarkModeAtom);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update isMobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [location.pathname, setIsMobileMenuOpen]);

  return (
    <div className={`app-layout ${darkMode ? 'dark' : ''}`}>
      {/* Revolutionary Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="main-content">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
      
      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="mobile-overlay"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div className="mobile-overlay-content">
            <button 
              className="mobile-close-btn"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={24} />
            </button>
            <MobileMenu />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLayout;

import { ReactNode, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePagePersistence } from '../../hooks/usePagePersistence';
import AppLayout from './AppLayout';
import SimpleNavigation from './SimpleNavigation';
import { Home, BarChart, Camera, User, ListFilter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAtom } from 'jotai';
import { isDarkModeAtom } from '../../lib/uiStore';

const Layout = () => {
  const location = useLocation();
  const { } = usePagePersistence(); // This will automatically persist the current page
  const [darkMode] = useAtom(isDarkModeAtom);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Update document title based on current route
  useEffect(() => {
    const getPageTitle = () => {
      switch(location.pathname) {
        case '/':
        case '/dashboard':
          return 'Dashboard - XspensesAI';
        case '/upload':
          return 'Upload Statements - XspensesAI';
        case '/scan-receipt':
          return 'Scan Receipt - XspensesAI';
        case '/receipts':
          return 'Receipt History - XspensesAI';
        case '/badges':
          return 'Achievements - XspensesAI';
        case '/transactions':
          return 'Transactions - XspensesAI';
        case '/transactions/new':
          return 'New Expense - XspensesAI';
        case '/transactions/new-income':
          return 'New Income - XspensesAI';
        case '/dashboard/reports':
          return 'Reports - XspensesAI';
        case '/settings/profile':
          return 'Account & Users - XspensesAI';
        case '/admin':
          return 'Admin Panel - XspensesAI';
        case '/pricing':
          return 'Subscription & Billing - XspensesAI';
        case '/gamification':
          return 'XP & Gamification - XspensesAI';
        case '/credit':
          return 'Credit Score - XspensesAI';
        case '/credit-builder':
          return 'Credit Builder - XspensesAI';
        case '/recents':
          return 'Recent Transactions - XspensesAI';
        case '/search':
          return 'Search - XspensesAI';
        case '/mass-upload':
          return 'Mass Upload - XspensesAI';
        default:
          if (location.pathname.startsWith('/months/')) {
            const month = location.pathname.split('/').pop();
            return `${month} Overview - XspensesAI`;
          }
          return 'XspensesAI - Master your expenses';
      }
    };

    document.title = getPageTitle();
    
    // Add resize listener for mobile detection
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname]);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Global Navigation */}
      <SimpleNavigation />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="pt-0 mt-0">
            {/* Use key prop to prevent component state persistence issues */}
            <div key={location.pathname}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div className={`md:hidden fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t flex justify-around items-center p-2 z-30`}>
          <Link to="/dashboard" className="flex flex-col items-center p-2">
            <Home size={24} className={location.pathname === '/dashboard' || location.pathname === '/' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-xs ${location.pathname === '/dashboard' || location.pathname === '/' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`}`}>Home</span>
          </Link>
                      <Link to="/dashboard/reports" className="flex flex-col items-center p-2">
              <BarChart size={24} className={location.pathname === '/dashboard/reports' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-xs ${location.pathname === '/dashboard/reports' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`}`}>Reports</span>
            </Link>
          <Link to="/scan-receipt" className="flex flex-col items-center p-2">
            <div className="relative -mt-8">
              <div className={`w-14 h-14 ${darkMode ? 'bg-primary-600' : 'bg-green-400'} rounded-full flex items-center justify-center shadow-lg`}>
                <Camera size={28} className="text-white" />
              </div>
            </div>
            <span className={`text-xs ${darkMode ? 'text-primary-600' : 'text-green-500'} mt-1`}>Scan</span>
          </Link>
          <Link to="/transactions" className="flex flex-col items-center p-2">
            <ListFilter size={24} className={location.pathname === '/transactions' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-xs ${location.pathname === '/transactions' ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`}`}>Transactions</span>
          </Link>
          <Link to="/settings/profile" className="flex flex-col items-center p-2">
            <User size={24} className={location.pathname.includes('/settings') ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-xs ${location.pathname.includes('/settings') ? "text-primary-600" : `${darkMode ? 'text-gray-400' : 'text-gray-500'}`}`}>Profile</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Layout;

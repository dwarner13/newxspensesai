import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  BarChart, 
  Camera, 
  ListFilter, 
  User,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featuresDropdownOpen, setFeaturesDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const featuresDropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
      
      if (
        featuresDropdownOpen &&
        featuresDropdownRef.current &&
        !featuresDropdownRef.current.contains(event.target as Node)
      ) {
        setFeaturesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen, featuresDropdownOpen]);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setFeaturesDropdownOpen(false);
  }, [location.pathname]);

  const navItems = [
    { name: 'Home', path: '/dashboard', icon: <Home size={20} /> },
            { name: 'Reports', path: '/dashboard/reports', icon: <BarChart size={20} /> },
    { name: 'Scan', path: '/scan-receipt', icon: <Camera size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <ListFilter size={20} /> },
    { name: 'Profile', path: '/settings/profile', icon: <User size={20} /> },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path;
  };

  const toggleFeaturesDropdown = () => {
    setFeaturesDropdownOpen(!featuresDropdownOpen);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="  px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <div className="w-8 h-8 bg-primary-600 rounded-md flex items-center justify-center mr-2">
                <span className="text-white text-lg">🪙</span>
              </div>
              <span className="font-bold text-gray-900">XspensesAI</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Home size={20} />
                <span>Home</span>
              </div>
            </Link>
            
            {/* Features Dropdown */}
            <div className="relative" ref={featuresDropdownRef}>
              <button
                onClick={toggleFeaturesDropdown}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                  location.pathname.includes('/features')
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                }`}
              >
                <span>Features</span>
                <ChevronDown size={16} className={`transition-transform ${featuresDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {featuresDropdownOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <Link
                      to="/features/how-it-works"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setFeaturesDropdownOpen(false)}
                    >
                      How It Works
                    </Link>
                    <Link
                      to="/features/email-receipts"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setFeaturesDropdownOpen(false)}
                    >
                      Email Receipts
                    </Link>
                    <Link
                      to="/features/ai-insights"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setFeaturesDropdownOpen(false)}
                    >
                      AI Insights
                    </Link>
                    <Link
                      to="/features/personal-business-goals"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setFeaturesDropdownOpen(false)}
                    >
                      Personal & Business Goals
                    </Link>
                    <Link
                      to="/ai-learning"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setFeaturesDropdownOpen(false)}
                    >
                      AI Learning
                    </Link>
                  </div>
                </div>
              )}
            </div>
            
            <Link
              to="/dashboard/reports"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard/reports')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-1">
                <BarChart size={20} />
                <span>Reports</span>
              </div>
            </Link>
            
            <Link
              to="/scan-receipt"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/scan-receipt')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-1">
                <Camera size={20} />
                <span>Scan</span>
              </div>
            </Link>
            
            <Link
              to="/transactions"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/transactions')
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-1">
                <ListFilter size={20} />
                <span>Transactions</span>
              </div>
            </Link>
            
            {user ? (
              <Link to="/dashboard" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button and Login Button */}
          <div className="md:hidden flex items-center space-x-4">
            {!user && (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 text-sm rounded-lg transition-colors">
                Sign In
              </Link>
            )}
            <button 
              ref={menuButtonRef}
              className="text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="md:hidden bg-white py-4 shadow-lg">
          <div className="container  px-4 space-y-3">
            <Link 
              to="/dashboard" 
              className="block text-gray-600 hover:text-primary-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            
            {/* Features Dropdown for Mobile */}
            <div className="space-y-2">
              <button
                onClick={() => setFeaturesDropdownOpen(!featuresDropdownOpen)}
                className="flex items-center justify-between w-full text-gray-600 hover:text-primary-600 transition-colors"
              >
                <span>Features</span>
                <ChevronDown size={16} className={`transition-transform ${featuresDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {featuresDropdownOpen && (
                <div className="pl-4 space-y-2 border-l-2 border-gray-100">
                  <Link 
                    to="/features/how-it-works" 
                    className="block text-gray-600 hover:text-primary-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How It Works
                  </Link>
                  <Link 
                    to="/features/email-receipts" 
                    className="block text-gray-600 hover:text-primary-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Email Receipts
                  </Link>
                  <Link 
                    to="/features/ai-insights" 
                    className="block text-gray-600 hover:text-primary-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AI Insights
                  </Link>
                  <Link 
                    to="/features/personal-business-goals" 
                    className="block text-gray-600 hover:text-primary-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Personal & Business Goals
                  </Link>
                  <Link 
                    to="/ai-learning" 
                    className="block text-gray-600 hover:text-primary-600 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AI Learning
                  </Link>
                </div>
              )}
            </div>
            
            <Link 
              to="/dashboard/reports" 
              className="block text-gray-600 hover:text-primary-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reports
            </Link>
            <Link 
              to="/scan-receipt" 
              className="block text-gray-600 hover:text-primary-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Scan Receipt
            </Link>
            <Link 
              to="/transactions" 
              className="block text-gray-600 hover:text-primary-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Transactions
            </Link>
            <Link 
              to="/pricing" 
              className="block text-gray-600 hover:text-primary-600 transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            {user ? (
              <Link 
                to="/dashboard" 
                className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <Link 
                to="/login" 
                className="block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  HelpCircle,
  Crown,
  LogOut,
  ChevronDown,
  Home,
  BarChart3,
  CreditCard,
  Upload,
  Receipt,
  Tag,
  Target,
  Bot,
  Sparkles,
  Headphones,
  Mic,
  FileText,
  Calculator,
  TrendingUp,
  User,
  DollarSign,
  Plus,
  TrendingDown,
  Brain,
  Heart,
  Briefcase
} from 'lucide-react';
import { useMockData } from '../../hooks/useMockData';
import { useMonthSelection, generateMonthsList } from '../../hooks/useMonthSelection';

// Define menu item type
interface MenuItem {
  name: string;
  icon: React.ReactElement;
  path: string;
  active?: boolean;
  notifications?: number;
  isNew?: boolean;
  type?: 'internal' | 'external';
  description?: string;
  badge?: string;
  badgeType?: 'notification' | 'new' | 'safe-space';
}

// Professional Logo Component
const SidebarHeader = () => (
  <div className="sidebar-header">
    <div className="logo-container">
      <div className="logo-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#gradient)" />
          <path d="M8 12h16M8 16h16M8 20h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="logo-text">
        <span className="logo-name">XspensesAI</span>
        <span className="logo-tagline">Financial Intelligence</span>
      </div>
    </div>
  </div>
);

// Professional User Profile Section
const UserProfileSection = () => (
  <div className="user-profile-section">
    <div className="plan-badge-header">
      <div className="plan-icon">⭐</div>
      <div className="plan-info">
        <span className="plan-name">PERSONAL PLAN</span>
      </div>
    </div>
    
    <div className="user-info">
      <h3 className="user-name">Darrell Warner</h3>
      <p className="user-email">darrell.warner13@gmail.com</p>
    </div>
    
    <div className="user-stats">
      <div className="stat-card">
        <span className="stat-value">541</span>
        <span className="stat-label">SCORE</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">Lv.8</span>
        <span className="stat-label">LEVEL</span>
      </div>
    </div>
  </div>
);

// Professional Time Selector
const TimeSelector = () => {
  const [selectedMonth, setSelectedMonth] = useState('June 2025');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const months = [
    'July 2025', 'June 2025', 'May 2025', 'April 2025', 
    'March 2025', 'February 2025', 'January 2025'
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="time-selector" ref={dropdownRef}>
      <div className="time-header">
        <span className="calendar-icon">📅</span>
        <span className="time-label">TIME PERIOD</span>
      </div>
      
      <div className={`time-dropdown ${isOpen ? 'open' : ''}`}>
        <button 
          className="time-trigger"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{selectedMonth}</span>
          <span className={`arrow ${isOpen ? 'up' : 'down'}`}>▼</span>
        </button>
        
        {isOpen && (
          <div className="time-options">
            {months.map((month) => (
              <button
                key={month}
                className={`time-option ${selectedMonth === month ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedMonth(month);
                  setIsOpen(false);
                }}
              >
                {month}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Professional Navigation Menu
const NavigationMenu = () => {
  const [activeItem, setActiveItem] = useState('Smart Import AI');
  
  const menuStructure: Array<{
    title: string;
    items: MenuItem[];
  }> = [
    {
      title: "CORE FEATURES",
      items: [
        { 
          name: "Smart Import AI", 
          icon: <Upload size={18} />, 
          path: "/smart-import", 
          active: true,
          description: "Document processing & AI analysis"
        },
        { 
          name: "Business", 
          icon: <Briefcase size={18} />, 
          path: "/business",
          description: "Business expense tools"
        },
        { 
          name: "Goals", 
          icon: <Target size={18} />, 
          path: "/goals",
          description: "Financial goal tracking"
        },
        { 
          name: "Podcasts", 
          icon: <Headphones size={18} />, 
          path: "/podcasts",
          description: "Personal financial podcasts"
        }
      ]
    },
    {
      title: "AI INTELLIGENCE",
      items: [
        { 
          name: "AI Assistant", 
          icon: <Bot size={18} />, 
          path: "/ai-assistant", 
          isNew: true,
          description: "Your intelligent financial advisor",
          badge: "3",
          badgeType: "notification"
        },
        { 
          name: "AI Therapist", 
          icon: <Brain size={18} />, 
          path: "/ai-therapist", 
          isNew: true,
          description: "Financial mental health & healing",
          badge: "Safe Space",
          badgeType: "safe-space"
        }
      ]
    },
    {
      title: "ANALYTICS & INSIGHTS",
      items: [
        { 
          name: "Analytics", 
          icon: <BarChart3 size={18} />, 
          path: "/analytics",
          description: "Data visualization & insights"
        },
        { 
          name: "AI Insights", 
          icon: <Sparkles size={18} />, 
          path: "/ai-insights",
          description: "AI-powered financial insights"
        },
        { 
          name: "Trends", 
          icon: <TrendingUp size={18} />, 
          path: "/trends",
          description: "Spending patterns & trends"
        },
        { 
          name: "Forecasting", 
          icon: <TrendingDown size={18} />, 
          path: "/forecasting",
          description: "Financial predictions & planning"
        }
      ]
    },
    {
      title: "ACCOUNT & SETTINGS",
      items: [
        { 
          name: "Settings", 
          icon: <Settings size={18} />, 
          path: "/settings",
          description: "Account & AI preferences"
        },
        { 
          name: "Profile", 
          icon: <User size={18} />, 
          path: "/profile",
          description: "User profile & preferences"
        },
        { 
          name: "Subscription", 
          icon: <Crown size={18} />, 
          path: "/subscription",
          description: "Plan management & billing"
        },
        { 
          name: "Help & Support", 
          icon: <HelpCircle size={18} />, 
          path: "/help",
          description: "Support & documentation"
        }
      ]
    }
  ];

  const handleNavigation = (item: MenuItem) => {
    console.log('=== SIDEBAR NAVIGATION DEBUG ===');
    console.log('Menu item clicked:', item.name, item.path);
    console.log('Item type:', item.type);
    console.log('Current URL:', window.location.href);
    
    // Handle all navigation as internal
    setActiveItem(item.name);
    console.log(`Navigating to ${item.path}`);
    window.location.href = item.path;
  };

  const getBadgeClass = (badgeType?: string) => {
    switch (badgeType) {
      case 'notification':
        return 'notification-badge';
      case 'new':
        return 'new-badge';
      case 'safe-space':
        return 'safe-space-badge';
      default:
        return 'badge';
    }
  };

  return (
    <nav className="navigation-menu">
      {menuStructure.map((section, sectionIndex) => (
        <div key={sectionIndex} className="menu-section">
          <h4 className="section-title">{section.title}</h4>
          <ul className="menu-items">
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex} className="menu-item">
                <button
                  className={`menu-link ${activeItem === item.name ? 'active' : ''}`}
                  onClick={() => handleNavigation(item)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <div className="menu-content">
                    <span className="menu-text">{item.name}</span>
                    {item.description && (
                      <span className="menu-description">{item.description}</span>
                    )}
                  </div>
                  
                  {item.isNew && (
                    <span className="new-badge">NEW</span>
                  )}
                  
                  {item.badge && (
                    <span className={getBadgeClass(item.badgeType)}>{item.badge}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

// Professional Quick Actions Footer
const QuickActionsFooter = () => (
  <div className="sidebar-footer">
    <div className="quick-actions">
      <button className="action-btn">
        <Plus size={14} />
        <span>Add Expense</span>
      </button>
      <button className="action-btn">
        <TrendingUp size={14} />
        <span>Add Income</span>
      </button>
    </div>
    <div className="app-version">XspensesAI v2.1.0</div>
  </div>
);

// Main Sidebar Component
const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Add click outside functionality for mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <>
      {/* Mobile menu toggle button */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        style={{
          display: 'none',
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 1001,
          background: '#8B5CF6',
          color: 'white',
          border: 'none',
          padding: '12px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        ☰
      </button>
      
      <motion.aside 
        className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        ref={sidebarRef}
      >
        <SidebarHeader />
        <UserProfileSection />
        <TimeSelector />
        <NavigationMenu />
        <QuickActionsFooter />
      </motion.aside>
    </>
  );
};

export default Sidebar;

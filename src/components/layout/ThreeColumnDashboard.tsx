/**
 * XSPENSESAI THREE-COLUMN DASHBOARD LAYOUT
 * Professional three-column layout with responsive design
 * 
 * FEATURES:
 * - Left sidebar (360px) - Navigation and tools
 * - Main content (scrollable) - Dashboard content
 * - Right sidebar (320px) - AI Team and contacts
 * - Responsive breakpoints for mobile/tablet
 * - Glassmorphism design system
 * - Discovery ticker and tool cards
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './ThreeColumnDashboard.css';

interface ThreeColumnDashboardProps {
  children?: React.ReactNode;
  showDiscoveryTicker?: boolean;
  showToolCards?: boolean;
  showHeroCard?: boolean;
}

const ThreeColumnDashboard: React.FC<ThreeColumnDashboardProps> = ({
  children,
  showDiscoveryTicker = true,
  showToolCards = true,
  showHeroCard = true
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTabletSidebarOpen, setIsTabletSidebarOpen] = useState(false);

  // Discovery ticker data
  const discoveryItems = [
    { icon: '🎉', employee: 'Spark', text: 'You saved $127 vs last month!' },
    { icon: '🔮', employee: 'Crystal', text: 'Tuesday spending spike pattern detected' },
    { icon: '💰', employee: 'Ledger', text: 'New tax deduction worth $340 found!' },
    { icon: '📄', employee: 'Byte', text: 'Processed 47 documents today with 99.7% accuracy' },
    { icon: '🎯', employee: 'Goalie', text: '67% progress to vacation goal!' },
    { icon: '⚡', employee: 'Blitz', text: 'New debt payoff plan calculated' },
    { icon: '🧘', employee: 'Harmony', text: 'Stress levels decreased 23%' },
    { icon: '🎙️', employee: 'Narrator', text: 'New podcast episode ready!' }
  ];

  // Tool cards data
  const toolCards = [
    {
      icon: '📤',
      name: 'Smart Import AI',
      description: 'Upload receipts and bank statements. Byte processes them instantly.',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      route: '/dashboard/smart-import-ai'
    },
    {
      icon: '💬',
      name: 'AI Financial Assistant',
      description: 'Chat with our AI assistant for personalized financial advice.',
      gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
      route: '/dashboard/ai-financial-assistant'
    },
    {
      icon: '❤️',
      name: 'AI Financial Therapist',
      description: 'Emotional and behavioral coaching for financial wellness.',
      gradient: 'linear-gradient(135deg, #ee0979, #ff6a00)',
      route: '/dashboard/ai-therapist'
    },
    {
      icon: '🎯',
      name: 'AI Goal Concierge',
      description: 'Track and achieve your financial goals with Goalie.',
      gradient: 'linear-gradient(135deg, #f093fb, #f5576c)',
      route: '/dashboard/goal-concierge'
    },
    {
      icon: '💳',
      name: 'Debt Payoff Planner',
      description: 'Blitz helps you tackle debt and celebrate wins.',
      gradient: 'linear-gradient(135deg, #4facfe, #00f2fe)',
      route: '/dashboard/debt-planner'
    },
    {
      icon: '🔔',
      name: 'Bill Reminder System',
      description: 'Never miss a payment with Chime\'s reminders.',
      gradient: 'linear-gradient(135deg, #fa709a, #fee140)',
      route: '/dashboard/bill-reminders'
    }
  ];

  // AI Team data
  const aiTeam = [
    { avatar: '👑', name: 'Prime', status: 'Coordinating your empire', online: true },
    { avatar: '📄', name: 'Byte', status: 'Processing 2 documents', online: true },
    { avatar: '🏷️', name: 'Tag', status: 'Learned 3 patterns', online: true },
    { avatar: '🔮', name: 'Crystal', status: 'Prediction in 2 hours', online: 'away' },
    { avatar: '💰', name: 'Ledger', status: 'Found $340', online: false },
    { avatar: '⚡', name: 'Spark', status: 'New podcast ready!', online: true },
    { avatar: '🎯', name: 'Goalie', status: '67% to vacation', online: true },
    { avatar: '🧘', name: 'Harmony', status: 'Wellness check 3pm', online: 'away' }
  ];

  const handleToolCardClick = (route: string) => {
    navigate(route);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleTabletSidebarToggle = () => {
    setIsTabletSidebarOpen(!isTabletSidebarOpen);
  };

  return (
    <div className="three-column-dashboard">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="mobile-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleMobileMenuToggle}
          />
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={handleMobileMenuToggle}>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div className="mobile-logo">XspensesAI</div>
        <button className="mobile-sidebar-btn" onClick={handleTabletSidebarToggle}>
          👥
        </button>
      </div>

      <div className="dashboard-container">
        {/* LEFT SIDEBAR */}
        <motion.aside 
          className={`left-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
          initial={{ x: -360 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="logo-section">
            <div className="logo-icon">👑</div>
            <div className="logo-text">XspensesAI</div>
          </div>

          <button 
            className="main-dashboard-btn"
            onClick={() => navigate('/dashboard')}
          >
            <span>📊</span>
            <span>Main Dashboard</span>
          </button>

          <div className="sidebar-section">
            <div className="section-title">AI Workspace</div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/smart-import-ai')}>
              <span>📤</span>
              <span>Smart Import AI</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/ai-financial-assistant')}>
              <span>💬</span>
              <span>AI Chat Assistant</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/smart-categories')}>
              <span>🏷️</span>
              <span>Smart Categories</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/transactions')}>
              <span>📄</span>
              <span>Transactions</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-title">Planning & Analysis</div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/bill-reminder')}>
              <span>🔔</span>
              <span>Bill Reminder</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/debt-planner')}>
              <span>💳</span>
              <span>Debt Payoff Planner</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/goal-concierge')}>
              <span>🎯</span>
              <span>AI Goal Concierge</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/financial-freedom')}>
              <span>🗽</span>
              <span>AI Financial Freedom</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-title">Audio Entertainment</div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/personal-podcast')}>
              <span>🎙️</span>
              <span>Personal Podcast</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/spotify-integration')}>
              <span>🎵</span>
              <span>Spotify Integration</span>
            </div>
            <div className="sidebar-item" onClick={() => navigate('/dashboard/wellness-studio')}>
              <span>🧘</span>
              <span>Wellness Studio</span>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-card">
              <div className="profile-avatar">DW</div>
              <div className="profile-info">
                <div className="profile-name">Darrell Warner</div>
                <div className="profile-level">Level 8 Money Master</div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* MAIN CONTENT */}
        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">FinTech Entertainment Platform</h1>
            <p className="page-subtitle">Welcome back, John! Here's your financial overview.</p>
          </div>

          {/* Discovery Ticker */}
          {showDiscoveryTicker && (
            <div className="ticker-bar">
              <div className="ticker-content">
                {discoveryItems.map((item, index) => (
                  <div key={index} className="ticker-item">
                    <span>{item.icon}</span>
                    <span>{item.employee}: {item.text}</span>
                  </div>
                ))}
                {/* Duplicate for seamless loop */}
                {discoveryItems.slice(0, 3).map((item, index) => (
                  <div key={`duplicate-${index}`} className="ticker-item">
                    <span>{item.icon}</span>
                    <span>{item.employee}: {item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hero Card */}
          {showHeroCard && (
            <div className="hero-card">
              <div className="hero-content">
                <div className="hero-icon">⚡</div>
                <div className="hero-text">
                  <div className="hero-title">You're crushing your savings goals!</div>
                  <div className="hero-description">Spark celebrates your 67% progress to vacation fund.</div>
                  <button className="hero-button" onClick={() => navigate('/dashboard/goals')}>
                    See Progress
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tool Cards Grid */}
          {showToolCards && (
            <div className="cards-grid">
              {toolCards.map((tool, index) => (
                <motion.div
                  key={index}
                  className="tool-card"
                  whileHover={{ y: -8 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToolCardClick(tool.route)}
                >
                  <div 
                    className="tool-icon"
                    style={{ background: tool.gradient }}
                  >
                    {tool.icon}
                  </div>
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-description">{tool.description}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Custom Content */}
          {children}
        </main>

        {/* RIGHT SIDEBAR */}
        <motion.aside 
          className={`right-sidebar ${isTabletSidebarOpen ? 'tablet-open' : ''}`}
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="sidebar-header">
            <div className="sidebar-title">Your AI Team</div>
            <div className="sidebar-controls">
              <button className="control-btn">🔍</button>
              <button className="control-btn">⚙️</button>
            </div>
          </div>

          <div className="employee-section">
            <div className="section-label">
              <span className="section-name">Following</span>
              <span className="section-count">{aiTeam.length}</span>
            </div>

            {aiTeam.map((employee, index) => (
              <motion.div
                key={index}
                className="employee-item"
                whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="employee-avatar">
                  {employee.avatar}
                  <div className={`status-dot ${
                    employee.online === true ? 'status-online' : 
                    employee.online === 'away' ? 'status-away' : 'status-offline'
                  }`}></div>
                </div>
                <div className="employee-info">
                  <div className="employee-name">{employee.name}</div>
                  <div className="employee-status">{employee.status}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.aside>
      </div>
    </div>
  );
};

export default ThreeColumnDashboard;

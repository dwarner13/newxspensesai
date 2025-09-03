/**
 * XSPENSESAI DESKTOP COMPLETE REVOLUTION
 * Transforms static dashboard into living command center
 * 
 * CRITICAL: ADDS entertainment layer WITHOUT breaking existing functionality
 * - Left sidebar navigation remains unchanged
 * - All 3 core cards remain in place
 * - All existing features continue working
 * - This ENHANCES, not replaces
 */

import React, { useState, useEffect, useRef } from 'react';
import './DesktopRevolution.css';

// ================================================================================
// DESKTOP ENHANCEMENT SYSTEM
// ================================================================================

interface DesktopRevolutionProps {
  isDesktop: boolean;
}

const DesktopRevolution: React.FC<DesktopRevolutionProps> = ({ isDesktop }) => {
  const [discoveries, setDiscoveries] = useState<Array<{
    icon: string;
    employee: string;
    text: string;
  }>>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [activities, setActivities] = useState<Array<{
    avatar: string;
    employee: string;
    message: string;
    time: string;
  }>>([]);
  const [achievements, setAchievements] = useState<Array<{
    title: string;
    description: string;
  }>>([]);

  const tickerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Desktop detection
  const isDesktopScreen = () => {
    return window.innerWidth > 1200;
  };

  // Initialize all enhancements
  useEffect(() => {
    if (isDesktop && isDesktopScreen()) {
      initializeDiscoveries();
      initializeActivities();
      startHeroRotation();
      startLiveUpdates();
    }
  }, [isDesktop]);

  // ================================================================================
  // 1. DISCOVERY TICKER
  // ================================================================================

  const initializeDiscoveries = () => {
    const discoveryTemplates = [
      { icon: '🎉', employee: 'Spark', text: 'You saved $127 vs last month!' },
      { icon: '🔮', employee: 'Crystal', text: 'Tuesday spending spike pattern detected' },
      { icon: '💰', employee: 'Ledger', text: 'New tax deduction worth $340 found!' },
      { icon: '📄', employee: 'Byte', text: 'Processed 47 documents today with 99.7% accuracy' },
      { icon: '🎯', employee: 'Goalie', text: '67% progress to vacation goal!' },
      { icon: '⚡', employee: 'Blitz', text: 'New debt payoff plan calculated' }
    ];
    setDiscoveries(discoveryTemplates);
  };

  // ================================================================================
  // 2. HERO SECTION
  // ================================================================================

  const heroes = [
    {
      avatar: '💰',
      employee: 'Ledger',
      title: '$340 in tax deductions found!',
      subtitle: 'Ledger discovered 12 business expenses you missed.',
      cta: 'View Details',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      avatar: '🔮',
      employee: 'Crystal',
      title: 'Overspending alert for next Tuesday',
      subtitle: 'Crystal predicts a 23% spending spike based on patterns.',
      cta: 'Adjust Budget',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      avatar: '⚡',
      employee: 'Spark',
      title: 'You\'re crushing your savings goals!',
      subtitle: 'Spark celebrates your 67% progress to vacation fund.',
      cta: 'See Progress',
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    }
  ];

  const startHeroRotation = () => {
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % heroes.length);
    }, 5000);
    return () => clearInterval(interval);
  };

  // ================================================================================
  // 3. LIVE ACTIVITY FEED
  // ================================================================================

  const initializeActivities = () => {
    const initialActivities = [
      { avatar: '🏷️', employee: 'Tag', message: 'learned a new pattern: "Uber = Transport"', time: '2 minutes ago' },
      { avatar: '🔮', employee: 'Crystal', message: 'predicts overspending next Tuesday', time: '5 minutes ago' },
      { avatar: '⚡', employee: 'Blitz', message: 'calculated new debt payoff plan', time: '12 minutes ago' },
      { avatar: '🎯', employee: 'Goalie', message: 'says you\'re 67% to vacation goal!', time: '1 hour ago' }
    ];
    setActivities(initialActivities);
  };

  const addNewActivity = () => {
    const newActivities = [
      { avatar: '📄', employee: 'Byte', message: 'processed 3 new documents', time: 'Just now' },
      { avatar: '💰', employee: 'Ledger', message: 'found $50 in missed deductions', time: 'Just now' },
      { avatar: '🧘', employee: 'Harmony', message: 'completed wellness check', time: 'Just now' },
      { avatar: '🎙️', employee: 'Narrator', message: 'generated new podcast episode', time: 'Just now' }
    ];
    
    const randomActivity = newActivities[Math.floor(Math.random() * newActivities.length)];
    setActivities(prev => [randomActivity, ...prev.slice(0, 3)]);
  };

  const startLiveUpdates = () => {
    const activityInterval = setInterval(addNewActivity, 8000);
    return () => clearInterval(activityInterval);
  };

  // ================================================================================
  // 4. ACHIEVEMENT SYSTEM
  // ================================================================================

  const showAchievement = (title: string, description: string) => {
    setAchievements(prev => [...prev, { title, description }]);
    
    // Remove after 4 seconds
    setTimeout(() => {
      setAchievements(prev => prev.slice(1));
    }, 4000);
  };

  const checkAchievements = () => {
    // Simulate achievement checks
    const conditions = [
      { check: () => Math.random() > 0.95, title: 'Document Master!', description: 'Processed 100+ documents' },
      { check: () => Math.random() > 0.98, title: 'Savings Superstar!', description: 'Found $500+ in savings' },
      { check: () => Math.random() > 0.99, title: 'Week Warrior!', description: '7-day streak achieved' }
    ];
    
    conditions.forEach(condition => {
      if (condition.check()) {
        showAchievement(condition.title, condition.description);
      }
    });
  };

  useEffect(() => {
    const achievementInterval = setInterval(checkAchievements, 10000);
    return () => clearInterval(achievementInterval);
  }, []);

  if (!isDesktop || !isDesktopScreen()) {
    return null; // Don't render on mobile
  }

  const currentHero = heroes[currentHeroIndex];

  return (
    <div className="desktop-revolution-container">
      
      {/* Discovery Ticker */}
      <div className="discovery-ticker" ref={tickerRef}>
        <div className="ticker-content">
          {[...discoveries, ...discoveries].map((discovery, index) => (
            <div key={index} className="ticker-item">
              <span className="ticker-icon">{discovery.icon}</span>
              <span>{discovery.employee}: {discovery.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <div 
        className="hero-section" 
        ref={heroRef}
        style={{ background: currentHero.background }}
      >
        <div className="hero-background"></div>
        <div className="hero-content">
          <div className="hero-employee">
            <div className="hero-avatar">{currentHero.avatar}</div>
            <div className="hero-message">
              <div className="hero-title">{currentHero.title}</div>
              <div className="hero-subtitle">{currentHero.subtitle}</div>
              <button className="hero-action">{currentHero.cta}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Sidebar */}
      <div className="employee-sidebar">
        <div className="employee-sidebar-header">
          <div className="sidebar-title">YOUR AI TEAM</div>
          <div className="sidebar-actions">
            <button className="sidebar-action-btn">🔍</button>
            <button className="sidebar-action-btn">⚙️</button>
          </div>
        </div>

        <div className="employee-section">
          <div className="section-header">
            <span>FOLLOWING</span>
            <span className="employee-count">8</span>
          </div>
          <div className="following-list">
            {[
              { avatar: '👑', name: 'Prime', status: 'Coordinating your empire', online: true },
              { avatar: '📄', name: 'Byte', status: 'Processing 2 documents', online: true },
              { avatar: '🏷️', name: 'Tag', status: 'Learned 3 patterns', online: true },
              { avatar: '🔮', name: 'Crystal', status: 'Prediction in 2 hours', online: 'away' },
              { avatar: '💰', name: 'Ledger', status: 'Found $340', online: false },
              { avatar: '⚡', name: 'Spark', status: 'New podcast ready!', online: true },
              { avatar: '🎯', name: 'Goalie', status: '67% to vacation', online: true },
              { avatar: '🧘', name: 'Harmony', status: 'Wellness check 3pm', online: 'away' }
            ].map((employee, index) => (
              <div key={index} className="employee-list-item">
                <div className="employee-avatar">
                  {employee.avatar}
                  <div className={`status-indicator ${
                    employee.online === true ? 'status-online' : 
                    employee.online === 'away' ? 'status-away' : 'status-offline'
                  }`}></div>
                </div>
                <div className="employee-info">
                  <div className="employee-name">{employee.name}</div>
                  <div className="employee-activity">{employee.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="discover-section">
          <div className="section-header">
            <span>DISCOVER MORE</span>
            <span className="employee-count">22</span>
          </div>
          <div className="discover-list">
            {[
              { avatar: '🎙️', name: 'Narrator', status: 'Storytelling expert' },
              { avatar: '📊', name: 'Analyst', status: 'Data insights' },
              { avatar: '🔒', name: 'Guardian', status: 'Security specialist' }
            ].map((employee, index) => (
              <div key={index} className="employee-list-item">
                <div className="employee-avatar">
                  {employee.avatar}
                  <div className="status-indicator status-offline"></div>
                </div>
                <div className="employee-info">
                  <div className="employee-name">{employee.name}</div>
                  <div className="employee-activity">{employee.status}</div>
                </div>
                <button className="follow-btn">Follow</button>
              </div>
            ))}
          </div>
          <button className="show-more-btn">Show More Employees...</button>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="activity-feed-section">
        <div className="activity-feed-header">
          <h3 className="activity-feed-title">Live Team Activity</h3>
          <div className="live-indicator">
            <div className="activity-indicator"></div>
            <span>LIVE</span>
          </div>
        </div>
        <div className="activity-grid">
          {activities.map((activity, index) => (
            <div key={index} className="activity-card animated-slide-in">
              <div className="activity-avatar">{activity.avatar}</div>
              <div className="activity-details">
                <div className="activity-message">
                  <strong>{activity.employee}</strong> {activity.message}
                </div>
                <div className="activity-time">{activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Popups */}
      {achievements.map((achievement, index) => (
        <div key={index} className="achievement-popup">
          <div className="achievement-icon">🏆</div>
          <div className="achievement-content">
            <div className="achievement-title">{achievement.title}</div>
            <div className="achievement-description">{achievement.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DesktopRevolution;

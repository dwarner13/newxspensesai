/**
 * XSPENSESAI COMPLETE SIDEBAR PAGE SYSTEM
 * Individual employee workspaces with consistent navigation and toggleable panels
 * 
 * CRITICAL: Maintains all existing functionality while adding personality layers
 * - Consistent top navbar across all pages
 * - Toggleable activity stream and employee sidebar
 * - Unique workspace for each sidebar link
 * - No breaking changes to existing code
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './WorkspaceLayout.css';

// ================================================================================
// CONSISTENT TOP NAVBAR
// ================================================================================

interface TopNavbarProps {
  pageTitle: string;
  onActivityToggle: () => void;
  onTeamToggle: () => void;
  activityStreamOpen: boolean;
  employeeSidebarOpen: boolean;
  notifications: number;
}

const TopNavbar: React.FC<TopNavbarProps> = ({
  pageTitle,
  onActivityToggle,
  onTeamToggle,
  activityStreamOpen,
  employeeSidebarOpen,
  notifications
}) => {
  const navigate = useNavigate();

  const navigateToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <nav className="top-navbar">
      <div className="nav-left">
        {/* Logo - clicks to dashboard */}
        <div className="nav-logo" onClick={navigateToDashboard}>
          <span className="logo-icon">👑</span>
          <span className="logo-text">XspensesAI</span>
        </div>
        
        {/* Dynamic Page Title */}
        <div className="page-title">
          {pageTitle}
        </div>
      </div>
      
      <div className="nav-right">
        {/* Notification Bell */}
        <div className="nav-item notification-bell">
          <span className="nav-icon">🔔</span>
          {notifications > 0 && (
            <span className="notification-badge">{notifications}</span>
          )}
        </div>
        
        {/* Activity Stream Toggle */}
        <button 
          className={`nav-toggle ${activityStreamOpen ? 'active' : ''}`}
          onClick={onActivityToggle}
        >
          <span className="toggle-icon">📊</span>
          <span className="toggle-label">Activity</span>
        </button>
        
        {/* Employee Sidebar Toggle */}
        <button 
          className={`nav-toggle ${employeeSidebarOpen ? 'active' : ''}`}
          onClick={onTeamToggle}
        >
          <span className="toggle-icon">👥</span>
          <span className="toggle-label">Team</span>
        </button>
        
        {/* Spotify Integration */}
        <div className="nav-item spotify-status">
          <span className="spotify-icon">🎵</span>
          <span className="connection-dot"></span>
        </div>
        
        {/* Profile Dropdown */}
        <div className="nav-item profile-dropdown">
          <span className="profile-avatar">A</span>
          <span className="dropdown-arrow">▼</span>
        </div>
      </div>
    </nav>
  );
};

// ================================================================================
// TOGGLEABLE ACTIVITY STREAM
// ================================================================================

interface ActivityStreamProps {
  isOpen: boolean;
  activities: Array<{
    avatar: string;
    employee: string;
    action: string;
    time: string;
  }>;
}

const ActivityStream: React.FC<ActivityStreamProps> = ({ isOpen, activities }) => {
  return (
    <div className={`activity-stream ${isOpen ? 'open' : ''}`}>
      <div className="stream-header">
        <h3>Live Activity</h3>
        <span className="live-indicator">
          <span className="pulse-dot"></span> LIVE
        </span>
      </div>
      
      <div className="activity-list">
        {activities.map((activity, index) => (
          <div key={index} className="activity-item animated-slide-in">
            <div className="activity-avatar">{activity.avatar}</div>
            <div className="activity-content">
              <strong>{activity.employee}</strong> {activity.action}
              <div className="activity-time">{activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================================
// TOGGLEABLE EMPLOYEE SIDEBAR
// ================================================================================

interface EmployeeSidebarProps {
  isOpen: boolean;
  following: Array<{
    avatar: string;
    name: string;
    status: string;
    online: boolean | string;
  }>;
  discover: Array<{
    avatar: string;
    name: string;
    status: string;
  }>;
  onEmployeeFollow: (name: string) => void;
}

const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  isOpen,
  following,
  discover,
  onEmployeeFollow
}) => {
  return (
    <div className={`employee-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Header */}
      <div className="employee-sidebar-header">
        <div className="sidebar-title">YOUR AI TEAM</div>
        <div className="sidebar-actions">
          <button className="sidebar-action-btn">🔍</button>
          <button className="sidebar-action-btn">⚙️</button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="employee-sidebar-content">
        {/* Following Section */}
        <div className="employee-section">
          <div className="section-header">
            <span>FOLLOWING</span>
            <span className="employee-count">{following.length}</span>
          </div>
          <div className="following-list">
            {following.map((employee, index) => (
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

        {/* Discover Section */}
        <div className="discover-section">
          <div className="section-header">
            <span>DISCOVER MORE</span>
            <span className="employee-count">{discover.length}</span>
          </div>
          <div className="discover-list">
            {discover.map((employee, index) => (
              <div key={index} className="employee-list-item">
                <div className="employee-avatar">
                  {employee.avatar}
                  <div className="status-indicator status-offline"></div>
                </div>
                <div className="employee-info">
                  <div className="employee-name">{employee.name}</div>
                  <div className="employee-activity">{employee.status}</div>
                </div>
                <button 
                  className="follow-btn"
                  onClick={() => onEmployeeFollow(employee.name)}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
          <button className="show-more-btn">Show More Employees...</button>
        </div>
      </div>
    </div>
  );
};

// ================================================================================
// MAIN WORKSPACE LAYOUT
// ================================================================================

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  employee?: {
    name: string;
    avatar: string;
    theme: string;
  };
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  children,
  pageTitle,
  employee
}) => {
  const [activityStreamOpen, setActivityStreamOpen] = useState(false);
  const [employeeSidebarOpen, setEmployeeSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const [activities, setActivities] = useState<Array<{
    avatar: string;
    employee: string;
    action: string;
    time: string;
  }>>([]);

  const following = [
    { avatar: '👑', name: 'Prime', status: 'Coordinating your empire', online: true },
    { avatar: '📄', name: 'Byte', status: 'Processing 2 documents', online: true },
    { avatar: '🏷️', name: 'Tag', status: 'Learned 3 patterns', online: true },
    { avatar: '🔮', name: 'Crystal', status: 'Prediction in 2 hours', online: 'away' },
    { avatar: '💰', name: 'Ledger', status: 'Found $340', online: false },
    { avatar: '⚡', name: 'Spark', status: 'New podcast ready!', online: true },
    { avatar: '🎯', name: 'Goalie', status: '67% to vacation', online: true },
    { avatar: '🧘', name: 'Harmony', status: 'Wellness check 3pm', online: 'away' }
  ];

  const discover = [
    { avatar: '🎙️', name: 'Narrator', status: 'Storytelling expert' },
    { avatar: '📊', name: 'Analyst', status: 'Data insights' },
    { avatar: '🔒', name: 'Guardian', status: 'Security specialist' }
  ];

  // Load user preferences
  useEffect(() => {
    const savedActivityStream = localStorage.getItem('activityStreamOpen');
    const savedEmployeeSidebar = localStorage.getItem('employeeSidebarOpen');
    
    if (savedActivityStream !== null) {
      setActivityStreamOpen(savedActivityStream === 'true');
    }
    if (savedEmployeeSidebar !== null) {
      setEmployeeSidebarOpen(savedEmployeeSidebar === 'true');
    }
  }, []);

  // Initialize activities
  useEffect(() => {
    const initialActivities = [
      { avatar: '🏷️', employee: 'Tag', action: 'learned a new pattern: "Uber = Transport"', time: '2 minutes ago' },
      { avatar: '🔮', employee: 'Crystal', action: 'predicts overspending next Tuesday', time: '5 minutes ago' },
      { avatar: '⚡', employee: 'Blitz', action: 'calculated new debt payoff plan', time: '12 minutes ago' },
      { avatar: '🎯', employee: 'Goalie', action: 'says you\'re 67% to vacation goal!', time: '1 hour ago' }
    ];
    setActivities(initialActivities);
  }, []);

  // Live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const newActivities = [
        { avatar: '📄', employee: 'Byte', action: 'processed 3 new documents', time: 'Just now' },
        { avatar: '💰', employee: 'Ledger', action: 'found $50 in missed deductions', time: 'Just now' },
        { avatar: '🧘', employee: 'Harmony', action: 'completed wellness check', time: 'Just now' },
        { avatar: '🎙️', employee: 'Narrator', action: 'generated new podcast episode', time: 'Just now' }
      ];
      
      const randomActivity = newActivities[Math.floor(Math.random() * newActivities.length)];
      setActivities(prev => [randomActivity, ...prev.slice(0, 3)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const handleActivityToggle = () => {
    const newState = !activityStreamOpen;
    setActivityStreamOpen(newState);
    localStorage.setItem('activityStreamOpen', newState.toString());
  };

  const handleTeamToggle = () => {
    const newState = !employeeSidebarOpen;
    setEmployeeSidebarOpen(newState);
    localStorage.setItem('employeeSidebarOpen', newState.toString());
  };

  const handleEmployeeFollow = (name: string) => {
    console.log(`Following ${name}`);
    // Could trigger follow functionality
  };

  return (
    <div className="workspace-layout">
      <TopNavbar
        pageTitle={pageTitle}
        onActivityToggle={handleActivityToggle}
        onTeamToggle={handleTeamToggle}
        activityStreamOpen={activityStreamOpen}
        employeeSidebarOpen={employeeSidebarOpen}
        notifications={notifications}
      />
      
      <div className="page-body">
        <div 
          className="main-content"
          style={{ 
            marginRight: employeeSidebarOpen ? '320px' : '0',
            marginLeft: activityStreamOpen ? '320px' : '0'
          }}
        >
          {children}
        </div>
        
        <ActivityStream
          isOpen={activityStreamOpen}
          activities={activities}
        />
        
        <EmployeeSidebar
          isOpen={employeeSidebarOpen}
          following={following}
          discover={discover}
          onEmployeeFollow={handleEmployeeFollow}
        />
      </div>
    </div>
  );
};

export default WorkspaceLayout;

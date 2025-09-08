/**
 * XSPENSESAI MOBILE REVOLUTION - STORY FEED IMPLEMENTATION
 * TikTok-style vertical swipe experience for financial insights
 * 
 * CRITICAL: This is MOBILE ONLY - Desktop remains unchanged
 * NO modifications to existing business logic or backend
 * Only adds new presentation layer for mobile devices
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './MobileRevolution.css';

// ================================================================================
// MOBILE DETECTION & ROUTING
// ================================================================================

const MobileDetection = {
  /**
   * IMPORTANT: Only activate mobile views on actual mobile devices
   * Desktop experience remains completely unchanged
   */
  isMobile: () => {
    // More robust mobile detection - only activate on actual mobile devices
    const isSmallScreen = window.innerWidth <= 768;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Don't activate mobile view on homepage - always show desktop homepage
    const isHomepage = window.location.pathname === '/';
    if (isHomepage) {
      return false;
    }
    
    // Don't activate mobile view on main dashboard - show regular dashboard
    const isMainDashboard = window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/';
    if (isMainDashboard) {
      return false;
    }
    
    // Only activate mobile view for specific dashboard pages on actual mobile devices
    const isSpecificDashboardPage = window.location.pathname.includes('/dashboard/') && 
      !window.location.pathname.includes('/dashboard/ai-categorization') &&
      !window.location.pathname.includes('/dashboard/smart-categories');
    return isSpecificDashboardPage && isSmallScreen && (hasTouch || isMobileUserAgent);
  },

  /**
   * Route to appropriate view based on device
   * Desktop users NEVER see mobile views
   */
  routeUser: () => {
    if (MobileDetection.isMobile()) {
      return 'mobile-experience';
    }
    return 'existing-desktop'; // NO CHANGES to desktop
  }
};

// ================================================================================
// MOBILE STORY FEED COMPONENT
// ================================================================================

interface Story {
  id: string;
  employee: {
    name: string;
    avatar: string;
    color: string;
  };
  type: 'discovery' | 'achievement' | 'insight';
  content: {
    bigNumber: string;
    headline: string;
    detail: string;
    actions: Array<{
      label: string;
      action: () => void;
    }>;
  };
  styling: {
    background: string;
    avatar: string;
    accentColor: string;
  };
  timestamp: string;
}

interface MobileStoryFeedProps {
  stories: Story[];
  onStoryAction: (action: string, storyId: string) => void;
}

const MobileStoryFeed: React.FC<MobileStoryFeedProps> = ({ stories, onStoryAction }) => {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Swipe Detection - Native mobile gestures
   */
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEndY(e.changedTouches[0].clientY);
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeDistance = touchStartY - touchEndY;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance) {
      // Swipe up - next story
      nextStory();
    } else if (swipeDistance < -minSwipeDistance) {
      // Swipe down - previous story
      previousStory();
    }
  };

  /**
   * Navigation with smooth transitions
   */
  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      // Loop back to first story
      setCurrentStoryIndex(0);
    }
  };

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else {
      // Loop to last story
      setCurrentStoryIndex(stories.length - 1);
    }
  };

  /**
   * Smooth transition animation
   */
  useEffect(() => {
    if (containerRef.current) {
      const offset = currentStoryIndex * -100; // Each story is 100% height
      containerRef.current.style.transform = `translateY(${offset}%)`;
      containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    }
  }, [currentStoryIndex]);

  /**
   * Progress bar calculation
   */
  const progressPercentage = ((currentStoryIndex + 1) / stories.length) * 100;

  if (!MobileDetection.isMobile()) {
    return null; // Don't render on desktop
  }

  return (
    <div className="mobile-story-container">
      {/* Progress Bar */}
      <div className="story-progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      {/* Story Slides Container */}
      <div 
        className="story-slides-container"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {stories.map((story, index) => (
          <div key={story.id} className="story-slide" data-index={index}>
            {/* Employee Header */}
            <div className="story-header">
              <div className="employee-avatar">{story.styling.avatar}</div>
              <div className="employee-info">
                <div className="employee-name">{story.employee.name}</div>
                <div className="timestamp">{story.timestamp}</div>
              </div>
            </div>

            {/* Main Content */}
            <div className="story-content">
              <div className="big-number">{story.content.bigNumber}</div>
              <h2 className="headline">{story.content.headline}</h2>
              <p className="detail">{story.content.detail}</p>
              
              {/* Action Buttons */}
              <div className="story-actions">
                {story.content.actions.map((action, actionIndex) => (
                  <button 
                    key={actionIndex}
                    className="story-action-btn" 
                    onClick={() => onStoryAction(action.label, story.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Swipe Hint */}
            <div className="swipe-hint">↑ Swipe up for next</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================================
// MOBILE PROCESSING SHOW
// ================================================================================

interface MobileProcessingShowProps {
  isProcessing: boolean;
  transactionCount: number;
  discoveries: Array<{
    icon: string;
    text: string;
    employee: string;
  }>;
  onComplete: () => void;
}

const MobileProcessingShow: React.FC<MobileProcessingShowProps> = ({
  isProcessing,
  transactionCount,
  discoveries,
  onComplete
}) => {
  const [animatedCount, setAnimatedCount] = useState(0);

  // Animate counter
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setAnimatedCount(prev => {
          if (prev < transactionCount) {
            return prev + Math.ceil(transactionCount / 50);
          }
          return transactionCount;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isProcessing, transactionCount]);

  if (!MobileDetection.isMobile() || !isProcessing) {
    return null;
  }

  return (
    <div className="mobile-processing-show">
      {/* Byte's Avatar */}
      <div className="byte-avatar-large animated-pulse">📄</div>
      
      {/* Personality Message */}
      <h2 className="processing-title">Byte's Document Feast!</h2>
      <p className="byte-personality">"Oh this looks absolutely delicious!"</p>
      
      {/* Live Counter */}
      <div className="transaction-counter">
        <span className="count-number">{animatedCount}</span>
        <span className="count-label">Transactions Found</span>
      </div>
      
      {/* Discovery Feed */}
      <div className="discovery-feed" id="mobileDiscoveryFeed">
        {discoveries.map((discovery, index) => (
          <div key={index} className="discovery-card animated-slide-in">
            <span className="discovery-icon">{discovery.icon}</span>
            <span className="discovery-text">{discovery.text}</span>
            <span className="discovery-employee">- {discovery.employee}</span>
          </div>
        ))}
      </div>

      {/* Complete Button */}
      {transactionCount > 0 && (
        <button className="complete-processing-btn" onClick={onComplete}>
          View Results
        </button>
      )}
    </div>
  );
};

// ================================================================================
// MOBILE LIVE MODE
// ================================================================================

interface Employee {
  id: string;
  name: string;
  avatar: string;
  status: 'active' | 'idle' | 'processing';
  currentTask: string;
}

interface MobileLiveModeProps {
  employees: Employee[];
  isLive: boolean;
}

const MobileLiveMode: React.FC<MobileLiveModeProps> = ({ employees, isLive }) => {
  if (!MobileDetection.isMobile()) {
    return null;
  }

  const activeEmployees = employees.filter(emp => emp.status === 'active');

  return (
    <div className="mobile-live-mode">
      <div className="live-header">
        <h2>AI Team Live</h2>
        <div className="live-indicator">
          <span className={`pulse-dot ${isLive ? 'active' : ''}`}></span>
          <span>{activeEmployees.length} employees active</span>
        </div>
      </div>
      
      <div className="employee-grid">
        {employees.map((employee) => (
          <div key={employee.id} className={`employee-card ${employee.status}`}>
            <div className="employee-avatar">{employee.avatar}</div>
            <div className="employee-name">{employee.name}</div>
            <div className="employee-status">{employee.currentTask}</div>
            <div className={`status-indicator ${employee.status}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================================================================
// MOBILE BOTTOM NAVIGATION
// ================================================================================

interface MobileBottomNavProps {
  activeEmployee: string;
  onEmployeeSelect: (employeeId: string) => void;
  onUpload: () => void;
  notifications: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeEmployee,
  onEmployeeSelect,
  onUpload,
  notifications
}) => {
  const navigate = useNavigate();

  if (!MobileDetection.isMobile()) {
    return null;
  }

  const navItems = [
    { id: 'byte', icon: '📄', label: 'Byte', badge: notifications > 0 ? notifications.toString() : null },
    { id: 'prime', icon: '👑', label: 'Prime', badge: '!' },
    { id: 'crystal', icon: '🔮', label: 'Crystal', badge: null },
    { id: 'team', icon: '👥', label: 'Team', badge: '5' }
  ];

  return (
    <div className="mobile-bottom-nav">
      {navItems.map((item) => (
        <button 
          key={item.id}
          className={`nav-item ${activeEmployee === item.id ? 'active' : ''}`}
          onClick={() => onEmployeeSelect(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </button>
      ))}
      
      {/* Central Upload */}
      <button className="nav-upload" onClick={onUpload}>
        <span className="upload-icon">📸</span>
      </button>
    </div>
  );
};

// ================================================================================
// MAIN MOBILE REVOLUTION COMPONENT
// ================================================================================

interface MobileRevolutionProps {
  currentView: 'stories' | 'processing' | 'live' | 'upload';
  onViewChange: (view: string) => void;
  onUpload: () => void;
  isProcessing?: boolean;
  transactionCount?: number;
  discoveries?: Array<{icon: string, text: string, employee: string}>;
  activeEmployee?: string;
  notifications?: number;
  onEmployeeSelect?: (employeeId: string) => void;
  onStoryAction?: (action: string, storyId: string) => void;
}

const MobileRevolution: React.FC<MobileRevolutionProps> = ({
  currentView,
  onViewChange,
  onUpload,
  isProcessing = false,
  transactionCount = 0,
  discoveries = [],
  activeEmployee = 'prime',
  notifications = 0,
  onEmployeeSelect,
  onStoryAction
}) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const loadStories = async () => {
    // Transform existing data into story format
    const mockStories: Story[] = [
      {
        id: 'story-1',
        employee: { name: 'Byte', avatar: '📄', color: '#3b82f6' },
        type: 'discovery',
        content: {
          bigNumber: '$340',
          headline: 'Found in tax deductions!',
          detail: 'Ledger discovered several business expenses you can deduct this year.',
          actions: [
            { label: 'View Details', action: () => {} },
            { label: 'Share Win', action: () => {} }
          ]
        },
        styling: {
          background: 'gradient',
          avatar: '📄',
          accentColor: '#3b82f6'
        },
        timestamp: '2 min ago'
      },
      {
        id: 'story-2',
        employee: { name: 'Crystal', avatar: '🔮', color: '#8b5cf6' },
        type: 'insight',
        content: {
          bigNumber: '23%',
          headline: 'Spending pattern detected',
          detail: 'Your Tuesday spending is 23% higher than other days. Consider meal prep!',
          actions: [
            { label: 'View Analysis', action: () => {} },
            { label: 'Set Reminder', action: () => {} }
          ]
        },
        styling: {
          background: 'gradient',
          avatar: '🔮',
          accentColor: '#8b5cf6'
        },
        timestamp: '5 min ago'
      }
    ];
    setStories(mockStories);
  };

  const loadEmployees = () => {
    const mockEmployees: Employee[] = [
      { id: 'byte', name: 'Byte', avatar: '📄', status: 'active', currentTask: 'Processing documents' },
      { id: 'prime', name: 'Prime', avatar: '👑', status: 'active', currentTask: 'Executive summary' },
      { id: 'crystal', name: 'Crystal', avatar: '🔮', status: 'idle', currentTask: 'Standing by' },
      { id: 'ledger', name: 'Ledger', avatar: '📊', status: 'processing', currentTask: 'Tax calculations' }
    ];
    setEmployees(mockEmployees);
  };

  // Check if we're on mobile and should render
  useEffect(() => {
    const checkMobile = () => {
      const mobile = MobileDetection.isMobile();
      setIsMobile(mobile);
      
      if (mobile) {
        loadStories();
        loadEmployees();
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  const handleStoryAction = (action: string, storyId: string) => {
    if (onStoryAction) {
      onStoryAction(action, storyId);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    if (onEmployeeSelect) {
      onEmployeeSelect(employeeId);
    }
    onViewChange('stories');
  };

  const handleProcessingComplete = () => {
    onViewChange('stories');
  };

  if (!MobileDetection.isMobile()) {
    return null; // Don't render on desktop
  }

  return (
    <div className="mobile-revolution-container">
      {/* Main Content Area */}
      <div className="mobile-content">
        {currentView === 'stories' && (
          <MobileStoryFeed 
            stories={stories}
            onStoryAction={handleStoryAction}
          />
        )}
        
        {currentView === 'processing' && (
          <MobileProcessingShow
            isProcessing={isProcessing}
            transactionCount={transactionCount}
            discoveries={discoveries}
            onComplete={handleProcessingComplete}
          />
        )}
        
        {currentView === 'live' && (
          <MobileLiveMode
            employees={employees}
            isLive={true}
          />
        )}
      </div>

      {/* Bottom Navigation */}
              <MobileBottomNav
          activeEmployee={activeEmployee}
          onEmployeeSelect={handleEmployeeSelect}
          onUpload={onUpload}
          notifications={notifications}
        />
    </div>
  );
};

export default MobileRevolution;

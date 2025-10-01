/**
 * XSPENSESAI MOBILE REVOLUTION - STORY FEED IMPLEMENTATION
 * TikTok-style vertical swipe experience for financial insights
 * 
 * CRITICAL: This is MOBILE ONLY - Desktop remains unchanged
 * NO modifications to existing business logic or backend
 * Only adds new presentation layer for mobile devices
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Crown, Home, Upload, Bot, Bell, Mic
} from 'lucide-react';
import BossBubble from '../boss/BossBubble';
import { useAuth } from '../../contexts/AuthContext';
import MobileDebugPanel from '../dev/MobileDebugPanel';
import MobileNavInline from '../navigation/MobileNavInline';
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
    const isDashboardPage = window.location.pathname.includes('/dashboard');
    const isSmallScreen = window.innerWidth <= 768; // Match CSS breakpoint
    
    console.log('Component mobile detection:', { 
      isDashboardPage,
      windowWidth: window.innerWidth,
      pathname: window.location.pathname,
      result: isDashboardPage && isSmallScreen});
    
    // Show mobile view on dashboard pages with small screens
    return isDashboardPage && isSmallScreen;
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

  // Removed - using hook's isMobile prop instead

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

  // Removed - using hook's isMobile prop instead

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
  // Removed - using hook's isMobile prop instead

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
  onViewChange: (view: string) => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeEmployee,
  onEmployeeSelect,
  onUpload,
  onViewChange,
  notifications
}) => {
  const navigate = useNavigate();

  // Removed - using hook's isMobile prop instead

  const navItems = [
    { id: 'dashboard', icon: 'home', label: 'Home', badge: null },
    { id: 'import', icon: 'upload', label: 'Import', badge: null },
    { id: 'assistant', icon: 'bot', label: 'Assistant', badge: null },
    { id: 'podcast', icon: 'mic', label: 'Podcast', badge: null },
    { id: 'alerts', icon: 'bell', label: 'Alerts', badge: null }
  ];

  const handleNavClick = (itemId: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (itemId === 'dashboard') {
      onViewChange('dashboard');
    } else if (itemId === 'import') {
      onUpload();
    } else if (itemId === 'assistant') {
      // Navigate to AI Financial Assistant page
      console.log('Assistant button clicked - navigating to AI Financial Assistant');
      
      // Add visual feedback
      if (event) {
        const button = event.currentTarget;
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 150);
      }
      
      // Navigate to AI Financial Assistant
      navigate('/dashboard/ai-financial-assistant');
    } else if (itemId === 'podcast') {
      // Add visual feedback
      if (event) {
        const button = event.currentTarget;
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 150);
      }
      
      // Navigate to podcast route
      navigate('/dashboard/podcast');
    } else if (itemId === 'alerts') {
      // Handle alerts - could open notifications panel
      console.log('Alerts clicked');
    }
  };

  return (
    <div className="mobile-bottom-nav mobile-active">
      {navItems.map((item) => (
        <button 
          key={item.id}
          className={`nav-item ${activeEmployee === item.id ? 'active' : ''}`}
          onClick={(e) => handleNavClick(item.id, e)}
          data-id={item.id}
        >
          <span className="nav-icon">
            {item.icon === 'home' && <Home size={20} />}
            {item.icon === 'upload' && <Upload size={20} />}
            {item.icon === 'bot' && <Bot size={20} />}
            {item.icon === 'mic' && <Mic size={20} />}
            {item.icon === 'bell' && <Bell size={20} />}
          </span>
          <span className="nav-label">{item.label}</span>
          {item.badge && <span className="nav-badge">{item.badge}</span>}
        </button>
      ))}
    </div>
  );
};

// ================================================================================
// MAIN MOBILE REVOLUTION COMPONENT
// ================================================================================

interface MobileRevolutionProps {
  currentView: 'stories' | 'processing' | 'live' | 'upload' | 'dashboard' | 'chat';
  onViewChange: (view: string) => void;
  onUpload: () => void;
  isProcessing?: boolean;
  transactionCount?: number;
  discoveries?: Array<{icon: string, text: string, employee: string}>;
  activeEmployee?: string;
  notifications?: number;
  onEmployeeSelect?: (employeeId: string) => void;
  onStoryAction?: (action: string, storyId: string) => void;
  isMobile?: boolean;
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
  onStoryAction,
  isMobile: propIsMobile = false
}) => {
  const { pathname } = useLocation();
  
  // Get current route to determine what content to show
  const currentRoute = pathname;
  const isDashboardRoot = currentRoute === '/dashboard';
  const currentPage = currentRoute.split('/').pop() || 'dashboard';

  // ✅ Render on all dashboard routes (root and sub-routes)
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // Console logging for debugging
  console.log('[MobileRevolution] pathname:', pathname, 'isDashboardRoute:', isDashboardRoute, 'isMounted:', isDashboardRoute);

  // Track rendering content
  useEffect(() => {
    console.log('[MobileRevolution] Rendering content for pathname:', pathname, 'isDashboardRoute:', isDashboardRoute);
  }, [pathname, isDashboardRoute]);

  // If not a dashboard route, unmount completely - let other layouts handle non-dashboard pages
  if (!isDashboardRoute) return null;
  const [stories, setStories] = useState<Story[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: React.ReactNode;
  } | null>(null);
  
  const closeModal = () => {
    setModalOpen(false);
    setModalContent(null);
  };
  const navigate = useNavigate();
  const { user } = useAuth();

  // Handler functions for mobile cards (same as desktop)
  const handleImportNow = async () => {
    if (!user) return;
    
    // Create file input programmatically
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.jpg,.png,.jpeg';
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        onUpload(); // Trigger the upload process
      }
    };
    
    input.click();
  };

  const handleChatNow = async (employeeId: string = 'financial-assistant') => {
    if (!user) return;
    navigate('/dashboard/ai-financial-assistant');
  };

  const handleSetGoals = async () => {
    if (!user) return;
    navigate('/dashboard/goal-concierge');
  };

  const handleViewPredictions = async () => {
    if (!user) return;
    navigate('/dashboard/spending-predictions');
  };

  // Mobile-specific handlers that open modals instead of navigating

  // Mobile card handlers - Show mobile views instead of navigating
  const handleMobileCategorization = () => {
    console.log('Mobile: Showing AI Categorization view');
    // Instead of navigating, we'll show the categorization content within mobile
    // For now, let's navigate to the desktop version
    navigate('/dashboard/ai-categorization');
  };

  const handleMobileTransactions = () => {
    console.log('Mobile: Navigating to transactions');
    console.log('Mobile: Current pathname:', window.location.pathname);
    console.log('Mobile: Navigate function available:', typeof navigate);
    navigate('/dashboard/transactions');
  };

  const handleMobileSmartAutomation = () => {
    console.log('Mobile: Navigating to smart-automation');
    navigate('/dashboard/smart-automation');
  };

  const handleMobileDebtPlanner = () => {
    console.log('Mobile: Navigating to debt-payoff-planner');
    navigate('/dashboard/debt-payoff-planner');
  };

  const handleMobileFinancialFreedom = () => {
    navigate('/dashboard/ai-financial-freedom');
  };

  const handleMobileBillReminders = () => {
    navigate('/dashboard/bill-reminders');
  };

  const handleMobileFinancialStory = () => {
    navigate('/dashboard/financial-story');
  };

  const handleMobileFinancialTherapist = () => {
    navigate('/dashboard/financial-therapist');
  };

  const handleMobileWellnessStudio = () => {
    navigate('/dashboard/wellness-studio');
  };

  const handleMobileSpotifyIntegration = () => {
    navigate('/dashboard/spotify-integration');
  };

  const handleMobileTaxAssistant = () => {
    navigate('/dashboard/tax-assistant');
  };

  const handleMobileBusinessIntelligence = () => {
    navigate('/dashboard/business-intelligence');
  };

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

  // Mobile menu functionality
  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', hasDropdown: false },
    { name: 'Import Documents', path: '/dashboard/smart-import-ai', hasDropdown: false },
    { name: 'AI Assistant', path: '/dashboard/ai-financial-assistant', hasDropdown: false },
    { name: 'Transactions', path: '/dashboard/transactions', hasDropdown: false },
    { name: 'Reports', path: '/dashboard/reports', hasDropdown: false },
    { name: 'Wellness Studio', path: '/dashboard/wellness-studio', hasDropdown: false },
    { name: 'Settings', path: '/dashboard/settings', hasDropdown: false }
  ];




  // Use the isMobile prop from the hook instead of component's own detection
  useEffect(() => {
    console.log('Using isMobile prop from hook:', propIsMobile, 'Current view:', currentView);
    setIsMobile(propIsMobile);
    
    if (propIsMobile) {
      // NEVER load stories - always show dashboard view
      // loadStories(); // COMMENTED OUT - Never load stories
      loadEmployees();
    }
  }, [propIsMobile, currentView]);


  // Debug logging
  console.log('🚀 MobileRevolution render check:', {
    isMobile,
    propIsMobile,
    windowWidth: window.innerWidth,
    pathname: window.location.pathname,
    hasTouch: 'ontouchstart' in window,
    userAgent: navigator.userAgent,
    currentView});
  
  // Additional debugging for dashboard rendering
  console.log('🎯 Dashboard rendering check:', {
    currentView,
    isMobile,
    shouldRenderDashboard: currentView === 'dashboard' && isMobile,
    windowWidth: window.innerWidth});
  
  // Add visible debug indicator
  if (typeof window !== 'undefined') {
    console.log('🎯 MOBILE REVOLUTION IS RENDERING! (v2.0)');
    console.log('Props received:', { 
    isMobile, 
    propIsMobile, 
    currentView, 
    pathname: window.location.pathname,
    timestamp: Date.now()
  });
  }

  // Don't render on desktop - use ONLY the isMobile prop from hook
  if (!propIsMobile) {
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

  return (
    <div className="mobile-only mobile-revolution-container mobile-active">

      {/* Main Content Area */}
      <div className="mobile-content">
        <div className="mobile-dashboard" style={{ 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        }}>
            {/* Mobile Header */}
            <div className="mobile-header relative z-[60]">
              <div className="mobile-logo-section">
                <div className="mobile-logo-icon">
                  <Crown size={24} className="text-white" />
                </div>
                <div className="mobile-logo-text">XspensesAI</div>
              </div>

              {/* RIGHT ACTIONS */}
              <div className="mobile-nav-actions flex items-center gap-2">
                {/* Self-contained mobile navigation */}
                <MobileNavInline />
              </div>
            </div>
            
            {/* Dashboard Content - Shows different content based on route */}
            <div className="mobile-dashboard-content">
              {isDashboardRoot ? (
                <>
                  <h2 className="mobile-dashboard-title">FinTech Entertainment Platform</h2>
                  <p className="mobile-welcome-text">Welcome back, John! Here's your financial overview.</p>
                  <div className="mobile-dashboard-cards">
                {/* AI WORKSPACE CARDS */}
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📄</div>
                  <div className="mobile-card-content">
                    <h3>Smart Import AI</h3>
                    <p>Upload receipts and bank statements. Byte processes them instantly and you can chat about your data in real-time.</p>
                    <button className="mobile-card-button" onClick={handleImportNow}>Import & Chat</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🤖</div>
                  <div className="mobile-card-content">
                    <h3>AI Chat Assistant</h3>
                    <p>Chat with our AI assistant for personalized financial advice, insights, and real-time analysis of your data.</p>
                    <button className="mobile-card-button" onClick={() => handleChatNow('financial-assistant')}>Chat Now</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🏷️</div>
                  <div className="mobile-card-content">
                    <h3>Smart Categories</h3>
                    <p>Automatically categorize your transactions with AI. Learn from your corrections and improve over time.</p>
                    <button className="mobile-card-button" onClick={handleMobileCategorization}>Categorize Now</button>
                  </div>
                </div>

                {/* PLANNING & ANALYSIS CARDS */}
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📊</div>
                  <div className="mobile-card-content">
                    <h3>Transactions</h3>
                    <p>View and manage all your financial transactions with detailed insights.</p>
                    <button className="mobile-card-button" onClick={handleMobileTransactions}>View All</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🎯</div>
                  <div className="mobile-card-content">
                    <h3>AI Goal Concierge</h3>
                    <p>Set and track your financial goals with personalized coaching.</p>
                    <button className="mobile-card-button" onClick={handleSetGoals}>Set Goals</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">⚡</div>
                  <div className="mobile-card-content">
                    <h3>Smart Automation</h3>
                    <p>Automate repetitive financial tasks with AI-powered workflows.</p>
                    <button className="mobile-card-button" onClick={handleMobileSmartAutomation}>Configure</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📈</div>
                  <div className="mobile-card-content">
                    <h3>Spending Predictions</h3>
                    <p>AI-powered forecasts of your future spending patterns and trends.</p>
                    <button className="mobile-card-button" onClick={handleViewPredictions}>View Predictions</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">💳</div>
                  <div className="mobile-card-content">
                    <h3>Debt Payoff Planner</h3>
                    <p>Military-style debt destruction strategies and motivation.</p>
                    <button className="mobile-card-button" onClick={handleMobileDebtPlanner}>Attack Debt</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">💰</div>
                  <div className="mobile-card-content">
                    <h3>AI Financial Freedom</h3>
                    <p>Wise investment advice and long-term wealth building strategies.</p>
                    <button className="mobile-card-button" onClick={handleMobileFinancialFreedom}>Get Strategy</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🔔</div>
                  <div className="mobile-card-content">
                    <h3>Bill Reminder System</h3>
                    <p>Never miss a payment with smart reminders and automated tracking.</p>
                    <button className="mobile-card-button" onClick={handleMobileBillReminders}>Set Reminders</button>
                  </div>
                </div>

                {/* ENTERTAINMENT & WELLNESS CARDS */}
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🎙️</div>
                  <div className="mobile-card-content">
                    <h3>Personal Podcast</h3>
                    <p>AI-generated podcasts about your financial journey and money story.</p>
                    <button className="mobile-card-button" onClick={() => navigate('/dashboard/podcast')}>Listen Now</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📖</div>
                  <div className="mobile-card-content">
                    <h3>Financial Story</h3>
                    <p>Transform your financial data into engaging stories with AI storytellers.</p>
                    <button className="mobile-card-button" onClick={handleMobileFinancialStory}>Create Story</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">💖</div>
                  <div className="mobile-card-content">
                    <h3>AI Financial Therapist</h3>
                    <p>Emotional and behavioral coaching to improve your financial wellness. Chat about money stress and get support.</p>
                    <button className="mobile-card-button" onClick={handleMobileFinancialTherapist}>Start Session</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🧘</div>
                  <div className="mobile-card-content">
                    <h3>Wellness Studio</h3>
                    <p>Educational content and guided sessions for financial health and wellness.</p>
                    <button className="mobile-card-button" onClick={handleMobileWellnessStudio}>Start Session</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">🎵</div>
                  <div className="mobile-card-content">
                    <h3>Spotify Integration</h3>
                    <p>Curated playlists for focus, relaxation, and financial motivation.</p>
                    <button className="mobile-card-button" onClick={handleMobileSpotifyIntegration}>Connect</button>
                  </div>
                </div>

                {/* BUSINESS & TAX CARDS */}
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📋</div>
                  <div className="mobile-card-content">
                    <h3>Tax Assistant</h3>
                    <p>AI-powered tax preparation and optimization for maximum savings.</p>
                    <button className="mobile-card-button" onClick={handleMobileTaxAssistant}>Get Started</button>
                  </div>
                </div>
                <div className="mobile-card min-h-[120px] rounded-2xl bg-white/10 backdrop-blur-md">
                  <div className="mobile-card-icon">📊</div>
                  <div className="mobile-card-content">
                    <h3>Business Intelligence</h3>
                    <p>Advanced analytics and insights for business growth and optimization.</p>
                    <button className="mobile-card-button" onClick={handleMobileBusinessIntelligence}>View Reports</button>
                  </div>
                </div>
                  </div>
                </>
              ) : (
                <div className="mobile-page-content">
                  <h2 className="mobile-dashboard-title">Mobile View</h2>
                  <p className="mobile-welcome-text">Current page: {currentPage}</p>
                  <div className="mobile-page-info">
                    <p>This is a mobile-optimized view for: {currentRoute}</p>
                    <button 
                      className="mobile-card-button" 
                      onClick={() => navigate('/dashboard')}
                      style={{ marginTop: '20px' }}
                    >
                      Back to Dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>

      {/* Bottom Navigation - MobileRevolution's custom navbar */}
      <MobileBottomNav
        activeEmployee={activeEmployee}
        onEmployeeSelect={handleEmployeeSelect}
        onUpload={onUpload}
        notifications={notifications}
        onViewChange={onViewChange}
      />
      
      {/* Prime Chatbot - Using the main BossBubble component */}
      <BossBubble />

      {/* Mobile Modal for Card Content */}
      {modalOpen && modalContent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={closeModal}>
          <div style={{
            width: '100%',
            maxWidth: '400px',
            maxHeight: '70vh',
            backgroundColor: '#1a1a2e',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            position: 'relative',
            padding: '24px'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
                margin: 0
              }}>
                {modalContent.title}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{
              color: 'white',
              lineHeight: '1.6'
            }}>
              {modalContent.content}
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <MobileDebugPanel data={{
        path: window.location.pathname,
        width: window.innerWidth,
        isMobile: propIsMobile,
        isMobileByWidth: window.innerWidth <= 768,
        isLikelyMobileUA: /iphone|android|ipad|ipod|mobile|silk|kindle|opera mini|palm|blackberry/.test(navigator.userAgent.toLowerCase()),
        isExcludedRoute: false,
        shouldRenderMobile: propIsMobile,
        currentView: currentView
      }} />

    </div>
  );
};

export default MobileRevolution;

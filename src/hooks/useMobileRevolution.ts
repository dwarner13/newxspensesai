/**
 * MOBILE REVOLUTION INTEGRATION HOOK
 * Connects mobile revolution with existing app functionality
 * 
 * CRITICAL: This is a bridge layer - no business logic changes
 * Only connects mobile UI to existing functions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOBILE_CONFIG } from '../config/mobile';

interface MobileRevolutionState {
  currentView: 'stories' | 'processing' | 'live' | 'upload' | 'dashboard' | 'chat';
  isProcessing: boolean;
  transactionCount: number;
  discoveries: Array<{
    icon: string;
    text: string;
    employee: string;
  }>;
  activeEmployee: string;
  notifications: number;
}

interface MobileDebugData {
  path: string;
  width: number;
  isMobile: boolean;
  isMobileByWidth: boolean;
  isLikelyMobileUA: boolean;
  isExcludedRoute: boolean;
  shouldRenderMobile: boolean;
  currentView?: string;
}

export const useMobileRevolution = () => {
  const navigate = useNavigate();
  
  // Robust device detection with width tracking
  const [width, setWidth] = useState<number>(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // User Agent detection for mobile devices
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '').toLowerCase();
  const isLikelyMobileUA = /iphone|android|ipad|ipod|mobile|silk|kindle|opera mini|palm|blackberry/.test(ua);

  // Mobile detection logic
  const isMobileByWidth = width < MOBILE_CONFIG.MOBILE_MAX;
  const isMobile = isMobileByWidth || isLikelyMobileUA;
  
  // TEMPORARY: Force mobile for testing - DISABLED now that mobile layout is working
  const forceMobileForTesting = false;
  const finalIsMobile = forceMobileForTesting || isMobile;

  // Route exclusion logic with force override
  const pathname = window.location.pathname;
  const forceMobile = MOBILE_CONFIG.FORCE_ENABLED;
  const isExcludedRoute = !forceMobile && MOBILE_CONFIG.excludedRoutes.includes(pathname as any);
  const shouldRenderMobile = finalIsMobile && !isExcludedRoute;
  
  // Debug logging (reduced for production)
  if (import.meta.env.DEV) {
    console.log('[useMobileRevolution] Debug info:', {
      pathname,
      width,
      isMobileByWidth,
      isLikelyMobileUA,
      finalIsMobile,
      isExcludedRoute,
      shouldRenderMobile,
      forceMobileForTesting
    });
  }
  
  // Determine initial view based on current route
  const getInitialView = (): MobileRevolutionState['currentView'] => {
    if (import.meta.env.DEV) {
      console.log('Getting initial view for path:', pathname);
    }
    
    if (isExcludedRoute && !forceMobile) {
      if (import.meta.env.DEV) {
        console.log('Path excluded from MobileRevolution:', pathname);
      }
      return 'dashboard'; // Default view for excluded routes
    }
    
    // Map routes to views
    if (pathname === '/dashboard') return 'dashboard';
    if (pathname === '/dashboard/upload') return 'upload';
    if (pathname === '/dashboard/processing') return 'processing';
    if (pathname === '/dashboard/live') return 'live';
    if (pathname === '/dashboard/chat') return 'chat';
    
    return 'stories'; // Default to stories view
  };

  const [currentView, setCurrentView] = useState<MobileRevolutionState['currentView']>(getInitialView);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionCount, setTransactionCount] = useState(0);
  const [discoveries, setDiscoveries] = useState<MobileRevolutionState['discoveries']>([]);
  const [activeEmployee, setActiveEmployee] = useState('prime');
  const [notifications, setNotifications] = useState(0);

  // Listen for route changes
  useEffect(() => {
    const handleRouteChange = () => {
      const newView = getInitialView();
      if (import.meta.env.DEV) {
        console.log('Route changed, updating view to:', newView);
      }
      setCurrentView(newView);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    
    // Also listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleRouteChange, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleRouteChange, 0);
    };

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [pathname, isExcludedRoute, forceMobile]);

  // Debug data for the debug panel
  const debugData: MobileDebugData = {
    path: pathname,
    width,
    isMobile: finalIsMobile,
    isMobileByWidth,
    isLikelyMobileUA,
    isExcludedRoute,
    shouldRenderMobile,
    currentView
  };

  // Handler functions for mobile cards
  const handleViewChange = (view: MobileRevolutionState['currentView']) => {
    if (import.meta.env.DEV) {
      console.log('Changing view to:', view);
    }
    setCurrentView(view);
  };

  const handleUpload = () => {
    if (import.meta.env.DEV) {
      console.log('Upload triggered from mobile');
    }
    setIsProcessing(true);
    setTransactionCount(prev => prev + 1);
    
    // Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      setDiscoveries(prev => [...prev, {
        icon: '📊',
        text: 'New transaction discovered',
        employee: 'Byte'
      }]);
    }, 2000);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setTransactionCount(prev => prev + 5);
    setDiscoveries(prev => [...prev, {
      icon: '🎯',
      text: 'Spending patterns identified',
      employee: 'Tag'
    }]);
  };

  const handleLiveMode = () => {
    setCurrentView('live');
    setActiveEmployee('prime');
    setNotifications(prev => prev + 1);
  };

  const handleChat = () => {
    setCurrentView('chat');
    navigate('/dashboard/ai-financial-assistant');
  };

  const handleSetGoals = () => {
    navigate('/dashboard/goal-concierge');
  };

  const handleViewTransactions = () => {
        navigate('/dashboard/transactions');
  };

  const handleViewReports = () => {
    navigate('/dashboard/reports');
  };

  const handleSettings = () => {
    navigate('/dashboard/settings');
  };

  // Log mobile detection state for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Mobile detection state:', {
        pathname,
        width,
        isMobile: finalIsMobile,
        isMobileByWidth,
        isLikelyMobileUA,
        isExcludedRoute,
        shouldRenderMobile,
        forceMobile,
        currentView,
        forceMobileForTesting
      });
    }
  }, [pathname, width, finalIsMobile, isMobileByWidth, isLikelyMobileUA, isExcludedRoute, shouldRenderMobile, forceMobile, currentView]);
  
  return {
    // Core state
    currentView,
    isProcessing,
    transactionCount,
    discoveries,
    activeEmployee,
    notifications,
    
    // Mobile detection
    isMobile: finalIsMobile,
    shouldRenderMobile,
    debugData,
    
    // Handlers
    handleViewChange,
    handleUpload,
    handleProcessingComplete,
    handleLiveMode,
    handleChat,
    handleSetGoals,
    handleViewTransactions,
    handleViewReports,
    handleSettings,
  };
};
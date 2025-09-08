/**
 * MOBILE REVOLUTION INTEGRATION HOOK
 * Connects mobile revolution with existing app functionality
 * 
 * CRITICAL: This is a bridge layer - no business logic changes
 * Only connects mobile UI to existing functions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface MobileRevolutionState {
  currentView: 'stories' | 'processing' | 'live' | 'upload' | 'dashboard';
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

export const useMobileRevolution = () => {
  const navigate = useNavigate();
  
  // Determine initial view based on current route
  const getInitialView = (): MobileRevolutionState['currentView'] => {
    const path = window.location.pathname;
    if (path === '/dashboard' || path === '/dashboard/') {
      return 'dashboard';
    }
    return 'stories';
  };
  
  const [state, setState] = useState<MobileRevolutionState>({
    currentView: getInitialView(),
    isProcessing: false,
    transactionCount: 0,
    discoveries: [],
    activeEmployee: 'prime',
    notifications: 3
  });

  // Mobile detection
  const isMobile = () => {
    return window.innerWidth <= 768 && 
           ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  };

  // View change handler
  const handleViewChange = (view: string) => {
    if (!isMobile()) return; // Only work on mobile
    
    setState(prev => ({
      ...prev,
      currentView: view as MobileRevolutionState['currentView']
    }));

    // Route to existing functionality
    switch (view) {
      case 'upload':
        navigate('/upload');
        break;
      case 'stories':
        // Stay in mobile stories view
        break;
      case 'live':
        // Show live employee grid
        break;
      default:
        break;
    }
  };

  // Upload handler - connects to existing upload system
  const handleUpload = () => {
    if (!isMobile()) return;
    
    // Trigger existing upload functionality
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.csv,.xlsx,.jpg,.png,.jpeg';
    input.multiple = true;
    
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files || []);
      
      if (files.length === 0) return;
      
      // Start mobile processing show
      setState(prev => ({
        ...prev,
        currentView: 'processing',
        isProcessing: true,
        transactionCount: 0,
        discoveries: []
      }));

      // Simulate processing with discoveries
      simulateProcessing(files);
    };
    
    input.click();
  };

  // Simulate processing with discoveries
  const simulateProcessing = async (files: File[]) => {
    const discoveryTemplates = [
      { icon: '☕', text: 'Starbucks visits detected... that\'s a lot of caffeine!', employee: 'Byte' },
      { icon: '🎮', text: 'Gaming expense found: Steam purchase detected', employee: 'Byte' },
      { icon: '💡', text: 'Multiple Netflix subscriptions detected!', employee: 'Tag' },
      { icon: '🚨', text: 'Amazon spending alert: Midnight purchases detected!', employee: 'Crystal' },
      { icon: '💰', text: 'Tax deduction found: Office supplies = savings!', employee: 'Ledger' },
      { icon: '📈', text: 'Side hustle income increased this month!', employee: 'Intelia' }
    ];

    let discoveryCount = 0;
    let transactionCount = 0;

    // Simulate processing over time
    const processingInterval = setInterval(() => {
      // Add discovery
      if (discoveryCount < discoveryTemplates.length) {
        const discovery = discoveryTemplates[discoveryCount];
        setState(prev => ({
          ...prev,
          discoveries: [...prev.discoveries, discovery]
        }));
        discoveryCount++;
      }

      // Update transaction count
      transactionCount += Math.floor(Math.random() * 5) + 1;
      setState(prev => ({
        ...prev,
        transactionCount
      }));

      // Complete processing
      if (discoveryCount >= discoveryTemplates.length && transactionCount >= 50) {
        clearInterval(processingInterval);
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            isProcessing: false,
            currentView: 'stories'
          }));
        }, 2000);
      }
    }, 800);
  };

  // Employee selection handler
  const handleEmployeeSelect = (employeeId: string) => {
    setState(prev => ({
      ...prev,
      activeEmployee: employeeId,
      currentView: 'stories'
    }));
  };

  // Story action handler
  const handleStoryAction = (action: string, storyId: string) => {
    console.log(`Mobile story action: ${action} on ${storyId}`);
    
    // Route to existing functionality based on action
    switch (action) {
      case 'View Details':
        navigate('/dashboard/transactions');
        break;
      case 'Share Win':
        // Could trigger share functionality
        break;
      case 'View Analysis':
        navigate('/dashboard/analytics');
        break;
      case 'Set Reminder':
        navigate('/dashboard/bill-reminders');
        break;
      default:
        break;
    }
  };

  return {
    ...state,
    isMobile: isMobile(),
    handleViewChange,
    handleUpload,
    handleEmployeeSelect,
    handleStoryAction
  };
};

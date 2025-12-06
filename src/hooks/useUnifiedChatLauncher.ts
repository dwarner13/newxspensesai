/**
 * Unified Chat Launcher Hook
 * 
 * Provides a simple API to open the unified chat from anywhere in the app
 * with context and initial employee preference.
 */

import { useState, useCallback, useEffect } from 'react';
import { getEmployeeDisplay } from '../utils/employeeUtils';

export interface ChatLaunchOptions {
  initialEmployeeSlug?: string;
  context?: {
    page?: string;
    filters?: any;
    selectionIds?: string[];
    data?: any;
  };
  initialQuestion?: string;
  conversationId?: string;
}

interface ChatState {
  isOpen: boolean;
  options: ChatLaunchOptions;
  activeEmployeeSlug?: string;
  activeEmployeeEmoji?: string;
  activeEmployeeShortName?: string;
  isWorking: boolean;
  hasCompletedResponse: boolean;
  hasNewResponse: boolean; // Alias for hasCompletedResponse for clarity
  hasAttention: boolean; // Visual attention state (pulse when true)
  hasActivity: boolean; // Activity/unread state (gradient + pulse)
  lastAssistantMessageAt?: number; // Timestamp of last assistant message
  lastChatViewedAt?: number; // Timestamp when chat was last opened
  progress?: number; // Optional 0-1 progress for long tasks
}

// Global state for chat (shared across components)
let globalChatState: ChatState = {
  isOpen: false,
  options: {},
  activeEmployeeSlug: 'prime-boss', // Default to Prime
  activeEmployeeEmoji: '👑',
  activeEmployeeShortName: 'Prime',
  isWorking: false,
  hasCompletedResponse: false,
  hasNewResponse: false,
  hasAttention: false,
  hasActivity: false,
  lastAssistantMessageAt: undefined,
  lastChatViewedAt: undefined,
  progress: undefined,
};

const listeners = new Set<(state: ChatState) => void>();

function notifyListeners() {
  listeners.forEach(listener => listener(globalChatState));
}

export function useUnifiedChatLauncher() {
  const [state, setState] = useState<ChatState>(globalChatState);

  // Subscribe to global state changes
  useEffect(() => {
    const listener = (newState: ChatState) => {
      setState(newState);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const openChat = useCallback((options?: ChatLaunchOptions) => {
    const newSlug = options?.initialEmployeeSlug || globalChatState.activeEmployeeSlug || 'prime-boss';
    // Update employee display info when opening
    const display = getEmployeeDisplay(newSlug);
    
    globalChatState = {
      ...globalChatState,
      isOpen: true,
      options: options || {},
      activeEmployeeSlug: newSlug,
      activeEmployeeEmoji: display.emoji,
      activeEmployeeShortName: display.shortName,
      hasCompletedResponse: false, // Clear completed response when opening
      hasNewResponse: false, // Clear new response when opening
      hasAttention: false, // Clear attention when opening
      hasActivity: false, // Clear activity when opening
      lastChatViewedAt: Date.now(), // Update last viewed timestamp
    };
    notifyListeners();
    
    // NOTE: Removed event dispatch to prevent infinite recursion
    // Components should use the hook directly via useUnifiedChatLauncher()
    // React's state system handles reactivity automatically
  }, []);

  const closeChat = useCallback(() => {
    globalChatState = {
      ...globalChatState,
      isOpen: false,
      options: {},
    };
    notifyListeners();
    
    // NOTE: Removed event dispatch to prevent infinite recursion
    // Components should use the hook directly via useUnifiedChatLauncher()
  }, []);

  const setChatContext = useCallback((context: ChatLaunchOptions['context']) => {
    globalChatState = {
      ...globalChatState,
      options: {
        ...globalChatState.options,
        context,
      },
    };
    notifyListeners();
  }, []);

  const setActiveEmployee = useCallback((employeeSlug: string) => {
    // Update employee display info when employee changes
    const display = getEmployeeDisplay(employeeSlug);
    
    globalChatState = {
      ...globalChatState,
      activeEmployeeSlug: employeeSlug,
      activeEmployeeEmoji: display.emoji,
      activeEmployeeShortName: display.shortName,
    };
    notifyListeners();
  }, []);

  const setIsWorking = useCallback((working: boolean) => {
    globalChatState = {
      ...globalChatState,
      isWorking: working,
    };
    notifyListeners();
  }, []);

  const setHasCompletedResponse = useCallback((completed: boolean) => {
    const now = Date.now();
    globalChatState = {
      ...globalChatState,
      hasCompletedResponse: completed,
      hasNewResponse: completed, // Keep in sync
      hasAttention: completed && !globalChatState.isOpen, // Set attention when completed and closed
      hasActivity: completed && !globalChatState.isOpen, // Set activity when completed and closed
      lastAssistantMessageAt: completed ? now : globalChatState.lastAssistantMessageAt,
    };
    notifyListeners();
  }, []);

  const setHasAttention = useCallback((attention: boolean) => {
    globalChatState = {
      ...globalChatState,
      hasAttention: attention,
      hasActivity: attention && !globalChatState.isOpen, // Sync activity with attention when closed
    };
    notifyListeners();
  }, []);

  const setHasActivity = useCallback((activity: boolean) => {
    globalChatState = {
      ...globalChatState,
      hasActivity: activity,
    };
    notifyListeners();
  }, []);

  const setProgress = useCallback((progress?: number) => {
    globalChatState = {
      ...globalChatState,
      progress,
    };
    notifyListeners();
  }, []);

  return {
    isOpen: state.isOpen,
    options: state.options,
    activeEmployeeSlug: state.activeEmployeeSlug || 'prime-boss',
    activeEmployeeEmoji: state.activeEmployeeEmoji || '👑',
    activeEmployeeShortName: state.activeEmployeeShortName || 'Prime',
    isWorking: state.isWorking || false,
    hasCompletedResponse: state.hasCompletedResponse || false,
    hasNewResponse: state.hasNewResponse || state.hasCompletedResponse || false,
    hasAttention: state.hasAttention || false,
    hasActivity: state.hasActivity || false,
    progress: state.progress,
    openChat,
    closeChat,
    setChatContext,
    setActiveEmployee,
    setIsWorking,
    setHasCompletedResponse,
    setHasAttention,
    setHasActivity,
    setProgress,
  };
}

// Export global functions for use outside React components
export function openUnifiedChat(options?: ChatLaunchOptions) {
  const newSlug = options?.initialEmployeeSlug || globalChatState.activeEmployeeSlug || 'prime-boss';
  const display = getEmployeeDisplay(newSlug);
  
  globalChatState = {
    ...globalChatState,
    isOpen: true,
    options: options || {},
    activeEmployeeSlug: newSlug,
    activeEmployeeEmoji: display.emoji,
    activeEmployeeShortName: display.shortName,
  };
  notifyListeners();
  
  // NOTE: Removed event dispatch to prevent infinite recursion
  // Components should use the hook directly via useUnifiedChatLauncher()
}

export function closeUnifiedChat() {
  globalChatState = {
    ...globalChatState,
    isOpen: false,
    options: {},
  };
  notifyListeners();
  
  // NOTE: Removed event dispatch to prevent infinite recursion
  // Components should use the hook directly via useUnifiedChatLauncher()
}


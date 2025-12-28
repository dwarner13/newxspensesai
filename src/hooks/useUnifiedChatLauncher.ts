/**
 * Unified Chat Launcher Hook
 * 
 * Provides a simple API to open the unified chat from anywhere in the app
 * with context and initial employee preference.
 */

import { useState, useCallback, useEffect } from 'react';
import { getEmployeeDisplay } from '../utils/employeeUtils';
import { ONBOARDING_MODE } from '../config/onboardingConfig';

// Helper to check onboarding state without React hooks (for use in callbacks)
// CRITICAL: Defaults to TRUE (blocking) during initial load to prevent race conditions
function checkOnboardingActive(): boolean {
  try {
    // If legacy onboarding is disabled, never block chat
    if (!ONBOARDING_MODE.legacyEnabled) {
      return false; // Onboarding disabled - DO NOT BLOCK
    }
    
    // Check window state set by UnifiedOnboardingFlow
    const onboardingState = (window as any).__onboardingState;
    const currentStep = onboardingState?.currentStep;
    
    // Block Prime chat if onboarding is open OR if we're in Custodian phase
    if (onboardingState?.isOpen === true || currentStep === 'custodian') {
      return true; // Modal is open or in Custodian phase - BLOCK
    }
    
    // Check profile metadata for completion
    const profileData = (window as any).__profileData;
    if (profileData?.metadata && typeof profileData.metadata === 'object') {
      const metadata = profileData.metadata as any;
      const completed = metadata.onboarding?.completed === true;
      return !completed; // Active if not completed - BLOCK
    }
    
    // RACE CONDITION PREVENTION: If no profile data yet, assume onboarding is active
    // This prevents auto-open during initial load before profile resolves
    // Only allow chat if we have explicit confirmation that onboarding is complete
    if (!profileData) {
      return true; // No profile data = assume onboarding active - BLOCK
    }
    
    // If no metadata object exists, assume incomplete (onboarding active) - BLOCK
    return true;
  } catch (e) {
    // If check fails, fail closed (block chat) to prevent race conditions
    return true; // Changed from false to true - BLOCK on error
  }
}

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
  force?: boolean; // Force open even if explicitly closed (for user-initiated opens)
}

interface ChatState {
  isOpen: boolean;
  options: ChatLaunchOptions;
  activeEmployeeSlug?: string;
  activeEmployeeEmoji?: string;
  activeEmployeeShortName?: string;
  activeEmployeeSlugOverride?: string | null; // PART 2: Route-aware override (UI-only)
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
  activeEmployeeSlugOverride: null, // PART 2: Route-aware override (UI-only)
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

// Track if chat was explicitly closed by user (prevents auto-reopen)
let wasExplicitlyClosedRef: { current: boolean } = { current: false };

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
    // Guard: Don't auto-open if user explicitly closed chat recently
    // This prevents route-based auto-open from reopening after user closes
    if (wasExplicitlyClosedRef.current && !options?.force) {
      if (import.meta.env.DEV) {
        console.log('[useUnifiedChatLauncher] Chat was explicitly closed, skipping auto-open');
      }
      return;
    }
    
    // HARD BLOCK: Do not open chat during onboarding
    // This check MUST happen BEFORE any "Opening worker chat" log
    const onboardingActive = checkOnboardingActive();
    
    if (onboardingActive) {
      console.info('[CHAT_GATE] blocked useUnifiedChatLauncher during onboarding', {
        source: 'useUnifiedChatLauncher.openChat',
        employeeSlug: options?.initialEmployeeSlug || 'prime-boss',
        windowState: (window as any).__onboardingState,
        hasProfileData: !!(window as any).__profileData,
      });
      return; // Block opening during onboarding - EXIT BEFORE ANY LOGS
    }
    
    // Make initialEmployeeSlug authoritative - if provided, use it; otherwise fallback to current activeEmployeeSlug or default
    const newSlug = options?.initialEmployeeSlug || globalChatState.activeEmployeeSlug || 'prime-boss';
    // Update employee display info when opening
    const display = getEmployeeDisplay(newSlug);
    
    // Dev log for debugging - ONLY REACHED IF ONBOARDING IS NOT ACTIVE
    if (import.meta.env.DEV) {
      console.log(`[useUnifiedChatLauncher] Opening worker chat: ${newSlug}`, {
        providedSlug: options?.initialEmployeeSlug,
        currentActiveSlug: globalChatState.activeEmployeeSlug,
        resolvedSlug: newSlug,
      });
    }
    
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
    // Mark as explicitly closed to prevent auto-reopen
    wasExplicitlyClosedRef.current = true;
    
    globalChatState = {
      ...globalChatState,
      isOpen: false,
      options: {},
    };
    notifyListeners();
    
    // Reset flag after a short delay to allow route-based opens on new navigation
    setTimeout(() => {
      wasExplicitlyClosedRef.current = false;
    }, 1000);
    
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

  // PART 2: Set active employee override (route-aware, UI-only)
  const setActiveEmployeeSlugOverride = useCallback((slug: string | null) => {
    globalChatState = {
      ...globalChatState,
      activeEmployeeSlugOverride: slug,
    };
    notifyListeners();
  }, []);

  // Compute effective employee slug: override > activeEmployeeSlug > default
  const effectiveEmployeeSlug = state.activeEmployeeSlugOverride ?? state.activeEmployeeSlug ?? 'prime-boss';

  return {
    isOpen: state.isOpen,
    options: state.options,
    activeEmployeeSlug: effectiveEmployeeSlug,
    activeEmployeeEmoji: state.activeEmployeeEmoji || '👑',
    activeEmployeeShortName: state.activeEmployeeShortName || 'Prime',
    activeEmployeeSlugOverride: state.activeEmployeeSlugOverride ?? null,
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
    setActiveEmployeeSlugOverride,
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


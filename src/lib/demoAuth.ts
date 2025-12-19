/**
 * Demo Auth Utility
 * 
 * Manages guest session for localhost demo mode.
 * Only active when:
 * - window.location.hostname === 'localhost' OR
 * - VITE_DEMO_MODE === 'true'
 */

const GUEST_SESSION_KEY = 'xspensesai_guest_session';
export const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || '00000000-0000-4000-8000-000000000001';
export const DEMO_USER_EMAIL = 'guest@xspensesai.local';
export const DEMO_USER_NAME = 'Guest';

export interface GuestSession {
  demo_user_id: string;
  demo_user_email: string;
  demo_user_name: string;
  demo_session: boolean;
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  // Check explicit env flag
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  
  // Check if running on localhost
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }
  
  return false;
}

/**
 * Set guest session in localStorage
 */
export function setGuestSession(): void {
  if (!isDemoMode()) {
    console.warn('[demoAuth] Demo mode not enabled - cannot set guest session');
    return;
  }
  
  const session: GuestSession = {
    demo_user_id: DEMO_USER_ID,
    demo_user_email: DEMO_USER_EMAIL,
    demo_user_name: DEMO_USER_NAME,
    demo_session: true,
  };
  
  try {
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
    console.log('[demoAuth] Guest session set:', session);
  } catch (error) {
    console.error('[demoAuth] Failed to set guest session:', error);
  }
}

/**
 * Get guest session from localStorage
 */
export function getGuestSession(): GuestSession | null {
  if (!isDemoMode()) {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(GUEST_SESSION_KEY);
    if (!stored) {
      return null;
    }
    
    const session = JSON.parse(stored) as GuestSession;
    
    // Validate session structure
    if (session.demo_session && session.demo_user_id) {
      return session;
    }
    
    return null;
  } catch (error) {
    console.error('[demoAuth] Failed to get guest session:', error);
    return null;
  }
}

/**
 * Clear guest session from localStorage
 */
export function clearGuestSession(): void {
  try {
    localStorage.removeItem(GUEST_SESSION_KEY);
    console.log('[demoAuth] Guest session cleared');
  } catch (error) {
    console.error('[demoAuth] Failed to clear guest session:', error);
  }
}

/**
 * Check if current session is a guest session
 */
export function isGuestSession(): boolean {
  return getGuestSession() !== null;
}

/**
 * Create a user object compatible with AuthContext from guest session
 */
export function createGuestUser(): any {
  const session = getGuestSession();
  if (!session) {
    return null;
  }
  
  return {
    id: session.demo_user_id,
    email: session.demo_user_email,
    user_metadata: {
      full_name: session.demo_user_name,
      name: session.demo_user_name,
    },
  };
}


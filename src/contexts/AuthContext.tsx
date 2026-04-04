import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getSupabase } from '../lib/supabase';
import { isDemoMode, getGuestSession, createGuestUser } from '../lib/demoAuth';
import { getOrCreateProfile, type Profile } from '../lib/profileHelpers';
import { log, warn } from '../lib/logger';
import { resetChatUserInitiated } from '../hooks/useUnifiedChatLauncher';
import { getSessionFlag, setSessionFlag, clearWelcomeFlagsForUser } from '../lib/welcomeSession';

interface AuthContextType {
  user: any;
  userId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearDevice: () => Promise<void>;
  session: any;
  ready: boolean;
  isDemoUser: boolean;
  firstName: string; // User's first name for personalization
  profile: Profile | null; // Full profile data
  isProfileLoading: boolean; // Separate from auth loading
  refreshProfile: () => Promise<void>; // Refresh profile from DB
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Check if demo mode is allowed
 * Demo mode is ONLY allowed when explicitly enabled via VITE_ALLOW_DEMO_FALLBACK=true
 * Default: OFF (no demo fallback, require real auth)
 */
function isDemoAllowed(): boolean {
  // Only allow demo if explicitly enabled via env flag
  return import.meta.env.VITE_ALLOW_DEMO_FALLBACK === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-4000-8000-000000000001";
  const demoAllowed = isDemoAllowed();
  
  // Dev-only logging
  if (import.meta.env.DEV) {
    log('[AuthContext] Environment:', {
      mode: import.meta.env.DEV ? 'dev' : 'production',
      demoEnabled: demoAllowed,
      forceDemo: import.meta.env.VITE_FORCE_DEMO === 'true',
    });
  }
  
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Removed didRouteToOnboardingRef - RouteDecisionGate owns routing decisions
  
  // Track last auth event for greeting toast
  const lastAuthEventRef = useRef<'SIGNED_IN' | 'SIGNED_UP' | 'SHOWN' | null>(null);
  const handledSignInTokenRef = useRef<string | null>(null);
  const handledSignInUserIdRef = useRef<string | null>(null);
  const didShowToastRef = useRef<{ signedIn?: string; signedUp?: string }>({});
  
  // Compute firstName from profile or user metadata
  // Priority: profile.metadata.display_name > profile.metadata.first_name > profile.display_name > profile.full_name > user.user_metadata.display_name > user.user_metadata.first_name > user.user_metadata.full_name > user.user_metadata.name > email prefix > "there"
  const firstName = useMemo(() => {
    const raw =
      profile?.metadata?.display_name ||
      profile?.metadata?.first_name ||
      profile?.display_name ||
      profile?.full_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0];
    
    if (!raw) return 'there';
    const part = raw.split(' ')[0];
    return part.charAt(0).toUpperCase() + part.slice(1);
  }, [profile, user]);

  // Helper to get time-of-day greeting based on timezone
  const getTimeGreeting = useCallback((timezone?: string | null): string => {
    try {
      const now = timezone 
        ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
        : new Date();
      const hour = now.getHours();
      
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Good night';
    } catch (e) {
      // Fallback to local time if timezone invalid
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Good morning';
      if (hour >= 12 && hour < 17) return 'Good afternoon';
      if (hour >= 17 && hour < 22) return 'Good evening';
      return 'Good night';
    }
  }, []);

  // Show greeting toast after profile loads
  // CRITICAL: Only triggers for SIGNED_IN and SIGNED_UP events (from lastAuthEventRef)
  // No heuristic detection - uses authEvent passed in
  const showGreetingToast = useCallback(
    (authEvent: 'SIGNED_IN' | 'SIGNED_UP', profile: Profile | null, userName: string) => {
      if (!userId) return;
      const ENABLE_AUTH_GREETING_TOASTS = false;

      // Check sessionStorage to prevent duplicate toasts (once per session per user)
      const storageKey = `auth_greeted_${userId}`;
      const alreadyShown = sessionStorage.getItem(storageKey);

      if (alreadyShown) {
        if (import.meta.env.DEV) {
          log(
            `[AuthContext] Greeting toast already shown for ${userId.substring(0, 8)}... (skipping)`
          );
        }
        return;
      }

      // StrictMode guard (prevents double-run)
      const refKey = authEvent === 'SIGNED_IN' ? 'signedIn' : 'signedUp';
      const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
      if (didShowToastRef.current[refKey] === today) return;

      // Get timezone from profile
      const timezone = (profile as any)?.time_zone || null;
      const timeGreeting = getTimeGreeting(timezone);

      if (authEvent === 'SIGNED_IN') {
        if (getSessionFlag('xai_prime_ready_shown', userId)) {
          return;
        }
        if (ENABLE_AUTH_GREETING_TOASTS) {
          toast.success(`${timeGreeting} — Prime is ready.`, {
            duration: 4000,
            position: 'top-right',
          });
        }
        setSessionFlag('xai_prime_ready_shown', userId);
      } else {
        if (ENABLE_AUTH_GREETING_TOASTS) {
          toast.success(`Welcome, ${userName}`, {
            duration: 4000,
            position: 'top-right',
            icon: '👋',
          });
          toast('Your AI team is ready when you are.', {
            duration: 3000,
            position: 'top-right',
          });
        }
      }

      // Mark as shown (persists for session)
      sessionStorage.setItem(storageKey, '1');
      didShowToastRef.current[refKey] = today;
    },
    [userId, getTimeGreeting]
  );

  // Non-blocking profile loader - fire-and-forget, never gates auth init
  const loadProfile = useCallback(async (uid: string, userEmail?: string) => {
    setIsProfileLoading(true);
    try {
      const profile = await getOrCreateProfile(uid, userEmail || '');
      setProfile(profile ?? null);
      
      // Show greeting toast after profile loads (only for SIGNED_IN or SIGNED_UP events)
      // CRITICAL: Only triggers if lastAuthEventRef is 'SIGNED_IN' or 'SIGNED_UP'
      // Other events (INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED, SIGNED_OUT) are ignored
      if (lastAuthEventRef.current === 'SIGNED_IN') {
        if (profile) {
          const userName = profile.display_name || profile.first_name || profile.full_name || userEmail?.split('@')[0] || 'there';
          
          // Debug log (dev only)
          if (import.meta.env.DEV) {
            log(`[AuthContext] Showing greeting toast: ${lastAuthEventRef.current} for ${uid.substring(0, 8)}...`);
          }
          
          showGreetingToast(lastAuthEventRef.current, profile, userName);
          lastAuthEventRef.current = 'SHOWN';
        }
      }
      
      // PART B: Profile loaded - navigation logic moved to useEffect to prevent loops
    } catch (e) {
      warn('[AuthContext] Profile load failed', e);
    } finally {
      setIsProfileLoading(false);
    }
  }, [navigate, showGreetingToast]);

  // Refresh profile function - reloads profile from database
  const refreshProfile = useCallback(async () => {
    if (!userId || !user?.email) {
      return;
    }

    setIsProfileLoading(true);
    try {
      const refreshedProfile = await getOrCreateProfile(userId, user.email);
      setProfile(refreshedProfile);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[AuthContext] Error refreshing profile:', error);
      }
    } finally {
      setIsProfileLoading(false);
    }
  }, [userId, user?.email]);
  
  log('AuthProvider render:', { user: !!user, userId, loading, initialLoad, ready, isDemoUser});

  // CRITICAL: Custodian ready computation (NO navigation - RouteDecisionGate owns routing)
  // AuthContext computes custodianReady and exposes it, but RouteDecisionGate makes routing decisions
  // This ensures ONE source of truth for routing (RouteDecisionGate)
  useEffect(() => {
    // Only compute when auth and profile are fully loaded
    if (!ready || !profile || isProfileLoading) {
      return;
    }

    // Compute custodian ready status (for dev logging only - no navigation)
    try {
      const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
      const custodianReady = (md as any).custodian_ready === true;
      
      // Dev log: show computed custodianReady value (NO navigation)
      if (import.meta.env.DEV) {
        log('[AuthContext] custodianReady computed:', {
          custodianReady,
          source: 'profile.metadata.custodian_ready',
          metadata: md,
          profileId: profile.id,
          note: 'RouteDecisionGate owns routing decisions - AuthContext does NOT navigate',
        });
      }
    } catch (error: any) {
      warn('[AuthContext] Error computing custodian ready status (non-fatal):', error?.message || error);
    }
  }, [ready, profile, isProfileLoading]);

  useEffect(() => {
    let alive = true;
    const safe = (fn: () => void) => alive && fn();

    const finish = () =>
      safe(() => {
        setLoading(false);
        setInitialLoad(false);
        setReady(true);
      });

    (async () => {
      const timeout = setTimeout(() => {
        warn('[AuthContext] Safety timeout triggered');
        finish();
      }, 8000);

      try {
        // ========================================================================
        // STEP 1: Check for guest session (demo mode only)
        // ========================================================================
        if (isDemoMode()) {
          const guestSession = getGuestSession();
          if (guestSession) {
            const guestUser = createGuestUser();
            log('🔍 AuthContext: Guest session found - using guest user', guestSession.demo_user_id);
            safe(() => {
              setUserId(guestSession.demo_user_id);
              setUser(guestUser);
              setSession(null); // No Supabase session for guest
              setIsDemoUser(true);
              setProfile(null);
            });
            clearTimeout(timeout);
            finish();
            return;
          }
        }

        log('[AuthContext] Checking Supabase session...');
        const supabase = getSupabase();
        
        if (!supabase) {
          // No Supabase configured
          if (demoAllowed) {
            // Dev mode - use demo user
            log('🔍 AuthContext: No Supabase configured - using demo user (dev mode)', DEMO_USER_ID);
            safe(() => {
              setUserId(DEMO_USER_ID);
              setUser(null);
              setSession(null);
              setIsDemoUser(true);
              setProfile(null);
            });
          } else {
            // Staging/prod - require real auth, no demo fallback
            log('🔍 AuthContext: No Supabase configured - requiring real auth (no demo fallback)');
            safe(() => {
              setUserId(null);
              setUser(null);
              setSession(null);
              setIsDemoUser(false);
              setProfile(null);
            });
          }
          clearTimeout(timeout);
          finish();
          return;
        }

        const { data, error } = await supabase.auth.getSession();

        // DEV-only debug logging
        if (import.meta.env.DEV) {
          log('[AuthContext] Session check:', {
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
            userId: data?.session?.user?.id || null,
            error: error?.message || null,
          });
        }

        if (error) {
          warn('[AuthContext] getSession error', error);
        }

        const currentSession = data?.session;
        
        if (currentSession?.user?.id) {
          // Real user logged in
          const userId = currentSession.user.id;
          if (import.meta.env.DEV) {
            log('[AuthContext] User ID source: real auth', {
              userId,
              email: currentSession.user.email,
              mode: import.meta.env.DEV ? 'dev' : 'production',
            });
          }
          log('🔍 AuthContext: Logged in as', currentSession.user.email);
          safe(() => {
            setUserId(userId);
            setUser(currentSession.user);
            setSession(currentSession);
            setIsDemoUser(false);
          });

          // Fire-and-forget profile load
          void loadProfile(userId, currentSession.user.email || undefined);
        } else {
          // No session found - require login (no demo fallback unless explicitly enabled)
          if (demoAllowed) {
            // Demo fallback enabled via VITE_ALLOW_DEMO_FALLBACK=true
            if (import.meta.env.DEV) {
              log('[AuthContext] User ID source: demo user (demo fallback enabled)', {
                userId: DEMO_USER_ID,
                mode: 'dev',
                demoEnabled: true,
              });
            }
            log('🔍 AuthContext: No session - using demo user (demo fallback enabled)', DEMO_USER_ID);
            safe(() => {
              setUserId(DEMO_USER_ID);
              setUser(null);
              setSession(null);
              setIsDemoUser(true);
              setProfile(null);
            });
          } else {
            // No demo fallback - user must log in
            if (import.meta.env.DEV) {
              log('[AuthContext] No session - redirecting to login (demo fallback disabled)', {
                userId: null,
                demoEnabled: false,
              });
            }
            log('🔍 AuthContext: No session - user must log in (demo fallback disabled)');
            safe(() => {
              setUserId(null);
              setUser(null);
              setSession(null);
              setIsDemoUser(false);
              setProfile(null);
            });
            
            // Redirect to login ONLY for protected routes (dashboard/app routes)
            // Marketing routes are public and should NOT redirect
            const isProtectedRoute = location.pathname.startsWith('/dashboard') || 
                                     location.pathname.startsWith('/onboarding');
            if (isProtectedRoute) {
              const nextPath = encodeURIComponent(location.pathname + location.search);
              navigate(`/login?next=${nextPath}`, { replace: true });
            }
          }
        }

      } catch (e) {
        warn('[AuthContext] bootstrap threw', e);
        // On error, only use demo user if allowed
        if (demoAllowed) {
          safe(() => {
            setUserId(DEMO_USER_ID);
            setUser(null);
            setSession(null);
            setIsDemoUser(true);
            setProfile(null);
          });
        } else {
          // Staging/prod - on error, require login (no demo fallback)
          safe(() => {
            setUserId(null);
            setUser(null);
            setSession(null);
            setIsDemoUser(false);
            setProfile(null);
          });
        }
      } finally {
        clearTimeout(timeout);
        finish();
      }
    })();

    const supabase = getSupabase();
    if (!supabase) {
      if (demoAllowed) {
        // Dev mode - use demo user
        safe(() => {
          setUser({ id: DEMO_USER_ID, email: "demo@xspensesai.local" });
          setUserId(DEMO_USER_ID);
          setIsDemoUser(true);
        });
      } else {
        // Staging/prod - require real auth
        safe(() => {
          setUser(null);
          setUserId(null);
          setIsDemoUser(false);
        });
      }
      finish();
      return () => {
        alive = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const eventType = _event as string;
      log('[AuthContext] Auth state change:', _event);

      const uid = session?.user?.id ?? null;
      const token = (session as any)?.access_token ?? null;

      // DEDUPE: Sometimes Supabase fires SIGNED_IN twice (SIGNED_IN -> INITIAL_SESSION -> SIGNED_IN)
      // We only want to handle SIGNED_IN once per token (or per user if token missing).
      if (eventType === 'SIGNED_IN') {
        if (token && handledSignInTokenRef.current === token) {
          if (import.meta.env.DEV) log('[AuthContext] Skipping duplicate SIGNED_IN (same token)');
          return;
        }
        if (!token && uid && handledSignInUserIdRef.current === uid) {
          if (import.meta.env.DEV) log('[AuthContext] Skipping duplicate SIGNED_IN (same user)');
          return;
        }
        handledSignInTokenRef.current = token ?? null;
        handledSignInUserIdRef.current = uid ?? null;
      }

      if (eventType === 'INITIAL_SESSION') return;

      if (eventType === 'SIGNED_IN' || eventType === 'SIGNED_UP') {
        lastAuthEventRef.current = eventType as 'SIGNED_IN' | 'SIGNED_UP';
      } else {
        // Do NOT set lastAuthEventRef for INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED, etc.
        lastAuthEventRef.current = null;
      }

      safe(() => {
        setSession(session);
        setUser(session?.user ?? null);
        setUserId(session?.user?.id ?? null);
      });

      // Fire-and-forget profile load (for all events, but toast only shows if lastAuthEventRef is set)
      // NOTE: Custodian ready check is now handled inside loadProfile() to ensure profile is loaded first
      if (session?.user?.id) {
        void loadProfile(session.user.id, session.user.email || undefined);
      }

      // Handle demo mode logic for SIGNED_OUT
      if (eventType === 'SIGNED_OUT') {
        log('🔍 AuthContext: User signed out');
        resetChatUserInitiated();
        clearWelcomeFlagsForUser(userId);
        // Clear lastAuthEventRef on sign out
        lastAuthEventRef.current = null;
        handledSignInTokenRef.current = null;
        handledSignInUserIdRef.current = null;
        // Clear greeting toast dedupe key for all users (cleanup)
        if (typeof window !== 'undefined') {
          // Clear all auth_greeted keys (in case userId changed)
          const keysToRemove: string[] = [];
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('auth_greeted_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
          if (import.meta.env.DEV && keysToRemove.length > 0) {
            log(`[AuthContext] Cleared ${keysToRemove.length} greeting toast dedupe key(s) on sign out`);
          }
        }
        if (demoAllowed) {
          // Dev mode - switch to demo user
          safe(() => {
            setUserId(DEMO_USER_ID);
            setUser(null);
            setSession(null);
            setIsDemoUser(true);
            setProfile(null);
          });
        } else {
          // Staging/prod - clear user, require login (no demo fallback)
          safe(() => {
            setUserId(null);
            setUser(null);
            setSession(null);
            setIsDemoUser(false);
            setProfile(null);
          });
        }
      } else if (eventType === 'SIGNED_IN') {
        log('🔍 AuthContext: User signed in');
        safe(() => {
          setIsDemoUser(false);
        });
        
        // Track auth event for greeting toast (will show after profile loads)
        // CRITICAL: This is the ONLY place SIGNED_IN sets lastAuthEventRef
        // Do NOT clear on INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED, etc.
        // Those events may fire after SIGNED_IN but before profile loads
        
        // Set flag to prevent auto-opening chat after login
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('just_signed_in', '1');
          sessionStorage.setItem('first_prime_open_after_login', '1');
        }
        
        // Load profile immediately on sign-in and check Custodian ready status
        if (session?.user?.id) {
          void loadProfile(session.user.id, session.user.email || undefined);
        }
      } else if (eventType === 'SIGNED_UP') {
        log('🔍 AuthContext: User signed up');
        safe(() => {
          setIsDemoUser(false);
        });
        
        // Track auth event for greeting toast (will show after profile loads)
        // CRITICAL: This is the ONLY place SIGNED_UP sets lastAuthEventRef
        // Do NOT clear on INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED, etc.
        
        // Set flag to prevent auto-opening chat after signup
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('just_signed_in', '1');
        }
        
        // Load profile immediately on sign-up
        if (session?.user?.id) {
          void loadProfile(session.user.id, session.user.email || undefined);
        }
      }
      // All other events (_event === 'INITIAL_SESSION' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | etc.)
      // Do NOT modify lastAuthEventRef - preserve SIGNED_IN/SIGNED_UP until toast is shown

      finish();
    });

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [navigate, demoAllowed, DEMO_USER_ID, loadProfile]);

  const signInWithGoogle = async () => {
    try {
      // DEV-only debug logging
      if (import.meta.env.DEV) {
        log('[AuthContext] Google OAuth:', {
          origin: window.location.origin,
          redirectTo: `${window.location.origin}/auth/callback`,
          hasSupabase: !!getSupabase(),
        });
      }
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        if (import.meta.env.DEV) {
          log('[AuthContext] Google sign-in skipped - Supabase not configured');
        }
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        }
      });

      if (error) {
        console.error('[AuthContext] Google sign-in error:', error);
        throw error;
      }
    } catch (error) {
      console.error('[AuthContext] Google sign-in failed:', error);
      throw error;
    }
  };


  const signInWithOtp = async (email: string) => {
    try {
      const emailRedirectTo = `${window.location.origin}/auth/callback`;
      
      // DEV-only debug logging
      if (import.meta.env.DEV) {
        log('[AuthContext] Magic link OTP:', {
          email,
          origin: window.location.origin,
          emailRedirectTo,
          hasSupabase: !!getSupabase(),
        });
      }
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        if (import.meta.env.DEV) {
          log('[AuthContext] Magic link skipped - Supabase not configured');
        }
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo
        }
      });

      if (error) {
        console.error('[AuthContext] Magic link error:', error);
        throw error;
      }
      
      log('✅ AuthContext: Magic link sent successfully');
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error sending magic link:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      log('🔍 AuthContext: Signing out user...');

      // Capture userId before clearing state
      const currentUserId = userId;
      clearWelcomeFlagsForUser(currentUserId);

      // Clear Supabase session if exists
      const supabase = getSupabase();
      if (supabase?.auth) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      // Clear ALL guest/demo localStorage keys
      try {
        // Guest session
        localStorage.removeItem('xspensesai_guest_session');
        // Guest profile
        localStorage.removeItem('xai_profile_guest');
        // Guest preferences
        localStorage.removeItem('xai_prefs_guest');
        // Any other demo-related keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('guest') || key.includes('demo') || key.includes('xai_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        log('✅ Cleared all guest/demo localStorage keys');
      } catch (storageError) {
        warn('⚠️ AuthContext: Failed to clear some localStorage keys:', storageError);
      }

      // Clear greeting toast dedupe key before clearing user state
      if (currentUserId) {
        sessionStorage.removeItem(`auth_greeted_${currentUserId}`);
      }
      // Also clear any remaining auth_greeted keys (cleanup)
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('auth_greeted_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));

      // Clear user state
      setUserId(null);
      setUser(null);
      setSession(null);
      setIsDemoUser(false);
      setProfile(null);
      handledSignInTokenRef.current = null;
      handledSignInUserIdRef.current = null;
      resetChatUserInitiated();
      log('✅ Signed out successfully');
      
      // Clear session storage
      sessionStorage.removeItem('xspensesai-intended-path');
      sessionStorage.removeItem('xai_welcome_back_shown');
      // Clear any other welcome/onboarding session keys
      const sessionKeysToRemove = [
        'xai_welcome_back_shown',
        'prime_welcome_back_seen', // Legacy key from PrimeWelcomeBackCard
      ];
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      // Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      throw error;
    }
  };

  /**
   * Clear device data: Sign out and erase all local storage/session storage
   * Does NOT delete Supabase account data - only clears local browser data
   */
  const clearDevice = async () => {
    try {
      log('🔍 AuthContext: Clearing device data...');

      // 1. Sign out from Supabase
      const supabase = getSupabase();
      if (supabase?.auth) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      // 2. Clear ALL localStorage keys owned by the app
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('xspensesai') ||
            key.includes('xai_') ||
            key.includes('guest') ||
            key.includes('demo') ||
            key.startsWith('supabase.') ||
            key.startsWith('sb-')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        log('✅ Cleared all app localStorage keys');
      } catch (storageError) {
        warn('⚠️ AuthContext: Failed to clear some localStorage keys:', storageError);
      }

      // 3. Clear ALL sessionStorage keys
      try {
        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key.includes('xspensesai') ||
            key.includes('xai_') ||
            key.includes('welcome') ||
            key.includes('onboarding')
          )) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        log('✅ Cleared all app sessionStorage keys');
      } catch (storageError) {
        warn('⚠️ AuthContext: Failed to clear some sessionStorage keys:', storageError);
      }

      // 4. Clear Cache Storage (if available)
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          const appCaches = cacheNames.filter(name => 
            name.includes('xspensesai') || 
            name.includes('xai') ||
            name.includes('supabase')
          );
          await Promise.all(appCaches.map(name => caches.delete(name)));
          log('✅ Cleared app cache storage');
        }
      } catch (cacheError) {
        warn('⚠️ AuthContext: Failed to clear cache storage:', cacheError);
      }

      // 5. Clear user state
      setUserId(null);
      setUser(null);
      setSession(null);
      setIsDemoUser(false);
      setProfile(null);
      log('✅ Device cleared successfully');
      
      // 6. Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ AuthContext: Clear device error:', error);
      throw error;
    }
  };

  // Show loading screen during initial auth check
  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const contextValue = {
    user,
    userId,
    loading,
    signInWithGoogle,
    signInWithOtp,
    signOut,
    clearDevice,
    session,
    ready,
    isDemoUser,
    firstName,
    profile,
    isProfileLoading,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// App wrapper that shows loading screen during initial auth check
export function AppWithAuth({ children }: { children: ReactNode }) {
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    log('🔍 AppWithAuth: Starting auth initialization...');

    // Check if Supabase is available
    const supabase = getSupabase();
    if (supabase) {
      log('🔍 AppWithAuth: Supabase available, checking auth status...');
      
      // Check if auth is already initialized
      const checkAuth = async () => {
        try {
          log('🔍 AppWithAuth: Checking Supabase auth status...');
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('❌ AppWithAuth: Error checking auth status:', error);
          } else {
            log('🔍 AppWithAuth: Auth status check result:', {
              hasSession: !!session,
              userEmail: session?.user?.email || 'No user'
            });
          }

          setAuthInitialized(true);
        } catch (error) {
          console.error('❌ AppWithAuth: Unexpected error during auth check:', error);
          setAuthInitialized(true);
        }
      };

      checkAuth();
    } else {
      // Development mode - no Supabase
      log('⚡ Dev mode: AppWithAuth skipping Supabase auth check');
      setAuthInitialized(true);
    }

    // Cleanup function
    return () => {
      log('🔍 AppWithAuth: Cleaning up...');
    };
  }, []);

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

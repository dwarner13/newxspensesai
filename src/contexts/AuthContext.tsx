import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-hot-toast'; // Temporarily disabled for debugging
import { getSupabase } from '../lib/supabase';
import { isDemoMode, getGuestSession, createGuestUser, clearGuestSession } from '../lib/demoAuth';

interface AuthContextType {
  user: any;
  userId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  session: any;
  ready: boolean;
  isDemoUser: boolean;
  firstName: string; // User's first name for personalization
  profile: any; // Full profile data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Check if demo mode is allowed
 * Demo mode is ONLY allowed in:
 * 1. Local development (import.meta.env.DEV === true)
 * 2. When explicitly forced (VITE_FORCE_DEMO === 'true')
 * 
 * In staging/production, demo mode is DISABLED - users must use real auth
 */
function isDemoAllowed(): boolean {
  // Allow demo in dev mode
  if (import.meta.env.DEV === true) {
    return true;
  }
  // Allow demo if explicitly forced (for testing)
  if (import.meta.env.VITE_FORCE_DEMO === 'true') {
    return true;
  }
  // Disable demo in staging/production
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-4000-8000-000000000001";
  const demoAllowed = isDemoAllowed();
  
  // Dev-only logging
  if (import.meta.env.DEV) {
    console.log('[AuthContext] Environment:', {
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
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  
  // Compute firstName from profile or user metadata
  const firstName = useMemo(() => {
    const raw =
      profile?.display_name ||
      profile?.account_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0];
    
    if (!raw) return 'there';
    return raw.split(' ')[0];
  }, [profile, user]);
  
  console.log('AuthProvider render:', { user: !!user, userId, loading, initialLoad, ready, isDemoUser});

  useEffect(() => {
    console.log('🔍 AuthContext: Checking Supabase session...');
    
    const checkSession = async () => {
      try {
        // ========================================================================
        // STEP 1: Check for guest session (demo mode only)
        // ========================================================================
        if (isDemoMode()) {
          const guestSession = getGuestSession();
          if (guestSession) {
            const guestUser = createGuestUser();
            console.log('🔍 AuthContext: Guest session found - using guest user', guestSession.demo_user_id);
            setUserId(guestSession.demo_user_id);
            setUser(guestUser);
            setSession(null); // No Supabase session for guest
            setIsDemoUser(true);
            setProfile(null);
            setLoading(false);
            setInitialLoad(false);
            setReady(true);
            return;
          }
        }
        
        const supabase = getSupabase();
        
        if (!supabase) {
          // No Supabase configured
          if (demoAllowed) {
            // Dev mode - use demo user
            console.log('🔍 AuthContext: No Supabase configured - using demo user (dev mode)', DEMO_USER_ID);
            setUserId(DEMO_USER_ID);
            setUser(null);
            setSession(null);
            setIsDemoUser(true);
            setProfile(null);
          } else {
            // Staging/prod - require real auth, no demo fallback
            console.log('🔍 AuthContext: No Supabase configured - requiring real auth (no demo fallback)');
            setUserId(null);
            setUser(null);
            setSession(null);
            setIsDemoUser(false);
            setProfile(null);
          }
          setLoading(false);
          setInitialLoad(false);
          setReady(true);
          return;
        }
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user?.id) {
          // Real user logged in
          const userId = currentSession.user.id;
          if (import.meta.env.DEV) {
            console.log('[AuthContext] User ID source: real auth', {
              userId,
              email: currentSession.user.email,
              mode: import.meta.env.DEV ? 'dev' : 'production',
            });
          }
          console.log('🔍 AuthContext: Logged in as', currentSession.user.email);
          setUserId(userId);
          setUser(currentSession.user);
          setSession(currentSession);
          setIsDemoUser(false);
          
          // Load user profile, create if missing
          try {
            const userId = currentSession.user.id;
            const userEmail = currentSession.user.email || '';
            
            if (import.meta.env.DEV) {
              console.log('[AuthContext] 📊 Fetching profile', { userId, email: userEmail });
            }
            
            // Try to load existing profile
            const { data: profileData, error: selectError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (profileData) {
              // Profile exists, use it
              if (import.meta.env.DEV) {
                console.log('[AuthContext] ✅ Profile loaded', {
                  id: profileData.id,
                  display_name: profileData.display_name,
                  full_name: profileData.full_name,
                  plan: profileData.plan,
                  role: profileData.role,
                  level: profileData.level,
                });
              }
              setProfile(profileData);
            } else {
              // Profile missing, create it
              if (import.meta.env.DEV) {
                console.log('[AuthContext] ⚠️ Profile missing, creating new profile', { userId, email: userEmail });
              }
              const displayName = currentSession.user.user_metadata?.full_name 
                || currentSession.user.user_metadata?.name 
                || userEmail.split('@')[0] 
                || 'User';
              
              const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: userEmail,
                  display_name: displayName,
                  role: 'free',
                  plan: 'free',
                })
                .select()
                .single();
              
              if (insertError) {
                console.error('[AuthContext] ❌ Failed to create profile:', insertError);
                setProfile(null);
              } else {
                if (import.meta.env.DEV) {
                  console.log('[AuthContext] ✅ Profile created successfully', {
                    id: newProfile.id,
                    display_name: newProfile.display_name,
                    plan: newProfile.plan,
                  });
                }
                setProfile(newProfile);
              }
            }
          } catch (profileError) {
            console.warn('[AuthContext] ⚠️ Could not load/create profile:', profileError);
            setProfile(null);
          }
        } else {
          // No session found
          if (demoAllowed) {
            // Dev mode - use demo user
            if (import.meta.env.DEV) {
              console.log('[AuthContext] User ID source: demo user (dev mode)', {
                userId: DEMO_USER_ID,
                mode: 'dev',
                demoEnabled: true,
              });
            }
            console.log('🔍 AuthContext: No session - using demo user (dev mode)', DEMO_USER_ID);
            setUserId(DEMO_USER_ID);
            setUser(null);
            setSession(null);
            setIsDemoUser(true);
            setProfile(null);
          } else {
            // Staging/prod - no session means user must log in (no demo fallback)
            if (import.meta.env.DEV) {
              console.log('[AuthContext] User ID source: null (staging/prod, no demo)', {
                userId: null,
                mode: 'production',
                demoEnabled: false,
              });
            }
            console.log('🔍 AuthContext: No session - user must log in (no demo fallback)');
            setUserId(null);
            setUser(null);
            setSession(null);
            setIsDemoUser(false);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking session:', error);
        // On error, only use demo user if allowed
        if (demoAllowed) {
          setUserId(DEMO_USER_ID);
          setUser(null);
          setSession(null);
          setIsDemoUser(true);
        } else {
          // Staging/prod - on error, require login (no demo fallback)
          setUserId(null);
          setUser(null);
          setSession(null);
          setIsDemoUser(false);
        }
      } finally {
        setLoading(false);
        setInitialLoad(false);
        setReady(true);
      }
    };

    checkSession();

    // Set up auth state change listener
    let subscription: any = null;
    
    try {
      const supabase = getSupabase();
      // In mock mode, supabase is null
      if (!supabase) {
        if (demoAllowed) {
          // Dev mode - use demo user
          setUser({ id: DEMO_USER_ID, email: "demo@xspensesai.local" });
          setUserId(DEMO_USER_ID);
          setIsDemoUser(true);
        } else {
          // Staging/prod - require real auth
          setUser(null);
          setUserId(null);
          setIsDemoUser(false);
        }
        setLoading(false);
        setInitialLoad(false);
        setReady(true);
        return;
      }
      const { data } = supabase.auth.onAuthStateChange(
        async (event: string, authSession: any) => {
          console.log('🔍 AuthContext: Auth state change:', event, authSession?.user?.email);
          
          switch (event) {
            case 'SIGNED_IN':
              console.log('🔍 AuthContext: User signed in');
              if (authSession?.user?.id) {
                setUserId(authSession.user.id);
                setUser(authSession.user);
                setSession(authSession);
                setIsDemoUser(false);
                
                // Load user profile, create if missing
                const supabase = getSupabase();
                if (supabase) {
                  try {
                    const userId = authSession.user.id;
                    const userEmail = authSession.user.email || '';
                    
                    // Try to load existing profile
                    const { data: profileData, error: selectError } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('id', userId)
                      .maybeSingle();
                    
                    if (profileData) {
                      // Profile exists, use it
                      setProfile(profileData);
                    } else {
                      // Profile missing, create it
                      console.log('🔍 AuthContext: Profile missing on SIGNED_IN, creating new profile for user:', userId);
                      const displayName = authSession.user.user_metadata?.full_name 
                        || authSession.user.user_metadata?.name 
                        || userEmail.split('@')[0] 
                        || 'User';
                      
                      const { data: newProfile, error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                          id: userId,
                          email: userEmail,
                          display_name: displayName,
                          role: 'free',
                          plan: 'free',
                        })
                        .select()
                        .single();
                      
                      if (insertError) {
                        console.error('❌ AuthContext: Failed to create profile on SIGNED_IN:', insertError);
                        setProfile(null);
                      } else {
                        console.log('✅ AuthContext: Profile created successfully on SIGNED_IN');
                        setProfile(newProfile);
                      }
                    }
                  } catch (profileError) {
                    console.warn('🔍 AuthContext: Could not load/create profile:', profileError);
                    setProfile(null);
                  }
                }
              }
              setLoading(false);
              setInitialLoad(false);
              setReady(true);
              break;
              
            case 'SIGNED_OUT':
              console.log('🔍 AuthContext: User signed out');
              if (demoAllowed) {
                // Dev mode - switch to demo user
                setUserId(DEMO_USER_ID);
                setUser(null);
                setSession(null);
                setIsDemoUser(true);
              } else {
                // Staging/prod - clear user, require login (no demo fallback)
                setUserId(null);
                setUser(null);
                setSession(null);
                setIsDemoUser(false);
              }
              setProfile(null);
              setLoading(false);
              setInitialLoad(false);
              setReady(true);
              break;
              
            case 'TOKEN_REFRESHED':
              console.log('🔍 AuthContext: Token refreshed');
              if (authSession?.user?.id) {
                setUserId(authSession.user.id);
                setUser(authSession.user);
                setSession(authSession);
              }
              break;
              
            case 'USER_UPDATED':
              console.log('🔍 AuthContext: User updated');
              if (authSession?.user?.id) {
                setUserId(authSession.user.id);
                setUser(authSession.user);
                setSession(authSession);
              }
              break;
              
            case 'INITIAL_SESSION':
              console.log('🔍 AuthContext: Initial session event');
              // Handle initial session - don't change state, just log
              break;
              
            default:
              console.log('🔍 AuthContext: Unhandled auth event:', event);
          }
        }
      );
      subscription = data.subscription;
    } catch (error) {
      console.error('❌ AuthContext: Failed to set up auth listener:', error);
    }

    // Cleanup function
    return () => {
      console.log('🔍 AuthContext: Cleaning up auth context...');
      if (subscription) {
        subscription?.unsubscribe?.();
      }
    };
  }, [navigate]);

  const signInWithGoogle = async () => {
    try {
      console.log('🔍 AuthContext: Signing in with Google...');
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        console.log('⚡ Dev mode: Google sign-in skipped');
        console.log('Development mode - sign-in simulated');
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ AuthContext: Google sign-in error:', error);
        console.error('Failed to sign in with Google. Please try again.');
        throw error;
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error during Google sign-in:', error);
      console.error('An unexpected error occurred. Please try again.');
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('🔍 AuthContext: Signing in with Apple...');
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        console.log('⚡ Dev mode: Apple sign-in skipped');
        console.log('Development mode - sign-in simulated');
        return;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ AuthContext: Apple sign-in error:', error);
        console.error('Failed to sign in with Apple. Please try again.');
        throw error;
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error during Apple sign-in:', error);
      console.error('An unexpected error occurred. Please try again.');
      throw error;
    }
  };

  const signInWithOtp = async (email: string) => {
    try {
      console.log('🔍 AuthContext: Sending magic link to:', email);
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        console.log('⚡ Dev mode: Magic link skipped');
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('❌ AuthContext: Magic link error:', error);
        throw error;
      }
      
      console.log('✅ AuthContext: Magic link sent successfully');
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error sending magic link:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔍 AuthContext: Signing out user...');

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
        console.log('✅ Cleared all guest/demo localStorage keys');
      } catch (storageError) {
        console.warn('⚠️ AuthContext: Failed to clear some localStorage keys:', storageError);
      }

      // Clear user state
      setUserId(null);
      setUser(null);
      setSession(null);
      setIsDemoUser(false);
      setProfile(null);
      console.log('✅ Signed out successfully');
      
      // Clear session storage
      sessionStorage.removeItem('xspensesai-intended-path');
      
      // Navigate to login page
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
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
    signInWithApple,
    signInWithOtp,
    signOut,
    session,
    ready,
    isDemoUser,
    firstName,
    profile,
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
    console.log('🔍 AppWithAuth: Starting auth initialization...');

    // Check if Supabase is available
    const supabase = getSupabase();
    if (supabase) {
      console.log('🔍 AppWithAuth: Supabase available, checking auth status...');
      
      // Check if auth is already initialized
      const checkAuth = async () => {
        try {
          console.log('🔍 AppWithAuth: Checking Supabase auth status...');
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('❌ AppWithAuth: Error checking auth status:', error);
          } else {
            console.log('🔍 AppWithAuth: Auth status check result:', {
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
      console.log('⚡ Dev mode: AppWithAuth skipping Supabase auth check');
      setAuthInitialized(true);
    }

    // Cleanup function
    return () => {
      console.log('🔍 AppWithAuth: Cleaning up...');
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

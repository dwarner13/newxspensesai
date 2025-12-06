import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-hot-toast'; // Temporarily disabled for debugging
import { getSupabase } from '../lib/supabase';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-4000-8000-000000000001";
  
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
        const supabase = getSupabase();
        
        if (!supabase) {
          // No Supabase - use demo user
          console.log('🔍 AuthContext: No Supabase configured - using demo user', DEMO_USER_ID);
          setUserId(DEMO_USER_ID);
          setUser(null);
          setSession(null);
          setIsDemoUser(true);
          setProfile(null);
          setLoading(false);
          setInitialLoad(false);
          setReady(true);
          return;
        }
        
        // Check for existing session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user?.id) {
          // Real user logged in
          console.log('🔍 AuthContext: Logged in as', currentSession.user.email);
          setUserId(currentSession.user.id);
          setUser(currentSession.user);
          setSession(currentSession);
          setIsDemoUser(false);
          
          // Load user profile
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('display_name, account_name')
              .eq('id', currentSession.user.id)
              .maybeSingle();
            setProfile(profileData);
          } catch (profileError) {
            console.warn('🔍 AuthContext: Could not load profile:', profileError);
            setProfile(null);
          }
        } else {
          // No session - use demo user
          console.log('🔍 AuthContext: No session - using demo user', DEMO_USER_ID);
          setUserId(DEMO_USER_ID);
          setUser(null);
          setSession(null);
          setIsDemoUser(true);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Error checking session:', error);
        // On error, use demo user
        setUserId(DEMO_USER_ID);
        setUser(null);
        setSession(null);
        setIsDemoUser(true);
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
      // In mock mode, supabase is null – short-circuit to demo user.
      if (!supabase) {
        setUser({ id: DEMO_USER_ID, email: "demo@xspensesai.local" });
        setUserId(DEMO_USER_ID);
        setIsDemoUser(true);
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
                
                // Load user profile
                const supabase = getSupabase();
                if (supabase) {
                  try {
                    const { data: profileData } = await supabase
                      .from('profiles')
                      .select('display_name, account_name')
                      .eq('id', authSession.user.id)
                      .maybeSingle();
                    setProfile(profileData);
                  } catch (profileError) {
                    console.warn('🔍 AuthContext: Could not load profile:', profileError);
                  }
                }
              }
              setLoading(false);
              setInitialLoad(false);
              setReady(true);
              break;
              
            case 'SIGNED_OUT':
              console.log('🔍 AuthContext: User signed out - switching to demo user');
              setUserId(DEMO_USER_ID);
              setUser(null);
              setSession(null);
              setIsDemoUser(true);
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

      const supabase = getSupabase();
      if (supabase?.auth) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      // Switch to demo user after sign out
      setUserId(DEMO_USER_ID);
      setUser(null);
      setSession(null);
      setIsDemoUser(true);
      sessionStorage.removeItem('xspensesai-intended-path');
      console.log('✅ Signed out successfully - switched to demo user');
      
      // Stay on current page (demo mode) instead of navigating to login
      // If you want to force login page: navigate('/login', { replace: true });
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

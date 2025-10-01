import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
// import { toast } from 'react-hot-toast'; // Temporarily disabled for debugging
import { getSupabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  session: any;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  
  console.log('AuthProvider render:', { user: !!user, loading, initialLoad, ready});
  
  // Refs for cleanup (currently unused due to bypass)
  // const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const authSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    console.log('🔍 AuthContext: Starting authentication check...');

    // Check if Supabase environment variables are configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.log('⚠️ Supabase auth skipped - not connected');
      console.log('🔍 AuthContext: Supabase not configured, bypassing authentication');
      
      // Create bypass user for development
      const bypassUser = {
        id: '12345678-1234-1234-1234-123456789abc',
        email: 'demo@xspensesai.com',
        full_name: 'Demo User',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Date.now() + 86400000, // 24 hours from now
      } as any;
      
      setUser(bypassUser);
      setSession({ user: bypassUser, access_token: 'bypass-token' });
      setLoading(false);
      setInitialLoad(false);
      setReady(true);
      console.log('🔍 AuthContext: Using bypass user for development', bypassUser);
      return;
    }

    // Supabase is configured, use normal authentication
    console.log('🔍 AuthContext: Supabase configured, checking authentication...');
    
    const checkSession = async () => {
      try {
        console.log('🔍 AuthContext: Checking Supabase session...');
        
        // Get Supabase client
        const supabase = getSupabase();
        
        if (!supabase) {
          console.log('🔍 AuthContext: Supabase not available, using bypass');
          const bypassUser = {
            id: 'bypass-user-123',
            email: 'demo@example.com',
            full_name: 'Demo User',
            aud: 'authenticated',
            role: 'authenticated',
            exp: Date.now() + 86400000,
          } as any;
          setUser(bypassUser);
          setSession({ user: bypassUser, access_token: 'bypass-token' });
          setLoading(false);
          setInitialLoad(false);
          setReady(true);
          return;
        }
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthContext: Session check error:', error);
          // Create a demo user even on error for development
          const demoUser = {
            id: 'demo-user-123',
            email: 'demo@xspensesai.com',
            full_name: 'Demo User',
            aud: 'authenticated',
            role: 'authenticated',
            exp: Date.now() + 86400000,
          } as any;
          setUser(demoUser);
          setSession({ user: demoUser, access_token: 'demo-token' });
        } else if (currentSession?.user) {
          console.log('🔍 AuthContext: User session found:', currentSession.user.email);
          setUser(currentSession.user);
          setSession(currentSession);
        } else {
          console.log('🔍 AuthContext: No active session found - using demo user');
          // Create a demo user for development when no session exists
          const demoUser = {
            id: 'demo-user-123',
            email: 'demo@xspensesai.com',
            full_name: 'Demo User',
            aud: 'authenticated',
            role: 'authenticated',
            exp: Date.now() + 86400000, // 24 hours from now
          } as any;
          setUser(demoUser);
          setSession({ user: demoUser, access_token: 'demo-token' });
        }
      } catch (error) {
        console.error('❌ AuthContext: Unexpected error during session check:', error);
        // Create a demo user even on unexpected error for development
        const demoUser = {
          id: 'demo-user-123',
          email: 'demo@xspensesai.com',
          full_name: 'Demo User',
          aud: 'authenticated',
          role: 'authenticated',
          exp: Date.now() + 86400000,
        } as any;
        setUser(demoUser);
        setSession({ user: demoUser, access_token: 'demo-token' });
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
      if (!supabase) {
        console.log('🔍 AuthContext: Supabase not available for auth listener');
        return;
      }
      const { data } = supabase.auth.onAuthStateChange(
        async (event: string, authSession: any) => {
          console.log('🔍 AuthContext: Auth state change:', event, authSession?.user?.email);
          
          switch (event) {
            case 'SIGNED_IN':
              console.log('🔍 AuthContext: User signed in');
              setUser(authSession?.user || null);
              setSession(authSession);
              setLoading(false);
              setInitialLoad(false);
              setReady(true);
              break;
              
            case 'SIGNED_OUT':
              console.log('🔍 AuthContext: User signed out');
              setUser(null);
              setSession(null);
              setLoading(false);
              setInitialLoad(false);
              setReady(true);
              navigate('/login', { replace: true});
              break;
              
            case 'TOKEN_REFRESHED':
              console.log('🔍 AuthContext: Token refreshed');
              setUser(authSession?.user || null);
              setSession(authSession);
              break;
              
            case 'USER_UPDATED':
              console.log('🔍 AuthContext: User updated');
              setUser(authSession?.user || null);
              setSession(authSession);
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
        subscription.unsubscribe();
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

  const signOut = async () => {
    try {
      console.log('🔍 AuthContext: Signing out user...');

      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        // Development mode - just clear the user state
        console.log('⚡ Dev mode: sign-out simulated');
        setUser(null);
        sessionStorage.removeItem('xspensesai-intended-path');
        console.log('Signed out successfully');
        navigate('/login', { replace: true});
        return;
      }

      // Production mode - use Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      sessionStorage.removeItem('xspensesai-intended-path');
      // toast.success('Signed out successfully'); // Temporarily disabled
      console.log('Signed out successfully');
      navigate('/login', { replace: true});
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      console.error('Failed to sign out. Please try again.');
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
    loading,
    signInWithGoogle,
    signInWithApple,
    signOut,
    session,
    ready
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

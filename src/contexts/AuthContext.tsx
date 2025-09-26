import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getSupabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();
  
  console.log('AuthProvider render:', { user: !!user, loading, initialLoad });
  
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
        id: 'demo-user-123',
        email: 'demo@xspensesai.com',
        full_name: 'Demo User',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Date.now() + 86400000, // 24 hours from now
      } as any;
      
      setUser(bypassUser);
      setLoading(false);
      setInitialLoad(false);
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
          setLoading(false);
          setInitialLoad(false);
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthContext: Session check error:', error);
          setUser(null);
        } else if (session?.user) {
          console.log('🔍 AuthContext: User session found:', session.user.email);
          setUser(session.user);
        } else {
          console.log('🔍 AuthContext: No active session found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Unexpected error during session check:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    let subscription: any = null;
    
    try {
      const supabase = getSupabase();
      const { data } = supabase.auth.onAuthStateChange(
        async (event: string, session: any) => {
          console.log('🔍 AuthContext: Auth state change:', event, session?.user?.email);
          
          switch (event) {
            case 'SIGNED_IN':
              console.log('🔍 AuthContext: User signed in');
              setUser(session?.user || null);
              setLoading(false);
              setInitialLoad(false);
              break;
              
            case 'SIGNED_OUT':
              console.log('🔍 AuthContext: User signed out');
              setUser(null);
              setLoading(false);
              setInitialLoad(false);
              navigate('/login', { replace: true });
              break;
              
            case 'TOKEN_REFRESHED':
              console.log('🔍 AuthContext: Token refreshed');
              setUser(session?.user || null);
              break;
              
            case 'USER_UPDATED':
              console.log('🔍 AuthContext: User updated');
              setUser(session?.user || null);
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
        toast.success('Development mode - sign-in simulated');
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
        toast.error('Failed to sign in with Google. Please try again.');
        throw error;
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error during Google sign-in:', error);
      toast.error('An unexpected error occurred. Please try again.');
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('🔍 AuthContext: Signing in with Apple...');
      
      const supabase = getSupabase();
      if (!supabase || !supabase.auth) {
        console.log('⚡ Dev mode: Apple sign-in skipped');
        toast.success('Development mode - sign-in simulated');
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
        toast.error('Failed to sign in with Apple. Please try again.');
        throw error;
      }
    } catch (error) {
      console.error('❌ AuthContext: Unexpected error during Apple sign-in:', error);
      toast.error('An unexpected error occurred. Please try again.');
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
        toast.success('Signed out successfully');
        navigate('/login', { replace: true });
        return;
      }

      // Production mode - use Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      sessionStorage.removeItem('xspensesai-intended-path');
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
      throw error;
    }
  };

  // Show loading screen during initial auth check
  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4 mx-auto"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithApple, signOut }}>
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

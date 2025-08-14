import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for cleanup (currently unused due to bypass)
  // const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // const authSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    console.log('🔍 AuthContext: Starting authentication check...');
    
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://auth.xspensesai.com' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXhpZ210ZHBqemt5YWZvc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4MjQsImV4cCI6MjA2NTA1OTgyNH0.j2qETzVRu2rj1EOqxxh5caiPu-tvjYUnrRA4SU2G-_Y') {
      console.log('⚠️ Supabase auth skipped - not connected');
      console.log('🔍 AuthContext: Supabase not configured, bypassing authentication');
      
      // Create a fake authenticated user
      const fakeUser = {
        id: 'bypass-user-123',
        email: 'bypass@example.com',
        full_name: 'Bypass User',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Date.now() + 86400000, // 24 hours from now
      } as any;
      
      setUser(fakeUser);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    if (import.meta.env.DEV) {
      // DEV ONLY: Fake user for local development
      console.log('🔍 AuthContext: Development mode - setting fake user');
      const fakeUser = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        full_name: 'Developer Test',
      } as any;
      setUser(fakeUser);
      setLoading(false);
      setInitialLoad(false);
      return;
    }

    // Production authentication logic - TEMPORARILY DISABLED
    console.log('🔍 AuthContext: Production auth temporarily disabled, using bypass user');
    
    // Create a bypass user for now
    const bypassUser = {
      id: 'bypass-user-123',
      email: 'bypass@example.com',
      full_name: 'Bypass User',
      aud: 'authenticated',
      role: 'authenticated',
      exp: Date.now() + 86400000, // 24 hours from now
    } as any;
    
    setUser(bypassUser);
    setLoading(false);
    setInitialLoad(false);

    // Cleanup function - simplified since no timeouts or subscriptions
    return () => {
      console.log('🔍 AuthContext: Cleaning up auth context...');
    };
  }, []); // Empty dependency array since this effect should only run once

  const signInWithGoogle = async () => {
    try {
      console.log('🔍 AuthContext: Starting Google sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ AuthContext: OAuth error:', error);
        throw error;
      }

      console.log('🔍 AuthContext: OAuth initiated, redirecting to Google...', data);
    } catch (error) {
      console.error('❌ AuthContext: Sign in error:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('🔍 AuthContext: Starting Apple sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        console.error('❌ AuthContext: OAuth error:', error);
        throw error;
      }

      console.log('🔍 AuthContext: OAuth initiated, redirecting to Apple...', data);
    } catch (error) {
      console.error('❌ AuthContext: Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔍 AuthContext: Signing out user...');
      
      // For bypass user, just clear the user state
      if (user?.id === 'bypass-user-123') {
        console.log('🔍 AuthContext: Bypass user sign out, clearing state');
        setUser(null);
        sessionStorage.removeItem('xspensesai-intended-path');
        toast.success('Signed out successfully');
        navigate('/login', { replace: true });
        return;
      }
      
      // Regular Supabase sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any stored paths
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
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
    
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://auth.xspensesai.com' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXhpZ210ZHBqemt5YWZvc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4MjQsImV4cCI6MjA2NTA1OTgyNH0.j2qETzVRu2rj1EOqxxh5caiPu-tvjYUnrRA4SU2G-_Y') {
      console.log('⚠️ Supabase auth skipped - not connected (AppWithAuth)');
      console.log('🔍 AppWithAuth: Supabase not configured, bypassing authentication');
      setAuthInitialized(true);
      return;
    }

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

    // Cleanup function - simplified since no timeouts
    return () => {
      console.log('🔍 AppWithAuth: Cleaning up...');
    };
  }, []);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mb-4">
            <img src="/assets/xspensesai-icon.svg" alt="XspensesAI" className="w-full h-full animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Loading XspensesAI...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

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

  useEffect(() => {
    if (import.meta.env.DEV) {
      // DEV ONLY: Fake user for local development
      const fakeUser = {
        id: 'dev-user-123',
        email: 'dev@example.com',
        full_name: 'Developer Test',
      };
      setUser(fakeUser as any);
      setLoading(false);
      setInitialLoad(false);
      return;
    }
    // Check active sessions and sets the user
    // supabase.auth.getSession().then(({ data: { session } }) => {
    //   console.log('🔍 Initial session check:', session?.user?.email || 'No session');
    //   setUser(session?.user ?? null);
    //   setLoading(false);
    //   setInitialLoad(false);
    // });

    // Listen for changes on auth state
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    //   ... existing code ...
    // });

    // return () => subscription.unsubscribe();
  }, []); // Empty dependency array since this effect should only run once

  const signInWithGoogle = async () => {
    try {
      console.log('🔍 Starting Google sign in...');
      
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
        console.error('❌ OAuth error:', error);
        throw error;
      }

      console.log('🔍 OAuth initiated, redirecting to Google...', data);
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    try {
      console.log('🔍 Starting Apple sign in...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        throw error;
      }

      console.log('🔍 OAuth initiated, redirecting to Apple...', data);
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔁 Signing out user...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any stored paths
      sessionStorage.removeItem('xspensesai-intended-path');
      
      toast.success('Signed out successfully');
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to sign out. Please try again.');
      throw error;
    }
  };

  // Show loading screen during initial auth check
  if (loading && initialLoad) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500  mb-4"></div>
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
    // Check if auth is already initialized
    supabase.auth.getSession().then(() => {
      setAuthInitialized(true);
    });
  }, []);

  if (!authInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16  mb-4">
            <img src="/assets/xspensesai-icon.svg" alt="XspensesAI" className="w-full h-full animate-pulse" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500  mb-4"></div>
          <p className="text-gray-600">Loading XspensesAI...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

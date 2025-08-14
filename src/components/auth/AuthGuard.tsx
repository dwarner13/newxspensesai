import { ReactNode, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, getProfile } from '../../lib/supabase';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [sessionValidating, setSessionValidating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check session validity on protected routes
  useEffect(() => {
    // Skip if still loading or no user
    if (loading || !user) {
      return;
    }

    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://auth.xspensesai.com' || supabaseAnonKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXhpZ210ZHBqemt5YWZvc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4MjQsImV4cCI6MjA2NTA1OTgyNH0.j2qETzVRu2rj1EOqxxh5caiPu-tvjYUnrRA4SU2G-_Y') {
      console.log('⚠️ Supabase auth skipped - not connected (AuthGuard)');
      console.log('🔍 AuthGuard: Supabase not configured, skipping session validation');
      return;
    }
    
    // Skip session validation in development mode or for bypass user
    if (import.meta.env.DEV || user.id === 'bypass-user-123') {
      console.log('🔍 AuthGuard: Development mode or bypass user - skipping session validation');
      return;
    }

    console.log('🔍 AuthGuard: Starting session validation for user:', user.email);
    setSessionValidating(true);

    // Set a 5-second timeout for session validation
    timeoutRef.current = setTimeout(() => {
      console.log('⚠️ AuthGuard: Session validation timeout reached (5s), forcing completion');
      setSessionValidating(false);
    }, 5000);

    const checkSession = async () => {
      try {
        console.log('🔍 AuthGuard: Checking session validity...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AuthGuard: Error checking session:', error);
          setSessionValidating(false);
          
          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // Store current path for after login
          sessionStorage.setItem('xspensesai-intended-path', location.pathname);
          return;
        }
        
        if (!session) {
          console.log('⚠️ AuthGuard: Invalid session detected, redirecting to login');
          setSessionValidating(false);
          
          // Clear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          // Store current path for after login
          sessionStorage.setItem('xspensesai-intended-path', location.pathname);
          return;
        }

        console.log('🔍 AuthGuard: Valid session found, checking profile...');
        
        try {
          // Use getProfile function which handles mock mode and dev users
          const profile = await getProfile(user.id);
          console.log('🔍 AuthGuard: Profile check successful:', profile ? 'Profile exists' : 'No profile');
          
          // Profile creation is handled by getProfile function
          // Gamification disabled - streak and XP updates removed
        } catch (error) {
          console.error('❌ AuthGuard: Error checking profile:', error);
          // Don't redirect on profile error, just log it
        }

        setSessionValidating(false);
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

      } catch (error) {
        console.error('❌ AuthGuard: Unexpected error in session check:', error);
        setSessionValidating(false);
        
        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    checkSession();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user, loading, location.pathname]); // Include location.pathname to prevent unnecessary re-renders

  // Show loading screen during auth check
  if (loading) {
    console.log('🔍 AuthGuard: Still loading auth context...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading screen during session validation
  if (sessionValidating) {
    console.log('🔍 AuthGuard: Validating session...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
          <p className="text-gray-600">Validating your session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔍 AuthGuard: No user found, redirecting to login');
    // Store the attempted path for redirect after login
    sessionStorage.setItem('xspensesai-intended-path', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('🔍 AuthGuard: User authenticated, rendering protected content');
  return <>{children}</>;
}

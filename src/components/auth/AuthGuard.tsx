import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../lib/supabase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, initialLoad } = useAuth();
  const [sessionValidating, setSessionValidating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Skip if still loading or no user
    if (loading || !user) {
      return;
    }

    // Check if Supabase is available
    if (!supabase) {
      // Development mode - no Supabase
      console.log('⚡ Dev mode: AuthGuard skipping session validation');
      return;
    }

    // Skip session validation in development mode or for dev user
    if (process.env.NODE_ENV !== 'production' || user.id === 'dev-user') {
      console.log('🔍 AuthGuard: Development mode or dev user - skipping session validation');
      return;
    }

    // Production mode - validate session
    console.log('🔍 AuthGuard: Validating session for production user...');
    setSessionValidating(true);

    // Set a timeout to prevent hanging
    const sessionTimeout = setTimeout(() => {
      console.log('⚠️ AuthGuard: Session validation timeout');
      setSessionValidating(false);
    }, 5000);

    const validateSession = async () => {
      try {
        console.log('🔍 AuthGuard: Checking session validity...');
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ AuthGuard: Session validation error:', error);
          // Redirect to login on session error
          window.location.href = '/login';
          return;
        }

        if (!session) {
          console.log('🔍 AuthGuard: No valid session found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        console.log('🔍 AuthGuard: Session validated successfully');
        setSessionValidating(false);
      } catch (error) {
        console.error('❌ AuthGuard: Unexpected error during session validation:', error);
        setSessionValidating(false);
        // On unexpected errors, redirect to login for safety
        window.location.href = '/login';
      }
    };

    validateSession();

    // Cleanup function
    return () => {
      clearTimeout(sessionTimeout);
    };
  }, [user, loading]);

  // Show loading while checking authentication
  if (loading || initialLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show loading while validating session
  if (sessionValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating your session...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if no user
  if (!user) {
    console.log('🔍 AuthGuard: No user found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

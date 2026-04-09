import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import supabase from '../../lib/supabase';
import { isDemoMode, isGuestSession } from '../../lib/demoAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userId, loading, initialLoad, isDemoUser } = useAuth();
  const [sessionValidating, setSessionValidating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Skip if still loading or no user/userId
    if (loading || (!user && !userId)) {
      return;
    }

    // Skip session validation for guest sessions (demo mode)
    if (isDemoMode() && isGuestSession()) {
      console.log('⚡ AuthGuard: Guest session detected - skipping session validation');
      return;
    }

    // Check if Supabase is available
    if (!supabase) {
      // Development mode - no Supabase
      console.log('⚡ Dev mode: AuthGuard skipping session validation');
      return;
    }

    // Skip session validation in development mode or for demo/guest user
    if (process.env.NODE_ENV !== 'production' || isDemoUser || user?.id === 'dev-user') {
      console.log('🔍 AuthGuard: Development mode or demo user - skipping session validation');
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
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
        <style>{`@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #1e2d4a', borderTopColor: '#c8a64e', animation: 'authSpin 0.9s linear infinite' }} />
      </div>
    );
  }

  // Show loading while validating session
  if (sessionValidating) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220' }}>
        <style>{`@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #1e2d4a', borderTopColor: '#c8a64e', animation: 'authSpin 0.9s linear infinite' }} />
      </div>
    );
  }

  // Redirect to login if no user or userId (accept guest sessions)
  if (!user && !userId) {
    console.log('🔍 AuthGuard: No user/userId found, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // User is authenticated (real or guest), render children
  return <>{children}</>;
}

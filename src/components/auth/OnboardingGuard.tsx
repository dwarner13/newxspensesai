import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isDemoMode, isGuestSession } from '../../lib/demoAuth';

/**
 * OnboardingGuard Component
 * 
 * Checks if user has completed profile setup (profile_completed = true).
 * If not completed, redirects to /onboarding/welcome
 * If logged out, redirects to login
 * If completed, allows access to protected routes
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, userId, loading, initialLoad, profile, isProfileLoading } = useAuth();
  const location = useLocation();

  // Demo user or guest session - skip onboarding check
  const isDemoUserId = userId === '00000000-0000-4000-8000-000000000001';
  const isGuest = isDemoMode() && isGuestSession();
  
  // Compute profile completed status
  const profileCompleted = useMemo(() => {
    // Skip check for demo/guest users
    if (isDemoUserId || isGuest) {
      return true;
    }

    // If no user/userId, not completed (will redirect to login)
    if (!user || !userId) {
      return null;
    }

    // If profile is still loading, return null (will show loading state)
    if (isProfileLoading || loading || initialLoad) {
      return null;
    }

    // If profile doesn't exist, user needs onboarding
    if (!profile) {
      return false;
    }

    // Check profile_completed field (defaults to false if null)
    return profile.profile_completed === true;
  }, [user, userId, profile, isProfileLoading, loading, initialLoad, isDemoUserId, isGuest]);

  // Show loading while checking auth or profile
  if (loading || initialLoad || isProfileLoading || profileCompleted === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user or userId, redirect to login (AuthGuard handles this, but double-check)
  // Accept guest sessions (userId exists even if user is null)
  if (!user && !userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile not completed, redirect to onboarding
  if (profileCompleted === false) {
    // Don't redirect if already on onboarding pages
    if (location.pathname.startsWith('/onboarding')) {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding/welcome" replace />;
  }

  // Profile completed or null (fail open), allow access
  return <>{children}</>;
}


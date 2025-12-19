import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabase } from '../../lib/supabase';
import { isDemoMode, isGuestSession, getGuestSession } from '../../lib/demoAuth';

/**
 * OnboardingGuard Component
 * 
 * Checks if user has completed profile setup (profile_completed = true).
 * If not completed, redirects to /onboarding/welcome
 * If logged out, redirects to login
 * If completed, allows access to protected routes
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, userId, loading, initialLoad } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkProfileStatus = async () => {
      // Skip if still loading auth
      if (loading || initialLoad) {
        return;
      }

      // If no user, don't check profile (AuthGuard will handle login redirect)
      if (!user || !userId) {
        setCheckingProfile(false);
        return;
      }

      // Demo user or guest session - skip onboarding check
      const isDemoUserId = userId === '00000000-0000-4000-8000-000000000001';
      const isGuest = isDemoMode() && isGuestSession();
      if (isDemoUserId || isGuest) {
        setProfileCompleted(true);
        setCheckingProfile(false);
        return;
      }

      try {
        const supabase = getSupabase();
        if (!supabase) {
          // No Supabase - allow access (dev mode)
          console.log('⚡ Dev mode: OnboardingGuard skipping profile check');
          setProfileCompleted(true);
          setCheckingProfile(false);
          return;
        }

        // Check profile_completed status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('profile_completed')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error checking profile status:', error);
          // On error, allow access (fail open)
          setProfileCompleted(true);
          setCheckingProfile(false);
          return;
        }

        // If profile doesn't exist, user needs onboarding
        if (!profile) {
          setProfileCompleted(false);
          setCheckingProfile(false);
          return;
        }

        // Check profile_completed field (defaults to false if null)
        setProfileCompleted(profile.profile_completed === true);
        setCheckingProfile(false);
      } catch (error) {
        console.error('Error checking profile:', error);
        // On error, allow access (fail open)
        setProfileCompleted(true);
        setCheckingProfile(false);
      }
    };

    checkProfileStatus();
  }, [user, userId, loading, initialLoad]);

  // Show loading while checking auth or profile
  if (loading || initialLoad || checkingProfile) {
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


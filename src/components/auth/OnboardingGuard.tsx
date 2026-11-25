import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppSplash } from '../ui/AppSplash';

/**
 * OnboardingGuard Component
 * 
 * Checks if user has completed onboarding (metadata.onboarding_completed = true).
 * IMPORTANT: Only checks after AuthContext.ready === true to prevent route flipping.
 * 
 * If not completed, allows access (overlay will show on dashboard)
 * If logged out, redirects to login
 * If completed, allows access to protected routes
 */
export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, userId, loading, ready, profile, isProfileLoading } = useAuth();
  const location = useLocation();

  // CRITICAL: ALL hooks must be called unconditionally at the top level
  // Check onboarding completion in metadata (must be before early returns)
  const onboardingCompleted = useMemo(() => {
    if (!profile?.metadata || typeof profile.metadata !== 'object') {
      return false;
    }
    return (profile.metadata as any)?.onboarding_completed === true;
  }, [profile]);

  // CRITICAL: Wait for auth to be ready before making any decisions
  // This prevents route flipping during auth initialization
  if (!ready || loading || isProfileLoading) {
    return (
      <AppSplash stage="preparing" />
    );
  }

  // If no user or userId, redirect to login
  if (!user && !userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Always allow access - overlay will show on dashboard if not completed
  // This prevents route flipping and keeps user on dashboard
  return <>{children}</>;
}


import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import { CustodianOnboardingWizard } from '../../components/onboarding/CustodianOnboardingWizard';

export default function OnboardingSetupPage() {
  const navigate = useNavigate();
  const { user, userId, profile, ready, refreshProfile } = useAuth();
  const { endTransition } = useRouteTransition();

  // End route transition when page mounts
  useEffect(() => {
    endTransition();
  }, [endTransition]);

  // Redirect unauthenticated users to homepage
  useEffect(() => {
    if (ready && !user && !userId) {
      console.log('[OnboardingSetupPage] User not authenticated, redirecting to homepage');
      navigate('/', { replace: true });
    }
  }, [ready, user, userId, navigate]);

  // Log custodian status for debugging (redirect handled in render via Navigate component)
  useEffect(() => {
    if (!ready || !user || !userId || !profile) return;
    
    const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
    const custodianReady = (md as any).custodian_ready === true;
    
    // Log for verification
    if (import.meta.env.DEV) {
      console.log('[OnboardingSetupPage] Checking custodian status:', {
        profileId: profile?.id,
        custodian_ready: custodianReady,
        onboarding_completed: profile?.onboarding_completed,
        metadata: md,
      });
      
      if (custodianReady) {
        console.log('[OnboardingSetupPage] Custodian ready - Navigate component will redirect');
      } else {
        console.log('[OnboardingSetupPage] Custodian not ready, showing Custodian wizard');
      }
    }
  }, [ready, user, userId, profile]);

  // Show loading while auth initializes (prevent blank screen)
  if (!ready) {
    return (
      <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Loading your setup…</p>
        </div>
      </div>
    );
  }

  // Redirect unauthenticated users (don't show wizard)
  if (!user || !userId) {
    return (
      <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Redirecting…</p>
        </div>
      </div>
    );
  }

  // Show loading while profile loads (prevent blank screen)
  if (!profile) {
    return (
      <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
          <p className="text-white text-lg">Loading your setup…</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Early return - if custodian_ready === true, NEVER render wizard
  // This prevents onboarding re-entry after completion
  // Use Navigate component for immediate, reliable redirect
  // SAFETY: Only check if profile exists (already checked above)
  const md = (profile?.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
  const custodianReady = (md as any)?.custodian_ready === true;
  if (custodianReady) {
    // Redirect immediately using Navigate component (more reliable than navigate() in render)
    if (import.meta.env.DEV) {
      console.log('[OnboardingSetupPage] Custodian ready, redirecting to dashboard (Navigate component)');
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleComplete = async () => {
    // After wizard completes, refresh profile to get latest custodian_ready status
    // Then redirect to dashboard (RouteDecisionGate will handle if custodian_ready is still false)
    
    // Force refresh profile to get latest metadata
    await refreshProfile();
    
    // Small delay to ensure profile state updates
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Navigate to dashboard - RouteDecisionGate will handle redirect if custodian_ready is still false
    // But typically it should be true now, so this will succeed
    navigate('/dashboard', { replace: true });
  };

  // CRITICAL: Always render wizard when custodian_ready is false, even if onboarding_completed is true
  // Never return null - always render something
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <CustodianOnboardingWizard onComplete={handleComplete} />
      </div>
    </div>
  );
}







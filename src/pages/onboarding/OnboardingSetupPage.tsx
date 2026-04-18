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
          <p className="text-white text-lg">Loading your setup...</p>
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
          <p className="text-white text-lg">Redirecting...</p>
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
          <p className="text-white text-lg">Loading your setup...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Early return - if custodian_ready === true, NEVER render wizard
  // This prevents onboarding re-entry after completion.
  // Redirect to /dashboard (returning users) — but if the wizard just completed
  // in THIS session, the wizard's own navigate() handles redirect to upload?welcome=1
  // so we use a sessionStorage flag to avoid clobbering it.
  const md = (profile?.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
  const custodianReady = (md as any)?.custodian_ready === true;
  const justCompleted = typeof window !== 'undefined' && sessionStorage.getItem('wizard_just_completed') === '1';
  if (custodianReady && !justCompleted) {
    // Returning user with onboarding already done — send to dashboard
    if (import.meta.env.DEV) {
      console.log('[OnboardingSetupPage] Custodian ready, redirecting to dashboard (Navigate component)');
    }
    return <Navigate to="/dashboard" replace />;
  }

  const handleComplete = async () => {
    // Wizard handles its own navigate to /dashboard/upload?welcome=1.
    // We just need to:
    //   1. Set a sessionStorage flag so the custodian_ready Navigate guard above
    //      doesn't preempt the wizard's redirect on the next render.
    //   2. Refresh the profile so other context consumers see the new state.
    // Do NOT call navigate() here — that would override the wizard's redirect.
    try {
      sessionStorage.setItem('wizard_just_completed', '1');
      // Clean up the flag after a beat so reloads of /onboarding/setup redirect correctly
      setTimeout(() => sessionStorage.removeItem('wizard_just_completed'), 3000);
    } catch {
      /* sessionStorage may not be available */
    }
    await refreshProfile();
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







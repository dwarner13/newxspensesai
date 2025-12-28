/**
 * RouteDecisionGate Component
 * 
 * Prevents dashboard flash by ensuring BOTH auth and profile state are resolved
 * before rendering any dashboard components or making routing decisions.
 * 
 * Flow:
 * 1. Wait for auth.ready === true (auth state resolved)
 * 2. Wait for profile to load (!isProfileLoading AND profile exists or confirmed missing)
 * 3. Show "Preparing your workspace..." screen during wait
 * 4. Only after both ready, decide: onboarding required → redirect, else → render children
 * 
 * This ensures ConnectedDashboard and chat components never mount before onboarding decision.
 * 
 * ============================================================================
 * VERIFICATION STEPS
 * ============================================================================
 * 
 * After login, verify the correct sequence in console logs:
 * 
 * 1. ✅ "Preparing your workspace..." screen appears FIRST
 *    - Log: [RouteDecisionGate] routeReady=false, showing PreparingWorkspaceScreen
 * 
 * 2. ✅ Route decision made AFTER auth + profile ready
 *    - Log: [RouteDecisionGate] Decision: routeReady=true, onboardingCompleted=<bool>, targetRoute=<string>
 * 
 * 3. ✅ If onboarding required:
 *    - Log: [RouteDecisionGate] Redirecting to onboarding (dashboard NOT rendered)
 *    - Onboarding page mounts
 *    - NO ConnectedDashboard render logs before onboarding
 * 
 * 4. ✅ If onboarding complete:
 *    - Log: [RouteDecisionGate] Rendering dashboard (onboarding complete)
 *    - ConnectedDashboard renders ONCE
 *    - Chat mounts ONCE
 * 
 * 5. ✅ No flash/jump:
 *    - ConnectedDashboard render should NOT appear before onboarding redirect
 *    - Only ONE ConnectedDashboard render log after onboarding decision
 *    - Only ONE chat mount log
 * 
 * Expected log sequence (new user):
 *   [RouteDecisionGate] routeReady=false → PreparingWorkspaceScreen
 *   [RouteDecisionGate] Decision: routeReady=true, onboardingCompleted=false, targetRoute=/onboarding/welcome
 *   [RouteDecisionGate] Redirecting to onboarding (dashboard NOT rendered)
 *   [OnboardingWelcomePage] Mounted (endTransition called)
 * 
 * Expected log sequence (returning user):
 *   [RouteDecisionGate] routeReady=false → PreparingWorkspaceScreen
 *   [RouteDecisionGate] Decision: routeReady=true, onboardingCompleted=true, targetRoute=/dashboard
 *   [RouteDecisionGate] Rendering dashboard (onboarding complete)
 *   [ConnectedDashboard] Render (ONCE, after onboarding decision)
 *   [Chat] Mount (ONCE)
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import { WelcomeBackOverlay } from '../onboarding/WelcomeBackOverlay';
import { useAppBootStatus } from '../../hooks/useAppBootStatus';

/**
 * Loading screen shown while waiting for auth + profile to resolve
 */
function PreparingWorkspaceScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#0f172a] to-[#1a1e3a]">
      {/* Blurred background effect */}
      <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm" />
      
      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center justify-center px-4">
        {/* Subtle spinner */}
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60" />
        </div>
        
        {/* Text */}
        <p className="text-white/90 text-lg font-medium">
          Preparing your workspace...
        </p>
        <p className="text-white/60 text-sm mt-2">
          Just a moment
        </p>
      </div>
    </div>
  );
}

export default function RouteDecisionGate({ children }: { children: React.ReactNode }) {
  // ============================================================================
  // CRITICAL: ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  // NO HOOKS AFTER ANY RETURN STATEMENTS
  // ============================================================================
  
  // Hook 1: Permanent boot tracking - NEVER resets during navigation
  const hasBootedRef = useRef(false);
  const [isBootComplete, setIsBootComplete] = useState(false);
  
  // Hook 2: Context hooks - ALL called unconditionally
  const { user, userId, loading, ready, profile, isProfileLoading } = useAuth();
  
  // Hook 3: Router hook - called unconditionally (but NOT used for boot logic)
  const location = useLocation();
  
  // Hook 4: Transition hook - called unconditionally
  const { startTransition } = useRouteTransition();

  // Computed values (not hooks, but must be before any returns)
  const authReady = ready && !loading;

  // Hook 5: useMemo - profileReady - called unconditionally
  const profileReady = useMemo(() => {
    if (isProfileLoading) return false;
    if (userId) return true;
    return true;
  }, [isProfileLoading, userId, profile]);

  // Computed value (not a hook)
  const routeReady = authReady && profileReady;
  
  // CRITICAL: Track boot completion ONCE - never reset during navigation
  // This effect runs only when auth/profile become ready for the first time
  useEffect(() => {
    // Once boot is complete, mark it permanently
    if (routeReady && !hasBootedRef.current) {
      hasBootedRef.current = true;
      setIsBootComplete(true);
      if (import.meta.env.DEV) {
        console.log('[RouteDecisionGate] ✅ Boot complete - loader will NEVER show again until hard refresh');
      }
    }
  }, [routeReady]); // Only depends on routeReady, NOT location or navigation
  
  // Only show loader during TRUE first boot (before hasBootedRef is set)
  // Once hasBootedRef.current is true, NEVER show loader again
  const shouldShowLoader = !hasBootedRef.current && !routeReady;

  // Hook 5: useMemo - onboardingRequired - called unconditionally
  // SINGLE SOURCE OF TRUTH: Check custodian_ready (profile.metadata.custodian_ready)
  // This matches OnboardingSetupPage logic exactly
  // RouteDecisionGate owns ALL routing decisions - AuthContext does NOT navigate
  const onboardingRequired = useMemo(() => {
    if (!routeReady) return false;
    
    // If no userId, no onboarding needed
    if (!userId) return false;
    
    // If userId exists but no profile yet, require onboarding
    if (!profile) return true;
    
    // SINGLE SOURCE OF TRUTH: Check custodian_ready from metadata
    // Strict check: must be exactly true (not truthy string or number)
    const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
    const custodianReady = (md as any).custodian_ready === true;
    const required = !custodianReady;
    
    // Log for verification - compare with OnboardingSetupPage
    if (import.meta.env.DEV && routeReady) {
      console.log('[RouteDecisionGate] Custodian check (SINGLE SOURCE OF TRUTH):', {
        profileId: profile.id,
        custodian_ready: custodianReady,
        onboardingRequired: required,
        source: 'profile.metadata.custodian_ready',
        note: 'RouteDecisionGate owns routing - AuthContext does NOT navigate',
      });
    }
    
    return required;
  }, [routeReady, profile, userId]);

  // Hook 6: useMemo - targetRoute - called unconditionally
  const targetRoute = useMemo(() => {
    if (!routeReady) return 'pending';
    if (onboardingRequired && location.pathname.startsWith('/dashboard')) {
      return '/onboarding/setup'; // Route to Custodian onboarding wizard
    }
    return location.pathname;
  }, [routeReady, onboardingRequired, location.pathname]);

  // Hook 7: useMemo - onboardingCompleted - called unconditionally
  const onboardingCompleted = useMemo(() => {
    if (!profile) return false;
    const onboardingStatus = (profile as any).onboarding_status;
    return onboardingStatus === 'completed' || profile.onboarding_completed === true;
  }, [profile]);

  // Hook 8: useEffect - logging - called unconditionally
  // REMOVED location.pathname from dependencies to prevent re-triggering on navigation
  useEffect(() => {
    if (shouldShowLoader && !hasBootedRef.current) {
      console.log('[RouteDecisionGate] First boot - showing PreparingWorkspaceScreen');
      return;
    }

    // Don't log during navigation - only log boot completion once
    if (isBootComplete && routeReady) {
      // Only log once when boot completes, not on every route change
      if (import.meta.env.DEV) {
        const md = (profile?.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
        const custodianReady = (md as any).custodian_ready === true;
        console.log('[RouteDecisionGate] Decision (SINGLE SOURCE OF TRUTH):', {
          routeReady: true,
          custodianReady,
          onboardingRequired,
          targetRoute,
          decision: onboardingRequired ? 'redirect to /onboarding/setup' : 'allow access to dashboard',
          source: 'profile.metadata.custodian_ready',
          note: 'RouteDecisionGate owns routing - AuthContext does NOT navigate',
        });
      }
    }
  }, [shouldShowLoader, isBootComplete, routeReady, onboardingCompleted, onboardingRequired, targetRoute, profile]);

  // Hook 9: useEffect - transition - called unconditionally
  useEffect(() => {
    if (onboardingRequired && location.pathname.startsWith('/dashboard')) {
      console.log('[RouteDecisionGate] Triggering transition → redirecting to onboarding');
      startTransition();
    }
  }, [onboardingRequired, location.pathname, startTransition]);

  // CRITICAL: Show loading screen ONLY during TRUE first boot
  // Once hasBootedRef.current is true, NEVER show loader again (even on route changes)
  if (shouldShowLoader && !hasBootedRef.current) {
    return <PreparingWorkspaceScreen />;
  }
  
  // After boot is complete, ALWAYS proceed to route decision logic
  // Never show loader again, even if routeReady becomes temporarily false
  // This prevents loader flashes during navigation
  if (!hasBootedRef.current && !routeReady) {
    // Still on first boot and route not ready - show loader
    return <PreparingWorkspaceScreen />;
  }

  // Auth resolved but no user/userId - redirect to login
  if (!user && !userId) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If onboarding required and we're on dashboard, redirect immediately (no children render)
  // Route to /onboarding/setup (Custodian) instead of /onboarding/welcome (Prime greeting)
  if (onboardingRequired && location.pathname.startsWith('/dashboard')) {
    return <Navigate to="/onboarding/setup" replace />;
  }

  // Boot complete (or route ready) - render children (dashboard)
  // After boot, we always render children even if routeReady is temporarily false
  // This prevents blank pages during navigation
  // SAFETY: Always render children - never return null or undefined
  if (!children) {
    if (import.meta.env.DEV) {
      console.error('[RouteDecisionGate] ⚠️ No children to render - this should not happen');
    }
    return <PreparingWorkspaceScreen />;
  }
  
  return (
    <>
      {children}
      {/* Show Welcome Back overlay once per session after onboarding is complete */}
      {onboardingCompleted && <WelcomeBackOverlay />}
    </>
  );
}


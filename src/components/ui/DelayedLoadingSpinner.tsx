/**
 * DelayedLoadingSpinner Component
 * 
 * Loading spinner that only appears after a delay to prevent flicker during fast navigation.
 * Uses useDelayedFlag to delay showing (350ms) and enforce minimum display time (400ms).
 * 
 * When used as a Suspense fallback, this component is mounted when Suspense shows fallback.
 * The delay logic prevents it from showing immediately, eliminating flicker during fast navigation.
 */

import { useEffect, useRef } from 'react';
import { useDelayedFlag } from '../../hooks/useDelayedFlag';

interface DelayedLoadingSpinnerProps {
  /** Whether loading is active (default: true when used as Suspense fallback) */
  isLoading?: boolean;
  /** Delay before showing (default: 350ms) */
  showDelayMs?: number;
  /** Minimum display time once shown (default: 400ms) */
  minDisplayMs?: number;
}

export function DelayedLoadingSpinner({
  isLoading = true, // Default to true since this is used as Suspense fallback
  showDelayMs = 350,
  minDisplayMs = 400,
}: DelayedLoadingSpinnerProps) {
  // Track when component mounts (means Suspense is showing fallback)
  const mountedRef = useRef(false);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // When this component mounts, it means Suspense is showing the fallback
  // We always treat it as "loading" when mounted
  const shouldShow = useDelayedFlag(isLoading, showDelayMs, minDisplayMs);

  if (!shouldShow) {
    // Return a placeholder that preserves height and matches dashboard background
    return (
      <div className="min-h-[calc(100vh-120px)] w-full bg-slate-950" aria-hidden="true" />
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-950 flex flex-col items-center justify-center">
      {/* Prime's Crown with Glow Effect */}
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
          <span className="text-6xl">👑</span>
        </div>
        {/* Glow effect around the crown */}
        <div className="absolute inset-0 w-32 h-32 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
      </div>
      
      {/* Loading Message */}
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
          Connecting to AI...
        </h1>
        <p className="text-lg text-white/80 max-w-md mx-auto">
          Assembling your AI dream team under Prime's leadership
        </p>
      </div>
      
      {/* Loading Progress Bar */}
      <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden mb-8">
        <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-full animate-pulse"></div>
      </div>
      
      {/* Loading Stages */}
      <div className="text-center space-y-2">
        <div className="text-white/70 text-sm animate-pulse">
          🔍 Initializing AI systems...
        </div>
        <div className="text-white/70 text-sm animate-pulse">
          🧠 Loading financial intelligence...
        </div>
        <div className="text-white/70 text-sm animate-pulse">
          👥 Assembling your AI team...
        </div>
      </div>
    </div>
  );
}


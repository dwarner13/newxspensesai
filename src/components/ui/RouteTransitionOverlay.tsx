/**
 * Route Transition Overlay
 * 
 * Premium fade/blur overlay that appears during route transitions.
 * Provides smooth visual feedback when navigating between routes.
 */

import { useEffect } from 'react';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';

export function RouteTransitionOverlay() {
  const { isTransitioning, endTransition } = useRouteTransition();

  // Auto-end transition after a reasonable timeout (safety fallback)
  useEffect(() => {
    if (isTransitioning) {
      const timeout = setTimeout(() => {
        // Safety: auto-end if transition takes too long
        console.warn('[RouteTransitionOverlay] Auto-ending transition after timeout');
        endTransition();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning, endTransition]);

  // DISABLED: Route transition overlay removed to prevent blur flash
  // Route transitions now handled by AnimatedOutlet with Framer Motion (no blur)
  return null;
}


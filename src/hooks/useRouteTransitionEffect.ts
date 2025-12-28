/**
 * useRouteTransitionEffect Hook
 * 
 * Automatically ends route transition when component mounts.
 * Use this hook in route components to ensure transitions end properly.
 */

import { useEffect } from 'react';
import { useRouteTransition } from '../contexts/RouteTransitionContext';

/**
 * Hook that automatically ends route transition on mount
 * Use this in route components to ensure smooth transitions
 * 
 * @example
 * function MyRoute() {
 *   useRouteTransitionEffect();
 *   return <div>Content</div>;
 * }
 */
export function useRouteTransitionEffect() {
  const { endTransition } = useRouteTransition();

  useEffect(() => {
    // Small delay to ensure smooth fade-in
    const timeout = setTimeout(() => {
      endTransition();
    }, 100);

    return () => clearTimeout(timeout);
  }, [endTransition]);
}







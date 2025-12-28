/**
 * useTransitionNavigate Hook
 * 
 * Wraps React Router's navigate with route transition effects.
 * Call startTransition(), wait briefly, then navigate for smooth transitions.
 */

import { useNavigate } from 'react-router-dom';
import { useRouteTransition } from '../contexts/RouteTransitionContext';
import { useCallback } from 'react';

/**
 * Hook that provides navigation with automatic transition effects
 * 
 * @param delayMs Delay before navigation (default: 200ms for smooth transition)
 * @returns navigate function that triggers transition overlay
 * 
 * @example
 * const navigate = useTransitionNavigate();
 * navigate('/dashboard'); // Automatically triggers transition overlay
 */
export function useTransitionNavigate(delayMs: number = 200) {
  const navigate = useNavigate();
  const { startTransition, endTransition } = useRouteTransition();

  const transitionNavigate = useCallback(
    (to: string | number, options?: { replace?: boolean; state?: any }) => {
      startTransition();
      
      setTimeout(() => {
        if (typeof to === 'string') {
          navigate(to, options);
        } else {
          navigate(to);
        }
        
        // End transition after navigation completes
        // Note: This is approximate - actual end should be called by destination route
        setTimeout(() => {
          endTransition();
        }, 300);
      }, delayMs);
    },
    [navigate, startTransition, endTransition, delayMs]
  );

  return transitionNavigate;
}







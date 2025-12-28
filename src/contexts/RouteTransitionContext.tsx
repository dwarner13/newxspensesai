/**
 * Route Transition Context
 * 
 * Manages global route transition state for premium fade/blur overlay effects.
 * Provides startTransition() and endTransition() functions for smooth route changes.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface RouteTransitionContextType {
  isTransitioning: boolean;
  startTransition: () => void;
  endTransition: () => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextType | undefined>(undefined);

export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = useCallback(() => {
    setIsTransitioning(true);
  }, []);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  return (
    <RouteTransitionContext.Provider
      value={{
        isTransitioning,
        startTransition,
        endTransition,
      }}
    >
      {children}
    </RouteTransitionContext.Provider>
  );
}

export function useRouteTransition() {
  const context = useContext(RouteTransitionContext);
  if (context === undefined) {
    throw new Error('useRouteTransition must be used within a RouteTransitionProvider');
  }
  return context;
}







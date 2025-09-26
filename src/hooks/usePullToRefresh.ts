import { useState, useRef, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
  disabled = false
}: PullToRefreshOptions) => {
  const [state, setState] = useState<PullToRefreshState>({
    isRefreshing: false,
    pullDistance: 0,
    isPulling: false
  });

  const startY = useRef(0);
  const currentY = useRef(0);
  const isScrolledToTop = useRef(true);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) {
      return;
    }
    
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
    
    // Check if we're at the top of the page or very close to it
    isScrolledToTop.current = window.scrollY <= 5;
    
    if (isScrolledToTop.current) {
      setState(prev => ({ ...prev, isPulling: true }));
    }
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing || !state.isPulling) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0 && isScrolledToTop.current) {
      e.preventDefault();
      e.stopPropagation();
      
      const pullDistance = Math.min(deltaY * resistance, threshold * 1.5);
      setState(prev => ({ ...prev, pullDistance }));
    }
  }, [disabled, state.isRefreshing, state.isPulling, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || state.isRefreshing || !state.isPulling) return;
    
    setState(prev => ({ ...prev, isPulling: false }));
    
    if (state.pullDistance >= threshold) {
      // Haptic feedback for supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      setState(prev => ({ ...prev, isRefreshing: true, pullDistance: 0 }));
      
      try {
        await onRefresh();
      } finally {
        setState(prev => ({ ...prev, isRefreshing: false }));
      }
    } else {
      setState(prev => ({ ...prev, pullDistance: 0 }));
    }
  }, [disabled, state.isRefreshing, state.isPulling, state.pullDistance, threshold, onRefresh]);

  return {
    ...state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};

/**
 * Slideout Resize Guard (Dev-Only)
 * 
 * Monitors the slideout shell's bounding box to detect unwanted resizing.
 * Only active in development mode (import.meta.env.DEV).
 * 
 * Usage:
 *   const guard = useSlideoutResizeGuard(slideoutRef);
 *   // Guard automatically monitors and logs resize events
 */

import { useEffect, useRef } from 'react';

export interface ResizeGuardState {
  width: number;
  height: number;
  timestamp: number;
}

export interface ResizeEvent {
  previous: ResizeGuardState;
  current: ResizeGuardState;
  deltaWidth: number;
  deltaHeight: number;
}

/**
 * Hook to monitor slideout resize events (dev-only)
 */
export function useSlideoutResizeGuard(
  elementRef: React.RefObject<HTMLElement>,
  enabled: boolean = true
) {
  const previousSizeRef = useRef<ResizeGuardState | null>(null);
  const isMonitoringRef = useRef(false);
  const openTimeRef = useRef<number | null>(null);
  
  // CRITICAL: Minimum heights to prevent false positives
  const MIN_SHELL_HEIGHT_DESKTOP = 420;
  const MIN_SHELL_HEIGHT_MOBILE = 320;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const MIN_SHELL_HEIGHT = isMobile ? MIN_SHELL_HEIGHT_MOBILE : MIN_SHELL_HEIGHT_DESKTOP;
  const INITIAL_QUIET_PERIOD_MS = 300; // Ignore resizes during first 300ms after open

  useEffect(() => {
    // Only run in development
    if (!import.meta.env.DEV || !enabled || !elementRef.current) {
      return;
    }

    const element = elementRef.current;
    openTimeRef.current = Date.now(); // Record when guard starts monitoring

    // Record initial size when element becomes visible
    const recordSize = () => {
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const currentSize: ResizeGuardState = {
        width: rect.width,
        height: rect.height,
        timestamp: Date.now(),
      };

      if (previousSizeRef.current) {
        const previous = previousSizeRef.current;
        const deltaWidth = currentSize.width - previous.width;
        const deltaHeight = currentSize.height - previous.height;
        const timeSinceOpen = openTimeRef.current ? currentSize.timestamp - openTimeRef.current : 0;
        
        // CRITICAL: Ignore resizes during initial quiet period (first 300ms)
        if (timeSinceOpen < INITIAL_QUIET_PERIOD_MS) {
          previousSizeRef.current = currentSize;
          return; // Skip logging during initial period
        }
        
        // CRITICAL: Ignore resizes that shrink below minimum height (likely measurement error or initial render)
        if (currentSize.height < MIN_SHELL_HEIGHT && deltaHeight < 0) {
          if (import.meta.env.DEV) {
            console.log('[SlideoutResizeGuard] Ignoring resize below minimum height:', {
              currentHeight: currentSize.height,
              minHeight: MIN_SHELL_HEIGHT,
              deltaHeight,
            });
          }
          previousSizeRef.current = currentSize;
          return; // Skip logging for collapses below minimum
        }

        // Only log if there's a meaningful change (> 3px threshold to avoid rounding errors and minor layout shifts)
        // Input area growth within max-height constraints should not trigger warnings
        if (Math.abs(deltaWidth) > 3 || Math.abs(deltaHeight) > 3) {
          const event: ResizeEvent = {
            previous,
            current: currentSize,
            deltaWidth,
            deltaHeight,
          };

          // Get element selector for debugging
          const elementSelector = element.id 
            ? `#${element.id}` 
            : element.className 
            ? `.${element.className.split(' ')[0]}` 
            : element.tagName.toLowerCase();
          
          console.warn(
            '[SlideoutResizeGuard] ⚠️ Slideout shell resized!',
            {
              element: elementSelector,
              previous: `${previous.width}×${previous.height}px`,
              current: `${currentSize.width}×${currentSize.height}px`,
              delta: `${deltaWidth > 0 ? '+' : ''}${deltaWidth}px × ${deltaHeight > 0 ? '+' : ''}${deltaHeight}px`,
              deltaWidth,
              deltaHeight,
              timeSinceOpen: `${timeSinceOpen}ms`,
              minHeight: MIN_SHELL_HEIGHT,
              timestamp: new Date(currentSize.timestamp).toISOString(),
              // Log computed styles that might be causing resize
              computedHeight: window.getComputedStyle(element).height,
              computedWidth: window.getComputedStyle(element).width,
              computedMaxHeight: window.getComputedStyle(element).maxHeight,
              computedMinHeight: window.getComputedStyle(element).minHeight,
            }
          );
        }
      }

      previousSizeRef.current = currentSize;
    };

    // Use ResizeObserver for efficient monitoring
    const resizeObserver = new ResizeObserver(() => {
      recordSize();
    });

    resizeObserver.observe(element);

    // Also record initial size
    recordSize();

    return () => {
      resizeObserver.disconnect();
      previousSizeRef.current = null;
    };
  }, [elementRef, enabled]);

  return {
    recordSize: () => {
      if (elementRef.current && import.meta.env.DEV) {
        const rect = elementRef.current.getBoundingClientRect();
        previousSizeRef.current = {
          width: rect.width,
          height: rect.height,
          timestamp: Date.now(),
        };
        console.log(
          '[SlideoutResizeGuard] 📏 Initial size recorded:',
          `${rect.width}×${rect.height}`
        );
      }
    },
  };
}



/**
 * useDelayedFlag Hook
 * 
 * Delays showing a flag until a condition has been true for a minimum duration.
 * Also enforces a minimum display time once shown to prevent rapid flashing.
 * 
 * @param condition - The condition to monitor
 * @param showDelayMs - Delay before showing (default: 350ms)
 * @param minDisplayMs - Minimum time to keep showing once visible (default: 400ms)
 * @returns Whether the flag should be shown
 */

import { useState, useEffect, useRef } from 'react';

export function useDelayedFlag(
  condition: boolean,
  showDelayMs: number = 350,
  minDisplayMs: number = 400
): boolean {
  const [shouldShow, setShouldShow] = useState(false);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    // Clear any pending timeouts
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (condition) {
      // Condition is true - start delay timer
      if (!shouldShow) {
        // Not currently showing - wait for showDelayMs before showing
        showTimeoutRef.current = setTimeout(() => {
          setShouldShow(true);
          shownAtRef.current = Date.now();
        }, showDelayMs);
      }
      // If already showing, keep showing (no action needed)
    } else {
      // Condition is false
      if (shouldShow) {
        // Currently showing - check if minimum display time has elapsed
        const timeShown = shownAtRef.current ? Date.now() - shownAtRef.current : 0;
        const remainingTime = Math.max(0, minDisplayMs - timeShown);

        if (remainingTime > 0) {
          // Wait for remaining minimum display time
          hideTimeoutRef.current = setTimeout(() => {
            setShouldShow(false);
            shownAtRef.current = null;
          }, remainingTime);
        } else {
          // Minimum display time already elapsed - hide immediately
          setShouldShow(false);
          shownAtRef.current = null;
        }
      }
      // If not showing, cancel any pending show timer
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    }

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [condition, shouldShow, showDelayMs, minDisplayMs]);

  return shouldShow;
}



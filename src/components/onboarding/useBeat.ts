/**
 * useBeat Hook
 * 
 * Returns ready=true after delayMs when enabled.
 * StrictMode-safe with token refs.
 * Clears timers on unmount.
 */

import { useState, useEffect, useRef } from 'react';

interface UseBeatOptions {
  delayMs: number;
  enabled?: boolean;
}

export function useBeat({ delayMs, enabled = true }: UseBeatOptions): boolean {
  const [ready, setReady] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountTokenRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setReady(false);
    const token = ++mountTokenRef.current;

    timerRef.current = setTimeout(() => {
      // Only update if mount hasn't changed (StrictMode safety)
      if (token === mountTokenRef.current) {
        setReady(true);
      }
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [delayMs, enabled]);

  return ready;
}









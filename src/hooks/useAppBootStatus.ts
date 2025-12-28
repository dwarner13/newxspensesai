/**
 * useAppBootStatus Hook
 * 
 * Tracks app boot status - only runs once on initial mount.
 * Once boot is complete, never returns to "loading" state.
 * This prevents the "Preparing your workspace..." screen from showing during route navigation.
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

type BootStatus = 'loading' | 'ready' | 'error';

export function useAppBootStatus(): BootStatus {
  const { ready, loading, isProfileLoading } = useAuth();
  const [bootStatus, setBootStatus] = useState<BootStatus>('loading');
  const hasBootedRef = useRef(false);

  useEffect(() => {
    // Once boot is complete, never reset to loading
    if (hasBootedRef.current) {
      return;
    }

    // Check if auth and profile are ready
    const authReady = ready && !loading;
    const profileReady = !isProfileLoading;
    const isReady = authReady && profileReady;

    if (isReady) {
      hasBootedRef.current = true;
      setBootStatus('ready');
    } else {
      // Still loading on first boot
      setBootStatus('loading');
    }
  }, [ready, loading, isProfileLoading]);

  return bootStatus;
}


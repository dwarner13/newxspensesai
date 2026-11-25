import { useEffect, useRef } from 'react';
import { useDelayedFlag } from '../../hooks/useDelayedFlag';
import { AppSplash } from './AppSplash';

interface DelayedLoadingSpinnerProps {
  isLoading?: boolean;
  showDelayMs?: number;
  minDisplayMs?: number;
}

export function DelayedLoadingSpinner({
  isLoading = true,
  showDelayMs = 350,
  minDisplayMs = 400,
}: DelayedLoadingSpinnerProps) {
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const shouldShow = useDelayedFlag(isLoading, showDelayMs, minDisplayMs);

  // LD-1: the same full-screen AppSplash as sign-in and workspace preparation (no second
  // spinner at a different height). The existing show delay / minimum display still apply,
  // so quick page loads show nothing at all.
  // Inside the dashboard the layout (sidebar) is already on screen: show it in the content
  // area. Elsewhere (sign-in, first load) it is the full-screen startup splash.
  const inDashboard = typeof window !== 'undefined' && window.location.pathname.startsWith('/dashboard');
  return <AppSplash stage="loading" showRing={shouldShow} inline={inDashboard} />;
}
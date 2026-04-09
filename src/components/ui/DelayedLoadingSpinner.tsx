import { useEffect, useRef } from 'react';
import { useDelayedFlag } from '../../hooks/useDelayedFlag';

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

  return (
    <div style={{ minHeight: "calc(100vh - 120px)", background: "#0b1220", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {shouldShow && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #1e2d4a", borderTopColor: "#c8a64e", animation: "xai-spin 0.9s linear infinite" }} />
          <span style={{ fontSize: 11, color: "#4a5f7a", letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase" as const, fontFamily: "inherit" }}>Loading</span>
          <style>{`@keyframes xai-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
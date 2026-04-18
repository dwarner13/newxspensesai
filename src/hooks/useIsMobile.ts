/**
 * useIsMobile
 *
 * Single source of truth for "is this a mobile viewport" across the app.
 * Replaces the 8+ scattered `useState(window.innerWidth <= 768)` patterns
 * that have been duplicated in AppLayout, Header, Layout, ByteDocumentChat,
 * MobileRevolution, FeaturesMegaMenu, ConnectedDashboard, etc.
 *
 * Threshold: 768px (tablets and below count as mobile).
 *
 * Usage:
 *   const isMobile = useIsMobile();
 *   const padding = isMobile ? 20 : 32;
 */

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}

/**
 * PrimeSlideoutShell Component
 *
 * Shared layout shell for Prime slideout panels (Team, Tasks, Chat, etc.)
 * Provides consistent positioning, styling, header, and close button integration
 */

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { GuardrailNotice } from "../chat/GuardrailNotice";
import { CHAT_SHEET_HEIGHT, CHAT_SHEET_WIDTH } from "../../lib/chatSlideoutConstants";
import { useSlideoutResizeGuard } from "../../lib/slideoutResizeGuard";

export interface PrimeSlideoutShellProps {
  /** Panel title (e.g., "PRIME — CHAT") */
  title: string;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Optional status badge (e.g., Online indicator) */
  statusBadge?: React.ReactNode;

  /** Optional icon/emoji for the header */
  icon?: React.ReactNode;

  /** Optional gradient classes for icon background */
  iconGradient?: string;

  /** Optional header actions (right side of header) */
  headerActions?: React.ReactNode;

  /** Main content area */
  children: React.ReactNode;

  /** Close handler */
  onClose?: () => void;

  /** Optional footer content */
  footer?: React.ReactNode;

  /** Optional quick actions section (rendered between header and scroll area) */
  quickActions?: React.ReactNode;

  /** Optional welcome region (welcome card + quick actions, rendered between header and scroll area) */
  welcomeRegion?: React.ReactNode;

  /** Whether to show guardrails banner */
  showGuardrailsBanner?: boolean;

  /** Custom className for the aside element */
  className?: string;

  /** Optional floating rail component to render inside the slideout */
  floatingRail?: React.ReactNode;
}

export function PrimeSlideoutShell({
  title,
  subtitle,
  statusBadge,
  icon,
  iconGradient = "from-amber-400 via-orange-500 to-pink-500",
  headerActions,
  children,
  onClose,
  footer,
  quickActions,
  welcomeRegion,
  showGuardrailsBanner = false,
  className = "",
  floatingRail,
}: PrimeSlideoutShellProps) {
  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Route awareness: On /dashboard/prime-chat, remove scroll trap to allow page scrolling
  const location = useLocation();
  const isPrimeChatPage = location.pathname === "/dashboard/prime-chat";

  // Lock shell height to stable viewport-based height (never changes during typing)
  const [lockedHeight, setLockedHeight] = useState<string | null>(null);
  const [lockedWidth, setLockedWidth] = useState<string | null>(null);
  const openTimeRef = useRef<number | null>(null);
  const chatReadyRef = useRef(false); // Track if chat content is ready (prevents locking to tiny height)

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // CRITICAL: Height constraints to prevent collapse
  const MIN_H = 420; // Minimum height (desktop)
  const MAX_H = 720; // Maximum height
  const MIN_SHELL_HEIGHT_MOBILE = 320; // Minimum height for mobile
  const MIN_SHELL_HEIGHT = isMobile ? MIN_SHELL_HEIGHT_MOBILE : MIN_H;

  useEffect(() => {
    // Wait for chat to be ready before locking height (prevents locking to tiny initial size)
    // Use a small delay to ensure content has rendered
    const timer = setTimeout(() => {
      chatReadyRef.current = true;
      
      // CRITICAL: Use window.innerHeight as the source of truth
      const vh = Math.max(0, window.innerHeight || 0);
      
      // Calculate top chrome offset (header + padding)
      // Header is typically ~64px, add some padding for spacing
      const topChromeOffset = 80; // Header + top padding
      
      // Compute height: viewport height minus top chrome offset
      let next = vh - topChromeOffset;
      
      // Clamp to MIN_H and MAX_H
      next = Math.max(MIN_SHELL_HEIGHT, Math.min(MAX_H, next));
      
      // CRITICAL: Sanity check - if computed height is below minimum, force minimum
      if (next < MIN_SHELL_HEIGHT) {
        if (import.meta.env.DEV) {
          console.error(`[PrimeSlideoutShell] ⚠️ Computed height ${next}px is below minimum ${MIN_SHELL_HEIGHT}px, forcing minimum`);
        }
        next = MIN_SHELL_HEIGHT;
      }
      
      const frozenW = 576; // max-w-xl = 576px

      setLockedHeight(`${next}px`);
      setLockedWidth(`${frozenW}px`);
      openTimeRef.current = Date.now();

      if (import.meta.env.DEV) {
        console.log("[PrimeSlideoutShell] 📏 First paint size locked", {
          mountId: mountIdRef.current,
          width: `${frozenW}px`,
          height: `${next}px`,
          computedHeight: next,
          minHeight: MIN_SHELL_HEIGHT,
          maxHeight: MAX_H,
          viewportHeight: vh,
          topChromeOffset,
          isMobile,
          timestamp: new Date().toISOString(),
        });
      }
    }, 100); // Small delay to ensure content rendered

    return () => clearTimeout(timer);
  }, [isMobile, MIN_SHELL_HEIGHT]);

  // Optional: Recompute on window resize (debounced)
  useEffect(() => {
    if (!lockedHeight) return;

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // CRITICAL: Use window.innerHeight as the source of truth
        const vh = Math.max(0, window.innerHeight || 0);
        
        // Calculate top chrome offset (header + padding)
        const topChromeOffset = 80; // Header + top padding
        
        // Compute height: viewport height minus top chrome offset
        let next = vh - topChromeOffset;
        
        // Clamp to MIN_H and MAX_H
        next = Math.max(MIN_SHELL_HEIGHT, Math.min(MAX_H, next));
        
        // CRITICAL: Sanity check - if computed height is below minimum, force minimum
        if (next < MIN_SHELL_HEIGHT) {
          if (import.meta.env.DEV) {
            console.error(`[PrimeSlideoutShell] ⚠️ Resize computed height ${next}px is below minimum ${MIN_SHELL_HEIGHT}px, forcing minimum`);
          }
          next = MIN_SHELL_HEIGHT;
        }
        
        setLockedHeight(`${next}px`);

        if (import.meta.env.DEV) {
          console.log("[PrimeSlideoutShell] 🔄 Resize recompute (debounced)", {
            mountId: mountIdRef.current,
            newHeight: `${next}px`,
            computedHeight: next,
            minHeight: MIN_SHELL_HEIGHT,
            maxHeight: MAX_H,
            viewportHeight: vh,
            topChromeOffset,
            isMobile,
          });
        }
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [lockedHeight, MIN_SHELL_HEIGHT, isMobile]);

  // Resize guard (dev-only) - monitors shell for unwanted resizing
  const shellRef = useRef<HTMLElement>(null);
  useSlideoutResizeGuard(shellRef, true);

  // Dev-only mount/unmount logging with unique ID
  const mountIdRef = useRef<string>(
    `shell-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[PrimeSlideoutShell] 🟢 Mounted", {
        mountId: mountIdRef.current,
        title,
        lockedHeight,
      });
      return () => {
        console.log("[PrimeSlideoutShell] 🔴 Unmounted", {
          mountId: mountIdRef.current,
          title,
          reason: "Component unmounting",
        });
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full justify-end items-stretch py-6 pr-4">
      <motion.aside
        ref={shellRef}
        data-prime-slideout-shell="true"
        initial={{ opacity: 0, transform: "translate3d(110%, 0, 0)" }}
        animate={{ opacity: 1, transform: "translate3d(0, 0, 0)" }}
        exit={{ opacity: 0, transform: "translate3d(110%, 0, 0)" }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                transform: { duration: 0.26, ease: [0.2, 0.9, 0.2, 1] },
                opacity: { duration: 0.18, ease: "easeOut" },
              }
        }
        style={{
          willChange: "transform, opacity",
          height: lockedHeight || CHAT_SHEET_HEIGHT,
          maxHeight: lockedHeight || CHAT_SHEET_HEIGHT,
          // CRITICAL: Enforce minimum height to prevent collapse while open
          minHeight: lockedHeight ? undefined : `${MIN_SHELL_HEIGHT}px`,
          width: lockedWidth || "100%",
          maxWidth: lockedWidth || "576px",
          transition: prefersReducedMotion
            ? "none"
            : "transform 0.26s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.18s ease-out",
        }}
        className={`
          flex flex-col
          ${lockedWidth ? "" : `w-full ${CHAT_SHEET_WIDTH}`}
          rounded-3xl border border-slate-800/80 bg-gradient-to-b
          from-slate-900/80 via-slate-950 to-slate-950
          shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(56,189,248,0.25)]
          overflow-hidden transform-gpu
          ${className}
        `}
      >
        {/* Relative wrapper for rail + content */}
        <div className="relative flex flex-col h-full overflow-hidden min-h-0">
          {/* Floating rail - absolutely positioned inside */}
          {floatingRail && (
            <div className="absolute -left-12 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-3 pointer-events-auto">
              {floatingRail}
            </div>
          )}

          {/* Main content area wrapper */}
          {/* CRITICAL: Must have flex flex-col min-h-0 so scroll container can shrink */}
          <div
            className={`flex flex-1 flex-col min-h-0 ${
              isPrimeChatPage ? "h-auto overflow-visible" : "h-full overflow-hidden"
            }`}
            style={{ minHeight: 0 }} // Explicit min-h-0 to ensure flex chain works
          >
            {/* HEADER */}
            <div className="sticky top-0 z-20 border-b border-slate-800/70 bg-gradient-to-r from-slate-950/95 via-slate-950/90 to-slate-950/95 px-6 pt-5 pb-4 backdrop-blur-sm flex-shrink-0 min-h-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {icon && (
                      <span
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${iconGradient} text-base shadow-lg`}
                      >
                        {icon}
                      </span>
                    )}
                    <div>
                      <h2 className="text-sm font-semibold tracking-[0.24em] text-slate-200 uppercase">
                        {title}
                      </h2>
                      {subtitle && (
                        <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                          {subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Status badge + Close button */}
                <div className="flex flex-col items-end gap-2">
                  {statusBadge && <div className="flex items-center gap-2">{statusBadge}</div>}
                  {headerActions && (
                    <div className="flex items-center gap-2">{headerActions}</div>
                  )}
                  {onClose && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                      }}
                      className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors relative z-[90]"
                      aria-label="Close panel"
                      style={{ pointerEvents: "auto" }}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Guardrails banner */}
            {showGuardrailsBanner && (
              <div className="px-6 pt-3 pb-2 shrink-0">
                <GuardrailNotice />
              </div>
            )}

            {/* WELCOME REGION */}
            {welcomeRegion && <div className="shrink-0 min-h-0">{welcomeRegion}</div>}

            {/* QUICK ACTIONS fallback */}
            {!welcomeRegion && quickActions && (
              <div className="shrink-0 min-h-0">{quickActions}</div>
            )}

            {/* SCROLL AREA - Messages only */}
            {/* CRITICAL: This wrapper provides flex structure - actual scroll container is inside UnifiedAssistantChat */}
            {/* The message list container inside children will have the scroll handlers and be the scroll owner */}
            <div
              className="flex-1 min-h-0 flex flex-col"
              style={{ 
                minHeight: "420px", // Prevent collapse to tiny height while chat is open
              }}
            >
              {children}
            </div>

            {/* FOOTER – IMPORTANT FIX */}
            {footer && (
              <div
                className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/95 px-4 pt-3 pb-4 backdrop-blur-sm flex-shrink-0 min-h-0"
                style={
                  isPrimeChatPage
                    ? { overflowY: "visible" } // ✅ NO nested scroll on /dashboard/prime-chat
                    : { maxHeight: "200px", overflowY: "auto" } // ✅ keep overlay behavior elsewhere
                }
              >
                {footer}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}



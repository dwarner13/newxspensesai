/**
 * GuidedOnboardingShell Component
 * 
 * Full-screen onboarding shell for Prime + Custodian onboarding.
 * 
 * Features:
 * - Full-screen overlay (desktop + mobile)
 * - Lock height on mount (no resizing during typing or transitions)
 * - Internal scroll only
 * - Background blur + vignette
 * - Hide bottom navigation while active
 * - No close (X) or background tap to exit
 * - Support controlled exit via callback (Finish later)
 */

import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboardingUI } from '../../contexts/OnboardingUIContext';
import { OnboardingCinematicBackground } from './OnboardingCinematicBackground';

interface GuidedOnboardingShellProps {
  isOpen: boolean;
  onExit: () => void;
  children: ReactNode;
  exitButtonText?: string;
}

export function GuidedOnboardingShell({
  isOpen,
  onExit,
  children,
  exitButtonText = 'Finish later',
}: GuidedOnboardingShellProps) {
  const { setIsOnboardingOpen } = useOnboardingUI();
  const containerRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth <= 768
  );
  
  // Update OnboardingUIContext when shell opens/closes
  useEffect(() => {
    setIsOnboardingOpen(isOpen);
  }, [isOpen, setIsOnboardingOpen]);

  // Detect mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock height on mount (prevents resizing during typing/transitions)
  useEffect(() => {
    if (isOpen && !lockedHeight) {
      const height = window.innerHeight;
      const lockedValue = `${height}px`;
      setLockedHeight(lockedValue);
      
      // Set CSS custom property to prevent resize
      document.documentElement.style.setProperty('--onboarding-height', lockedValue);
      
      // Prevent resize events from changing height
      const handleResize = () => {
        // Keep locked height - ignore resize events
        if (containerRef.current) {
          containerRef.current.style.height = lockedValue;
          containerRef.current.style.maxHeight = lockedValue;
          containerRef.current.style.minHeight = lockedValue;
        }
      };
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        document.documentElement.style.removeProperty('--onboarding-height');
      };
    }
  }, [isOpen, lockedHeight]);

  // Hide bottom navigation and lock body scroll while active
  // IMPORTANT: Only modify overflow - do NOT change position/width/top (causes layout shifts)
  useEffect(() => {
    if (!isOpen) return;

    const bottomNav = document.querySelector('[data-mobile-bottom-nav]');
    if (bottomNav) {
      (bottomNav as HTMLElement).style.display = 'none';
    }

    // Lock body scroll - ONLY change overflow, nothing else
    // Do NOT modify position, width, or top (causes layout shifts)
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
      
      // Restore body overflow only
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Prevent swipe-to-dismiss on mobile
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const startY = touch.clientY;
        const startX = touch.clientX;

        const handleTouchMove = (e: TouchEvent) => {
          if (e.touches.length === 1) {
            const touch = e.touches[0];
            const deltaY = touch.clientY - startY;
            const deltaX = touch.clientX - startX;
            // Prevent swipe down to dismiss
            if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) && deltaY > 50) {
              e.preventDefault();
            }
          }
        };

        const handleTouchEnd = () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };

        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isMobile, isOpen]);

  // Prevent background click to exit
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only prevent if clicking the backdrop itself, not children
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop with gradient veil + soft glow edges - NO CLOSE ON CLICK */}
          {/* Z-index > 10000 ensures it blocks ALL dashboard UI including footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 overflow-hidden"
            onClick={handleBackdropClick}
            style={{ 
              zIndex: 10001,
              height: '100dvh',
              maxHeight: '100dvh',
              pointerEvents: 'auto',
            }}
          >
            {/* Apple-like cinematic background */}
            <OnboardingCinematicBackground />
            
            {/* Backdrop blur overlay (light, preserves cinematic look) */}
            <div 
              className="absolute inset-0 backdrop-blur-[2px] pointer-events-none"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
              }}
            />
          </motion.div>

          {/* Full-screen content container - NO SCROLL */}
          {/* Z-index > 10000 ensures it blocks ALL dashboard UI */}
          <div 
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ 
              zIndex: 10002,
              height: '100dvh',
              maxHeight: '100dvh',
            }}
          >
            <motion.div
              ref={containerRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              className="w-full h-full pointer-events-auto flex flex-col overflow-hidden"
              style={{ 
                height: '100dvh',
                maxHeight: '100dvh',
              }}
            >
              {/* Content area - NO SCROLL, children handle their own scrolling */}
              <div 
                className="flex-1 min-h-0 overflow-hidden h-full w-full"
              >
                {children}
              </div>

              {/* Footer removed - exit button moved to top-right */}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}


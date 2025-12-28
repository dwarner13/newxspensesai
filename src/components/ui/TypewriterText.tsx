/**
 * TypewriterText Component
 * 
 * StrictMode-safe typewriter effect:
 * - Uses startedRef to prevent double-run in StrictMode
 * - Cancels timers on cleanup
 * - Smooth requestAnimationFrame timing
 * - Caret positioned absolutely to prevent width changes
 */

import React, { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  start?: boolean;
  onDone?: () => void;
  className?: string;
}

export function TypewriterText({
  text,
  speedMs = 18,
  start = true,
  onDone,
  className = '',
}: TypewriterTextProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startedRef = useRef(false);
  const lastUpdateTimeRef = useRef<number>(0);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    // Reset if text changes
    if (!text || !start) {
      setDisplayedLength(0);
      startedRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // StrictMode guard: prevent double-run
    if (startedRef.current) {
      return;
    }

    // If reduced motion, show instantly
    if (prefersReducedMotion) {
      setDisplayedLength(text.length);
      startedRef.current = true;
      if (onDone) {
        setTimeout(() => onDone(), 300);
      }
      return;
    }

    // Mark as started (StrictMode guard)
    startedRef.current = true;
    setDisplayedLength(0);
    lastUpdateTimeRef.current = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - lastUpdateTimeRef.current;
      
      if (elapsed >= speedMs) {
        setDisplayedLength((prev) => {
          const next = prev + 1;
          if (next >= text.length) {
            // Complete
            if (onDone) {
              setTimeout(() => onDone(), 200);
            }
            animationFrameRef.current = null;
            return text.length;
          }
          lastUpdateTimeRef.current = currentTime;
          animationFrameRef.current = requestAnimationFrame(animate);
          return next;
        });
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      // Cleanup: cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startedRef.current = false;
    };
  }, [text, speedMs, start, onDone, prefersReducedMotion]);

  const displayedText = text.slice(0, displayedLength);

  return (
    <span className={`relative inline-block ${className}`}>
      {displayedText}
      {displayedLength < text.length && (
        <span 
          className="inline-block w-0.5 h-full bg-purple-400 ml-1 animate-pulse"
          style={{ position: 'absolute', marginLeft: '0.25rem' }}
        />
      )}
    </span>
  );
}


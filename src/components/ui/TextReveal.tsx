/**
 * TextReveal Component
 * 
 * StrictMode-safe typewriter effect for short text reveals.
 * Features:
 * - Time-gated character reveal
 * - Layout reservation (no shift)
 * - StrictMode-safe cleanup
 * - Respects prefers-reduced-motion
 */

import React, { useState, useEffect, useRef } from 'react';

interface TextRevealProps {
  text: string;
  msPerChar?: number;
  startDelayMs?: number;
  onDone?: () => void;
  className?: string;
  cursor?: boolean;
}

// Module-level counter for mount tracking
let revealInstanceCounter = 0;

export function TextReveal({
  text,
  msPerChar = 30,
  startDelayMs = 0,
  onDone,
  className = '',
  cursor = false,
}: TextRevealProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountKeyRef = useRef<string>(`${Date.now()}-${Math.random()}-${++revealInstanceCounter}`);
  const onDoneRef = useRef(onDone);
  const onDoneCalledRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const lastCharTimeRef = useRef<number | null>(null);

  // Keep onDone ref updated
  useEffect(() => {
    onDoneRef.current = onDone;
    onDoneCalledRef.current = false;
  }, [onDone]);

  useEffect(() => {
    const currentMountKey = mountKeyRef.current;

    // Safety: empty text
    if (!text || text.length === 0) {
      setDisplayedLength(0);
      if (onDoneRef.current && !onDoneCalledRef.current) {
        onDoneCalledRef.current = true;
        onDoneRef.current();
      }
      return;
    }

    // Check for reduced motion
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayedLength(text.length);
      if (onDoneRef.current && !onDoneCalledRef.current) {
        onDoneCalledRef.current = true;
        setTimeout(() => onDoneRef.current?.(), 100);
      }
      return;
    }

    // Reset state
    setDisplayedLength(0);
    onDoneCalledRef.current = false;
    startTimeRef.current = null;
    lastCharTimeRef.current = null;

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Start delay
    const delayTimeout = setTimeout(() => {
      if (mountKeyRef.current !== currentMountKey) {
        return; // Mount changed, don't start
      }

      startTimeRef.current = performance.now();
      lastCharTimeRef.current = performance.now();
      setDisplayedLength(1); // Show first character immediately

      // Time-gated character reveal using requestAnimationFrame
      const animate = () => {
        // Check if mount changed
        if (mountKeyRef.current !== currentMountKey) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          return;
        }

        const now = performance.now();
        if (lastCharTimeRef.current === null || startTimeRef.current === null) {
          lastCharTimeRef.current = now;
          timerRef.current = setTimeout(animate, msPerChar);
          return;
        }

        const elapsed = now - lastCharTimeRef.current;
        
        if (elapsed >= msPerChar) {
          setDisplayedLength(prev => {
            if (prev < text.length) {
              const newLength = prev + 1;
              lastCharTimeRef.current = now;

              if (newLength >= text.length) {
                // Complete
                timerRef.current = null;
                if (onDoneRef.current && !onDoneCalledRef.current) {
                  onDoneCalledRef.current = true;
                  setTimeout(() => onDoneRef.current?.(), 100);
                }
                return newLength;
              }
              return newLength;
            }
            return prev;
          });
        }

        timerRef.current = setTimeout(animate, Math.max(1, msPerChar - elapsed));
      };

      timerRef.current = setTimeout(animate, msPerChar);
    }, startDelayMs);

    return () => {
      clearTimeout(delayTimeout);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      // Generate new mount key for next mount (StrictMode)
      mountKeyRef.current = `${Date.now()}-${Math.random()}-${++revealInstanceCounter}`;
    };
  }, [text, msPerChar, startDelayMs]);

  const displayedText = text.slice(0, displayedLength);

  // Safety: empty text
  if (!text || text.length === 0) {
    return null;
  }

  return (
    <span className={`relative inline-block ${className}`}>
      {/* Ghost full text for layout reservation */}
      <span 
        className="opacity-0 pointer-events-none select-none"
        aria-hidden="true"
        style={{ 
          visibility: 'hidden',
          display: 'inline-block',
        }}
      >
        {text}
      </span>
      
      {/* Visible typed text */}
      <span 
        className="absolute inset-0"
        style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {displayedText}
        {cursor && displayedLength < text.length && (
          <span 
            className="inline-block w-[2px] h-[1em] bg-purple-400 ml-1 align-middle animate-pulse"
            style={{ 
              verticalAlign: 'baseline',
              marginLeft: '0.25rem',
            }}
            aria-hidden="true"
          />
        )}
      </span>
    </span>
  );
}


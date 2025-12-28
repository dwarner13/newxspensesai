/**
 * TypewriterStable Component
 * 
 * Stable typewriter effect that prevents layout jumping and double-rendering:
 * - Renders invisible "ghost" full text to reserve height
 * - Overlays typed text absolutely on top
 * - Uses time-delta accumulation for smooth, consistent timing
 * - Prevents double-typing in React StrictMode via mount-key tracking
 * - Stable typography with fixed line-height
 */

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

interface TypewriterStableProps {
  text: string;
  msPerChar?: number;
  startDelayMs?: number;
  cursor?: boolean;
  onDone?: () => void;
  className?: string;
}

// Module-level instance counter to track unique mounts (survives StrictMode remounts)
let instanceCounter = 0;

export function TypewriterStable({
  text,
  msPerChar = 48,
  startDelayMs = 180,
  cursor = true,
  onDone,
  className = '',
}: TypewriterStableProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const [reservedHeight, setReservedHeight] = useState<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const instanceIdRef = useRef<number>(++instanceCounter);
  const textRef = useRef<string>(''); // Track text to detect changes
  const onDoneRef = useRef(onDone);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const mountKeyRef = useRef<string>(`${Date.now()}-${Math.random()}`);
  
  // Time-delta accumulation refs
  const lastTsRef = useRef<number | null>(null);
  const accumulatedMsRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const onDoneCalledRef = useRef(false);
  const currentLengthRef = useRef<number>(0); // Track current length for calculations
  
  // Keep onDone ref updated
  useEffect(() => {
    onDoneRef.current = onDone;
    onDoneCalledRef.current = false; // Reset when onDone changes
  }, [onDone]);

  // Measure ghost height to reserve layout
  useLayoutEffect(() => {
    if (ghostRef.current && text && text.length > 0) {
      const height = ghostRef.current.getBoundingClientRect().height;
      if (height > 0) {
        setReservedHeight(height);
      }
    }
  }, [text]);

  useEffect(() => {
    // Reset if text changes
    if (textRef.current !== text) {
      // Cancel any ongoing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Reset state
      setDisplayedLength(0);
      currentLengthRef.current = 0;
      textRef.current = text;
      lastTsRef.current = null;
      accumulatedMsRef.current = 0;
      startTimeRef.current = null;
      onDoneCalledRef.current = false;
    }

    // Safety fallback: if text is empty, show nothing (not caret-only)
    if (!text || text.length === 0) {
      setDisplayedLength(0);
      return;
    }

    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // If reduced motion, show instantly
    if (prefersReducedMotion) {
      setDisplayedLength(text.length);
      if (onDoneRef.current && !onDoneCalledRef.current) {
        onDoneCalledRef.current = true;
        setTimeout(() => onDoneRef.current?.(), 100);
      }
      return;
    }

    // Check if animation is already running for this text
    if (animationFrameRef.current !== null && textRef.current === text) {
      return;
    }

    // Set text ref
    textRef.current = text;
    setDisplayedLength(0);
    currentLengthRef.current = 0;
    lastTsRef.current = null;
    accumulatedMsRef.current = 0;
    startTimeRef.current = null;
    onDoneCalledRef.current = false;

    const currentMountKey = mountKeyRef.current; // Capture mount key

    // Start delay before beginning animation
    const delayTimeout = setTimeout(() => {
      if (mountKeyRef.current !== currentMountKey) {
        return; // Mount changed, don't start
      }

      startTimeRef.current = performance.now();
      lastTsRef.current = performance.now();

      const animate = (currentTs: number) => {
        // Check if this mount is still active (not unmounted)
        if (mountKeyRef.current !== currentMountKey) {
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }

        // Check if text changed during animation
        if (textRef.current !== text) {
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }

        if (lastTsRef.current === null || startTimeRef.current === null) {
          lastTsRef.current = currentTs;
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        }

        // Time-delta accumulation for smooth, consistent timing
        const deltaMs = currentTs - lastTsRef.current;
        lastTsRef.current = currentTs;
        
        // Cap delta to prevent huge jumps if tab was inactive
        const cappedDelta = Math.min(deltaMs, 100);
        accumulatedMsRef.current += cappedDelta;

        // Calculate how many characters to add based on accumulated time
        const charsToAdd = Math.floor(accumulatedMsRef.current / msPerChar);
        
        if (charsToAdd > 0) {
          const currentLength = currentLengthRef.current;
          const newLength = Math.min(currentLength + charsToAdd, text.length);
          
          // Update ref immediately for next frame calculation
          currentLengthRef.current = newLength;
          setDisplayedLength(newLength);
          
          // Keep remainder for next frame
          accumulatedMsRef.current = accumulatedMsRef.current % msPerChar;

          // Check if complete
          if (newLength >= text.length) {
            animationFrameRef.current = null;
            if (onDoneRef.current && !onDoneCalledRef.current) {
              onDoneCalledRef.current = true;
              setTimeout(() => onDoneRef.current?.(), 100);
            }
            return;
          }
        }

        animationFrameRef.current = requestAnimationFrame(animate);
      };

      // Start animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    }, startDelayMs);

    return () => {
      // Cleanup: clear delay timeout and animation frame
      clearTimeout(delayTimeout);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Reset all timing refs for StrictMode remount safety
      lastTsRef.current = null;
      accumulatedMsRef.current = 0;
      startTimeRef.current = null;
      currentLengthRef.current = 0;
      // Generate new mount key for next mount (StrictMode remount)
      mountKeyRef.current = `${Date.now()}-${Math.random()}`;
    };
  }, [text, msPerChar, startDelayMs]);

  const displayedText = text.slice(0, displayedLength);

  // Safety fallback: if text is empty or invalid, render nothing (not caret-only)
  if (!text || text.length === 0) {
    return null;
  }

  return (
    <span 
      ref={containerRef}
      className={`relative inline-block w-full ${className}`} 
      style={{ 
        lineHeight: '1.15',
        minHeight: reservedHeight ? `${reservedHeight}px` : undefined,
      }}
    >
      {/* Ghost full text layer - locks layout height, invisible but reserves space */}
      <span 
        ref={ghostRef}
        className={`opacity-0 pointer-events-none select-none ${className}`}
        aria-hidden="true"
        style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.15',
          display: 'block',
          width: '100%',
          visibility: 'hidden',
          position: 'absolute',
        }}
      >
        {text}
      </span>
      
      {/* Visible typed text layer - absolute positioned over ghost */}
      <span 
        className={`absolute inset-0 ${className}`}
        style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.15',
          willChange: 'contents',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          color: 'inherit',
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

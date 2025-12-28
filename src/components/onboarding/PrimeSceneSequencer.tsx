/**
 * Prime Scene Sequencer
 * 
 * Shows Prime messages one at a time with fade/replace flow.
 * Each message types → holds → fades away → next appears.
 * StrictMode-safe with ref guards.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypewriterStable } from '../ui/TypewriterStable';

interface PrimeSceneSequencerProps {
  scenes: string[];
  onSceneComplete?: (sceneIndex: number) => void;
  onAllScenesComplete?: () => void;
  onSceneEnter?: (sceneIndex: number) => void; // Called when scene starts typing
  isDimmed?: boolean;
  startDelayMs?: number;
}

type PrimeScenePhase = 'typing' | 'hold' | 'exit';

export function PrimeSceneSequencer({
  scenes,
  onSceneComplete,
  onAllScenesComplete,
  onSceneEnter,
  isDimmed = false,
  startDelayMs = 0,
}: PrimeSceneSequencerProps) {
  const [primeSceneIndex, setPrimeSceneIndex] = useState(0);
  const [primeScenePhase, setPrimeScenePhase] = useState<PrimeScenePhase>('typing');
  const [hasStarted, setHasStarted] = useState(false);
  
  // StrictMode guard: prevent double-fire
  const sequenceTokenRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start first scene after delay
  useEffect(() => {
    if (!hasStarted && scenes.length > 0) {
      const token = ++sequenceTokenRef.current;
      timerRef.current = setTimeout(() => {
        if (token === sequenceTokenRef.current) {
          setHasStarted(true);
          setPrimeScenePhase('typing');
          // Fire onSceneEnter for scene 0 when typing starts
          onSceneEnter?.(0);
        }
      }, startDelayMs);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hasStarted, scenes.length, startDelayMs, onSceneEnter]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  // Per-scene hold durations (breathing pause after typing completes)
  // Premium pacing: 1400ms hold for each scene
  const HOLD_DURATIONS: Record<number, number> = {
    0: 1400, // Scene 0: 1400ms breathing pause
    1: 1400, // Scene 1: 1400ms breathing pause
    2: 1400, // Scene 2: 1400ms breathing pause (if exists)
  };

  const handleTypingDone = () => {
    if (primeScenePhase !== 'typing') return;
    
    const currentIndex = primeSceneIndex;
    const token = ++sequenceTokenRef.current;
    
    // Move to 'hold' phase (message stays fully visible)
    setPrimeScenePhase('hold');
    
    // Get scene-specific hold duration (default to 1400ms if not specified)
    const holdDuration = HOLD_DURATIONS[currentIndex] ?? 1400;
    
    // Hold phase: keep message visible for breathing pause
    holdTimerRef.current = setTimeout(() => {
      // Check token matches and we're still on the same scene (StrictMode safety)
      if (token === sequenceTokenRef.current && primeSceneIndex === currentIndex) {
        // Move to 'exit' phase (fade out animation)
        setPrimeScenePhase('exit');
        
        // Exit animation duration: 550ms (premium ease-out)
        const exitDuration = 550;
        
        // After exit animation completes, call onSceneComplete (AFTER hold + fade)
        exitTimerRef.current = setTimeout(() => {
          // Check token matches and we're still on the same scene (StrictMode safety)
          if (token === sequenceTokenRef.current && primeSceneIndex === currentIndex) {
            // Call onSceneComplete AFTER hold + fade completes
            onSceneComplete?.(currentIndex);
            
            const nextIndex = currentIndex + 1;
            
            if (nextIndex < scenes.length) {
              // Advance to next scene
              setPrimeSceneIndex(nextIndex);
              setPrimeScenePhase('typing');
              // Fire onSceneEnter for the new scene
              onSceneEnter?.(nextIndex);
            } else {
              // All scenes complete
              onAllScenesComplete?.();
              // Stay on last scene, but mark as done
              setPrimeScenePhase('hold');
            }
          }
        }, exitDuration);
      }
    }, holdDuration);
  };

  if (scenes.length === 0 || !hasStarted) {
    return null;
  }

  const currentSceneText = scenes[primeSceneIndex];
  const isLastScene = primeSceneIndex === scenes.length - 1;
  const shouldShowTypewriter = primeScenePhase === 'typing';

  return (
    <div className="w-full max-w-[640px] px-8 md:px-12 py-8 md:py-10">
      {/* Crown Icon */}
      <div className="flex items-start mb-6 relative">
        <motion.div
          animate={{
            opacity: isDimmed ? 0.5 : 0.9,
          }}
          transition={{ duration: 0.5 }}
          style={{
            filter: isDimmed 
              ? 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.3))'
              : 'drop-shadow(0 0 12px rgba(192, 132, 252, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.2))',
          }}
        >
          <span className="text-4xl md:text-5xl">👑</span>
        </motion.div>
      </div>

      {/* Prime Message - ONE at a time with fade/replace */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`prime-scene-${primeSceneIndex}`}
          initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
          animate={{ 
            opacity: primeScenePhase === 'exit' ? 0 : (isDimmed ? 0.7 : 1),
            y: primeScenePhase === 'exit' ? -8 : 0,
            filter: primeScenePhase === 'exit' ? 'blur(8px)' : 'blur(0px)',
          }}
          exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
          transition={{ 
            duration: 0.55,
            ease: [0.2, 0, 0, 1], // easeOut
          }}
          className="text-xl md:text-2xl lg:text-3xl text-white/90 leading-relaxed min-h-[60px] md:min-h-[80px]"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
          }}
        >
          {shouldShowTypewriter ? (
            <TypewriterStable
              key={`tw-${primeSceneIndex}`}
              text={currentSceneText}
              msPerChar={34}
              startDelayMs={0}
              cursor={true}
              className="text-white/90"
              onDone={handleTypingDone}
            />
          ) : (
            <span>{currentSceneText}</span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}


/**
 * Cinematic Prime Panel
 * 
 * Big, cinematic typewriter text for Prime's welcome message.
 * Features:
 * - Large responsive headline (text-3xl to text-5xl)
 * - Slow premium typewriter (38ms per char)
 * - Subtle caret glow animation
 * - Staggered animations: headline → subtext → button
 * - Respects prefers-reduced-motion
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TypewriterStable } from '../ui/TypewriterStable';
import { TextReveal } from '../ui/TextReveal';

interface CinematicPrimePanelProps {
  headline: string;
  subtext: string;
  buttonText?: string; // Optional now - CTA removed
  onButtonClick?: () => void; // Optional now
  isMobile?: boolean;
  onHeadlineDone?: (done: boolean) => void;
}

type SublinePhase = 'hidden' | 'typing' | 'done';

export function CinematicPrimePanel({
  headline,
  subtext,
  buttonText,
  onButtonClick,
  isMobile = false,
  onHeadlineDone,
}: CinematicPrimePanelProps) {
  const [headlineDone, setHeadlineDone] = useState(false);
  const [sublinePhase, setSublinePhase] = useState<SublinePhase>('hidden');

  return (
    <div className="flex flex-col w-full">
      {/* Fixed height container to prevent layout shift */}
      <div className="flex flex-col min-h-[260px] md:min-h-[300px] lg:min-h-[340px]">
        {/* Crown Icon - No background circle, subtle pulse glow only */}
        <div className="flex items-start mb-8 md:mb-10 relative">
          {/* Crown with subtle pulse glow - no background circle */}
          <motion.div
            animate={{
              opacity: [0.9, 1, 0.9],
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              filter: 'drop-shadow(0 0 12px rgba(192, 132, 252, 0.5)) drop-shadow(0 0 24px rgba(59, 130, 246, 0.2))',
            }}
          >
            <span className="text-5xl md:text-6xl lg:text-7xl">👑</span>
          </motion.div>
        </div>

        {/* Cinematic Headline - Stable typewriter (reserves height, no jumping) */}
        {/* Container uses relative positioning for ghost overlay technique */}
        <div className="mb-6 md:mb-8 relative min-h-[160px] md:min-h-[220px] lg:min-h-[260px]">
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-semibold text-white/90 tracking-tight leading-tight relative"
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              lineHeight: '1.15',
              filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.4)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.2))',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <TypewriterStable
              text={headline}
              msPerChar={48}
              startDelayMs={180}
              cursor={true}
              className="text-white/90"
              onDone={() => {
                // Wait 250ms after headline completes, then start subline
                setTimeout(() => {
                  setHeadlineDone(true);
                  onHeadlineDone?.(true);
                  setSublinePhase('typing');
                }, 250);
              }}
            />
          </h1>
        </div>

        {/* Subline - Sequential typewriter reveal after headline */}
        <div className="mb-8 md:mb-10 min-h-[48px] relative">
          {sublinePhase !== 'hidden' && (
            <p
              className="text-base md:text-lg text-slate-300 leading-relaxed"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {sublinePhase === 'typing' ? (
                <TextReveal
                  text={subtext}
                  msPerChar={30}
                  startDelayMs={0}
                  className="text-slate-300"
                  cursor={false}
                  onDone={() => {
                    // After subline completes, mark as done
                    setTimeout(() => {
                      setSublinePhase('done');
                      // No CTA - Prime will auto-continue to narrator messages
                    }, 200);
                  }}
                />
              ) : (
                subtext
              )}
            </p>
          )}
        </div>

        {/* CTA removed - Prime auto-continues to narrator messages */}
      </div>
    </div>
  );
}

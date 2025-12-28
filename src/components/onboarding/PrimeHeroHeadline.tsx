/**
 * Prime Hero Headline Component
 * 
 * Smooth type reveal using clip-path animation (NO shaky typewriter, NO layout reflow).
 * Features:
 * - Fixed height container prevents layout shift
 * - Clip-path reveal animation (smooth, no per-character jitter)
 * - Matches dashboard typography tokens (Inter font, proper tracking/weight)
 * - Respects prefers-reduced-motion
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PrimeHeroHeadlineProps {
  text: string;
  onComplete?: () => void;
  className?: string;
}

export function PrimeHeroHeadline({
  text,
  onComplete,
  className = '',
}: PrimeHeroHeadlineProps) {
  const [revealProgress, setRevealProgress] = useState(0);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!text) {
      setRevealProgress(0);
      return;
    }

    // If reduced motion, show instantly
    if (prefersReducedMotion) {
      setRevealProgress(100);
      if (onComplete) {
        setTimeout(() => onComplete(), 300);
      }
      return;
    }

    // Smooth clip-path reveal: 300-450ms total duration
    const duration = 350; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      
      setRevealProgress(progress);

      if (progress < 100) {
        requestAnimationFrame(animate);
      } else {
        // Complete
        if (onComplete) {
          setTimeout(() => onComplete(), 200);
        }
      }
    };

    requestAnimationFrame(animate);
  }, [text, onComplete, prefersReducedMotion]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: '220px' }}>
      {/* Invisible placeholder to reserve space - prevents layout shift */}
      <h1 
        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight invisible"
        style={{ 
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: '1.2',
        }}
      >
        {text}
      </h1>
      
      {/* Visible text with clip-path reveal */}
      <h1 
        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight absolute top-0 left-0 w-full"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: '1.2',
          filter: 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.4)) drop-shadow(0 0 16px rgba(59, 130, 246, 0.2))',
          clipPath: `inset(0 ${100 - revealProgress}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - revealProgress}% 0 0)`,
        }}
      >
        {text}
      </h1>
    </div>
  );
}









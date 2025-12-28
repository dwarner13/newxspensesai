/**
 * PrimeNarrationPanel Component
 * 
 * Renders Prime messages as a narration panel (not chat bubbles).
 * 
 * Features:
 * - Line-by-line fade-in animation (300-500ms per line)
 * - No typing cursor or animation
 * - Desktop: Left-side narration panel
 * - Mobile: Top fixed-height narration strip
 * - Only renders when explicitly triggered by flow
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrimeNarrationPanelProps {
  text: string;
  isVisible: boolean;
  isMobile?: boolean;
  onComplete?: () => void;
}

export function PrimeNarrationPanel({
  text,
  isVisible,
  isMobile = false,
  onComplete,
}: PrimeNarrationPanelProps) {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);
  const completedRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reset and start typing when text changes
  useEffect(() => {
    if (!text || !isVisible) {
      setDisplayedText('');
      setIsTyping(false);
      completedRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }

    // Reset displayed text
    setDisplayedText('');
    setIsTyping(true);
    completedRef.current = false;

    // If reduced motion, show all text immediately
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsTyping(false);
      if (onComplete) {
        setTimeout(() => onComplete(), 300);
      }
      return;
    }

    // Typewriter effect: character by character with premium pacing
    let currentIndex = 0;
    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        // Premium pacing: 40-60ms per character (smooth, not rushed)
        // Slightly slower for punctuation, faster for spaces
        const char = text[currentIndex - 1];
        const isPunctuation = /[.,!?;:]/.test(char);
        const isSpace = char === ' ';
        const baseDelay = isPunctuation ? 80 : isSpace ? 20 : 40 + Math.random() * 20;
        typingTimeoutRef.current = setTimeout(typeNextChar, baseDelay);
      } else {
        setIsTyping(false);
        if (onComplete && !completedRef.current) {
          completedRef.current = true;
          // Premium pause after typing completes: 400-600ms (allows user to read)
          const pauseDelay = 400 + Math.random() * 200;
          if (import.meta.env.DEV) {
            console.log('[ONBOARDING] PrimeNarrationPanel typing complete, calling onComplete after', pauseDelay, 'ms');
          }
          setTimeout(() => {
            if (import.meta.env.DEV) {
              console.log('[ONBOARDING] PrimeNarrationPanel calling onComplete callback');
            }
            onComplete();
          }, pauseDelay);
        } else if (import.meta.env.DEV && !onComplete) {
          console.warn('[ONBOARDING] PrimeNarrationPanel typing complete but no onComplete callback provided');
        }
      }
    };

    // Start typing after a brief delay (300ms entrance)
    typingTimeoutRef.current = setTimeout(typeNextChar, 300);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [text, isVisible, onComplete, prefersReducedMotion]);

  if (!isVisible || !displayedText) {
    return null;
  }

  // Mobile: Top fixed-height strip with premium styling
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
        className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 border-b border-purple-500/30 backdrop-blur-xl shadow-lg shadow-purple-500/10"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 py-4 min-h-[120px] max-h-[180px] overflow-y-auto">
          <div className="flex items-start gap-3">
            {/* Prime Icon with glow */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/30">
              <span className="text-xl">👑</span>
            </div>
            {/* Narration Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                {displayedText}
                {isTyping && !prefersReducedMotion && (
                  <span className="inline-block w-0.5 h-4 bg-purple-400 ml-1.5 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Desktop: Left-side narration panel with premium glassmorphism
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
      className="absolute left-0 top-0 bottom-0 w-80 z-10 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 border-r border-purple-500/30 backdrop-blur-xl shadow-xl shadow-purple-500/10"
    >
      <div className="h-full flex flex-col">
        {/* Header with premium styling */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-purple-500/30 flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/30">
            <span className="text-2xl">👑</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Prime</h3>
            <p className="text-xs text-slate-300">Narration</p>
          </div>
        </div>

        {/* Narration Content with premium typography */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap font-medium">
            {displayedText}
            {isTyping && !prefersReducedMotion && (
              <span className="inline-block w-0.5 h-4 bg-purple-400 ml-1.5 animate-pulse" />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}


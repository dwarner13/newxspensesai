/**
 * WelcomeScene Component
 * 
 * Full-screen welcome scene before Custodian setup begins.
 * 
 * Features:
 * - Full-screen
 * - Prime narration only (no inputs initially)
 * - Soft fade-in text line-by-line
 * - CTA appears after narration completes
 * - No resizing, no chat bubbles
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeSceneProps {
  onBeginSetup: () => void;
  isMobile?: boolean;
}

const WELCOME_LINES = [
  "Welcome to XspensesAI.",
  "I'm Prime — your financial operating system.",
  "Custodian will personalize XspensesAI in under a minute.",
];

export function WelcomeScene({
  onBeginSetup,
  isMobile = false,
}: WelcomeSceneProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

  // Animate lines appearing one by one
  useEffect(() => {
    if (visibleLines < WELCOME_LINES.length) {
      const timer = setTimeout(() => {
        setVisibleLines(prev => prev + 1);
      }, 800); // 800ms delay between lines for soft fade-in

      return () => clearTimeout(timer);
    } else if (visibleLines === WELCOME_LINES.length && !showCTA) {
      // Show CTA after all lines are visible
      setTimeout(() => {
        setShowCTA(true);
      }, 500);
    }
  }, [visibleLines, showCTA]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4" style={{ minHeight: '100%' }}>
      {/* Prime Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
        className={`${isMobile ? 'w-24 h-24' : 'w-32 h-32'} rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-2xl shadow-purple-500/40 mb-8`}
      >
        <span className={`${isMobile ? 'text-5xl' : 'text-6xl'}`}>👑</span>
      </motion.div>

      {/* Narration Text */}
      <div className={`w-full ${isMobile ? 'max-w-md' : 'max-w-2xl'} text-center space-y-4 mb-12`}>
        <AnimatePresence mode="wait">
          {WELCOME_LINES.slice(0, visibleLines).map((line, index) => (
            <motion.p
              key={`${line}-${index}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`${isMobile ? 'text-xl' : 'text-2xl'} font-medium text-slate-200 leading-relaxed`}
            >
              {line}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* CTA Button - Appears after narration */}
      <AnimatePresence>
        {showCTA && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
            onClick={(e) => {
              if (import.meta.env.DEV) {
                console.log('[ONBOARDING] WelcomeScene button clicked');
              }
              e.preventDefault();
              e.stopPropagation();
              onBeginSetup();
            }}
            className={`group relative ${isMobile ? 'px-8 py-4 text-base' : 'px-10 py-4'} rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border border-purple-400/30 hover:border-purple-400/50 shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden cursor-pointer`}
          >
            <motion.div 
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            />
            <span className={`relative text-white font-medium ${isMobile ? 'text-base' : 'text-lg'}`}>
              Start my setup
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}


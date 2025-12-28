/**
 * Custodian Warmup Panel
 * 
 * Elegant placeholder that appears on the right side while Prime Scene 0 types.
 * Shows "Preparing your setup..." with sequential fade-in lines.
 * Transitions smoothly to interactive Custodian panel.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

interface CustodianWarmupPanelProps {
  isMobile?: boolean;
}

const WARMUP_LINES = [
  "Loading your workspace…",
  "Checking preferences…",
  "Ready in a moment.",
];

export function CustodianWarmupPanel({ isMobile = false }: CustodianWarmupPanelProps) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  // Sequential fade-in for each line
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    WARMUP_LINES.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, index]);
      }, index * 400 + 300); // Stagger: 300ms delay + 400ms per line
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  if (isMobile) {
    return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div
        className="relative w-full max-w-[420px] h-full rounded-3xl overflow-hidden"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.1) 0%,
              rgba(255, 255, 255, 0.05) 50%,
              rgba(255, 255, 255, 0.08) 100%
            )
          `,
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2),
            0 0 0 1px rgba(255, 255, 255, 0.05)
          `,
        }}
      >
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          {/* Shield Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6"
          >
            <Shield className="w-8 h-8 text-white/60" />
          </motion.div>

          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xl font-semibold text-white mb-2"
          >
            Custodian
          </motion.h3>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-sm text-slate-400 mb-8"
          >
            Preparing your setup…
          </motion.p>

          {/* Sequential Lines */}
          <div className="space-y-2 w-full max-w-[280px]">
            <AnimatePresence>
              {WARMUP_LINES.map((line, index) => (
                visibleLines.includes(index) && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    {/* Tiny pulsing dot */}
                    <motion.div
                      animate={{
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-white/40"
                    />
                    <span className="text-sm text-slate-300">{line}</span>
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}









/**
 * Prime Greeting Card
 * 
 * Premium, cinematic greeting card for Prime with:
 * - Glass panel styling with subtle glow
 * - Staggered animations for entrance
 * - Action chips with click handlers
 * - Status indicators
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles } from 'lucide-react';
import { PrimeGreetingData, PrimeGreetingChip } from './greetings/primeGreeting';

export interface PrimeGreetingCardProps {
  greeting: PrimeGreetingData;
  onChipClick: (chip: PrimeGreetingChip) => void;
  className?: string;
}

export function PrimeGreetingCard({ greeting, onChipClick, className = '' }: PrimeGreetingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative ${className}`}
    >
      {/* Glass panel with gradient border and glow */}
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(251,191,36,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Title line */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-xl font-semibold text-white leading-tight"
          >
            {greeting.titleLine}
          </motion.h2>

          {/* Status sub-line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-2 text-xs text-slate-400"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>{greeting.subLine}</span>
            </div>
          </motion.div>

          {/* Bullets */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-2 text-sm text-slate-300 leading-relaxed"
          >
            {greeting.bullets.map((bullet, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + index * 0.1 }}
                className="flex items-start gap-2"
              >
                <span className="text-amber-400/60 mt-1.5">•</span>
                <span>{bullet}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Vibe tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            className="flex items-center gap-2 pt-2"
          >
            <Shield className="w-4 h-4 text-amber-400/70" />
            <span className="text-xs font-medium text-amber-400/80 uppercase tracking-wide">
              {greeting.vibeTag}
            </span>
          </motion.div>

          {/* Action chips - Removed from greeting card, now shown via PrimeQuickActions below */}
        </div>
      </div>
    </motion.div>
  );
}


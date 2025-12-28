/**
 * Typing Dots Component
 * 
 * Simple pulsing dots animation for typing indicators.
 * Used in Custodian onboarding to show "thinking" state.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface TypingDotsProps {
  className?: string;
  dotColor?: string;
}

export function TypingDots({ 
  className = '', 
  dotColor = 'rgba(255, 255, 255, 0.6)' 
}: TypingDotsProps) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="rounded-full"
          style={{
            width: '6px',
            height: '6px',
            backgroundColor: dotColor,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.9, 1.1, 0.9],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}









/**
 * FadeBubble Component
 * 
 * Reusable fade-in bubble animation for Custodian messages.
 * Premium iMessage-style animation: opacity 0→1, y 8→0, blur 8px→0 over 0.45s.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface FadeBubbleProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeBubble({ children, delay = 0, className = '' }: FadeBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0 }}
      transition={{ 
        duration: 0.45,
        delay,
        ease: [0.2, 0, 0, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}









/**
 * Prime Trust Micro-Message Component
 * 
 * Shows a single trust reassurance message after Prime's first response.
 * Non-blocking, educational tone.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

interface PrimeTrustMessageProps {
  onDismiss?: () => void;
}

export function PrimeTrustMessage({ onDismiss }: PrimeTrustMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-3 mb-3"
    >
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-300 leading-relaxed">
              Quick note — I help you understand and organize your finances.
              Sensitive details are automatically protected, and you're always in control.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}











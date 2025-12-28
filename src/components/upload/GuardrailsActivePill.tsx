/**
 * Guardrails Active Pill Component
 * 
 * Premium status pill showing guardrails are active during upload processing.
 * Clicking opens a popover explaining data protections.
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';

interface GuardrailsActivePillProps {
  /** Whether guardrails are active */
  isActive: boolean;
  /** Optional className */
  className?: string;
}

export function GuardrailsActivePill({ isActive, className = '' }: GuardrailsActivePillProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

  if (!isActive) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Pill Button */}
      <motion.button
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-amber-500/30 backdrop-blur-sm transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-800/80"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Breathing glow effect */}
        <motion.div
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-pink-500/20 blur-md"
        />
        
        {/* Content */}
        <div className="relative flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-medium text-amber-300">Guardrails Active</span>
        </div>
      </motion.button>

      {/* Popover */}
      <AnimatePresence>
        {isPopoverOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsPopoverOpen(false)}
            />

            {/* Popover Content */}
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 mb-2 z-50 w-80 rounded-xl bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border border-slate-700/60 shadow-xl backdrop-blur-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-pink-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">How your data is protected</h3>
                </div>
                <button
                  onClick={() => setIsPopoverOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Sensitive details are automatically masked during processing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>Only what's needed is analyzed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>You control what gets saved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">•</span>
                    <span>You can discard an upload anytime</span>
                  </li>
                </ul>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setIsPopoverOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}











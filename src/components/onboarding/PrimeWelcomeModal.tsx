/**
 * Prime Welcome Modal
 * 
 * First-time user welcome experience.
 * Shows when profile_completed = false or profile row is missing.
 */

import React from 'react';
import { Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrimeWelcomeModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export function PrimeWelcomeModal({ isOpen, onContinue }: PrimeWelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
            onClick={onContinue}
          />

          {/* Centered modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-2xl p-8 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onContinue}
                className="absolute right-4 top-4 p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="text-center space-y-6">
                {/* Prime Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-white">
                    Welcome to XspensesAI
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    I'm Prime — I oversee your entire financial system.
                  </p>
                  <p className="text-slate-400 text-sm">
                    Before we begin, Custodian will help set up your profile in just a few questions.
                  </p>
                </div>

                {/* Continue Button */}
                <button
                  onClick={onContinue}
                  className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}







/**
 * Prime Welcome Modal
 * 
 * @deprecated This component is legacy and should NOT be used.
 * Use PrimeCustodianOnboardingModal instead (the new WOW onboarding flow).
 * 
 * First-time user welcome experience.
 * Shows when profile_completed = false or profile row is missing.
 */

import React from 'react';
import { Crown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ONBOARDING_MODE } from '../../config/onboardingConfig';

interface PrimeWelcomeModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export function PrimeWelcomeModal({ isOpen, onContinue }: PrimeWelcomeModalProps) {
  // Hard-block: Prevent mounting if legacy onboarding is disabled
  if (!ONBOARDING_MODE.legacyEnabled) {
    return null;
  }
  
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
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Crown className="w-10 h-10 text-white" />
                  </div>
                </div>

                {/* Welcome Message */}
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold text-white">
                    Welcome to XspensesAI
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    I'm Prime — your financial operating system.
                  </p>
                  <p className="text-slate-400 text-sm">
                    Custodian will personalize XspensesAI in under a minute.
                  </p>
                </div>

                {/* Continue Button */}
                <button
                  onClick={onContinue}
                  className="group relative w-full px-6 py-3 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border border-purple-400/30 hover:border-purple-400/50 text-white font-semibold rounded-lg transition-all duration-300 shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] overflow-hidden"
                >
                  <span className="relative">Start my setup</span>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}








/**
 * FinalArrivalScene Component
 * 
 * Final scene after onboarding setup completes.
 * 
 * Features:
 * - Prime and Custodian both visible
 * - Calm, confident messaging
 * - Single CTA to enter dashboard
 * - Smooth transition back to app
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

interface FinalArrivalSceneProps {
  onEnterDashboard: () => void;
  isMobile?: boolean;
}

export function FinalArrivalScene({
  onEnterDashboard,
  isMobile = false,
}: FinalArrivalSceneProps) {
  const [showPrime, setShowPrime] = useState(false);
  const [showCustodian, setShowCustodian] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  // Staggered appearance animation
  useEffect(() => {
    // Prime appears first
    setTimeout(() => setShowPrime(true), 300);
    // Custodian appears second
    setTimeout(() => setShowCustodian(true), 800);
    // CTA appears last
    setTimeout(() => setShowCTA(true), 1400);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4" style={{ minHeight: '100%' }}>
      {/* Prime Section */}
      <AnimatePresence>
        {showPrime && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
            className={`w-full ${isMobile ? 'max-w-md' : 'max-w-2xl'} mb-8`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-2xl shadow-purple-500/40`}>
                <span className={`${isMobile ? 'text-3xl' : 'text-4xl'}`}>👑</span>
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white mb-1`}>
                  Prime
                </h3>
                <h2 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-white mb-2 leading-tight`}>
                  Welcome to XspensesAI
                </h2>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custodian Section */}
      <AnimatePresence>
        {showCustodian && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
            className={`w-full ${isMobile ? 'max-w-md' : 'max-w-2xl'} mb-12`}
          >
            <div className="flex items-center gap-4">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-2xl shadow-purple-500/40`}>
                <Shield className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} text-white`} />
              </div>
              <div>
                <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white mb-1`}>
                  Custodian
                </h3>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} text-slate-200 leading-relaxed`}>
                  You can adjust anything at any time.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Highlights - Premium styling */}
      <AnimatePresence>
        {showCustodian && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8, ease: [0.2, 0.9, 0.2, 1] }}
            className={`w-full ${isMobile ? 'max-w-md' : 'max-w-2xl'} mb-10`}
          >
            <div className="flex flex-wrap items-center justify-center gap-3 text-slate-300">
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-slate-200`}>Smart Import</span>
              <span className="text-purple-500/50">•</span>
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-slate-200`}>Smart Categories</span>
              <span className="text-purple-500/50">•</span>
              <span className={`${isMobile ? 'text-sm' : 'text-base'} font-medium text-slate-200`}>Real-time AI employees</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA Button */}
      <AnimatePresence>
        {showCTA && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
            onClick={onEnterDashboard}
            className={`group relative ${isMobile ? 'px-8 py-4 text-base' : 'px-10 py-4'} rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 border border-purple-400/30 hover:border-purple-400/50 shadow-[0_4px_16px_rgba(139,92,246,0.3)] hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] transition-all duration-300 overflow-hidden`}
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
            <span className={`relative text-white font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
              Enter Dashboard
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}


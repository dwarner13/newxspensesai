/**
 * Prime Welcome Back Card
 * 
 * Non-blocking welcome card for returning users.
 * Shows once per session or once per day.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, TrendingUp, MessageCircle, Globe, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface PrimeWelcomeBackCardProps {
  onDismiss?: () => void;
}

export function PrimeWelcomeBackCard({ onDismiss }: PrimeWelcomeBackCardProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if already seen today
  useEffect(() => {
    const storageKey = 'prime_welcome_back_seen';
    const today = new Date().toDateString();
    const lastSeen = localStorage.getItem(storageKey);

    if (lastSeen !== today) {
      setIsVisible(true);
    }
  }, []);

  // Extract timezone and currency from profile - MUST be called before any early returns
  const timezone = useMemo(() => {
    if (!profile) return null;
    const metadata = profile.metadata && typeof profile.metadata === 'object' 
      ? profile.metadata as Record<string, any>
      : null;
    return metadata?.timezone || profile.time_zone || null;
  }, [profile]);
  
  const currency = useMemo(() => {
    return profile?.currency || null;
  }, [profile]);
  
  const displayName = useMemo(() => {
    if (!profile?.display_name) return null;
    return profile.display_name.split(' ')[0] || profile.display_name || 'there';
  }, [profile?.display_name]);
  
  const isPremium = useMemo(() => {
    return profile?.role === 'premium' || false;
  }, [profile?.role]);
  
  // Determine greeting message based on onboarding completion time - MUST be called before any early returns
  const greetingMessage = useMemo(() => {
    if (!displayName) return null;
    const completedAt = profile?.onboarding_completed_at;
    if (completedAt) {
      const completedDate = new Date(completedAt);
      const now = new Date();
      const daysSinceCompletion = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // If completed within last 24 hours, show "You're all set"
      if (daysSinceCompletion < 1) {
        return `You're all set, ${displayName}.`;
      }
    }
    return `Welcome back, ${displayName}.`;
  }, [profile?.onboarding_completed_at, displayName]);

  const handleDismiss = () => {
    const storageKey = 'prime_welcome_back_seen';
    const today = new Date().toDateString();
    localStorage.setItem(storageKey, today);
    setIsDismissed(true);
    setIsVisible(false);
    onDismiss?.();
  };

  const handleAction = (action: 'import' | 'categories' | 'question') => {
    switch (action) {
      case 'import':
        navigate('/dashboard/smart-import-ai');
        break;
      case 'categories':
        navigate('/dashboard/smart-categories');
        break;
      case 'question':
        // Don't auto-open chat - user must click rail button explicitly
        // Just dismiss the card
        break;
    }
    handleDismiss();
  };

  // Early return AFTER all hooks - this is safe now
  if (!isVisible || isDismissed || !profile?.display_name || !displayName || !greetingMessage) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 right-4 z-[100] w-full max-w-sm pointer-events-auto"
        >
          <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-amber-500/20 rounded-xl p-5 shadow-2xl">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="pr-6">
              <h3 className="text-lg font-semibold text-white mb-2">
                {greetingMessage}
              </h3>
              
              {/* Status chips - timezone and currency */}
              {(timezone || currency) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {timezone && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md">
                      <Globe className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300">{timezone.split('/').pop()?.replace('_', ' ')}</span>
                    </div>
                  )}
                  {currency && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/60 border border-slate-700/50 rounded-md">
                      <DollarSign className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-300">{currency}</span>
                    </div>
                  )}
                </div>
              )}
              
              {isPremium && (
                <p className="text-sm text-slate-400 mb-4">
                  Your Pro tools are ready.
                </p>
              )}

              {/* Quick Actions */}
              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => handleAction('import')}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-amber-500/30 rounded-lg text-left transition-all group"
                >
                  <Upload className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  <span className="text-sm text-slate-200 group-hover:text-white">Open Smart Import</span>
                </button>

                <button
                  onClick={() => handleAction('categories')}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-amber-500/30 rounded-lg text-left transition-all group"
                >
                  <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  <span className="text-sm text-slate-200 group-hover:text-white">Open Smart Categories</span>
                </button>

                <button
                  onClick={() => handleAction('question')}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-amber-500/30 rounded-lg text-left transition-all group"
                >
                  <MessageCircle className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  <span className="text-sm text-slate-200 group-hover:text-white">Ask Prime</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


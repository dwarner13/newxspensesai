/**
 * PostOnboardingChooser Component
 * 
 * Shows a one-time destination chooser immediately after onboarding completion.
 * Uses sessionStorage flag to ensure it only shows once per session.
 * 
 * VERIFICATION CHECKLIST:
 * 1) Complete onboarding -> chooser appears once
 * 2) Click an option -> navigates/opens correctly and clears flag
 * 3) Refresh -> chooser does NOT appear
 * 4) Logout/login -> no chooser, no onboarding; lands dashboard
 * 5) Clicking Dashboard from marketing site -> straight to dashboard, no chooser
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Crown, Settings } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface PostOnboardingChooserProps {
  custodianReady: boolean;
}

export function PostOnboardingChooser({ custodianReady }: PostOnboardingChooserProps) {
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();
  const [showChooser, setShowChooser] = useState(false);
  const hasShownRef = useRef(false); // Prevent double-render

  useEffect(() => {
    // Only check once, prevent double-render
    if (hasShownRef.current) return;
    
    // Check if chooser should show: custodian_ready === true AND session flag exists
    if (custodianReady) {
      try {
        const justCompleted = sessionStorage.getItem('just_completed_onboarding') === 'true';
        if (justCompleted) {
          hasShownRef.current = true;
          setShowChooser(true);
          
          if (import.meta.env.DEV) {
            console.log('[PostOnboardingChooser] Showing chooser (custodian_ready=true, session flag present)');
          }
        }
      } catch (storageError: any) {
        // Non-fatal: sessionStorage may not be available
        if (import.meta.env.DEV) {
          console.warn('[PostOnboardingChooser] Failed to check sessionStorage (non-fatal):', storageError?.message || storageError);
        }
      }
    }
  }, [custodianReady]);

  const handleOptionClick = (destination: 'dashboard' | 'prime' | 'settings') => {
    // Clear flag immediately on any click (consume it)
    try {
      sessionStorage.removeItem('just_completed_onboarding');
      if (import.meta.env.DEV) {
        console.log('[PostOnboardingChooser] Cleared sessionStorage flag, navigating to:', destination);
      }
    } catch (storageError: any) {
      // Non-fatal
      if (import.meta.env.DEV) {
        console.warn('[PostOnboardingChooser] Failed to clear sessionStorage (non-fatal):', storageError?.message || storageError);
      }
    }
    
    // Close chooser
    setShowChooser(false);
    
    // Navigate based on destination
    if (destination === 'dashboard') {
      navigate('/dashboard', { replace: true });
    } else if (destination === 'prime') {
      // Open Prime chat immediately
      openChat({
        initialEmployeeSlug: 'prime-boss',
        context: {
          source: 'post-onboarding-chooser',
        },
      });
      // Navigate to dashboard if not already there
      if (window.location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    } else if (destination === 'settings') {
      navigate('/dashboard/settings', { replace: true });
    }
  };

  if (!showChooser) return null;

  return (
    <AnimatePresence>
      {showChooser && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={() => handleOptionClick('dashboard')} // Click outside = Dashboard
          />
          
          {/* Chooser Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-2xl p-8 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                  Where would you like to go?
                </h2>
                <p className="text-sm text-slate-400">
                  Choose your next destination
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {/* Dashboard */}
                <button
                  onClick={() => handleOptionClick('dashboard')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all text-left group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-700/50 group-hover:bg-slate-700 flex items-center justify-center">
                    <LayoutDashboard className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">Dashboard</div>
                    <div className="text-sm text-slate-400">View your overview</div>
                  </div>
                </button>

                {/* Prime */}
                <button
                  onClick={() => handleOptionClick('prime')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all text-left group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">Prime</div>
                    <div className="text-sm text-slate-400">Chat with your AI assistant</div>
                  </div>
                </button>

                {/* Settings */}
                <button
                  onClick={() => handleOptionClick('settings')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all text-left group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-700/50 group-hover:bg-slate-700 flex items-center justify-center">
                    <Settings className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-100">Settings</div>
                    <div className="text-sm text-slate-400">Configure your preferences</div>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}





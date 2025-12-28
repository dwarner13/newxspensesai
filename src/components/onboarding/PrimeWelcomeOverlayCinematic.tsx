/**
 * Prime Welcome Overlay Cinematic
 * 
 * Premium fullscreen overlay that appears after onboarding completion.
 * Features: blur backdrop, glass card, typewriter effect, staggered button animations.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Upload, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TypewriterStable } from '../ui/TypewriterStable';
import { PrimeLogoBadge } from '../branding/PrimeLogoBadge';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface PrimeWelcomeOverlayCinematicProps {
  onDismiss?: () => void;
}

const STORAGE_KEY = 'xspenses_welcome_back_dismissed';
const SESSION_KEY_ONBOARDING_COMPLETED = 'xspenses_onboarding_just_completed';

export function PrimeWelcomeOverlayCinematic({ onDismiss }: PrimeWelcomeOverlayCinematicProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();
  const [isVisible, setIsVisible] = useState(false);
  const [typingComplete, setTypingComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [clickedButton, setClickedButton] = useState<string | null>(null);

  // Check if already dismissed OR if onboarding just completed
  useEffect(() => {
    // Check if onboarding just completed (set by onboarding completion)
    const justCompleted = sessionStorage.getItem(SESSION_KEY_ONBOARDING_COMPLETED);
    if (justCompleted === '1') {
      // Clear the flag immediately
      sessionStorage.removeItem(SESSION_KEY_ONBOARDING_COMPLETED);
      // Show overlay even if previously dismissed (first-time completion)
      setIsVisible(true);
      return;
    }
    
    // Otherwise, check if already dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed === '1') {
      setIsVisible(false);
      return;
    }
    setIsVisible(true);
  }, []);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    if (isVisible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isVisible]);

  // Handle ESC key (disabled during transition)
  useEffect(() => {
    if (!isVisible || isTransitioning) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isVisible, isTransitioning]);

  const handleDismiss = () => {
    if (isTransitioning) return; // Prevent dismissal during transition
    localStorage.setItem(STORAGE_KEY, '1');
    setIsVisible(false);
    onDismiss?.();
  };

  const handleNavigate = (route: string, buttonId: string) => {
    // Prevent double navigation
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setClickedButton(buttonId);
    
    // Exit animation duration: 220ms
    // Wait slightly longer (240ms) to ensure animation completes before navigation
    setTimeout(() => {
      // Special handling for Prime Chat: open chat panel instead of navigating
      if (buttonId === 'prime-chat') {
        // Set sessionStorage flag for destination fade-in
        sessionStorage.setItem('xspenses_nav_fade', '1');
        // Open Prime Chat panel
        openChat({
          initialEmployeeSlug: 'prime-boss',
          context: {
            page: 'welcome-overlay',
            data: {
              source: 'welcome-overlay',
            },
          },
        });
        // Navigate to dashboard if not already there
        if (window.location.pathname !== '/dashboard') {
          navigate('/dashboard');
        }
      } else {
        // For other routes, navigate normally
        sessionStorage.setItem('xspenses_nav_fade', '1');
        navigate(route);
      }
      
      // Close overlay after navigation/chat open
      localStorage.setItem(STORAGE_KEY, '1');
      setIsVisible(false);
      onDismiss?.();
    }, 240);
  };

  // Get preferred name from profile (display_name → first_name → fallback)
  const preferredName = useMemo(() => {
    if (!profile) return null;
    // Use display_name first, fallback to first_name, then 'there'
    const name = profile.display_name?.trim() || profile.first_name?.trim() || null;
    if (!name) return null;
    // Extract first word if display_name contains multiple words
    return name.split(' ')[0] || name;
  }, [profile?.display_name, profile?.first_name]);

  // Build welcome message
  const welcomeMessage = useMemo(() => {
    if (!preferredName) return null;
    return `Welcome back, ${preferredName}. Your workspace is ready.`;
  }, [preferredName]);

  // Handle typing completion
  const handleTypingDone = () => {
    setTypingComplete(true);
    // Wait 250ms then show buttons
    setTimeout(() => {
      setShowButtons(true);
    }, 250);
  };

  // Don't render if not visible or no message
  if (!isVisible || !welcomeMessage || !preferredName) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isTransitioning ? 0.22 : 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            // Close on outside click (disabled during transition)
            if (!isTransitioning && e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          {/* Backdrop with blur */}
          <motion.div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xl"
            animate={{ opacity: isTransitioning ? 0 : 1 }}
            transition={{ duration: 0.22 }}
          />
          
          {/* Subtle vignette gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none" />

          {/* Glass card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ 
              opacity: isTransitioning ? 0 : 1, 
              scale: isTransitioning ? 0.985 : 1, 
              y: isTransitioning ? 8 : 0 
            }}
            exit={{ opacity: 0, scale: 0.985, y: 8 }}
            transition={{ duration: isTransitioning ? 0.22 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            style={{
              width: 'clamp(680px, 56vw, 880px)',
              minHeight: '420px',
              pointerEvents: isTransitioning ? 'none' : 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/10">
              {/* Prime avatar with glow */}
              <div className="relative flex items-center gap-3">
                {/* Soft glow behind avatar */}
                <div className="absolute -left-2 -top-2 w-16 h-16 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-rose-500/20 blur-xl opacity-60" />
                <PrimeLogoBadge size={48} showGlow={true} />
                <span className="text-lg font-semibold text-white">Prime</span>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                disabled={isTransitioning}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-8 py-8">
              {/* Typed welcome message */}
              <div className="mb-6">
                <h2 className="text-3xl font-semibold text-white mb-4">
                  <TypewriterStable
                    text={welcomeMessage}
                    msPerChar={25}
                    startDelayMs={300}
                    cursor={true}
                    onDone={handleTypingDone}
                    className="text-white"
                  />
                </h2>

                {/* Subtext - appears after typing */}
                <AnimatePresence>
                  {typingComplete && (
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="text-lg text-slate-300"
                    >
                      What should we do first?
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Buttons - stagger animation after typing */}
              <AnimatePresence>
                {showButtons && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.08,
                        },
                      },
                    }}
                    className="flex flex-col gap-3 mt-8"
                  >
                    {/* Primary: Open Prime Chat */}
                    <motion.button
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      onClick={() => handleNavigate('/dashboard/prime-chat', 'prime-chat')}
                      disabled={isTransitioning}
                      className={`group relative flex items-center gap-3 px-6 py-4 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-rose-500/10 border border-amber-500/30 rounded-full text-white font-semibold transition-all hover:border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] ${
                        isTransitioning ? 'opacity-50 cursor-not-allowed' : ''
                      } ${clickedButton === 'prime-chat' ? 'opacity-70' : ''}`}
                    >
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <MessageCircle className={`w-5 h-5 relative z-10 ${clickedButton === 'prime-chat' ? 'animate-pulse' : ''}`} />
                      <span className="relative z-10">{clickedButton === 'prime-chat' ? 'Opening...' : 'Open Prime Chat'}</span>
                    </motion.button>

                    {/* Secondary: Open Smart Import */}
                    <motion.button
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      onClick={() => handleNavigate('/dashboard/smart-import-ai', 'smart-import')}
                      disabled={isTransitioning}
                      className={`group flex items-center gap-3 px-6 py-4 bg-slate-800/60 border border-slate-700/50 rounded-full text-slate-200 font-medium transition-all hover:bg-slate-700/80 hover:border-slate-600 hover:text-white ${
                        isTransitioning ? 'opacity-50 cursor-not-allowed' : ''
                      } ${clickedButton === 'smart-import' ? 'opacity-70' : ''}`}
                    >
                      <Upload className={`w-5 h-5 ${clickedButton === 'smart-import' ? 'animate-pulse' : ''}`} />
                      <span>{clickedButton === 'smart-import' ? 'Opening...' : 'Open Smart Import'}</span>
                    </motion.button>

                    {/* Secondary: Open Smart Categories */}
                    <motion.button
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      onClick={() => handleNavigate('/dashboard/smart-categories', 'smart-categories')}
                      disabled={isTransitioning}
                      className={`group flex items-center gap-3 px-6 py-4 bg-slate-800/60 border border-slate-700/50 rounded-full text-slate-200 font-medium transition-all hover:bg-slate-700/80 hover:border-slate-600 hover:text-white ${
                        isTransitioning ? 'opacity-50 cursor-not-allowed' : ''
                      } ${clickedButton === 'smart-categories' ? 'opacity-70' : ''}`}
                    >
                      <TrendingUp className={`w-5 h-5 ${clickedButton === 'smart-categories' ? 'animate-pulse' : ''}`} />
                      <span>{clickedButton === 'smart-categories' ? 'Opening...' : 'Open Smart Categories'}</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


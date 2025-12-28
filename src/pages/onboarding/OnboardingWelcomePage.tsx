import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import { PrimeLogoBadge } from '../../components/branding/PrimeLogoBadge';

export default function OnboardingWelcomePage() {
  const navigate = useNavigate();
  const { user, profile, firstName } = useAuth();
  const { endTransition } = useRouteTransition();

  // Use display_name from profile, fallback to full_name, firstName, then email prefix
  // This matches the dashboard greeting logic for consistency
  const displayName = profile?.display_name?.trim() || 
    profile?.full_name?.trim() || 
    firstName || 
    (user?.email ? user.email.split('@')[0] : null) || 
    'there';

  // End route transition when page mounts
  useEffect(() => {
    endTransition();
  }, [endTransition]);

  // Lock scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleStartSetup = () => {
    document.body.style.overflow = '';
    navigate('/onboarding/setup');
  };

  const handleClose = () => {
    document.body.style.overflow = '';
    // Navigate back or to home
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={handleBackdropClick}
      >
        {/* Blurred backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        
        {/* Modal card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
          className="relative w-full max-w-2xl z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glass card with gradient border matching dashboard style */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient border wrapper */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/30 via-cyan-500/20 to-teal-500/30 p-[1px]">
              <div className="w-full h-full rounded-3xl bg-transparent" />
            </div>
            
            {/* Main card content */}
            <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 md:p-12 flex flex-col items-center text-center shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Prime Logo Badge - matches main app logo */}
              <div className="relative mb-6">
                <PrimeLogoBadge size={80} showGlow={true} />
              </div>

              {/* Welcome Message */}
              <h1 className="text-2xl md:text-3xl font-semibold text-white mb-4">
                Welcome to XspensesAI{displayName && displayName !== 'there' ? `, ${displayName}` : ''}
              </h1>
              
              <p className="text-base md:text-lg text-slate-300 mb-2 max-w-md mx-auto">
                I'm Prime, your AI financial CEO.
              </p>
              
              <p className="text-sm md:text-base text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                Prime will guide you. Custodian will set up your profile.
              </p>

              {/* Start Setup Button - Premium glass style matching dashboard */}
              <Button
                onClick={handleStartSetup}
                className="group relative px-8 py-3 rounded-xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-blue-500/30 hover:border-blue-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.4),0_0_0_1px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200 text-white font-medium text-base overflow-hidden"
              >
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                
                {/* Content */}
                <div className="relative flex items-center justify-center gap-2">
                  <span>Start Setup</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

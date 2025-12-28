/**
 * Prime Onboarding Welcome Component
 * 
 * Cinematic welcome message with expense mode selection and action chips for first-time Prime users.
 * Shows inside UnifiedAssistantChat when prime_initialized !== true.
 * 
 * Collects expense_mode (business/personal) and currency, saves to profile.metadata.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, User, DollarSign, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { markPrimeInitialized, updateProfileMetadata } from '../../lib/profileMetadataHelpers';
import { resolveDisplayNameSync } from '../../lib/user/resolveDisplayName';
import toast from 'react-hot-toast';

interface PrimeOnboardingWelcomeProps {
  onChipClick: (message: string) => void;
  onComplete: () => void;
}

type OnboardingStep = 'selection' | 'activating' | 'complete';

export function PrimeOnboardingWelcome({ onChipClick, onComplete }: PrimeOnboardingWelcomeProps) {
  const { profile, firstName, refreshProfile, userId, user } = useAuth();
  const [expenseMode, setExpenseMode] = useState<'business' | 'personal' | null>(null);
  const [currency, setCurrency] = useState<string>('CAD');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('selection');
  const [activationStep, setActivationStep] = useState(0);

  // Read existing values from metadata if available
  React.useEffect(() => {
    if (profile?.metadata && typeof profile.metadata === 'object') {
      const metadata = profile.metadata as any;
      if (metadata.expense_mode === 'business' || metadata.expense_mode === 'personal') {
        setExpenseMode(metadata.expense_mode);
      }
      if (metadata.currency) {
        setCurrency(metadata.currency);
      }
    }
  }, [profile]);

  // Resolve display name using helper (never returns email)
  const resolvedName = resolveDisplayNameSync(profile, user);
  const displayName = resolvedName.displayName || 'there';

  const handleExpenseModeSelect = (mode: 'business' | 'personal') => {
    setExpenseMode(mode);
    setSaveError(null);
  };

  const handleSaveAndContinue = async () => {
    if (!expenseMode) {
      setSaveError('Please select business or personal expenses');
      return;
    }

    if (!userId || !profile?.id) {
      setSaveError('User not authenticated');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    
    // Start activation sequence
    setOnboardingStep('activating');
    setActivationStep(0);

    try {
      // Step 1: "Securing your workspace..."
      setActivationStep(1);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 2: "Loading your financial profile..."
      setActivationStep(2);
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Step 3: "Connecting Prime + Custodian..."
      setActivationStep(3);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: "Finalizing your setup..."
      setActivationStep(4);
      
      // Save expense_mode, currency, onboarding completion, and prime_initialized to metadata
      const success = await updateProfileMetadata(userId, {
        expense_mode: expenseMode,
        currency: currency,
        onboarding: {
          completed: true,
          version: 1,
          completed_at: new Date().toISOString(),
        },
        prime_initialized: true,
        prime_initialized_at: new Date().toISOString(),
        debug_last_write: new Date().toISOString(),
      });

      if (!success) {
        throw new Error('Failed to save profile settings');
      }

      // Step 5: "Complete!"
      setActivationStep(5);
      await new Promise(resolve => setTimeout(resolve, 700));

      // Refresh profile to get updated metadata (critical for UI rehydration)
      await refreshProfile();

      // Dev debug logging
      if (import.meta.env.DEV) {
        console.log('[PrimeOnboardingWelcome] ✅ Saved metadata:', {
          expense_mode: expenseMode,
          currency: currency,
          onboarding: { completed: true, version: 1 },
        });
      }

      // Mark Prime as initialized (redundant but safe)
      await markPrimeInitialized(profile.id);

      // Show completion state immediately after save completes
      setOnboardingStep('complete');
      setIsSaving(false);
      
      toast.success('Prime is ready!');
    } catch (error: any) {
      console.error('[PrimeOnboardingWelcome] Error saving metadata:', error);
      setSaveError(error.message || 'Failed to save settings. Please try again.');
      toast.error('Failed to save settings');
      setIsSaving(false);
      setOnboardingStep('selection'); // Reset to selection on error
      return; // Don't advance UI if save fails
    }
  };

  const handleChipClick = async (message: string) => {
    // Ensure settings are saved before proceeding
    if (!expenseMode) {
      setSaveError('Please select business or personal expenses first');
      return;
    }

    // If not saved yet, save first (this will trigger activation sequence)
    if (onboardingStep === 'selection') {
      await handleSaveAndContinue();
      // Wait for activation sequence to complete
      while (onboardingStep !== 'complete' && !saveError) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // If save failed, don't proceed
      if (saveError) {
        return;
      }
      
      // Small delay after completion before proceeding to chat (smoother transition)
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    // Call parent handler
    onChipClick(message);
    onComplete();
  };

  // Action chips removed - replaced by PrimeQuickActions component in chat

  const activationSteps = [
    'Securing your workspace...',
    'Loading your financial profile...',
    'Connecting Prime + Custodian...',
    'Finalizing your setup...',
    'Complete!',
  ];

  const expenseModeDisplay = expenseMode === 'business' ? 'BUSINESS' : 'PERSONAL';

  // Render activation sequence
  if (onboardingStep === 'activating') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        {/* Prime Avatar with Enhanced Glow */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {/* Pulsing glow effect during activation */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 blur-xl"
            />
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <span className="text-2xl">👑</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Prime — AI Financial CEO</h3>
          </div>
        </div>

        {/* Activation Steps */}
        <div className="space-y-4">
          {activationSteps.map((step, index) => {
            const isActive = activationStep >= index + 1;
            const isCurrent = activationStep === index + 1;
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: isActive ? 1 : 0.3,
                  x: isActive ? 0 : -20,
                }}
                transition={{ 
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: [0.2, 0.9, 0.2, 1]
                }}
                className={`flex items-center gap-3 ${
                  isCurrent ? 'text-cyan-300' : isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {isActive ? (
                  <motion.div
                    animate={{ rotate: isCurrent ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-5 h-5 rounded-full border-2 border-cyan-400 flex items-center justify-center"
                  >
                    {isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-2 h-2 rounded-full bg-cyan-400"
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    )}
                  </motion.div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                )}
                <span className={`text-sm font-medium ${isCurrent ? 'font-semibold' : ''}`}>
                  {step}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(activationStep / activationSteps.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-teal-500"
          />
        </div>
      </motion.div>
    );
  }

  // Render completion card
  if (onboardingStep === 'complete') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* Success Animation */}
        <div className="flex items-center justify-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 blur-xl"
            />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl"
              >
                ✓
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Personalized Confirmation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center space-y-3"
        >
          <h3 className="text-xl font-semibold text-white">
            Prime is ready!
          </h3>
          <p className="text-slate-300 text-base">
            You're set up for <span className="font-semibold text-cyan-300">{expenseModeDisplay}</span> expenses in <span className="font-semibold text-cyan-300">{currency}</span>.
          </p>
        </motion.div>

        {/* Note: Action chips removed from completion state - will be shown via PrimeQuickActions in chat */}
      </motion.div>
    );
  }

  // Render selection UI (default state)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.9, 0.2, 1] }}
      className="space-y-6"
    >
      {/* Prime Avatar with Breathing Glow */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative">
          {/* Breathing glow effect */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 blur-xl"
          />
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-2xl">👑</span>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Prime — AI Financial CEO</h3>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="space-y-3">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-slate-200 text-base leading-relaxed"
        >
          Welcome back, <span className="font-semibold text-white">{displayName}</span>.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-slate-200 text-base font-medium mt-4"
        >
          Let's set up your expense tracking preferences.
        </motion.p>
      </div>

      {/* Expense Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300">What type of expenses will you track?</label>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => handleExpenseModeSelect('business')}
            className={`
              group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left
              ${expenseMode === 'business' 
                ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20' 
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/70'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <Briefcase className={`w-5 h-5 ${expenseMode === 'business' ? 'text-amber-300' : 'text-slate-400'}`} />
              <div>
                <div className={`font-medium text-sm ${expenseMode === 'business' ? 'text-white' : 'text-slate-300'}`}>
                  Business
                </div>
                <div className={`text-xs mt-0.5 ${expenseMode === 'business' ? 'text-amber-200' : 'text-slate-400'}`}>
                  For my company
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            onClick={() => handleExpenseModeSelect('personal')}
            className={`
              group relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left
              ${expenseMode === 'personal' 
                ? 'border-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20' 
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800/70'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <User className={`w-5 h-5 ${expenseMode === 'personal' ? 'text-amber-300' : 'text-slate-400'}`} />
              <div>
                <div className={`font-medium text-sm ${expenseMode === 'personal' ? 'text-white' : 'text-slate-300'}`}>
                  Personal
                </div>
                <div className={`text-xs mt-0.5 ${expenseMode === 'personal' ? 'text-amber-200' : 'text-slate-400'}`}>
                  For myself
                </div>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Currency Selection */}
        {expenseMode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <label className="text-sm font-medium text-slate-300">Currency</label>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50"
              >
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {saveError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </motion.div>
        )}
      </div>

      {/* Continue Message */}
      {expenseMode && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-slate-200 text-base font-medium mt-4"
        >
          What would you like help with today?
        </motion.p>
      )}

      {/* Continue Button - Premium gradient with delayed appearance */}
      {expenseMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-6"
        >
          <motion.button
            onClick={handleSaveAndContinue}
            disabled={isSaving || !expenseMode}
            whileHover={{ y: -2 }}
            whileTap={{ y: 0 }}
            className="
              group relative w-full px-6 py-3 rounded-xl
              bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600
              backdrop-blur-xl
              border border-indigo-400/30 hover:border-indigo-400/50
              shadow-[0_4px_16px_rgba(99,102,241,0.3),0_0_0_1px_rgba(99,102,241,0.1),inset_0_1px_0_rgba(255,255,255,0.1)]
              hover:shadow-[0_8px_24px_rgba(99,102,241,0.4),0_0_0_1px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]
              transition-all duration-300
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_4px_16px_rgba(99,102,241,0.3)]
              overflow-hidden
            "
          >
            {/* Animated gradient glow */}
            <motion.div 
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 via-violet-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
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
            
            {/* Content */}
            <div className="relative flex items-center justify-center gap-2">
              <span className="text-white font-medium text-sm">
                {isSaving ? 'Activating Prime...' : 'Begin setup'}
              </span>
            </div>
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}


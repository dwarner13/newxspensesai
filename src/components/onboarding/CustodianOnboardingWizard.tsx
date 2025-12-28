/**
 * Custodian Onboarding Wizard
 * 
 * Premium AI-driven chat wizard for onboarding.
 * Features:
 * - Two-column layout: Chat panel (left) + Live preview (right)
 * - Chat-style question flow with Custodian
 * - Live preview updates as answers are captured
 * - Micro-interactions: bubble fade-in, typing pause, review moment
 * - No email displayed anywhere
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, Save, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { TypingDots } from './TypingDots';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { getSupabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import './CustodianOnboardingWizard.css';

interface WizardAnswers {
  firstName: string;
  businessName: string;
  goal: 'personal' | 'business' | 'both';
  currency: string;
}

type WizardStep = 'firstName' | 'businessName' | 'goal' | 'currency' | 'review' | 'scanning' | 'saving' | 'done' | 'error';
type SaveState = 'idle' | 'scanning' | 'saving' | 'done' | 'error';

const STEP_LABELS: Record<WizardStep, string> = {
  firstName: 'Step 1/4',
  businessName: 'Step 2/4',
  goal: 'Step 3/4',
  currency: 'Step 4/4',
  review: 'Reviewing',
  scanning: 'Securing...',
  saving: 'Saving...',
  done: 'Complete',
};

const STEP_TIME_ESTIMATES: Record<WizardStep, string> = {
  firstName: '~1 min',
  businessName: '~1 min',
  goal: '~1 min',
  currency: '~1 min',
  review: '~30 sec',
  scanning: 'Securing...',
  saving: 'Saving...',
  done: 'Done',
};

const STEP_PROMPTS = {
  firstName: "Hi — I'm Custodian.\n\nI'll personalize everything around you. This takes under a minute.\n\nFirst — what's your first name?",
  businessName: "Do you have a business name? (Optional)",
  goal: "What's your primary goal?\n\nPersonal expenses, business expenses, or both?",
  currency: "What currency do you use?",
  review: "Perfect! Let me review everything...",
};

const GOAL_OPTIONS = [
  { value: 'personal' as const, label: 'Personal', icon: '👤' },
  { value: 'business' as const, label: 'Business', icon: '💼' },
  { value: 'both' as const, label: 'Both', icon: '🎯' },
];

const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
];

interface LiveProfilePreviewCardProps {
  answers: WizardAnswers;
  previousAnswers: React.MutableRefObject<WizardAnswers>;
}

function LiveProfilePreviewCard({ answers, previousAnswers }: LiveProfilePreviewCardProps) {
  const [pulsingField, setPulsingField] = useState<string | null>(null);

  // Detect changes and trigger pulse
  useEffect(() => {
    if (answers.firstName !== previousAnswers.current.firstName && answers.firstName) {
      setPulsingField('firstName');
      setTimeout(() => setPulsingField(null), 500);
    }
    if (answers.businessName !== previousAnswers.current.businessName && answers.businessName) {
      setPulsingField('businessName');
      setTimeout(() => setPulsingField(null), 500);
    }
    if (answers.goal !== previousAnswers.current.goal && answers.goal) {
      setPulsingField('goal');
      setTimeout(() => setPulsingField(null), 500);
    }
    if (answers.currency !== previousAnswers.current.currency && answers.currency) {
      setPulsingField('currency');
      setTimeout(() => setPulsingField(null), 500);
    }
    previousAnswers.current = answers;
  }, [answers, previousAnswers]);

  return (
    <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-purple-500/20 rounded-xl p-5 shadow-2xl backdrop-blur-xl h-full flex flex-col lg:h-[520px] lg:max-h-[520px] overflow-hidden">
      {/* AI Glow Overlay */}
      <div className="ai-glow-right" />
      
      <div className="flex items-center gap-2.5 mb-3 flex-shrink-0 relative z-10">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/40 relative">
          <CheckCircle className="w-3.5 h-3.5 text-white relative z-10" />
        </div>
        <h3 className="text-sm font-semibold text-white">Profile Preview</h3>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto relative z-10">
        <div className={`p-3 rounded-lg bg-slate-800/50 border transition-all duration-500 ${
          pulsingField === 'firstName' ? 'preview-row-pulse' : 'border-slate-700/50'
        }`}>
          <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">First Name</p>
          <p className="text-sm text-white font-medium">
            {answers.firstName || <span className="text-slate-500 italic">Not set</span>}
          </p>
        </div>

        {answers.businessName && (
          <div className={`p-3 rounded-lg bg-slate-800/50 border transition-all duration-500 ${
            pulsingField === 'businessName' ? 'preview-row-pulse' : 'border-slate-700/50'
          }`}>
            <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Business Name</p>
            <p className="text-sm text-white font-medium">{answers.businessName}</p>
          </div>
        )}

        <div className={`p-3 rounded-lg bg-slate-800/50 border transition-all duration-500 ${
          pulsingField === 'goal' ? 'preview-row-pulse' : 'border-slate-700/50'
        }`}>
          <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Goal</p>
          <p className="text-sm text-white font-medium capitalize">
            {answers.goal ? GOAL_OPTIONS.find(g => g.value === answers.goal)?.label : <span className="text-slate-500 italic">Not set</span>}
          </p>
        </div>

        <div className={`p-3 rounded-lg bg-slate-800/50 border transition-all duration-500 ${
          pulsingField === 'currency' ? 'preview-row-pulse' : 'border-slate-700/50'
        }`}>
          <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wide">Currency</p>
          <p className="text-sm text-white font-medium">
            {answers.currency || <span className="text-slate-500 italic">Not set</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

interface CustodianChatPanelProps {
  currentStep: WizardStep;
  answers: WizardAnswers;
  isTyping: boolean;
  isScanning: boolean;
  isSaving: boolean;
  showCompletion: boolean;
  saveError: string | null;
  onAnswer: (step: WizardStep, value: string) => void;
  onNext: () => void;
  onSave: () => void;
}

function CustodianChatPanel({ currentStep, answers, isTyping, isScanning, isSaving, showCompletion, saveError, onAnswer, onNext, onSave }: CustodianChatPanelProps) {
  const [nameInput, setNameInput] = useState('');
  const [businessNameInput, setBusinessNameInput] = useState('');

  // Reset inputs when step changes
  useEffect(() => {
    if (currentStep === 'firstName') {
      setNameInput(answers.firstName || '');
    } else if (currentStep === 'businessName') {
      setBusinessNameInput(answers.businessName || '');
    }
  }, [currentStep, answers]);

  const handleNameSubmit = () => {
    const trimmed = nameInput.trim();
    if (trimmed && !trimmed.includes('@')) {
      onAnswer('firstName', trimmed);
      setTimeout(() => onNext(), 300);
    }
  };

  const handleBusinessNameSubmit = () => {
    const trimmed = businessNameInput.trim();
    onAnswer('businessName', trimmed);
    setTimeout(() => onNext(), 300);
  };

  const handleSkipBusinessName = () => {
    onAnswer('businessName', '');
    setTimeout(() => onNext(), 300);
  };

  return (
    <div className="relative h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden lg:h-[520px] lg:max-h-[520px]">
      {/* AI Glow Overlay */}
      <div className="ai-glow-left" />
      
      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-2.5 border-b border-white/10 flex-shrink-0 z-10">
        {/* Shimmer Sweep */}
        <div className="custodian-header-shimmer" />
        
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            {/* Halo Ring */}
            <div className="custodian-icon-halo" />
            <Shield className="w-3.5 h-3.5 text-white relative z-10" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Custodian</h3>
            <p className="text-slate-400 text-xs">Guided setup</p>
          </div>
        </div>
        
        {/* Progress Pill */}
        <div className="relative z-10 px-2.5 py-1 bg-slate-800/60 border border-white/10 rounded-full text-xs text-slate-300">
          <span className="font-medium">{STEP_LABELS[currentStep]}</span>
          {currentStep !== 'saving' && currentStep !== 'review' && (
            <span className="text-slate-500 ml-1.5">• {STEP_TIME_ESTIMATES[currentStep]}</span>
          )}
        </div>
      </div>
      
      {/* Completion Toast */}
      {showCompletion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-3 py-2 bg-green-500/20 border border-green-500/40 rounded-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <CheckCircle className="w-4 h-4 text-green-400" />
              {/* Sparkle Bursts */}
              <div className="sparkle-burst sparkle-burst-1" />
              <div className="sparkle-burst sparkle-burst-2" />
              <div className="sparkle-burst sparkle-burst-3" />
              <div className="sparkle-burst sparkle-burst-4" />
            </div>
            <span className="text-xs text-green-300 font-medium">Secured ✓</span>
          </div>
        </motion.div>
      )}

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 min-h-0">
        {/* First Name Question */}
        {currentStep === 'firstName' && (
          <AnimatePresence>
            {!isTyping && (
              <motion.div
                key="firstName-question"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                    {STEP_PROMPTS.firstName}
                  </p>
                </div>
              </motion.div>
            )}
            {isTyping && (
              <motion.div
                key="firstName-typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <TypingDots />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Business Name Question */}
        {currentStep === 'businessName' && (
          <AnimatePresence>
            {!isTyping && (
              <motion.div
                key="businessName-question"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                    {STEP_PROMPTS.businessName}
                  </p>
                </div>
              </motion.div>
            )}
            {isTyping && (
              <motion.div
                key="businessName-typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <TypingDots />
                </div>
              </motion.div>
            )}
            {answers.firstName && (
              <motion.div
                key="firstName-answer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="flex items-start gap-3 justify-end"
              >
                <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl rounded-tr-sm px-3 py-2.5 border border-purple-500/30 max-w-[80%]">
                  <p className="text-white text-sm">{answers.firstName}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Goal Question */}
        {currentStep === 'goal' && (
          <AnimatePresence>
            {!isTyping && (
              <motion.div
                key="goal-question"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                    {STEP_PROMPTS.goal}
                  </p>
                </div>
              </motion.div>
            )}
            {isTyping && (
              <motion.div
                key="goal-typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <TypingDots />
                </div>
              </motion.div>
            )}
            {answers.businessName && (
              <motion.div
                key="businessName-answer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="flex items-start gap-3 justify-end"
              >
                <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl rounded-tr-sm px-3 py-2.5 border border-purple-500/30 max-w-[80%]">
                  <p className="text-white text-sm">{answers.businessName || 'Skip'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Currency Question */}
        {currentStep === 'currency' && (
          <AnimatePresence>
            {!isTyping && (
              <motion.div
                key="currency-question"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                    {STEP_PROMPTS.currency}
                  </p>
                </div>
              </motion.div>
            )}
            {isTyping && (
              <motion.div
                key="currency-typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                  <TypingDots />
                </div>
              </motion.div>
            )}
            {answers.goal && (
              <motion.div
                key="goal-answer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="flex items-start gap-3 justify-end"
              >
                <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl rounded-tr-sm px-3 py-2.5 border border-purple-500/30 max-w-[80%]">
                  <p className="text-white text-sm">{GOAL_OPTIONS.find(g => g.value === answers.goal)?.label}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <AnimatePresence>
            <motion.div
              key="review-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                  {STEP_PROMPTS.review}
                </p>
              </div>
            </motion.div>
            {answers.currency && (
              <motion.div
                key="currency-answer"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="flex items-start gap-3 justify-end"
              >
                <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl rounded-tr-sm px-3 py-2.5 border border-purple-500/30 max-w-[80%]">
                  <p className="text-white text-sm">{answers.currency}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Scanning Step */}
        {currentStep === 'scanning' && (
          <AnimatePresence>
            <motion.div
              key="scanning-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <TypingDots />
                  <p className="text-white/90 text-sm">Securing your workspace...</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Saving Step */}
        {currentStep === 'saving' && (
          <AnimatePresence>
            <motion.div
              key="saving-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-purple-500 border-t-transparent" />
                  <p className="text-white/90 text-sm">Saving your profile...</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Done Step - Secured message */}
        {currentStep === 'done' && (
          <AnimatePresence>
            <motion.div
              key="done-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-green-500/30">
                <p className="text-white/90 text-sm">Secured ✓ — welcome in.</p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* Error Step */}
        {currentStep === 'error' && (
          <AnimatePresence>
            <motion.div
              key="error-message"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-xl rounded-tl-sm px-3 py-2.5 border border-red-500/30">
                <p className="text-white/90 text-sm mb-2">
                  {saveError ? `Failed to save: ${saveError}` : 'Failed to save. Please try again.'}
                </p>
                <button
                  onClick={onSave}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Retry
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Footer Input/Buttons */}
      <div className="px-4 py-2.5 border-t border-white/10 flex-shrink-0 mt-auto">
        {currentStep === 'firstName' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim() && !nameInput.includes('@')) {
                  handleNameSubmit();
                }
              }}
              placeholder="Your first name"
              className="flex-1 h-11 px-4 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              disabled={!nameInput.trim() || nameInput.includes('@')}
              className="h-11 px-4 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 'businessName' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={businessNameInput}
              onChange={(e) => setBusinessNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && businessNameInput.trim()) {
                  handleBusinessNameSubmit();
                }
              }}
              placeholder="Business name (optional)"
              className="flex-1 h-11 px-4 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              autoFocus
            />
            <button
              onClick={handleBusinessNameSubmit}
              disabled={!businessNameInput.trim()}
              className="h-11 px-4 text-sm bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Continue
            </button>
            <button
              onClick={handleSkipBusinessName}
              className="h-11 px-3 text-sm bg-slate-800/50 border border-white/10 text-slate-300 font-medium rounded-lg hover:bg-slate-700/50 transition-all duration-200"
            >
              Skip
            </button>
          </div>
        )}

        {currentStep === 'goal' && !isTyping && (
          <div className="grid grid-cols-1 gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal.value}
                onClick={() => {
                  onAnswer('goal', goal.value);
                  setTimeout(() => onNext(), 300);
                }}
                className="h-11 px-4 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white font-medium hover:bg-slate-700/50 hover:border-purple-500/50 transition-all duration-200 text-left flex items-center gap-2.5"
              >
                <span className="text-base">{goal.icon}</span>
                <span>{goal.label}</span>
              </button>
            ))}
          </div>
        )}

        {currentStep === 'currency' && !isTyping && (
          <div className="grid grid-cols-2 gap-2">
            {CURRENCY_OPTIONS.map((currency) => (
              <button
                key={currency.value}
                onClick={() => {
                  onAnswer('currency', currency.value);
                  setTimeout(() => onNext(), 300);
                }}
                className="h-11 px-3 bg-slate-800/50 border border-white/10 rounded-lg text-xs text-white font-medium hover:bg-slate-700/50 hover:border-purple-500/50 transition-all duration-200"
              >
                {currency.label}
              </button>
            ))}
          </div>
        )}

        {/* Review Step - Save Button (mobile) */}
        {currentStep === 'review' && !isTyping && !isScanning && !isSaving && (
          <Button
            onClick={() => {
              onSave();
            }}
            disabled={!answers.firstName.trim()}
            className="w-full h-11 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            Confirm & Save
          </Button>
        )}
      </div>
    </div>
  );
}

interface CustodianOnboardingWizardProps {
  onComplete: () => void;
}

export function CustodianOnboardingWizard({ onComplete }: CustodianOnboardingWizardProps) {
  const { userId, user, refreshProfile, profile } = useAuth();
  const profileContext = useProfileContext();
  const refreshProfileContext = profileContext?.refreshProfile || null;
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('firstName');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [isTyping, setIsTyping] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const previousAnswers = useRef<WizardAnswers>({
    firstName: '',
    businessName: '',
    goal: 'both',
    currency: 'CAD',
  });
  const [answers, setAnswers] = useState<WizardAnswers>({
    firstName: '',
    businessName: '',
    goal: 'both',
    currency: 'CAD',
  });

  // Typing animation when step changes
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setIsTyping(false);
    }, 800 + Math.random() * 400); // 800-1200ms typing delay
    return () => clearTimeout(timer);
  }, [currentStep]);

  const handleAnswer = useCallback((step: WizardStep, value: string) => {
    setAnswers(prev => {
      if (step === 'firstName') return { ...prev, firstName: value };
      if (step === 'businessName') return { ...prev, businessName: value };
      if (step === 'goal') return { ...prev, goal: value as 'personal' | 'business' | 'both' };
      if (step === 'currency') return { ...prev, currency: value };
      return prev;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep === 'firstName') {
      setCurrentStep('businessName');
    } else if (currentStep === 'businessName') {
      setCurrentStep('goal');
    } else if (currentStep === 'goal') {
      setCurrentStep('currency');
    } else if (currentStep === 'currency') {
      setCurrentStep('review');
      // Don't auto-save - wait for user to click "Confirm & Save"
    }
  }, [currentStep]);

  const handleSave = useCallback(async () => {
    if (isSaving || isScanning || saveState !== 'idle') return; // Prevent double-save
    if (!userId || !user) {
      toast.error('Please sign in to continue');
      return;
    }

    if (!answers.firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    try {
      setSaveState('scanning');
      setIsScanning(true);
      setCurrentStep('scanning');
      setSaveError(null);
      
      // Wait 700ms for scanning animation
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Step 2: Switch to saving state
      setSaveState('saving');
      setIsScanning(false);
      setIsSaving(true);
      setCurrentStep('saving');
      
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Database connection unavailable');
      }

      // Fetch current profile for dev logging
      let currentProfile = null;
      if (import.meta.env.DEV) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        currentProfile = profileData;
        console.log('[CustodianOnboardingWizard] Profile BEFORE save:', currentProfile);
      }

      // Prepare payload: Save first_name, last_name, full_name, display_name properly
      // Save currency, onboarding_completed, onboarding_status, and onboarding_step
      const firstName = answers.firstName.trim();
      const lastName = answers.businessName?.trim() || ''; // Business name can be used as last name if provided
      const fullName = lastName ? `${firstName} ${lastName}`.trim() : firstName;
      
      const payload: any = {
        id: userId,
        email: user?.email || null,
        first_name: firstName,
        last_name: lastName || null,
        full_name: fullName,
        display_name: firstName, // Display name defaults to first name
        currency: answers.currency || 'CAD',
        onboarding_completed: true,
        onboarding_status: 'completed', // Standardized: always set to 'completed' when onboarding finishes
        onboarding_step: 'custodian_complete',
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add optional fields if they exist
      if (answers.businessName?.trim()) {
        payload.account_name = answers.businessName.trim();
      }
      if (answers.goal) {
        payload.account_type = answers.goal;
      }

      if (import.meta.env.DEV) {
        console.log('[CustodianOnboardingWizard] Saving profile to Supabase with payload:', {
          userId,
          display_name: payload.display_name,
          currency: payload.currency,
          onboarding_completed: payload.onboarding_completed,
          onboarding_status: payload.onboarding_status,
          onboarding_completed_at: payload.onboarding_completed_at,
          onboarding_step: payload.onboarding_step,
          account_name: payload.account_name,
          account_type: payload.account_type,
        });
      }

      const { error, data } = await supabase
        .from('profiles')
        .upsert(payload, {
          onConflict: 'id'
        })
        .select();

      if (error) {
        console.error('[CustodianOnboardingWizard] Failed to save profile:', error);
        setSaveError(error.message || 'Unknown error');
        setSaveState('error');
        setCurrentStep('error');
        setIsSaving(false);
        setIsScanning(false);
        toast.error(`Failed to save profile: ${error.message || 'Unknown error'}`);
        return;
      }

      if (import.meta.env.DEV && data && data.length > 0) {
        console.log('[CustodianOnboardingWizard] Profile AFTER save (updated row):', data[0]);
        console.log('[CustodianOnboardingWizard] Verification:', {
          onboarding_completed: data[0].onboarding_completed,
          onboarding_status: (data[0] as any).onboarding_status,
          onboarding_completed_at: (data[0] as any).onboarding_completed_at,
          onboarding_step: (data[0] as any).onboarding_step,
          display_name: data[0].display_name,
          currency: data[0].currency,
        });
      }

      // PART A: Mark Custodian as ready (merge-safe metadata update)
      // Get existing metadata to pass to helper (prevents race conditions)
      const existingMetadata = (profile?.metadata && typeof profile.metadata === 'object') 
        ? profile.metadata 
        : {};
      
      try {
        const { updateProfileMetadata } = await import('../../lib/profileMetadataHelpers');
        const success = await updateProfileMetadata(userId, {
          custodian_ready: true,
          custodian_setup_at: new Date().toISOString(),
          custodian_version: 'v1',
        }, existingMetadata);
        
        if (success) {
          if (import.meta.env.DEV) {
            console.log('[Custodian] wrote custodian_ready=true', { userId, existingMetadataKeys: Object.keys(existingMetadata) });
          }
          
          // Set sessionStorage flag for post-onboarding chooser (show only once, immediately after completion)
          try {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              sessionStorage.setItem('just_completed_onboarding', 'true');
              if (import.meta.env.DEV) {
                console.log('[CustodianOnboardingWizard] Set sessionStorage flag for post-onboarding chooser');
              }
            }
          } catch (storageError: any) {
            // Non-fatal: sessionStorage may not be available in some environments
            if (import.meta.env.DEV) {
              console.warn('[CustodianOnboardingWizard] Failed to set sessionStorage flag (non-fatal):', storageError?.message || storageError);
            }
          }
        } else {
          console.warn('[CustodianOnboardingWizard] ⚠️ Failed to mark Custodian as ready (non-fatal, continuing)');
        }
      } catch (error: any) {
        console.warn('[CustodianOnboardingWizard] ⚠️ Error marking Custodian as ready (non-fatal, continuing):', error?.message || error);
      }

      // Refresh profile in both AuthContext and ProfileContext to get updated data
      await refreshProfile();
      if (refreshProfileContext) {
        await refreshProfileContext();
      }
      
      // After refresh, check if custodian_ready is now true and redirect
      // Fetch fresh profile to verify write succeeded
      // Reuse existing supabase variable (already declared at line 752)
      if (supabase) {
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', userId)
          .maybeSingle();
        
        if (freshProfile?.metadata && typeof freshProfile.metadata === 'object') {
          const md = freshProfile.metadata;
          const custodianReady = (md as any).custodian_ready === true;
          
          if (import.meta.env.DEV) {
            console.log('[Custodian] profile refreshed, custodian_ready now =', custodianReady, { metadata: md });
          }
          
          // If custodian is ready, navigate to dashboard immediately
          if (custodianReady) {
            if (import.meta.env.DEV) {
              console.log('[Custodian] custodian_ready=true confirmed, redirecting to dashboard');
            }
            // Navigate via onComplete callback (which will trigger redirect in OnboardingSetupPage)
            onComplete();
            return; // Exit early - don't show completion message
          }
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[CustodianOnboardingWizard] ✅ Profile refreshed in both contexts');
      }

      // Step 3: Show done state with "Secured ✓ — welcome in." message
      setSaveState('done');
      setCurrentStep('done');
      setShowCompletion(true);
      
      // Navigate to dashboard after showing completion message
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('[CustodianOnboardingWizard] Unexpected error saving profile:', error);
      setSaveError(error.message || 'Unexpected error occurred');
      setSaveState('error');
      setCurrentStep('error');
      setIsSaving(false);
      setIsScanning(false);
      toast.error('Failed to save profile. Please try again.');
    }
  }, [userId, user, answers, refreshProfile, onComplete, isSaving, isScanning, saveState]);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full py-6 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:max-h-[520px]">
          {/* Left: Chat Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <CustodianChatPanel
              currentStep={currentStep}
              answers={answers}
              isTyping={isTyping}
              isScanning={isScanning}
              isSaving={isSaving}
              showCompletion={showCompletion}
              saveError={saveError}
              onAnswer={handleAnswer}
              onNext={handleNext}
              onSave={handleSave}
            />
          </div>

          {/* Right: Live Preview */}
          <div className="lg:col-span-7 flex flex-col">
            <LiveProfilePreviewCard answers={answers} previousAnswers={previousAnswers} />
            
            {/* Save Button (shown on review step) */}
            {currentStep === 'review' && !isScanning && !isSaving && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3"
              >
                <Button
                  onClick={handleSave}
                  disabled={!answers.firstName.trim()}
                  className="w-full h-10 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Confirm & Save
                </Button>
              </motion.div>
            )}

            {currentStep === 'saving' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-3 p-2.5 bg-slate-800/50 border border-purple-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-purple-500 border-t-transparent" />
                  <p className="text-sm text-white">Saving your profile...</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


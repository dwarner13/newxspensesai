/**
 * Custodian Onboarding Panel
 * 
 * Premium guided onboarding chat interface.
 * Features:
 * - Glass/blur styling
 * - Step-by-step questions (name, level, goal)
 * - Typing dots pacing
 * - Clean chat-style UI
 * - No message spam - derives display from state
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check } from 'lucide-react';
import { useCustodianOnboarding, ExperienceLevel } from '../../hooks/useCustodianOnboarding';
import { TypingDots } from './TypingDots';
import { FadeBubble } from './FadeBubble';
import { useBeat } from './useBeat';

interface CustodianOnboardingPanelProps {
  mode?: 'prepare' | 'questions' | 'done';
  onComplete: () => void;
  isMobile?: boolean;
  canStart?: boolean; // When true, allows first question to appear
}

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'novice', label: 'Novice', description: "I'll keep things simple." },
  { value: 'intermediate', label: 'Intermediate', description: "I'll keep things balanced." },
  { value: 'advanced', label: 'Advanced', description: "I'll keep things advanced." },
];

const PRIMARY_GOALS = [
  { value: 'debt', label: 'Debt' },
  { value: 'spending', label: 'Spending' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'business', label: 'Business' },
  { value: 'planning', label: 'Planning' },
  { value: 'exploring', label: 'Just exploring' },
];

const STEP_PROMPTS = {
  name: "Hi — I'm Custodian.\n\nI'll personalize everything around you. This takes under a minute.\n\nFirst — what should I call you?",
  level: "How comfortable are you with finances?",
  goal: "What do you want help with first?",
  done: "All set.",
};

const STEP_LABELS = {
  name: 'Step 1 of 3',
  level: 'Step 2 of 3',
  goal: 'Step 3 of 3',
  done: 'Complete',
};

export function CustodianOnboardingPanel({
  mode = 'questions',
  onComplete,
  isMobile = false,
  canStart = true,
}: CustodianOnboardingPanelProps) {
  // In 'prepare' mode, don't initialize the hook (save resources)
  const {
    currentStep,
    answers,
    isTyping,
    advance,
    setPreferredName,
    setExperienceLevel,
    setPrimaryGoal,
  } = useCustodianOnboarding(mode === 'questions' ? onComplete : undefined);

  const [nameInput, setNameInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Update name input when answer changes
  useEffect(() => {
    if (answers.preferredName) {
      setNameInput(answers.preferredName);
    }
  }, [answers.preferredName]);

  const handleNameSubmit = async () => {
    const trimmedName = nameInput.trim();
    
    // Ensure we don't accept email addresses as names
    if (trimmedName && !trimmedName.includes('@')) {
      // setPreferredName now handles: save display_name, set onboarding_completed=true, navigate to dashboard
      await setPreferredName(trimmedName);
    }
  };

  const handleLevelSelect = async (level: ExperienceLevel) => {
    // setExperienceLevel now handles auto-save and advance internally
    await setExperienceLevel(level);
    const levelData = EXPERIENCE_LEVELS.find(l => l.value === level);
    if (levelData) {
      setConfirmText(levelData.description);
      setShowConfirm(true);
      setTimeout(() => {
        setShowConfirm(false);
        // advance() is called by setExperienceLevel, but we keep this for UI timing
      }, 1200);
    }
  };

  const handleGoalSelect = async (goal: string) => {
    // setPrimaryGoal now handles auto-save, completion, and onComplete callback
    await setPrimaryGoal(goal);
    const goalLabel = PRIMARY_GOALS.find(g => g.value === goal)?.label || goal;
    setConfirmText(`Done. I'll tune your dashboard around ${goalLabel.toLowerCase()}.`);
    setShowConfirm(true);
    setTimeout(() => {
      setShowConfirm(false);
      // onComplete is called by setPrimaryGoal after completion
    }, 1500);
  };

  const handleDone = () => {
    onComplete();
  };

  // Thinking beat: 750ms delay before showing message content
  // Only start if canStart is true (waits for Prime scene 0 to complete + pause)
  const messageReady = useBeat({ delayMs: 750, enabled: canStart && !isTyping && currentStep !== 'done' });
  const introReady = useBeat({ delayMs: 750, enabled: canStart && currentStep === 'name' && !isTyping });

  // Derive what to display from state (no message spam)
  const showSystemIntro = currentStep === 'name' && introReady;
  const showPrompt = messageReady && currentStep !== 'name' && currentStep !== 'done';
  const showUserAnswer = 
    (currentStep === 'level' && answers.preferredName) ||
    (currentStep === 'goal' && answers.experienceLevel) ||
    (currentStep === 'done' && answers.primaryGoal);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Custodian</h3>
            <p className="text-slate-400 text-xs">Guided setup</p>
          </div>
        </div>
        <div className="text-slate-400 text-xs font-medium">
          {STEP_LABELS[currentStep]}
        </div>
      </div>

      {/* Chat Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 min-h-0">
        {/* System Intro (only on first step) */}
        <AnimatePresence>
          {showSystemIntro && (
            <FadeBubble className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                  {STEP_PROMPTS.name}
                </p>
              </div>
            </FadeBubble>
          )}
        </AnimatePresence>

        {/* Current Prompt or Typing Dots */}
        {currentStep !== 'name' && (
          <AnimatePresence mode="wait">
            {isTyping ? (
              <motion.div
                key="typing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                  <TypingDots />
                </div>
              </motion.div>
            ) : showPrompt ? (
              <FadeBubble key="prompt" className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed">
                    {STEP_PROMPTS[currentStep]}
                  </p>
                </div>
              </FadeBubble>
            ) : null}
          </AnimatePresence>
        )}

        {/* User Answer Bubble */}
        <AnimatePresence>
          {showUserAnswer && (
            <FadeBubble className="flex items-start gap-3 justify-end">
              <div className="flex-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl rounded-tr-sm px-4 py-3 border border-purple-500/30 max-w-[80%]">
                <p className="text-white text-sm">
                  {currentStep === 'level' && answers.preferredName}
                  {currentStep === 'goal' && EXPERIENCE_LEVELS.find(l => l.value === answers.experienceLevel)?.label}
                  {currentStep === 'done' && PRIMARY_GOALS.find(g => g.value === answers.primaryGoal)?.label}
                </p>
              </div>
            </FadeBubble>
          )}
        </AnimatePresence>

        {/* Micro-confirm */}
        <AnimatePresence>
          {showConfirm && confirmText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
                <p className="text-white/70 text-sm italic">
                  {confirmText}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Done Message */}
        {currentStep === 'done' && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-white/10">
              <p className="text-white/90 text-sm leading-relaxed">
                {STEP_PROMPTS.done}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer Input/Buttons */}
      <div className="px-6 py-4 border-t border-white/10">
        {currentStep === 'name' && (
          <div className="flex gap-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  handleNameSubmit();
                }
              }}
              placeholder="First name"
              className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              autoFocus
            />
            <button
              onClick={handleNameSubmit}
              disabled={!nameInput.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Continue
            </button>
          </div>
        )}

        {currentStep === 'level' && !isTyping && (
          <div className="grid grid-cols-1 gap-2">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => handleLevelSelect(level.value)}
                className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-slate-700/50 hover:border-purple-500/50 transition-all duration-200 text-left"
              >
                {level.label}
              </button>
            ))}
          </div>
        )}

        {currentStep === 'goal' && !isTyping && (
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY_GOALS.map((goal) => (
              <button
                key={goal.value}
                onClick={() => handleGoalSelect(goal.value)}
                className="px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white text-sm font-medium hover:bg-slate-700/50 hover:border-purple-500/50 transition-all duration-200"
              >
                {goal.label}
              </button>
            ))}
          </div>
        )}

        {currentStep === 'done' && !isTyping && (
          <button
            onClick={handleDone}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-200"
          >
            Enter dashboard
          </button>
        )}
      </div>
    </div>
  );
}


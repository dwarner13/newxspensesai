/**
 * CustodianSetupCard Component
 * 
 * Single-step setup card for Custodian onboarding questions.
 * 
 * Features:
 * - One question per screen
 * - Centered card (desktop) / Full-width (mobile)
 * - Title, question, helper text, input/selection
 * - Progress indicator
 * - Smooth fade + movement transitions
 * - No stacking or resizing
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Shield } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustodianSetupCardProps {
  question: {
    id: string;
    question: string;
    key: string;
    type: 'text' | 'options' | 'consent';
    options?: Option[];
  };
  currentStep: number;
  totalSteps: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isMobile?: boolean;
  helperText?: string;
}

export function CustodianSetupCard({
  question,
  currentStep,
  totalSteps,
  value,
  onChange,
  onSubmit,
  isMobile = false,
  helperText,
}: CustodianSetupCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus text input when card appears
  useEffect(() => {
    if (question.type === 'text' && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [question.type]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && question.type === 'text' && value.trim()) {
      onSubmit();
    }
  };

  const canSubmit = question.type === 'consent' 
    ? true 
    : question.type === 'text' 
    ? value.trim().length > 0 
    : value.length > 0;

  // For consent type, value should be 'yes' to show as selected
  const isConsentSelected = question.type === 'consent' && value === 'yes';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
      className={`w-full ${isMobile ? 'px-4' : 'max-w-lg mx-auto'} flex flex-col`}
    >
      {/* Premium glassmorphism card with soft glow */}
      <div className={`relative bg-gradient-to-br from-slate-900/95 via-slate-950/95 to-slate-900/95 border border-purple-500/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl ${isMobile ? 'p-6' : 'p-8'}`}
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Soft glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-indigo-500/5 pointer-events-none rounded-2xl" />
        {/* Header with Icon and Progress - Premium styling */}
        <div className="relative flex items-start gap-4 mb-6 z-10">
          <div className={`${isMobile ? 'w-12 h-12' : 'w-14 h-14'} rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/30`}>
            <Shield className={`${isMobile ? 'w-6 h-6' : 'w-7 h-7'} text-white`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-white`}>
                Custodian
              </h2>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 font-medium`}>
                Step {currentStep} of {totalSteps}
              </span>
            </div>
            {helperText && (
              <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-400 leading-relaxed`}>
                {helperText}
              </p>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-slate-200 leading-relaxed mb-2`}>
            {question.question}
          </h3>
        </div>

        {/* Input/Selection Area */}
        <div className="mb-6">
          {question.type === 'text' && (
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className={`w-full ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-3'} bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
            />
          )}

          {question.type === 'options' && question.options && (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1'} gap-3`}>
              {question.options.map((option) => (
                <motion.button
                  key={option.value}
                  onClick={() => onChange(option.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full ${isMobile ? 'px-4 py-3 text-base' : 'px-6 py-4'} rounded-xl border-2 transition-all text-left backdrop-blur-sm ${
                    value === option.value
                      ? 'bg-gradient-to-r from-purple-500/30 via-blue-500/30 to-indigo-500/30 border-purple-400 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-500/20'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-200 hover:border-purple-500/50 hover:bg-slate-800/70 hover:shadow-md'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          )}

          {question.type === 'consent' && (
            <button
              onClick={() => onSubmit()}
              className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                isConsentSelected
                  ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <Shield className={`${isMobile ? 'w-5 h-5' : 'w-6 h-6'} ${isConsentSelected ? 'text-blue-400' : 'text-slate-400'} mt-0.5 flex-shrink-0`} />
              <p className={`${isMobile ? 'text-sm' : 'text-base'} ${isConsentSelected ? 'text-white' : 'text-slate-300'} leading-relaxed`}>
                {question.question}
              </p>
            </button>
          )}
        </div>

        {/* Submit Button - Premium styling with glow */}
        {question.type !== 'consent' && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={onSubmit}
              disabled={!canSubmit}
              className={`relative w-full ${isMobile ? 'py-3 text-base' : 'py-3'} bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 rounded-xl overflow-hidden`}
            >
              <span className="relative z-10">Continue</span>
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-indigo-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300"
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
            </Button>
          </motion.div>
        )}

        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500'
                    : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}


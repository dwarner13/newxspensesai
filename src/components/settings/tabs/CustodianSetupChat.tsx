/**
 * Custodian Conversational Setup Chat
 * 
 * AI-driven profile setup via conversation.
 * Replaces static form with chat-style interface.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Sparkles, CheckCircle, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SetupAnswer {
  questionId: string;
  answer: string;
  confirmed: boolean;
}

interface CustodianSetupChatProps {
  onComplete: (answers: Record<string, string>) => void;
  onClose?: () => void;
}

const QUESTIONS = [
  {
    id: 'name',
    question: "How would you like me and the AI team to address you?",
    key: 'displayName',
  },
  {
    id: 'focus',
    question: "Is XspensesAI mainly for personal finances, business finances, or both?",
    key: 'focus',
    // Map user responses to valid values
    normalizeAnswer: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('personal') && !lower.includes('business') && !lower.includes('both')) return 'personal';
      if (lower.includes('business') && !lower.includes('personal') && !lower.includes('both')) return 'business';
      if (lower.includes('both')) return 'both';
      return answer; // Keep original if unclear
    },
  },
  {
    id: 'insight',
    question: "Do you prefer quick summaries or deeper explanations?",
    key: 'insightStyle',
    normalizeAnswer: (answer: string) => {
      const lower = answer.toLowerCase();
      if (lower.includes('quick') || lower.includes('summary') || lower.includes('brief')) return 'quick summaries';
      if (lower.includes('deep') || lower.includes('detail') || lower.includes('explain')) return 'deeper explanations';
      return answer;
    },
  },
  {
    id: 'context',
    question: "Is there anything important I should know right now? (You can skip this.)",
    key: 'context',
    optional: true,
  },
];

export function CustodianSetupChat({ onComplete, onClose }: CustodianSetupChatProps) {
  const { userId } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirmations, setConfirmations] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [userInput, setUserInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentQuestion = QUESTIONS[currentStep];
  const isLastQuestion = currentStep === QUESTIONS.length - 1;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStep, showSummary]);

  // Focus input on step change
  useEffect(() => {
    if (!showSummary) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentStep, showSummary]);

  const handleAnswer = () => {
    if (!userInput.trim() && !currentQuestion.optional) {
      return;
    }

    let answer = userInput.trim() || '(skipped)';
    
    // Normalize answer if normalizeAnswer function exists
    if (currentQuestion.normalizeAnswer && answer !== '(skipped)') {
      answer = currentQuestion.normalizeAnswer(answer);
    }
    
    setAnswers({ ...answers, [currentQuestion.key]: answer });

    // Show confirmation prompt
    if (currentQuestion.id === 'name') {
      // For name, show confirmation immediately
      setConfirmations({ ...confirmations, [currentQuestion.key]: true });
      setTimeout(() => {
        if (isLastQuestion) {
          setShowSummary(true);
        } else {
          setCurrentStep(currentStep + 1);
          setUserInput('');
        }
      }, 1500);
    } else {
      // For other questions, wait for explicit confirmation
      setUserInput('');
    }
  };

  const handleConfirm = (key: string) => {
    setConfirmations({ ...confirmations, [key]: true });
    setTimeout(() => {
      if (isLastQuestion) {
        setShowSummary(true);
      } else {
        setCurrentStep(currentStep + 1);
        setUserInput('');
      }
    }, 500);
  };

  const handleFinish = () => {
    // Only save confirmed answers
    const confirmedAnswers: Record<string, string> = {};
    Object.keys(answers).forEach((key) => {
      if (confirmations[key]) {
        confirmedAnswers[key] = answers[key];
      }
    });
    onComplete(confirmedAnswers);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (confirmations[currentQuestion.key]) {
        // Already confirmed, move to next
        return;
      }
      if (answers[currentQuestion.key] && !confirmations[currentQuestion.key]) {
        // Answer exists but not confirmed - confirm it
        handleConfirm(currentQuestion.key);
      } else {
        // No answer yet - submit answer
        handleAnswer();
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Custodian</h3>
            <p className="text-xs text-slate-400">
              Profile setup • Step {currentStep + 1} of {QUESTIONS.length}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Opening Message */}
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-sm text-slate-300">
                  I'll only store what you explicitly confirm.
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  You can change anything later.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Current Question */}
        {!showSummary && (
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                <p className="text-sm text-white font-medium">
                  {currentQuestion.question}
                </p>
              </div>

              {/* User Answer */}
              {answers[currentQuestion.key] && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 justify-end"
                >
                  <div className="flex-1 max-w-[80%]">
                    <div className="bg-blue-600 rounded-lg p-3">
                      <p className="text-sm text-white">
                        {answers[currentQuestion.key]}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Confirmation Prompt */}
              {answers[currentQuestion.key] && !confirmations[currentQuestion.key] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-slate-900/50 border border-blue-500/30 rounded-lg p-3">
                      {currentQuestion.id === 'name' ? (
                        <p className="text-sm text-slate-300">
                          I'll call you <span className="text-white font-medium">{answers[currentQuestion.key]}</span>.
                          Should I save that?
                        </p>
                      ) : (
                        <p className="text-sm text-slate-300">
                          Should I save that?
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirm(currentQuestion.key)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Yes, save it
                      </Button>
                      <Button
                        onClick={() => {
                          setAnswers({ ...answers, [currentQuestion.key]: '' });
                          setUserInput('');
                        }}
                        size="sm"
                        variant="secondary"
                        className="border border-slate-700 hover:bg-slate-800"
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Summary Card */}
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-white mb-3">
                  Here's what I've set up:
                </h4>
                <div className="space-y-2">
                  {answers.displayName && confirmations.displayName && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">• Name:</span>
                      <span className="text-white font-medium">{answers.displayName}</span>
                    </div>
                  )}
                  {answers.focus && confirmations.focus && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">• Focus:</span>
                      <span className="text-white font-medium capitalize">{answers.focus}</span>
                    </div>
                  )}
                  {answers.insightStyle && confirmations.insightStyle && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">• Explanation style:</span>
                      <span className="text-white font-medium">{answers.insightStyle}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleFinish}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finish setup
            </Button>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!showSummary && !answers[currentQuestion.key] && (
        <div className="p-4 border-t border-slate-800/80 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentQuestion.optional
                  ? "Type your answer or press Enter to skip..."
                  : "Type your answer..."
              }
              className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleAnswer}
              disabled={!userInput.trim() && !currentQuestion.optional}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send
            </Button>
          </div>
          {currentQuestion.optional && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              This question is optional. Press Enter to skip.
            </p>
          )}
        </div>
      )}
    </div>
  );
}


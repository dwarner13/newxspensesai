/**
 * Prime → Custodian Onboarding Modal
 * 
 * AI-led profile creation flow:
 * 1. Prime greeting (static)
 * 2. Custodian conversational setup (chat UI)
 * 3. Completion → handoff back to Prime
 * 
 * Features:
 * - Centered modal with backdrop blur
 * - Smooth transitions
 * - Soft lock (no ESC/close until complete)
 * - Works for both guest and authenticated users
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Sparkles, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getGuestProfile, 
  saveGuestProfile, 
  setGuestProfileCompleted,
  getUserIdentity 
} from '../../lib/userIdentity';
import { getSupabase } from '../../lib/supabase';
import { isDemoMode } from '../../lib/demoAuth';

interface ProfileData {
  display_name: string;
  primary_mode: 'personal' | 'business' | 'both' | 'exploring';
  guidance_style: 'explain_everything' | 'show_results_only' | 'mix';
  consent_confirmed: boolean;
  profile_completed: boolean;
  created_at: string;
}

interface Message {
  id: string;
  role: 'custodian' | 'user';
  content: string;
  timestamp: Date;
}

interface PrimeCustodianOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const QUESTIONS = [
  {
    id: 'name',
    question: "What should I call you?",
    key: 'display_name',
    type: 'text' as const,
  },
  {
    id: 'primary_intent',
    question: "What best describes how you'll use XspensesAI?",
    key: 'primary_mode',
    type: 'options' as const,
    options: [
      { value: 'personal', label: 'Personal finances' },
      { value: 'business', label: 'Business finances' },
      { value: 'both', label: 'Both' },
      { value: 'exploring', label: 'Just exploring' },
    ],
  },
  {
    id: 'guidance_style',
    question: "How hands-on should we be?",
    key: 'guidance_style',
    type: 'options' as const,
    options: [
      { value: 'explain_everything', label: 'Explain everything' },
      { value: 'show_results_only', label: 'Show results only' },
      { value: 'mix', label: 'A mix of both' },
    ],
  },
  {
    id: 'consent',
    question: "I only store what you explicitly tell me, and I never assume details. Is that okay?",
    key: 'consent_confirmed',
    type: 'consent' as const,
  },
];

export function PrimeCustodianOnboardingModal({ 
  isOpen, 
  onComplete 
}: PrimeCustodianOnboardingModalProps) {
  const { userId, isDemoUser } = useAuth();
  const [step, setStep] = useState<'prime' | 'custodian' | 'complete'>('prime');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [profileData, setProfileData] = useState<Partial<ProfileData>>({});
  const [saving, setSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  // Focus input when Custodian step starts
  useEffect(() => {
    if (step === 'custodian' && currentQuestionIndex === 0 && messages.length === 0) {
      setTimeout(() => {
        addCustodianMessage("I'll only store what you explicitly tell me. You can change anything later.");
        setTimeout(() => {
          addCustodianMessage(currentQuestion.question);
          inputRef.current?.focus();
        }, 500);
      }, 300);
    }
  }, [step]);

  // Focus input on question change
  useEffect(() => {
    if (step === 'custodian' && currentQuestionIndex > 0) {
      setTimeout(() => {
        addCustodianMessage(currentQuestion.question);
        inputRef.current?.focus();
      }, 300);
    }
  }, [currentQuestionIndex]);

  const addCustodianMessage = (content: string) => {
    const message: Message = {
      id: `custodian-${Date.now()}`,
      role: 'custodian',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  const handleContinue = () => {
    setStep('custodian');
  };

  const handleAnswer = (answer?: string) => {
    const answerValue = answer || userInput.trim();
    
    if (!answerValue && currentQuestion.type !== 'consent') {
      return;
    }

    // Add user message
    addUserMessage(answerValue);

    // Save answer
    if (currentQuestion.type === 'consent') {
      setProfileData(prev => ({ ...prev, consent_confirmed: true }));
    } else if (currentQuestion.type === 'options') {
      setProfileData(prev => ({ 
        ...prev, 
        [currentQuestion.key]: answerValue 
      }));
    } else {
      setProfileData(prev => ({ 
        ...prev, 
        [currentQuestion.key]: answerValue 
      }));
    }

    // Move to next question or complete
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setUserInput('');
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    
    try {
      const finalData: ProfileData = {
        display_name: profileData.display_name || '',
        primary_mode: (profileData.primary_mode || 'exploring') as ProfileData['primary_mode'],
        guidance_style: (profileData.guidance_style || 'mix') as ProfileData['guidance_style'],
        consent_confirmed: profileData.consent_confirmed || false,
        profile_completed: true,
        created_at: new Date().toISOString(),
      };

      if (isDemoUser) {
        // Save to localStorage for guest
        const existingProfile = getGuestProfile() || {};
        saveGuestProfile({
          ...existingProfile,
          displayName: finalData.display_name,
          preferences: {
            ...existingProfile.preferences,
            primaryMode: finalData.primary_mode,
            guidanceStyle: finalData.guidance_style,
          },
          consentConfirmed: finalData.consent_confirmed,
        });
        setGuestProfileCompleted(true);
      } else {
        // Save to Supabase for authenticated user
        const supabase = getSupabase();
        if (!supabase || !userId) {
          throw new Error('Supabase not available');
        }

        await supabase
          .from('profiles')
          .upsert({
            id: userId,
            display_name: finalData.display_name,
            account_mode: finalData.primary_mode,
            profile_completed: true,
            onboarding_completed_at: finalData.created_at,
            metadata: {
              guidance_style: finalData.guidance_style,
              consent_confirmed: finalData.consent_confirmed,
            },
          });
      }

      // Show completion message
      addCustodianMessage("Your profile is set up. You can review or update it anytime in Settings.");
      
      setTimeout(() => {
        setStep('complete');
        setTimeout(() => {
          onComplete();
        }, 1000);
      }, 1500);
    } catch (error) {
      console.error('[PrimeCustodianOnboardingModal] Failed to save profile:', error);
      addCustodianMessage("I encountered an error saving your profile. Please try again.");
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop - soft lock (no click to close) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
          />

          {/* Centered modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
              className="relative w-full max-w-2xl rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 shadow-2xl pointer-events-auto flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              {/* Prime Step */}
              {step === 'prime' && (
                <div className="p-8 text-center space-y-6">
                  {/* Prime Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                  </div>

                  {/* Welcome Message */}
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-white">
                      Welcome to XspensesAI
                    </h2>
                    <p className="text-slate-300 leading-relaxed">
                      I'm Prime — I oversee your entire financial system.
                    </p>
                    <p className="text-slate-400 text-sm">
                      Before we begin, Custodian will help set up your profile in just a few questions.
                    </p>
                  </div>

                  {/* Continue Button */}
                  <Button
                    onClick={handleContinue}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {/* Custodian Step */}
              {step === 'custodian' && (
                <div className="flex flex-col h-full max-h-[80vh]">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-800/80 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Custodian</h3>
                        <p className="text-xs text-slate-400">
                          Profile setup • Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                        </p>
                      </div>
                    </div>
                    {/* No close button - soft lock */}
                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-100'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  {currentQuestion.type === 'options' ? (
                    <div className="p-6 border-t border-slate-800/80 flex-shrink-0 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {currentQuestion.options?.map((option) => (
                          <Button
                            key={option.value}
                            onClick={() => handleAnswer(option.value)}
                            variant="secondary"
                            className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : currentQuestion.type === 'consent' ? (
                    <div className="p-6 border-t border-slate-800/80 flex-shrink-0">
                      <Button
                        onClick={() => handleAnswer('Yes')}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                      >
                        {saving ? 'Saving...' : 'Yes'}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 border-t border-slate-800/80 flex-shrink-0">
                      <div className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && userInput.trim()) {
                              handleAnswer();
                            }
                          }}
                          placeholder="Type your answer..."
                          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          onClick={() => handleAnswer()}
                          disabled={!userInput.trim() || saving}
                          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Complete Step */}
              {step === 'complete' && (
                <div className="p-8 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold text-white">
                      All Set!
                    </h2>
                    <p className="text-slate-300">
                      Your profile is complete. Prime is ready to help.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}





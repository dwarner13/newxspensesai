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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ONBOARDING_MODE } from '../../config/onboardingConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useProfileContext } from '../../contexts/ProfileContext';
import { 
  getGuestProfile, 
  saveGuestProfile, 
  setGuestProfileCompleted,
  getUserIdentity 
} from '../../lib/userIdentity';
import { getSupabase } from '../../lib/supabase';
import { isDemoMode } from '../../lib/demoAuth';
import { getEmployeeDisplayConfig } from '../../config/employeeDisplayConfig';
import { GuidedOnboardingShell } from './GuidedOnboardingShell';
import { PrimeNarrationPanel } from './PrimeNarrationPanel';
import { CustodianSetupCard } from './CustodianSetupCard';
import { WelcomeScene } from './WelcomeScene';
import { FinalArrivalScene } from './FinalArrivalScene';
import { FinishLaterConfirmDialog } from './FinishLaterConfirmDialog';
import { CustodianChatPanel } from './CustodianChatPanel';
import { CustodianOnboardingPanel } from './CustodianOnboardingPanel';
import { CustodianGlassPlaceholder } from './CustodianGlassPlaceholder';
import { CustodianWarmupPanel } from './CustodianWarmupPanel';
import { PrimeSceneSequencer } from './PrimeSceneSequencer';

// Memoized PrimeSceneSequencer wrapper to prevent remounts
const MemoizedPrimeSceneSequencer = React.memo(PrimeSceneSequencer, (prev, next) => {
  // Only re-render if scenes array or visual props change (not if callbacks change)
  return (
    prev.scenes === next.scenes &&
    prev.isDimmed === next.isDimmed &&
    prev.startDelayMs === next.startDelayMs
    // Callbacks (onSceneEnter, onSceneComplete, onAllScenesComplete) are ignored for comparison
  );
});
import { 
  saveOnboardingAnswer, 
  saveOnboardingProgress,
  commitOnboardingPreferencesToSettings,
  loadOnboardingState 
} from '../../lib/onboardingHelpers';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface OnboardingData {
  display_name: string;
  account_type: 'personal' | 'business' | 'both' | 'exploring';
  primary_goal: string;
  proactivity_level: 'insights' | 'alerts' | 'proactive';
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
    narration: "Let's start with something simple.",
  },
  {
    id: 'scope',
    question: "Is this for personal, business, or both?",
    key: 'account_type',
    type: 'options' as const,
    narration: "Understanding your scope helps me tailor everything.",
    options: [
      { value: 'personal', label: 'Personal finances' },
      { value: 'business', label: 'Business finances' },
      { value: 'both', label: 'Both' },
    ],
  },
  {
    id: 'primary_goal',
    question: "What's your #1 goal right now?",
    key: 'primary_goal',
    type: 'options' as const,
    narration: "Every journey needs a destination.",
    options: [
      { value: 'track_expenses', label: 'Track expenses' },
      { value: 'save_money', label: 'Save money' },
      { value: 'tax_preparation', label: 'Tax preparation' },
      { value: 'budget_planning', label: 'Budget planning' },
      { value: 'debt_payoff', label: 'Pay off debt' },
      { value: 'financial_insights', label: 'Financial insights' },
    ],
  },
  {
    id: 'proactivity',
    question: "How proactive should XspensesAI be?",
    key: 'proactivity_level',
    type: 'options' as const,
    narration: "Last question—how hands-on should I be?",
    options: [
      { value: 'insights', label: 'Show insights only' },
      { value: 'alerts', label: 'Send alerts when needed' },
      { value: 'proactive', label: 'Be proactive and suggest actions' },
    ],
  },
];

export function PrimeCustodianOnboardingModal({ 
  isOpen, 
  onComplete 
}: PrimeCustodianOnboardingModalProps) {
  // Hard-block: Prevent mounting if legacy onboarding is disabled
  if (!ONBOARDING_MODE.legacyEnabled) {
    return null;
  }

  // Canonical onboarding mount log (only log once per open)
  const hasLoggedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !hasLoggedRef.current) {
      console.info('[ONBOARDING_WOW] mounted', { ts: new Date().toISOString() });
      hasLoggedRef.current = true;
    } else if (!isOpen) {
      hasLoggedRef.current = false;
    }
  }, [isOpen]);

  const { userId, isDemoUser, refreshProfile: refreshAuthProfile } = useAuth();
  const { profile, refreshProfile, userIdentity } = useProfileContext();
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();
  
  // Scene-based state machine (wraps existing logic)
  const [onboardingScene, setOnboardingScene] = useState<'prime_intro' | 'custodian_name' | 'custodian_level' | 'custodian_goal' | 'handoff_complete'>('prime_intro');
  
  // Single orchestrator state machine
  // primeMessageIndex: 0 = first Prime message, 1 = second, 2 = third, null = all Prime messages done
  const [primeMessageIndex, setPrimeMessageIndex] = useState<number | null>(0);
  
  // Right panel mode: "preparing" = warmup placeholder, "chat" = interactive Custodian questions
  const [rightPanelMode, setRightPanelMode] = useState<'preparing' | 'chat'>('preparing');
  
  // Legacy state (kept for compatibility with existing components)
  const [step, setStep] = useState<'headline' | 'prime-explaining' | 'custodian' | 'final'>('prime-explaining');
  const [custodianPhase, setCustodianPhase] = useState<'guided' | 'legacy'>('guided');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [saving, setSaving] = useState(false);
  const [currentNarrationText, setCurrentNarrationText] = useState<string>('');
  const [showNarration, setShowNarration] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cardAnswers, setCardAnswers] = useState<Record<string, string>>({});
  const [waitingForNarration, setWaitingForNarration] = useState(false);
  const [primeExplanationsDone, setPrimeExplanationsDone] = useState(false);
  
  // Right panel visibility: slides in immediately when Prime message #1 starts typing
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  
  // Control when Custodian can start showing questions (after Prime scene 0 completes + pause)
  const [custodianCanStart, setCustodianCanStart] = useState(false);
  
  // StrictMode-safe sequence token
  const sequenceTokenRef = useRef(0);
  
  // Stable refs for PrimeSceneSequencer callbacks (prevents remounts)
  const primeSceneCompleteRef = useRef<(sceneIndex: number) => void>(() => {});
  const primeSceneEnterRef = useRef<(sceneIndex: number) => void>(() => {});
  const allScenesCompleteRef = useRef<() => void>(() => {});
  
  // Prime messages array - ALL messages use cinematic style (no separate headline)
  const PRIME_MESSAGES = [
    "I'll help you see what's happening with your money.",
    "We'll start by personalizing your dashboard and AI team.",
    "Custodian is here—three quick questions, then we begin.",
  ];
  
  // Handle Prime scene enter (called when scene starts typing)
  // Declared BEFORE useEffect hooks that reference it (hoisting fix)
  const handleSceneEnter = useCallback((sceneIndex: number) => {
    const token = ++sequenceTokenRef.current;
    
    // When Prime message #1 (index 0) starts typing, show right panel immediately
    if (sceneIndex === 0 && !rightPanelVisible) {
      setRightPanelVisible(true);
    }
  }, [rightPanelVisible]);
  
  // Handle Prime scene completion (called AFTER hold + fade completes)
  // Declared BEFORE useEffect hooks that reference it (hoisting fix)
  const handlePrimeSceneComplete = useCallback((sceneIndex: number) => {
    const token = ++sequenceTokenRef.current;
    
    // After Prime message #1 (index 0) completes + hold (1400ms) + fade (550ms), 
    // switch Custodian to chat mode and allow it to start showing questions
    if (sceneIndex === 0 && rightPanelMode === 'preparing') {
      setRightPanelMode('chat');
      setCustodianCanStart(true); // Allow Custodian to start showing first question
      setOnboardingScene('custodian_name');
      setPrimeExplanationsDone(true);
    }
    
    // Advance to next Prime message (if any)
    if (sceneIndex < PRIME_MESSAGES.length - 1) {
      const nextIndex = sceneIndex + 1;
      setPrimeMessageIndex(nextIndex);
    } else {
      // All Prime messages complete
      setPrimeMessageIndex(null);
    }
  }, [rightPanelMode, PRIME_MESSAGES.length]);
  
  // Handle all Prime scenes complete
  // Declared BEFORE useEffect hooks that reference it (hoisting fix)
  const handleAllPrimeScenesComplete = useCallback(() => {
    setPrimeMessageIndex(null);
  }, []);
  
  // Initialize callback refs (stable references - update when dependencies change)
  useEffect(() => {
    primeSceneCompleteRef.current = handlePrimeSceneComplete;
  }, [handlePrimeSceneComplete]);
  
  useEffect(() => {
    primeSceneEnterRef.current = handleSceneEnter;
  }, [handleSceneEnter]);
  
  useEffect(() => {
    allScenesCompleteRef.current = handleAllPrimeScenesComplete;
  }, [handleAllPrimeScenesComplete]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Debug: Log step changes (must be after all state declarations)
  // Only log once per step change to reduce noise
  const previousStepRef = useRef<string>('');
  useEffect(() => {
    if (import.meta.env.DEV && step !== previousStepRef.current) {
      console.log('[ONBOARDING] Step changed:', step, {
        currentQuestionIndex,
        showNarration,
        waitingForNarration,
        isTransitioning,
      });
      previousStepRef.current = step;
    }
  }, [step, currentQuestionIndex, showNarration, waitingForNarration, isTransitioning]);
  
  // Pre-fill answers from ProfileContext on mount
  useEffect(() => {
    if (isOpen && profile) {
      // Read from profiles.metadata.settings
      const metadata = profile.metadata && typeof profile.metadata === 'object'
        ? profile.metadata as Record<string, any>
        : null;
      const settings = metadata?.settings && typeof metadata.settings === 'object'
        ? metadata.settings as Record<string, any>
        : null;
      
      const prefillData: Partial<OnboardingData> = {};
      
      // Pre-fill display_name
      if (profile.display_name || profile.first_name || profile.full_name) {
        prefillData.display_name = profile.display_name || profile.first_name || profile.full_name || '';
      }
      
      // Pre-fill account_type
      if (profile.account_type) {
        prefillData.account_type = profile.account_type as OnboardingData['account_type'];
      }
      
      // Pre-fill primary_goal from metadata.settings
      if (settings?.primary_goal) {
        prefillData.primary_goal = settings.primary_goal;
      }
      
      // Pre-fill proactivity_level from metadata.settings
      if (settings?.proactivity_level) {
        prefillData.proactivity_level = settings.proactivity_level as OnboardingData['proactivity_level'];
      }
      
      if (Object.keys(prefillData).length > 0) {
        setOnboardingData(prefillData);
        // Also set card answers for UI
        Object.entries(prefillData).forEach(([key, value]) => {
          if (value) {
            setCardAnswers(prev => ({ ...prev, [key]: String(value) }));
          }
        });
      }
    }
  }, [isOpen, profile, userId, isDemoUser]);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  // Show Prime narration before first question
  useEffect(() => {
    if (step === 'custodian' && currentQuestionIndex === 0 && !showNarration && !waitingForNarration) {
      const firstQuestion = QUESTIONS[0];
      setCurrentNarrationText(firstQuestion.narration || "Let's get started.");
      setShowNarration(true);
      setWaitingForNarration(true);
    }
  }, [step, currentQuestionIndex, showNarration, waitingForNarration]);

  const addCustodianMessage = (content: string) => {
    const message: Message = {
      id: `custodian-${Date.now()}`,
      role: 'custodian',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
    
    // Show in narration panel (only when explicitly triggered)
    setCurrentNarrationText(content);
    setShowNarration(true);
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


  // Handle Custodian name completion (from useCustodianOnboarding hook)
  const handleCustodianNameDone = () => {
    setOnboardingScene('custodian_level');
  };

  // Handle Custodian level completion
  const handleCustodianLevelDone = () => {
    setOnboardingScene('custodian_goal');
  };

  // Handle Custodian goal completion
  const handleCustodianGoalDone = () => {
    setOnboardingScene('handoff_complete');
    // Complete onboarding
    handleComplete();
  };

  const handleBeginSetup = () => {
    if (import.meta.env.DEV) {
      console.log('[ONBOARDING] handleBeginSetup called - moving to custodian step');
    }
    setStep('custodian');
  };

  const handleEnterDashboard = () => {
    // Restore bottom navigation on mobile
    if (isMobile) {
      const bottomNav = document.querySelector('[data-mobile-bottom-nav]');
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = '';
      }
    }
    // Navigate to dashboard and open Prime chat (handled by handleComplete)
    // This is a fallback - handleComplete should have already been called
    navigate('/dashboard', { replace: true });
    setTimeout(() => {
      openChat({ 
        initialEmployeeSlug: 'prime-boss',
        context: { source: 'onboarding-complete' },
      });
    }, 800);
  };

  const [showFinishLaterConfirm, setShowFinishLaterConfirm] = useState(false);

  const handleFinishLater = async () => {
    // Show confirm dialog first
    setShowFinishLaterConfirm(true);
  };

  const confirmFinishLater = async () => {
    setShowFinishLaterConfirm(false);
    
    // Persist current progress before exit
    if (onboardingData.display_name || Object.keys(onboardingData).length > 0) {
      try {
        if (isDemoUser) {
          const existingProfile = getGuestProfile() || {};
          saveGuestProfile({
            ...existingProfile,
            displayName: onboardingData.display_name || existingProfile.displayName,
            preferences: {
              ...existingProfile.preferences,
              accountType: onboardingData.account_type || existingProfile.preferences?.accountType,
              primaryGoal: onboardingData.primary_goal || existingProfile.preferences?.primaryGoal,
              proactivityLevel: onboardingData.proactivity_level || existingProfile.preferences?.proactivityLevel,
            },
          });
        } else {
          const supabase = getSupabase();
          if (supabase && userId) {
            const { updateProfileMetadata } = await import('../../lib/profileMetadataHelpers');
            const existingMetadata = profile?.metadata && typeof profile.metadata === 'object' 
              ? profile.metadata as Record<string, any> 
              : null;
            
            await updateProfileMetadata(userId, {
              onboarding_progress: {
                step,
                currentQuestionIndex,
                onboardingData,
              },
            }, existingMetadata);
          }
        }
      } catch (error) {
        console.error('[PrimeCustodianOnboardingModal] Failed to save progress:', error);
      }
    }
    onComplete();
  };

  // Persist answer immediately after submission
  const persistAnswer = async (key: string, value: string) => {
    if (!userId || isDemoUser) return;
    
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // Update settings for primary_goal and proactivity_level (metadata.settings)
      if (key === 'primary_goal' || key === 'proactivity_level') {
        const { updateProfileMetadata } = await import('../../lib/profileMetadataHelpers');
        const existingMetadata = profile?.metadata && typeof profile.metadata === 'object'
          ? profile.metadata as Record<string, any>
          : {};
        const existingSettings = existingMetadata?.settings && typeof existingMetadata.settings === 'object'
          ? existingMetadata.settings as Record<string, any>
          : {};
        
        await updateProfileMetadata(userId, {
          settings: {
            ...existingSettings,
            [key]: value,
          },
        }, existingMetadata);
      } else if (key === 'display_name' || key === 'account_type') {
        // Update top-level profile fields
        await supabase
          .from('profiles')
          .update({
            [key]: value,
          })
          .eq('id', userId);
      }
      
      // Refresh profile after save
      await refreshProfile();
    } catch (error) {
      console.error('[PrimeCustodianOnboardingModal] Failed to persist answer:', error);
    }
  };

  const handleCardAnswer = async (answerValue: string) => {
    if (!answerValue) {
      return;
    }

    // Save answer to cardAnswers state
    setCardAnswers(prev => ({ ...prev, [currentQuestion.key]: answerValue }));

    // Save answer to onboardingData
    const updatedData = {
      ...onboardingData,
      [currentQuestion.key]: answerValue,
    };
    setOnboardingData(updatedData);

    // Persist immediately (non-blocking)
    persistAnswer(currentQuestion.key, answerValue);

    // PREMIUM TRANSITION FLOW:
    // 1. Fade out card (500ms)
    // 2. Show Prime narration (typewriter effect)
    // 3. After narration completes + 400-600ms pause, fade in next card
    setIsTransitioning(true);
    
    // Step 1: Fade out card with smooth animation
    setTimeout(() => {
      // Step 2: Show Prime narration before next question
      const nextQuestionIndex = currentQuestionIndex + 1;
      if (nextQuestionIndex < QUESTIONS.length) {
        const nextQuestion = QUESTIONS[nextQuestionIndex];
        setCurrentNarrationText(nextQuestion.narration || `Got it! Moving to the next question...`);
      } else {
        setCurrentNarrationText('Perfect! Completing your setup...');
      }
      setShowNarration(true);
      setWaitingForNarration(true);
      
      // Step 3: After narration completes (via onComplete callback), move to next question
      // The PrimeNarrationPanel will call onComplete after typing + 400-600ms pause
    }, 500); // Premium fade out duration (smooth, not rushed)
  };

  // Handle narration completion - move to next question with premium pacing
  const handleNarrationComplete = () => {
    if (import.meta.env.DEV) {
      console.log('[ONBOARDING] handleNarrationComplete called', {
        currentQuestionIndex,
        totalQuestions: QUESTIONS.length,
        waitingForNarration,
        showNarration,
      });
    }
    
    // Prime narration has finished typing + pause, now transition to next question
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      // Hide narration and show next card with smooth transition
      setShowNarration(false);
      setWaitingForNarration(false);
      
      // Small delay before showing next card (allows smooth transition)
      setTimeout(() => {
        if (import.meta.env.DEV) {
          console.log('[ONBOARDING] Moving to next question', {
            nextIndex: currentQuestionIndex + 1,
          });
        }
        setCurrentQuestionIndex(prev => prev + 1);
        setIsTransitioning(false);
      }, 300); // Brief pause for smooth transition
    } else {
      // All questions complete - move to final scene
      if (import.meta.env.DEV) {
        console.log('[ONBOARDING] All questions complete, moving to final scene');
      }
      setShowNarration(false);
      setWaitingForNarration(false);
      setTimeout(() => {
        handleComplete();
      }, 400);
    }
  };

  // Legacy handleAnswer for chat flow (kept for compatibility)
  const handleAnswer = (answer?: string) => {
    const answerValue = answer || userInput.trim();
    handleCardAnswer(answerValue);
  };

  const handleComplete = async () => {
    setSaving(true);
    
    try {
      const finalData: OnboardingData = {
        display_name: onboardingData.display_name || profile?.display_name || '',
        account_type: (onboardingData.account_type || 'exploring') as OnboardingData['account_type'],
        primary_goal: onboardingData.primary_goal || 'track_expenses',
        proactivity_level: (onboardingData.proactivity_level || 'alerts') as OnboardingData['proactivity_level'],
      };

      if (isDemoUser) {
        // Save to localStorage for guest
        const existingProfile = getGuestProfile() || {};
        saveGuestProfile({
          ...existingProfile,
          displayName: finalData.display_name,
          preferences: {
            ...existingProfile.preferences,
            accountType: finalData.account_type,
            primaryGoal: finalData.primary_goal,
            proactivityLevel: finalData.proactivity_level,
          },
        });
        setGuestProfileCompleted(true);
      } else {
        // Save to Supabase for authenticated user
        const supabase = getSupabase();
        if (!supabase || !userId) {
          throw new Error('Supabase not available');
        }

        // Get existing metadata
        const existingMetadata = profile?.metadata && typeof profile.metadata === 'object' 
          ? profile.metadata as Record<string, any> 
          : {};

        // Mark onboarding as completed with version and timestamp
        await saveOnboardingProgress(userId, {
          completed: true,
          completedAt: new Date().toISOString(),
          currentStep: 'done',
        }, existingMetadata);

        // Commit preferences to profiles.settings
        await commitOnboardingPreferencesToSettings(userId, {
          preferredName: finalData.display_name,
          primaryGoal: finalData.primary_goal,
        });

        // Update profile fields (non-metadata)
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            display_name: finalData.display_name,
            account_type: finalData.account_type,
          }, {
            onConflict: 'id'
          });

        if (updateError) {
          throw updateError;
        }

        // Refresh profile to ensure metadata.onboarding.completed is reflected
        await refreshProfile();
        await refreshAuthProfile();
        
        // Update window state to unblock Prime chat
        if (typeof window !== 'undefined') {
          (window as any).__onboardingState = { isOpen: false };
          if (profile) {
            (window as any).__profileData = {
              ...profile,
              metadata: {
                ...existingMetadata,
                onboarding: {
                  ...existingMetadata.onboarding,
                  completed: true,
                  completedAt: new Date().toISOString(),
                },
              },
            };
          }
        }
      }

      // Fade out onboarding overlay (cinematic dissolve)
      setPrimeMessageIndex(null);
      setRightPanelMode('chat');
      setStep('final');
      setSaving(false);
      
      // Wait for fade animation, then navigate to dashboard
      setTimeout(() => {
        // Close onboarding modal
        onComplete();
        
        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
        
        // Auto-open Prime chat with welcome message after dashboard loads
        setTimeout(() => {
          openChat({ 
            initialEmployeeSlug: 'prime-boss',
            context: {
              source: 'onboarding-complete',
            },
          });
          
          // Inject welcome message after chat opens
          setTimeout(() => {
            // The welcome message will be handled by Prime's auto-greet system
            // which checks for onboarding completion
          }, 1000);
        }, 800);
      }, 600);
    } catch (error) {
      console.error('[PrimeCustodianOnboardingModal] Failed to save profile:', error);
      setSaving(false);
      alert('Failed to save your profile. Please try again.');
    }
  };

  // Log split layout rendering (only once per step to reduce noise)
  const previousLayoutStepRef = useRef<string>('');
  useEffect(() => {
    if (import.meta.env.DEV && isOpen && !isMobile && step !== previousLayoutStepRef.current) {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      console.info('[ONBOARDING_UI] split-layout enabled', {
        step,
        isMobile,
        width,
      });
      previousLayoutStepRef.current = step;
    }
  }, [isOpen, step, isMobile]);

  const cancelFinishLater = () => {
    setShowFinishLaterConfirm(false);
  };

  return (
    <>
      {/* Finish Later Confirm Dialog */}
      <FinishLaterConfirmDialog
        isOpen={showFinishLaterConfirm}
        onConfirm={confirmFinishLater}
        onCancel={cancelFinishLater}
      />

      <GuidedOnboardingShell
        isOpen={isOpen}
        onExit={handleFinishLater}
        exitButtonText="Finish setup later"
      >
        {/* Finish Later Button - Top Right (fixed, does not affect layout) */}
        <button
          onClick={handleFinishLater}
          className="fixed top-4 right-4 z-[10003] px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors font-medium"
          style={{ 
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : '1rem',
            paddingRight: isMobile ? 'env(safe-area-inset-right)' : '1rem',
          }}
        >
          Finish later
        </button>

        {/* Split Screen Container - Desktop: 50/50 grid, Mobile: Stacked */}
        {/* NO SCROLL - fixed height, overflow hidden */}
        <div className={`w-full h-full overflow-hidden ${isMobile ? 'flex flex-col' : 'grid grid-cols-1 lg:grid-cols-2'} gap-0 max-w-[1400px] mx-auto relative`}
          style={{ 
            paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0',
            paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : '0',
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
          }}
        >
          {/* Subtle vertical divider - Desktop only */}
          {!isMobile && (
            <div 
              className="absolute left-1/2 top-0 bottom-0 w-px transform -translate-x-1/2 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, rgba(139, 92, 246, 0.2) 20%, rgba(139, 92, 246, 0.3) 50%, rgba(139, 92, 246, 0.2) 80%, transparent 100%)',
              }}
            />
          )}
          {/* LEFT PANEL: Prime Content (headline OR scenes, never both) */}
          {/* NO SCROLL - fixed height, overflow hidden, vertically centered */}
          <div className={`${isMobile ? 'w-full' : ''} h-full min-h-0 overflow-hidden flex items-center justify-center px-6 md:px-8 lg:px-12 onboarding-apple-shine`}>
            <style>{`
              .onboarding-apple-shine {
                position: relative;
              }
              .onboarding-apple-shine::before {
                content: '';
                position: absolute;
                inset: 0;
                background: 
                  radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.03), transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.02), transparent 50%);
                pointer-events: none;
                z-index: 0;
              }
              .onboarding-apple-shine::after {
                content: '';
                position: absolute;
                inset: 0;
                background: 
                  repeating-linear-gradient(
                    0deg,
                    rgba(255, 255, 255, 0.01) 0px,
                    transparent 1px,
                    transparent 2px,
                    rgba(255, 255, 255, 0.01) 3px
                  );
                opacity: 0.4;
                pointer-events: none;
                z-index: 0;
                mix-blend-mode: soft-light;
              }
            `}</style>
            <AnimatePresence mode="wait">
              {primeMessageIndex !== null && step !== 'final' && (
                <motion.div
                  key="prime-scenes-stable"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full"
                >
                  <MemoizedPrimeSceneSequencer
                    scenes={PRIME_MESSAGES}
                    onSceneEnter={(idx) => primeSceneEnterRef.current?.(idx)}
                    onSceneComplete={(idx) => primeSceneCompleteRef.current?.(idx)}
                    onAllScenesComplete={() => allScenesCompleteRef.current?.()}
                    isDimmed={rightPanelMode === 'chat'}
                    startDelayMs={0}
                  />
                </motion.div>
              )}
              {step === 'final' && (
                <motion.div
                  key="final-prime"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="h-full flex flex-col justify-center p-6 w-full"
                >
                  <div className="bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-xl text-center max-w-md mx-auto">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/40 ring-2 ring-purple-500/30">
                      <span className="text-4xl">👑</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Welcome to XspensesAI</h3>
                    <p className="text-slate-300">You're all set!</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT PANEL: Custodian Chat */}
          {/* NO SCROLL - fixed height, overflow hidden, only chat messages scroll */}
          {/* RIGHT PANEL: Glass Placeholder or Custodian Chat */}
          <div className={`${isMobile ? 'w-full flex-1' : 'flex flex-col'} h-full min-h-0 overflow-hidden px-6 md:px-8 lg:px-12 relative`}>
            {/* Right panel container - slides in ONCE when rightPanelVisible becomes true */}
            <AnimatePresence>
              {rightPanelVisible && (
                <motion.div
                  key="right-panel-container"
                  initial={{ opacity: 0, x: isMobile ? 0 : 24, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 0.65,
                    ease: [0.2, 0, 0, 1],
                  }}
                  className="h-full w-full flex flex-col"
                  style={{
                    willChange: 'transform, opacity, filter',
                  }}
                >
                  {/* Content crossfade: Preparing → Chat → Final */}
                  <AnimatePresence mode="wait">
                    {rightPanelMode === 'preparing' && step !== 'final' && (
                      <motion.div
                        key="custodian-preparing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-full w-full"
                      >
                        <CustodianWarmupPanel isMobile={isMobile} />
                      </motion.div>
                    )}
                    {rightPanelMode === 'chat' && step !== 'final' && (
                      <motion.div
                        key="custodian-chat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="h-full flex flex-col"
                      >
                        <div className="flex-1 flex items-center justify-center p-4 min-h-0 w-full">
                          {custodianPhase === 'guided' ? (
                            <CustodianOnboardingPanel
                              mode="questions"
                              onComplete={handleComplete}
                              isMobile={isMobile}
                              canStart={custodianCanStart}
                            />
                          ) : currentQuestion ? (
                            <CustodianChatPanel
                              question={currentQuestion}
                              currentStep={currentQuestionIndex + 1}
                              totalSteps={QUESTIONS.length}
                              value={cardAnswers[currentQuestion.key] || ''}
                              onChange={(value) => {
                                setCardAnswers(prev => ({ ...prev, [currentQuestion.key]: value }));
                                if (currentQuestion.type === 'options') {
                                  // Auto-submit handled in CustodianChatPanel
                                }
                              }}
                              onSubmit={() => {
                                const answerValue = cardAnswers[currentQuestion.key] || '';
                                if (answerValue) {
                                  handleCardAnswer(answerValue);
                                }
                              }}
                              isMobile={isMobile}
                              showTyping={waitingForNarration}
                            />
                          ) : (
                            <div className="text-white/60 text-center p-8">
                              <p>Loading question...</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                    {step === 'final' && (
                      <motion.div
                        key="final-custodian"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="h-full flex flex-col"
                      >
                        <FinalArrivalScene
                          onEnterDashboard={handleEnterDashboard}
                          isMobile={isMobile}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </GuidedOnboardingShell>
    </>
  );
}





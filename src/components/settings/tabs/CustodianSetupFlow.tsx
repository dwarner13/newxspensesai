/**
 * Custodian-Guided Profile Setup Flow
 * 
 * A simple stepper form with Custodian messaging.
 * Never invents facts - only stores what user explicitly provides.
 */

import React, { useState } from 'react';
import { User, ArrowRight, Sparkles, CheckCircle, SkipForward } from 'lucide-react';
import { Button } from '../../ui/button';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/utils';

interface SetupData {
  displayName?: string;
  goal?: string;
  currency?: string;
  businessName?: string;
  timezone?: string;
}

interface CustodianSetupFlowProps {
  initialData?: Partial<SetupData> | null;
  onComplete: (data: SetupData) => void;
  onSkip: () => void;
}

const GOALS = [
  { id: 'personal', label: 'Personal finance tracking' },
  { id: 'business', label: 'Small business expenses' },
  { id: 'both', label: 'Both personal and business' },
];

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD'];

export function CustodianSetupFlow({ initialData, onComplete, onSkip }: CustodianSetupFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>({
    displayName: initialData?.displayName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    goal: initialData?.goal || '',
    currency: initialData?.currency || 'CAD',
    businessName: initialData?.businessName || '',
    timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const steps = [
    {
      id: 'name',
      question: "What should I call you?",
      tip: "This is how Custodian and other AI employees will address you.",
      render: () => (
        <div className="space-y-4">
          <input
            type="text"
            value={data.displayName || ''}
            onChange={(e) => setData({ ...data, displayName: e.target.value })}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      ),
    },
    {
      id: 'goal',
      question: "What are you using XspensesAI for?",
      tip: "This helps Custodian personalize your experience.",
      render: () => (
        <div className="space-y-3">
          {GOALS.map((goal) => (
            <button
              key={goal.id}
              onClick={() => setData({ ...data, goal: goal.id })}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-colors",
                data.goal === goal.id
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600"
              )}
            >
              {goal.label}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'currency',
      question: "What's your primary currency?",
      tip: "You can change this later in settings.",
      render: () => (
        <div className="space-y-3">
          <select
            value={data.currency || 'CAD'}
            onChange={(e) => setData({ ...data, currency: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    {
      id: 'business',
      question: "Business name (optional)",
      tip: "Skip this if you're only tracking personal expenses.",
      render: () => (
        <div className="space-y-4">
          <input
            type="text"
            value={data.businessName || ''}
            onChange={(e) => setData({ ...data, businessName: e.target.value })}
            placeholder="Your business name"
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canContinue = step === 0 ? !!data.displayName : true;

  const handleContinue = () => {
    if (isLastStep) {
      // Final step - save profile
      onComplete(data);
    } else {
      setStep(step + 1);
    }
  };

  const handleSkip = () => {
    if (isLastStep) {
      onSkip();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Custodian Welcome Card */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">Custodian Setup</h3>
            <p className="text-sm text-slate-300 mb-3">
              I'll help you set up your profile. I only store what you explicitly tell me.
            </p>
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <CheckCircle className="w-4 h-4" />
              <span>You can change this anytime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "flex-1 h-1 rounded-full transition-colors",
              idx <= step ? "bg-blue-500" : "bg-slate-800"
            )}
          />
        ))}
      </div>

      {/* Current Step */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-white mb-2">
            {currentStep.question}
          </h4>
          <p className="text-sm text-slate-400 mb-4">{currentStep.tip}</p>
        </div>

        {currentStep.render()}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            {isLastStep ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Profile
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <Button
            onClick={handleSkip}
            variant="secondary"
            className="px-4 border border-slate-700 hover:bg-slate-800"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Profile Preview */}
      {step > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-3">Profile Preview</h5>
          <div className="space-y-2 text-sm">
            {data.displayName && (
              <div className="flex justify-between">
                <span className="text-slate-400">Name:</span>
                <span className="text-white">{data.displayName}</span>
              </div>
            )}
            {data.goal && (
              <div className="flex justify-between">
                <span className="text-slate-400">Goal:</span>
                <span className="text-white capitalize">{data.goal}</span>
              </div>
            )}
            {data.currency && (
              <div className="flex justify-between">
                <span className="text-slate-400">Currency:</span>
                <span className="text-white">{data.currency}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


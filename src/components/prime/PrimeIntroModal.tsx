import React, { useState } from "react";
import { X, Crown, Zap, Users } from "lucide-react";

export function PrimeIntroModal({ open, onComplete }: { open: boolean; onComplete: () => void }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const steps = [
    { 
      title: "👑 Meet Prime", 
      sub: "Your AI CEO", 
      body: "I orchestrate your AI team for elite financial clarity.", 
      icon: <Crown className="w-14 h-14 text-amber-500" /> 
    },
    { 
      title: "🤝 Your AI Team", 
      sub: "30+ Specialists", 
      body: "Byte (imports), Tag (categorization), Crystal (analytics) and more.", 
      icon: <Users className="w-14 h-14 text-blue-500" /> 
    },
    { 
      title: "⚡ Quick Start", 
      sub: "Ask Anything", 
      body: "Click my crown in the top-right anytime to get help instantly.", 
      icon: <Zap className="w-14 h-14 text-yellow-500" /> 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white shadow-2xl">
        {/* Close Button */}
        <button 
          onClick={onComplete} 
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close intro modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="mb-8 space-y-3 text-center">
          <div className="mx-auto flex items-center justify-center">
            {steps[step].icon}
          </div>
          <h2 className="text-3xl font-bold">{steps[step].title}</h2>
          <p className="text-sm text-gray-400">{steps[step].sub}</p>
          <p className="text-gray-300">{steps[step].body}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-amber-500" : "bg-gray-700"
              }`} 
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex-1 rounded-lg bg-gray-700 px-4 py-2 font-medium transition-colors disabled:opacity-50 hover:bg-gray-600"
          >
            Back
          </button>
          {step < steps.length - 1 ? (
            <button 
              onClick={() => setStep((s) => s + 1)} 
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold transition-colors hover:bg-amber-700"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={onComplete} 
              className="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-semibold transition-colors hover:bg-amber-700"
            >
              Let&apos;s Go!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}





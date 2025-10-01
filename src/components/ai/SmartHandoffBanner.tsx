// Smart Handoff Banner - Displays context from Prime Boss handoff
import React, { useState } from 'react';
import { X, MessageCircle, User, Clock, DollarSign, Target } from 'lucide-react';
import { useSmartHandoff } from '../../hooks/useSmartHandoff';
import { HandoffContext } from '../../lib/smartHandoff';

interface SmartHandoffBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export default function SmartHandoffBanner({ onDismiss, className = '' }: SmartHandoffBannerProps) {
  const { handoffContext, markAsUsed, hasHandoff } = useSmartHandoff();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!hasHandoff || !handoffContext || isDismissed) {
    return null;
  }

  const handleDismiss = async () => {
    setIsDismissed(true);
    await markAsUsed();
    onDismiss?.();
  };

  const analysis = handoffContext.context_data?.question_analysis || {};
  const originalQuestion = handoffContext.original_question;

  return (
    
      <div
        className={`bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-blue-400/20 rounded-xl p-4 mb-6 backdrop-blur-sm ${className}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Context from Prime Boss</span>
            </div>
            
            <div className="text-white/90 text-sm mb-3">
              <strong>Your question:</strong> "{originalQuestion}"
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {analysis.amount_mentioned && (
                <div className="flex items-center gap-2 text-green-400">
                  <DollarSign className="w-4 h-4" />
                  <span>Amount: ${analysis.amount_mentioned.toLocaleString()}</span>
                </div>
              )}
              
              {analysis.timeframe_mentioned && (
                <div className="flex items-center gap-2 text-orange-400">
                  <Clock className="w-4 h-4" />
                  <span>Timeframe: {analysis.timeframe_mentioned}</span>
                </div>
              )}
              
              {analysis.intent && analysis.intent !== 'general' && (
                <div className="flex items-center gap-2 text-purple-400">
                  <Target className="w-4 h-4" />
                  <span>Focus: {analysis.intent.replace('_', ' ')}</span>
                </div>
              )}
              
              {analysis.keywords && analysis.keywords.length > 0 && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <User className="w-4 h-4" />
                  <span>Topics: {analysis.keywords.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="ml-4 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Dismiss context banner"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    
  );
}

// Smart Welcome Message - Personalized greeting with handoff context
import React, { useState, useEffect } from 'react';
import { MessageCircle, Sparkles, User, Clock } from 'lucide-react';
import { useSmartHandoff } from '../../hooks/useSmartHandoff';
import { HandoffContext } from '../../lib/smartHandoff';

interface SmartWelcomeMessageProps {
  employeeName: string;
  employeeEmoji: string;
  defaultMessage?: string;
  className?: string;
}

export default function SmartWelcomeMessage({ 
  employeeName, 
  employeeEmoji, 
  defaultMessage,
  className = '' 
}: SmartWelcomeMessageProps) {
  const { handoffContext, hasHandoff } = useSmartHandoff();
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (hasHandoff && handoffContext) {
      // Generate personalized welcome message from handoff context
      const analysis = handoffContext.context_data?.question_analysis || {};
      const originalQuestion = handoffContext.original_question;
      
      let message = `Hi! I'm ${employeeName} ${employeeEmoji}. Thank you for reaching out!`;
      
      // Add context about their question
      if (analysis.amount_mentioned) {
        message += ` I understand you want to work with $${analysis.amount_mentioned.toLocaleString()}`;
      }
      
      if (analysis.timeframe_mentioned) {
        message += ` over ${analysis.timeframe_mentioned}`;
      }
      
      if (analysis.intent === 'saving') {
        message += ` for your savings goals`;
      } else if (analysis.intent === 'investment') {
        message += ` for your investment strategy`;
      } else if (analysis.intent === 'debt_management') {
        message += ` for your debt management`;
      } else if (analysis.intent === 'budgeting') {
        message += ` for your budgeting needs`;
      } else if (analysis.intent === 'goal_setting') {
        message += ` for your financial goals`;
      }
      
      // Add confirmation
      message += `. Do I have that right?`;
      
      // Add how they can help
      if (employeeName.toLowerCase().includes('finley')) {
        message += ` I'm here to help with all your financial planning, budgeting, and investment questions.`;
      } else if (employeeName.toLowerCase().includes('goalie')) {
        message += ` I specialize in goal setting and tracking your progress toward financial milestones.`;
      } else if (employeeName.toLowerCase().includes('crystal')) {
        message += ` I can help you predict and forecast your financial future based on current trends.`;
      } else if (employeeName.toLowerCase().includes('luna')) {
        message += ` I'm here to provide emotional support and help you develop healthy money habits.`;
      } else if (employeeName.toLowerCase().includes('byte')) {
        message += ` I can help you import and organize all your financial documents and receipts.`;
      } else if (employeeName.toLowerCase().includes('ledger')) {
        message += ` I specialize in tax optimization and helping you maximize your deductions.`;
      } else if (employeeName.toLowerCase().includes('intelia')) {
        message += ` I provide business intelligence and insights to help grow your business.`;
      } else if (employeeName.toLowerCase().includes('automa')) {
        message += ` I can help you automate repetitive financial tasks and create smart workflows.`;
      }

      // Simulate typing effect
      setIsTyping(true);
      setWelcomeMessage('');
      
      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex < message.length) {
          setWelcomeMessage(message.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    } else {
      // Use default message
      setWelcomeMessage(defaultMessage || `Hi! I'm ${employeeName} ${employeeEmoji}. How can I help you today?`);
    }
  }, [hasHandoff, handoffContext, employeeName, employeeEmoji, defaultMessage]);

  return (
    <div
      className={`bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-blue-400/20 rounded-xl p-4 mb-6 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-xl">{employeeEmoji}</span>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">Welcome Message</span>
            {isTyping && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>
          
          <div className="text-white/90 text-sm leading-relaxed">
            {welcomeMessage}
            {isTyping && <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse"></span>}
          </div>
          
          {hasHandoff && handoffContext && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Sparkles className="w-3 h-3" />
                <span>Context provided by Prime Boss</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

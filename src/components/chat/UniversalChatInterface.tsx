import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Mic, Headphones, Zap, Target, TrendingUp, Heart, Banknote } from 'lucide-react';
import { UniversalAIController } from '../../services/UniversalAIController';
import { EnhancedChatInterface } from './EnhancedChatInterface';

interface ChatMessage {
  id: number;
  type: 'user' | 'ai';
  content: string;
  employee?: string;
  actions?: any[];
  timestamp: Date;
}

interface UniversalChatInterfaceProps {
  employeeId: string;
  aiController: UniversalAIController;
  userId: string;
  onClose: () => void;
}

const employeeIcons: Record<string, React.ReactNode> = {
  'Byte': <Mic className="w-5 h-5" />,
  'Serenity': <Heart className="w-5 h-5" />,
  'Finley': <Banknote className="w-5 h-5" />,
  'Goalie': <Target className="w-5 h-5" />,
  'Crystal': <TrendingUp className="w-5 h-5" />,
  'Tag': <Zap className="w-5 h-5" />,
  'Blitz': <Zap className="w-5 h-5" />,
  'Wisdom': <TrendingUp className="w-5 h-5" />,
  'Fortune': <Banknote className="w-5 h-5" />,
  'Savage Sally': <Heart className="w-5 h-5" />,
  'Harmony': <Heart className="w-5 h-5" />,
  'Automa': <Zap className="w-5 h-5" />,
  'Spark': <Zap className="w-5 h-5" />,
  'Intelia': <TrendingUp className="w-5 h-5" />,
  'Ledger': <Banknote className="w-5 h-5" />,
  'Dash': <TrendingUp className="w-5 h-5" />,
  'Nova': <Zap className="w-5 h-5" />,
  'DJ Zen': <Headphones className="w-5 h-5" />
};

export function UniversalChatInterface({ employeeId, aiController, userId, onClose }: UniversalChatInterfaceProps) {
  // Use the enhanced chat interface
  return (
    <EnhancedChatInterface
      employeeId={employeeId}
      aiController={aiController}
      userId={userId}
      onClose={onClose}
      isMobile={false}
    />
  );
}

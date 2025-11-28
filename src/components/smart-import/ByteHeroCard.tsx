/**
 * ByteHeroCard Component
 * 
 * Byte introduction card for top of middle column
 * Shows avatar, title, stats, and action buttons
 */

import React from 'react';
import { Upload, FileText, MessageSquare } from 'lucide-react';

interface ByteHeroCardProps {
  onChatClick?: () => void;
}

export function ByteHeroCard({ onChatClick }: ByteHeroCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/30 rounded-xl p-6 flex-shrink-0">
      {/* Header Area */}
      <div className="flex items-center gap-4 mb-4">
        {/* Avatar Circle */}
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 flex-shrink-0">
          <span className="text-3xl">📄</span>
        </div>
        
        {/* Text Area */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white">
            Byte — Smart Import AI
          </h2>
          <p className="text-sm text-slate-400">
            Data Processing Specialist
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-blue-400">99.7%</div>
          <div className="text-xs text-slate-500">Accuracy</div>
        </div>
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-green-400">2.3s</div>
          <div className="text-xs text-slate-500">Speed</div>
        </div>
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-purple-400">24/7</div>
          <div className="text-xs text-slate-500">Available</div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="flex items-center gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white rounded-lg text-sm font-medium transition-all duration-200">
          <Upload className="w-[18px] h-[18px]" />
          <span>Upload</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white rounded-lg text-sm font-medium transition-all duration-200">
          <FileText className="w-[18px] h-[18px]" />
          <span>View All</span>
        </button>
        <button 
          onClick={onChatClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white rounded-lg text-sm font-medium transition-all duration-200"
        >
          <MessageSquare className="w-[18px] h-[18px]" />
          <span>Chat</span>
        </button>
      </div>
    </div>
  );
}

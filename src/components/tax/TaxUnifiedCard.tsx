/**
 * TaxUnifiedCard Component
 * 
 * Unified card for Tax Assistant workspace
 * Matches ByteUnifiedCard structure exactly
 */

import React, { useState, useCallback } from 'react';
import { Search, Upload, FileText, Send, Calculator } from 'lucide-react';
import { Button } from '../ui/button';

interface TaxUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TaxUnifiedCard({ onExpandClick, onChatInputClick }: TaxUnifiedCardProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    if (onChatInputClick) {
      onChatInputClick();
    } else if (onExpandClick) {
      onExpandClick();
    }
    setInputValue('');
  }, [inputValue, onChatInputClick, onExpandClick]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col h-full">
      <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 flex-shrink-0">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight truncate">
              Tax — AI Tax Advisor
            </h2>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
              Smart tax optimization · Maximize deductions and minimize liability
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">$4,250</div>
            <div className="text-xs text-slate-500">Deductions Found</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-emerald-400">$1,180</div>
            <div className="text-xs text-slate-500">Estimated Savings</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-blue-400">12</div>
            <div className="text-xs text-slate-500">Documents Processed</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white text-xs sm:text-sm"
          >
            <Search className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Find Deductions</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white text-xs sm:text-sm"
          >
            <Upload className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Upload</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 min-w-0 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500/30 text-white text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Summary</span>
          </Button>
        </div>
      </div>

      {/* Simplified middle section */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Calculator className="w-12 h-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome to Tax Assistant</h3>
          <p className="text-slate-400 mb-4 max-w-md">
            Maximize your deductions and minimize your tax liability. I'll help you find every eligible deduction.
          </p>
        </div>
      </div>

      <div className="pt-3 pb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300/80 border-t border-slate-800/50 flex-shrink-0 -mx-6 px-6">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300 border border-emerald-500/20">
            🔒 Guardrails + PII Protection Active
          </span>
        </div>
        <div className="text-[11px] text-slate-400">
          Secure • Always Supporting
        </div>
      </div>

      <div className="flex-shrink-0 -mx-6 px-6">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-blue-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick || onExpandClick}
        >
          <input
            type="text"
            placeholder="Ask about your taxes…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none cursor-pointer"
            readOnly={!!onChatInputClick}
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}


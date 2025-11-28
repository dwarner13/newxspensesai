/**
 * SpotifyUnifiedCard Component
 * 
 * Unified card for Spotify Integration workspace
 * Matches ByteUnifiedCard structure exactly
 */

import React, { useState, useCallback } from 'react';
import { Link, Music, Compass, Send } from 'lucide-react';
import { Button } from '../../ui/button';

interface SpotifyUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function SpotifyUnifiedCard({ onExpandClick, onChatInputClick }: SpotifyUnifiedCardProps) {
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
      <div className="bg-gradient-to-br from-green-900/40 to-slate-900/10 border-b border-slate-800 pb-6 flex-shrink-0 -mx-6 -mt-6 px-6 pt-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50 flex-shrink-0">
            <span className="text-3xl">🎵</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">
              Spotify — Music Integration
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Connect your music to your financial journey
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-green-400">Connected</div>
            <div className="text-xs text-slate-500">Status</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-blue-400">5</div>
            <div className="text-xs text-slate-500">Playlists Created</div>
          </div>
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="text-2xl font-bold text-purple-400">48hrs</div>
            <div className="text-xs text-slate-500">Listening Time</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500/30 text-white text-xs sm:text-sm"
          >
            <Link className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Connect</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500/30 text-white text-xs sm:text-sm"
          >
            <Music className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Playlists</span>
          </Button>
          <Button 
            variant="secondary" 
            size="default"
            onClick={onExpandClick}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-green-500/30 text-white text-xs sm:text-sm"
          >
            <Compass className="w-4 h-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Explore</span>
          </Button>
        </div>
      </div>

      {/* Simplified middle section */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-4">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-5xl mb-4">
            🎵
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Welcome to Spotify Integration</h3>
          <p className="text-slate-400 mb-4 max-w-md">
            Connect your music to your financial journey. Create playlists that match your money mood.
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
          Secure • Always Playing
        </div>
      </div>

      <div className="flex-shrink-0 -mx-6 px-6">
        <div 
          className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2 border border-slate-700 focus-within:border-green-500 transition-all duration-200 cursor-pointer"
          onClick={onChatInputClick || onExpandClick}
        >
          <input
            type="text"
            placeholder="Ask about your music integration…"
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
            className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            disabled={!inputValue.trim()}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}


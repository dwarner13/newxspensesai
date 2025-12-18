/**
 * ProgressIndicator Component
 * 
 * Visualize transaction review progress using gamification helpers
 */

import React from 'react';
import { Trophy, Star } from 'lucide-react';
import { calculateProgress, calculateGamificationState } from '../../lib/gamification';
import type { ProgressStats } from '../../lib/gamification';

interface ProgressIndicatorProps {
  stats: ProgressStats;
}

export function ProgressIndicator({ stats }: ProgressIndicatorProps) {
  const progress = calculateProgress(stats);
  const gamification = calculateGamificationState(stats);
  const progressPercentage = Math.round(progress * 100);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Progress</h3>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">{gamification.xp} XP</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400">Level {gamification.level}</span>
          <span className="text-slate-400">{progressPercentage}% Complete</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
          <span>{stats.reviewed} reviewed</span>
          <span>{Math.round(gamification.progressToNextLevel * 100)}% to next level</span>
        </div>
      </div>

      {/* Stats breakdown */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">{stats.highConfidence}</div>
          <div className="text-[10px] text-slate-500">High Confidence</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-400">{stats.lowConfidence}</div>
          <div className="text-[10px] text-slate-500">Needs Review</div>
        </div>
      </div>
    </div>
  );
}










/**
 * Gamification Utility
 * 
 * Support XP / progress / gamified UI for cleaning up transactions
 */

export interface ProgressStats {
  total: number;
  reviewed: number;
  highConfidence: number;
  lowConfidence: number;
  duplicates: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  progressToNextLevel: number; // 0–1
}

/**
 * Calculate progress percentage (0–1)
 */
export function calculateProgress(stats: ProgressStats): number {
  if (stats.total === 0) {
    return 0;
  }

  // Progress is based on reviewed transactions
  // Bonus points for resolving low-confidence and duplicates
  const baseProgress = stats.reviewed / stats.total;
  const bonusProgress = (stats.lowConfidence + stats.duplicates) / Math.max(stats.total, 1) * 0.2;

  return Math.min(baseProgress + bonusProgress, 1.0);
}

/**
 * Calculate XP from stats
 */
function calculateXP(stats: ProgressStats): number {
  let xp = 0;

  // Base XP for reviewed transactions
  xp += stats.reviewed * 1;

  // Bonus XP for high-confidence approvals
  xp += stats.highConfidence * 2;

  // Extra bonus for resolving low-confidence items
  xp += stats.lowConfidence * 5;

  // Extra bonus for resolving duplicates
  xp += stats.duplicates * 3;

  return xp;
}

/**
 * Calculate level from XP
 */
function calculateLevel(xp: number): number {
  // Simple level curve: 100 XP per level
  return Math.floor(xp / 100) + 1;
}

/**
 * Calculate progress to next level (0–1)
 */
function calculateProgressToNextLevel(xp: number, level: number): number {
  const xpForCurrentLevel = (level - 1) * 100;
  const xpForNextLevel = level * 100;
  const xpInCurrentLevel = xp - xpForCurrentLevel;
  const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;

  return Math.min(xpInCurrentLevel / xpNeededForNextLevel, 1.0);
}

/**
 * Calculate gamification state from progress stats
 */
export function calculateGamificationState(
  stats: ProgressStats
): GamificationState {
  const xp = calculateXP(stats);
  const level = calculateLevel(xp);
  const progressToNextLevel = calculateProgressToNextLevel(xp, level);

  return {
    xp,
    level,
    progressToNextLevel,
  };
}








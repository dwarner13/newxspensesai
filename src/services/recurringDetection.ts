/**
 * Recurring Payment Detection Service
 * 
 * Detects recurring payment patterns from transactions to populate
 * recurring_obligations table for Chime AI notifications.
 */

import type { Transaction } from '../types/database.types';

export interface DetectedRecurringPattern {
  merchant_name: string;
  obligation_type: 'mortgage' | 'car_loan' | 'credit_card' | 'subscription' | 'other' | 'unknown';
  avg_amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'unknown';
  day_of_month: number | null;
  weekday: number | null;
  interval_days: number | null;
  first_seen_date: string; // ISO date string
  last_seen_date: string; // ISO date string
}

/**
 * Detect recurring payment patterns from user transactions
 * 
 * Groups transactions by merchant, finds patterns with at least 3 occurrences,
 * and detects frequency (weekly/biweekly/monthly) based on date gaps.
 */
export function detectRecurringPatternsForUser(
  transactions: Transaction[]
): DetectedRecurringPattern[] {
  // Filter to only expense transactions (outgoing payments)
  // Support both 'expense' and 'Debit' for backward compatibility
  const debitTransactions = transactions.filter(tx => 
    tx.type === 'expense' || tx.type === 'Debit'
  );
  
  if (debitTransactions.length < 3) {
    return []; // Need at least 3 transactions to detect a pattern
  }

  // Group by normalized merchant name
  const merchantGroups = groupByMerchant(debitTransactions);

  const patterns: DetectedRecurringPattern[] = [];

  for (const [merchant, group] of merchantGroups) {
    if (group.length < 3) {
      continue; // Need at least 3 occurrences
    }

    // Sort by date
    group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Analyze the pattern
    const analysis = analyzePattern(group);

    if (analysis.confidence < 0.5) {
      continue; // Not confident enough
    }

    patterns.push({
      merchant_name: merchant,
      obligation_type: 'other', // Will be refined later with Liberty/Tag
      avg_amount: analysis.avg_amount,
      frequency: analysis.frequency,
      day_of_month: analysis.day_of_month,
      weekday: analysis.weekday,
      interval_days: analysis.interval_days,
      first_seen_date: group[0].date,
      last_seen_date: group[group.length - 1].date,
    });
  }

  return patterns;
}

/**
 * Group transactions by normalized merchant name
 */
function groupByMerchant(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const normalized = normalizeMerchantName(tx.description);
    
    if (!groups.has(normalized)) {
      groups.set(normalized, []);
    }
    
    groups.get(normalized)!.push(tx);
  }

  return groups;
}

/**
 * Normalize merchant name for grouping
 * Removes extra spaces, common suffixes, converts to uppercase
 */
function normalizeMerchantName(description: string): string {
  return description
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s+(INC|LLC|LTD|CORP|CO)\.?$/i, '')
    .toUpperCase();
}

/**
 * Analyze a group of transactions to detect payment frequency and pattern
 */
function analyzePattern(transactions: Transaction[]): {
  avg_amount: number;
  frequency: 'monthly' | 'biweekly' | 'weekly' | 'unknown';
  day_of_month: number | null;
  weekday: number | null;
  interval_days: number | null;
  confidence: number;
} {
  const amounts = transactions.map(tx => Math.abs(tx.amount));
  const dates = transactions.map(tx => new Date(tx.date)).sort((a, b) => a.getTime() - b.getTime());

  // Calculate average amount
  const avg_amount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

  // Calculate amount variance (lower = more consistent = higher confidence)
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avg_amount, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const amountConsistency = 1 - Math.min(stdDev / avg_amount, 1); // 0-1, higher is better

  // Calculate date intervals (gaps between consecutive payments)
  const intervals: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const daysDiff = Math.round(
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    intervals.push(daysDiff);
  }

  if (intervals.length === 0) {
    return {
      avg_amount: Math.round(avg_amount * 100) / 100,
      frequency: 'unknown',
      day_of_month: null,
      weekday: null,
      interval_days: null,
      confidence: 0,
    };
  }

  // Find median interval (more robust than average)
  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  // Determine frequency based on median gap
  // Heuristics:
  // 5-9 days → weekly
  // 10-18 days → biweekly
  // 26-35 days → monthly
  let frequency: 'monthly' | 'biweekly' | 'weekly' | 'unknown' = 'unknown';
  let interval_days: number | null = null;
  let day_of_month: number | null = null;
  let weekday: number | null = null;

  if (medianInterval >= 5 && medianInterval <= 9) {
    frequency = 'weekly';
    interval_days = Math.round(medianInterval);
    // Find most common weekday
    weekday = findMostCommonWeekday(dates);
  } else if (medianInterval >= 10 && medianInterval <= 18) {
    frequency = 'biweekly';
    interval_days = Math.round(medianInterval);
    // Find most common weekday
    weekday = findMostCommonWeekday(dates);
  } else if (medianInterval >= 26 && medianInterval <= 35) {
    frequency = 'monthly';
    interval_days = Math.round(medianInterval);
    // Find most common day of month
    day_of_month = findMostCommonDayOfMonth(dates);
  } else {
    // Unknown pattern, but store the interval
    interval_days = Math.round(medianInterval);
  }

  // Calculate confidence score
  // Factors: number of occurrences, amount consistency, date regularity
  const occurrenceScore = Math.min(transactions.length / 6, 1); // Max at 6+ occurrences
  const intervalConsistency = calculateIntervalConsistency(intervals, medianInterval);
  const confidence = occurrenceScore * 0.4 + amountConsistency * 0.3 + intervalConsistency * 0.3;

  return {
    avg_amount: Math.round(avg_amount * 100) / 100,
    frequency,
    day_of_month,
    weekday,
    interval_days,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Find the most common weekday (0=Sunday, 6=Saturday) from dates
 */
function findMostCommonWeekday(dates: Date[]): number {
  const weekdayCounts = new Map<number, number>();
  
  for (const date of dates) {
    const day = date.getDay();
    weekdayCounts.set(day, (weekdayCounts.get(day) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon = 0;
  
  for (const [day, count] of weekdayCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = day;
    }
  }

  return mostCommon;
}

/**
 * Find the most common day of month (1-31) from dates
 */
function findMostCommonDayOfMonth(dates: Date[]): number {
  const dayCounts = new Map<number, number>();
  
  for (const date of dates) {
    const day = date.getDate();
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon = 1;
  
  for (const [day, count] of dayCounts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = day;
    }
  }

  return mostCommon;
}

/**
 * Calculate how consistent the intervals are (0-1, higher is better)
 * Lower coefficient of variation = higher consistency
 */
function calculateIntervalConsistency(intervals: number[], medianInterval: number): number {
  if (intervals.length === 0 || medianInterval === 0) {
    return 0;
  }

  const variance = intervals.reduce((sum, i) => sum + Math.pow(i - medianInterval, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (stdDev / mean)
  // Lower CV = more consistent
  const coefficientOfVariation = stdDev / medianInterval;
  
  // Convert to 0-1 score (lower CV = higher score)
  return Math.max(0, 1 - coefficientOfVariation);
}


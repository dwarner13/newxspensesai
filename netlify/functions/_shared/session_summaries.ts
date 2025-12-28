/**
 * 📝 Session Summaries Module
 * 
 * Day 5: Rolling conversation summaries with recall and threshold-based generation.
 * 
 * Functions:
 * - shouldSummarize: Check if summary should be generated
 * - estimateTokens: Token estimation (~4 chars/token)
 * - buildSummaryPrompt: Build LLM prompt for summary generation
 * - writeSummary: Save summary to database (with PII masking)
 * - getLatestSummary: Retrieve most recent summary
 */

import { admin } from './supabase';
import { maskPII } from './pii';

// ============================================================================
// TYPES
// ============================================================================

export interface ShouldSummarizeParams {
  turnCount: number;
  tokenEstimate: number;
  sinceLastSummaryMins: number;
}

export interface WriteSummaryParams {
  userId: string;
  convoId: string;
  text: string;
  model?: string;
}

export interface GetLatestSummaryParams {
  userId: string;
  convoId: string;
  maxAgeDays?: number;
}

// ============================================================================
// THRESHOLD CHECKS
// ============================================================================

/**
 * Determine if a summary should be generated based on thresholds
 * 
 * Default thresholds:
 * - turnCount >= 12 (12 conversation turns)
 * - tokenEstimate >= 4000 (~16k chars)
 * - sinceLastSummaryMins >= 30 (30 minutes since last summary)
 */
export function shouldSummarize(params: ShouldSummarizeParams): boolean {
  const { turnCount, tokenEstimate, sinceLastSummaryMins } = params;
  
  // Default thresholds
  const TURN_THRESHOLD = 12;
  const TOKEN_THRESHOLD = 4000;
  const TIME_THRESHOLD_MINS = 30;
  
  return (
    turnCount >= TURN_THRESHOLD ||
    tokenEstimate >= TOKEN_THRESHOLD ||
    sinceLastSummaryMins >= TIME_THRESHOLD_MINS
  );
}

/**
 * Estimate token count (simple approximation: ~4 chars/token)
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

/**
 * Build summary prompt for LLM
 * 
 * Includes:
 * - Key facts (extracted from conversation)
 * - Decisions made
 * - Open items/tasks
 * - Neutral tone, no PII leakage
 */
export function buildSummaryPrompt(transcriptChunk: string, recentFacts?: string[]): string {
  const factsSection = recentFacts && recentFacts.length > 0
    ? `\n\nRelevant facts:\n${recentFacts.map(f => `- ${f}`).join('\n')}`
    : '';
  
  return `Summarize this conversation transcript in concise bullet points.

Focus on:
- Key facts mentioned (dates, amounts, names, preferences)
- Decisions made or agreed upon
- Open items or tasks that need follow-up

Requirements:
- Neutral, factual tone
- No PII leakage (use placeholders if needed)
- Maximum 15 bullets
- Prioritize actionable items

Transcript:
${transcriptChunk}${factsSection}

Summary:`;
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Write summary to database (with PII masking)
 * 
 * Upserts into chat_convo_summaries table.
 * Masks PII before storing.
 */
export async function writeSummary(params: WriteSummaryParams): Promise<boolean> {
  const { userId, convoId, text, model = 'gpt-4o-mini' } = params;
  
  if (!userId || !convoId || !text || !text.trim()) {
    console.warn('[session_summaries] Invalid writeSummary params');
    return false;
  }
  
  // Mask PII before storing
  const masked = maskPII(text, 'full').masked;
  
  const sb = admin();
  
  try {
    // Upsert: if summary exists for this convo, update it; otherwise insert
    const { error } = await sb
      .from('chat_convo_summaries')
      .upsert({
        user_id: userId,
        convo_id: convoId,
        text: masked,
        model: model,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,convo_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.error('[session_summaries] Failed to write summary:', error);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('[session_summaries] Error writing summary:', error);
    return false;
  }
}

/**
 * Get latest summary for a conversation
 * 
 * Returns most recent summary within maxAgeDays (default 30 days).
 */
export async function getLatestSummary(params: GetLatestSummaryParams): Promise<{ text: string; created_at: string } | null> {
  const { userId, convoId, maxAgeDays = 30 } = params;
  
  if (!userId || !convoId) {
    return null;
  }
  
  const sb = admin();
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    
    const { data, error } = await sb
      .from('chat_convo_summaries')
      .select('text, created_at')
      .eq('user_id', userId)
      .eq('convo_id', convoId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error('[session_summaries] Failed to get latest summary:', error);
      return null;
    }
    
    if (!data || !data.text) {
      return null;
    }
    
    return {
      text: data.text,
      created_at: data.created_at
    };
  } catch (error: any) {
    console.error('[session_summaries] Error getting latest summary:', error);
    return null;
  }
}




















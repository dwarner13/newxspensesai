/**
 * XP Engine Module
 * 
 * Day 10: Award XP points for user engagement
 * 
 * Functions:
 * - awardXP: Insert XP entry into ledger (idempotent via meta hash)
 */

import { admin } from './supabase';
import crypto from 'crypto';

export interface XPAward {
  userId: string;
  action: string;
  points: number;
  meta?: Record<string, any>;
}

/**
 * Default XP awards
 */
export const XP_AWARDS = {
  'ocr.scan.success': 5,
  'ocr.categorize.auto': 2,
  'ocr.categorize.corrected': 8,
  'memory.teach.vendor_category': 6
} as const;

/**
 * Award XP points to user
 * 
 * Idempotent: Creates hash of (userId, action, meta) to prevent duplicates
 */
export async function awardXP(params: XPAward): Promise<number | null> {
  const { userId, action, points, meta = {} } = params;
  
  if (!userId || !action || points <= 0) {
    return null;
  }
  
  const sb = admin();
  
  try {
    // Create idempotency hash
    const hashInput = JSON.stringify({ userId, action, meta });
    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .slice(0, 16);
    
    // Check if this award already exists (idempotent check)
    const { data: existing } = await sb
      .from('user_xp_ledger')
      .select('id, points')
      .eq('user_id', userId)
      .eq('action', action)
      .eq('meta->>hash', hash)
      .maybeSingle();
    
    if (existing) {
      // Already awarded, return existing points
      return Number(existing.points);
    }
    
    // Insert new XP entry
    const { data: inserted, error } = await sb
      .from('user_xp_ledger')
      .insert({
        user_id: userId,
        action,
        points,
        meta: {
          ...meta,
          hash
        },
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.warn('[XP] Award failed:', error);
      return null;
    }
    
    return inserted?.id || null;
  } catch (error: any) {
    console.warn('[XP] Award failed:', error);
    return null;
  }
}

/**
 * Get total XP for user (optional helper)
 */
export async function getTotalXP(userId: string): Promise<number> {
  if (!userId) {
    return 0;
  }
  
  const sb = admin();
  
  try {
    const { data, error } = await sb
      .from('user_xp_ledger')
      .select('points')
      .eq('user_id', userId);
    
    if (error) {
      console.warn('[XP] Get total failed:', error);
      return 0;
    }
    
    return (data || []).reduce((sum, entry) => sum + Number(entry.points || 0), 0);
  } catch (error: any) {
    console.warn('[XP] Get total failed:', error);
    return 0;
  }
}

/**
 * Get XP by action type (optional helper)
 */
export async function getXPByAction(userId: string, action: string): Promise<number> {
  if (!userId || !action) {
    return 0;
  }
  
  const sb = admin();
  
  try {
    const { data, error } = await sb
      .from('user_xp_ledger')
      .select('points')
      .eq('user_id', userId)
      .eq('action', action);
    
    if (error) {
      console.warn('[XP] Get by action failed:', error);
      return 0;
    }
    
    return (data || []).reduce((sum, entry) => sum + Number(entry.points || 0), 0);
  } catch (error: any) {
    console.warn('[XP] Get by action failed:', error);
    return 0;
  }
}

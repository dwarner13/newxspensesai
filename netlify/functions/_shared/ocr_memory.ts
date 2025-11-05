/**
 * OCR Memory Module
 * 
 * Day 10: Match vendors, reinforce aliases, remember categories
 * 
 * Functions:
 * - matchVendor: Match merchant to canonical name (exact → alias → embedding)
 * - reinforceVendor: Update vendor alias confidence
 * - rememberCategory: Store vendor→category fact in memory
 */

import { admin } from './supabase';
import * as memory from './memory';
import { maskPII } from './pii';

export interface VendorMatch {
  canonical: string;
  confidence: number;
  source: 'exact' | 'alias' | 'embedding' | 'none';
}

/**
 * Match vendor/merchant to canonical name
 * 
 * Strategy:
 * 1. Exact match (case-insensitive)
 * 2. Alias table lookup
 * 3. Embedding similarity (fallback)
 */
export async function matchVendor(params: {
  userId: string;
  merchant: string;
}): Promise<VendorMatch> {
  const { userId, merchant } = params;
  
  if (!merchant || !userId) {
    return { canonical: merchant || '', confidence: 0, source: 'none' };
  }
  
  const merchantLower = merchant.toLowerCase().trim();
  
  // Step 1: Exact match (check if canonical already exists)
  const sb = admin();
  
  try {
    // Check if this exact merchant exists as a canonical (highest confidence alias)
    const { data: exactMatch } = await sb
      .from('vendor_aliases')
      .select('merchant, alias, confidence')
      .eq('user_id', userId)
      .eq('merchant', merchantLower)
      .order('confidence', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (exactMatch && Number(exactMatch.confidence) >= 0.7) {
      return {
        canonical: exactMatch.alias,
        confidence: Number(exactMatch.confidence),
        source: 'exact'
      };
    }
    
    // Step 2: Alias lookup (find aliases that match this merchant)
    const { data: aliasMatches } = await sb
      .from('vendor_aliases')
      .select('merchant, alias, confidence')
      .eq('user_id', userId)
      .ilike('merchant', `%${merchantLower}%`)
      .order('confidence', { ascending: false })
      .limit(5);
    
    if (aliasMatches && aliasMatches.length > 0) {
      // Find best match (highest confidence)
      const bestMatch = aliasMatches[0];
      return {
        canonical: bestMatch.alias,
        confidence: Number(bestMatch.confidence),
        source: 'alias'
      };
    }
    
    // Step 3: Embedding similarity (future: use pgvector)
    // For now, return merchant as-is with low confidence
    // TODO: Implement embedding-based matching using memory embeddings
    
    return {
      canonical: merchant,
      confidence: 0.3,
      source: 'none'
    };
  } catch (error: any) {
    console.warn('[OCR Memory] Vendor match failed:', error);
    return {
      canonical: merchant,
      confidence: 0,
      source: 'none'
    };
  }
}

/**
 * Reinforce vendor alias (update confidence)
 */
export async function reinforceVendor(params: {
  userId: string;
  merchant: string;
  canonical: string;
}): Promise<boolean> {
  const { userId, merchant, canonical } = params;
  
  if (!merchant || !canonical || !userId) {
    return false;
  }
  
  const merchantLower = merchant.toLowerCase().trim();
  const canonicalLower = canonical.toLowerCase().trim();
  
  // If merchant == canonical, no alias needed
  if (merchantLower === canonicalLower) {
    return true;
  }
  
  const sb = admin();
  
  try {
    // Check if alias exists
    const { data: existing } = await sb
      .from('vendor_aliases')
      .select('id, confidence')
      .eq('user_id', userId)
      .eq('merchant', merchantLower)
      .eq('alias', canonicalLower)
      .maybeSingle();
    
    if (existing) {
      // Update confidence (bump by 0.1, cap at 1.0)
      const newConfidence = Math.min(Number(existing.confidence) + 0.1, 1.0);
      
      await sb
        .from('vendor_aliases')
        .update({
          confidence: newConfidence,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new alias
      await sb
        .from('vendor_aliases')
        .insert({
          user_id: userId,
          merchant: merchantLower,
          alias: canonicalLower,
          confidence: 0.5,
          updated_at: new Date().toISOString()
        });
    }
    
    return true;
  } catch (error: any) {
    console.warn('[OCR Memory] Reinforce vendor failed:', error);
    return false;
  }
}

/**
 * Remember vendor→category fact in memory
 */
export async function rememberCategory(params: {
  userId: string;
  merchant: string;
  category: string;
  subcategory?: string;
  convoId?: string;
}): Promise<boolean> {
  const { userId, merchant, category, subcategory, convoId } = params;
  
  if (!merchant || !category || !userId) {
    return false;
  }
  
  try {
    // Build fact string
    let fact = `vendor.category: ${merchant} → ${category}`;
    if (subcategory) {
      fact += ` (${subcategory})`;
    }
    
    // Mask PII before storing
    const maskedFact = maskPII(fact, 'full').masked;
    
    // Upsert fact using canonical memory API
    const factId = await memory.upsertFact({
      userId,
      convoId: convoId || 'ocr',
      source: 'ocr',
      fact: maskedFact
    });
    
    if (factId) {
      // Embed and store
      await memory.embedAndStore({
        userId,
        factId,
        text: maskedFact,
        model: 'text-embedding-3-large'
      });
    }
    
    return !!factId;
  } catch (error: any) {
    console.warn('[OCR Memory] Remember category failed:', error);
    return false;
  }
}

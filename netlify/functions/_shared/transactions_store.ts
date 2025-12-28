/**
 * Transactions Store Module
 * 
 * Day 9: Persistence helpers for normalized transactions
 * 
 * Functions:
 * - insertTransaction: Upsert transaction (dedupe by user_id, date, merchant, amount, currency)
 * - insertItems: Bulk insert transaction items
 */

import { admin } from './supabase';
import { NormalizedTransaction } from './ocr_normalize';

export interface TransactionRow extends NormalizedTransaction {
  category?: string;
  subcategory?: string;
}

/**
 * Insert or update transaction (dedupe by user_id, date, merchant, amount, currency)
 * 
 * Returns transaction ID
 */
export async function insertTransaction(tx: TransactionRow): Promise<number | null> {
  if (!tx.userId || !tx.amount) {
    console.warn('[Transactions Store] Invalid transaction:', tx);
    return null;
  }
  
  const sb = admin();
  
  try {
    // Try to find existing transaction
    const { data: existing } = await sb
      .from('transactions')
      .select('id')
      .eq('user_id', tx.userId)
      .eq('date', tx.date || null)
      .eq('merchant', tx.merchant || null)
      .eq('amount', tx.amount)
      .eq('currency', tx.currency || 'USD')
      .maybeSingle();
    
    if (existing) {
      // Update existing transaction
      const { data: updated, error } = await sb
        .from('transactions')
        .update({
          category: tx.category || null,
          subcategory: tx.subcategory || null,
          kind: tx.kind,
          doc_id: tx.docId || null,
          source: tx.source || 'ocr',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('id')
        .single();
      
      if (error) {
        console.warn('[Transactions Store] Update error:', error);
        return null;
      }
      
      return updated?.id || existing.id;
    }
    
    // Insert new transaction
    const { data: inserted, error } = await sb
      .from('transactions')
      .insert({
        user_id: tx.userId,
        doc_id: tx.docId || null,
        kind: tx.kind,
        date: tx.date || null,
        merchant: tx.merchant || null,
        amount: tx.amount,
        currency: tx.currency || 'USD',
        category: tx.category || null,
        subcategory: tx.subcategory || null,
        source: tx.source || 'ocr',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      // Handle unique constraint violation (dedupe)
      if (error.code === '23505') {
        // Try to find existing again
        const { data: found } = await sb
          .from('transactions')
          .select('id')
          .eq('user_id', tx.userId)
          .eq('date', tx.date || null)
          .eq('merchant', tx.merchant || null)
          .eq('amount', tx.amount)
          .eq('currency', tx.currency || 'USD')
          .maybeSingle();
        
        return found?.id || null;
      }
      
      console.warn('[Transactions Store] Insert error:', error);
      return null;
    }
    
    return inserted?.id || null;
  } catch (error: any) {
    console.warn('[Transactions Store] Transaction insert failed:', error);
    return null;
  }
}

/**
 * Bulk insert transaction items
 */
export async function insertItems(transactionId: number, items: Array<{ name: string; qty?: number; unit?: string; price?: number }>): Promise<boolean> {
  if (!transactionId || !items || items.length === 0) {
    return false;
  }
  
  const sb = admin();
  
  try {
    // Delete existing items for this transaction (idempotent: allow re-running)
    await sb
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transactionId);
    
    // Insert new items
    const itemsToInsert = items.map(item => ({
      transaction_id: transactionId,
      name: item.name,
      qty: item.qty || null,
      unit: item.unit || null,
      price: item.price || null
    }));
    
    const { error } = await sb
      .from('transaction_items')
      .insert(itemsToInsert);
    
    if (error) {
      console.warn('[Transactions Store] Items insert error:', error);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.warn('[Transactions Store] Items insert failed:', error);
    return false;
  }
}

/**
 * Link transaction to document (update doc_id)
 */
export async function linkToDocument(txId: number, docId: string): Promise<boolean> {
  if (!txId || !docId) {
    return false;
  }
  
  const sb = admin();
  
  try {
    const { error } = await sb
      .from('transactions')
      .update({ doc_id: docId })
      .eq('id', txId);
    
    if (error) {
      console.warn('[Transactions Store] Link to document error:', error);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.warn('[Transactions Store] Link to document failed:', error);
    return false;
  }
}




















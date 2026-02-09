/**
 * Crystal Analytics Queries
 * 
 * Centralized queries for Crystal Analytics integration.
 * All queries use SAFE views to prevent access to raw OCR/PII data.
 */

import { admin } from './supabase.js';

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 'PGRST205' || message.includes('does not exist') || message.includes('schema cache');
}

export interface ByteCompletionEvent {
  id: string;
  user_id: string;
  import_run_id: string;
  doc_count?: string;
  txn_count?: string;
  pages?: string;
  integrity_verified?: string;
  created_at: string;
}

export interface ImportMetadata {
  import_id: string;
  user_id: string;
  status: string;
  file_type?: string;
  committed_count?: number;
  committed_at?: string;
  created_at: string;
  updated_at: string;
  import_run_id?: string;
}

export interface TransactionData {
  transaction_id: string;
  user_id: string;
  posted_at: string;
  amount: number;
  type: string;
  category?: string;
  merchant?: string;
  memo?: string;
  import_id?: string;
  created_at: string;
  import_run_id?: string;
}

/**
 * Get Byte completion event for a specific import_run_id
 * Uses ai_activity_events (byte.import.completed)
 */
export async function getByteCompletionEvent(
  userId: string,
  importRunId: string
): Promise<ByteCompletionEvent | null> {
  const sb = admin();
  
  const { data, error } = await sb
    .from('ai_activity_events')
    .select('id, user_id, created_at, details')
    .eq('user_id', userId)
    .eq('event_type', 'byte.import.completed')
    .eq('details->>import_run_id', importRunId)
    .maybeSingle();
  
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[crystalQueries] Missing source for Byte completion event, skipping', {
        userId,
        importRunId,
        error: error.message,
      });
      return null;
    }
    console.error('[crystalQueries] Error fetching Byte completion event:', error);
    return null;
  }
  
  if (!data) {
    return null;
  }

  const details = (data as any).details || {};
  return {
    id: data.id,
    user_id: data.user_id,
    import_run_id: String(details.import_run_id || importRunId),
    doc_count: details.doc_count !== undefined ? String(details.doc_count) : undefined,
    txn_count: details.txn_count !== undefined ? String(details.txn_count) : undefined,
    pages: details.pages !== undefined ? String(details.pages) : undefined,
    integrity_verified: details.integrity_verified !== undefined ? String(details.integrity_verified) : undefined,
    created_at: data.created_at,
  };
}

/**
 * Get import metadata for a specific import_run_id
 * Uses SAFE view: v_crystal_input_import
 */
export async function getImportMetadata(
  userId: string,
  importRunId: string
): Promise<ImportMetadata[]> {
  const sb = admin();
  
  const { data, error } = await sb
    .from('v_crystal_input_import')
    .select('*')
    .eq('user_id', userId)
    .eq('import_run_id', importRunId);
  
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[crystalQueries] Missing v_crystal_input_import view, skipping', {
        userId,
        importRunId,
        error: error.message,
      });
      return [];
    }
    console.error('[crystalQueries] Error fetching import metadata:', error);
    return [];
  }
  
  return (data || []) as ImportMetadata[];
}

/**
 * Get transactions for a specific import_run_id
 * Uses SAFE view: v_crystal_input_transactions
 */
export async function getTransactions(
  userId: string,
  importRunId: string
): Promise<TransactionData[]> {
  const sb = admin();
  
  const { data, error } = await sb
    .from('v_crystal_input_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('import_run_id', importRunId)
    .order('posted_at', { ascending: false });
  
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn('[crystalQueries] Missing v_crystal_input_transactions view, skipping', {
        userId,
        importRunId,
        error: error.message,
      });
      return [];
    }
    console.error('[crystalQueries] Error fetching transactions:', error);
    return [];
  }
  
  return (data || []) as TransactionData[];
}

/**
 * Check if Custodian verification exists for an import_run_id
 * Checks ai_activity_events for byte.import.completed with integrity_verified=true
 */
export async function isCustodianVerified(
  userId: string,
  importRunId: string
): Promise<boolean> {
  const sb = admin();
  
  const { data, error } = await sb
    .from('ai_activity_events')
    .select('details')
    .eq('user_id', userId)
    .eq('event_type', 'byte.import.completed')
    .eq('details->>import_run_id', importRunId)
    .maybeSingle();
  
  if (error || !data) {
    return false;
  }
  
  const details = data.details as any;
  // Check both new format (integrity.verified) and legacy format (integrity_verified)
  const integrityVerified = details?.integrity?.verified ?? details?.integrity_verified;
  
  return integrityVerified === true || integrityVerified === 'true';
}


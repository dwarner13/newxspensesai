/**
 * Smart Import Sync Netlify Function
 * 
 * Phase 2 sync step: Waits for/executes OCR/parse, normalization, and commit
 * Returns actual transaction counts for newly uploaded documents.
 * 
 * Flow:
 * 1. Takes docIds from recent uploads
 * 2. Finds corresponding imports records
 * 3. Waits for OCR/parse to complete (if needed)
 * 4. Triggers normalization if not already done
 * 5. Commits transactions from staging to final table
 * 6. Returns transaction count
 * 
 * Internal function map:
 * - smart-import-init.ts: Creates doc record, returns signed URL
 * - smart-import-finalize.ts: Routes by file type, triggers OCR/parse (async)
 * - smart-import-ocr.ts: Runs OCR, calls normalize-transactions (async)
 * - smart-import-parse-csv.ts: Parses CSV, calls normalize-transactions (async)
 * - normalize-transactions.ts: Extracts transactions, saves to staging, sets status='parsed'
 * - commit-import.ts: Moves from staging to final table, categorizes with Tag
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

export type SmartImportSyncResult = {
  docIds: string[];
  transactionCount: number;
  // Optional: more fields later
  // categorizedCount?: number;
  // categoryCount?: number;
};

const MAX_WAIT_MS = 30000; // 30 seconds max wait for async jobs
const POLL_INTERVAL_MS = 1000; // Poll every 1 second

/**
 * Wait for import status to become 'parsed' (ready to commit)
 */
async function waitForImportReady(
  sb: any,
  importId: string,
  userId: string,
  maxWaitMs: number = MAX_WAIT_MS
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data: importRecord } = await sb
      .from('imports')
      .select('status')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (importRecord?.status === 'parsed') {
      return true;
    }
    
    if (importRecord?.status === 'committed') {
      // Already committed, skip
      return true;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  
  return false;
}

/**
 * Trigger normalization for a document if not already normalized
 */
async function ensureNormalized(
  sb: any,
  documentId: string,
  userId: string,
  netlifyUrl: string
): Promise<{ ok: boolean; importId?: string }> {
  // Check if import already exists and is parsed
  const { data: existingImport } = await sb
    .from('imports')
    .select('id, status')
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existingImport?.status === 'parsed' || existingImport?.status === 'committed') {
    return { ok: true, importId: existingImport.id };
  }
  
  // Trigger normalization
  try {
    const normalizeRes = await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, documentId }),
    });
    
    if (!normalizeRes.ok) {
      const errorText = await normalizeRes.text();
      console.error('[smart-import-sync] normalize-transactions failed:', errorText);
      return { ok: false };
    }
    
    const normalizeData = await normalizeRes.json();
    const importId = normalizeData.importId || existingImport?.id;
    
    // Wait for normalization to complete
    if (importId) {
      const ready = await waitForImportReady(sb, importId, userId);
      return { ok: ready, importId };
    }
    
    return { ok: false };
  } catch (err: any) {
    console.error('[smart-import-sync] Error calling normalize-transactions:', err);
    return { ok: false };
  }
}

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, docIds } = body;

    if (!userId || !docIds || !Array.isArray(docIds) || docIds.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing userId or docIds array' }),
      };
    }

    const sb = admin();
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    
    console.log('[smart-import-sync] Starting sync', { userId: userId.substring(0, 8) + '...', docIds });

    // 1. Find or ensure imports records exist for each docId
    // Note: normalize-transactions creates import records, so if import doesn't exist,
    // we'll trigger normalization which will create it
    const importIds: string[] = [];
    
    for (const docId of docIds) {
      // Check if import exists
      let { data: importRecord } = await sb
        .from('imports')
        .select('id, status, document_id')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!importRecord) {
        // Import doesn't exist yet - trigger normalization which will create it
        console.log('[smart-import-sync] Import not found, triggering normalization for docId:', docId);
        const normalized = await ensureNormalized(sb, docId, userId, netlifyUrl);
        
        if (normalized.ok && normalized.importId) {
          importRecord = { id: normalized.importId, status: 'parsed', document_id: docId };
        } else {
          // Check again after a short wait
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: retryImport } = await sb
            .from('imports')
            .select('id, status, document_id')
            .eq('document_id', docId)
            .eq('user_id', userId)
            .maybeSingle();
          
          if (retryImport) {
            importRecord = retryImport;
          } else {
            console.warn('[smart-import-sync] Could not find or create import for docId:', docId);
            continue;
          }
        }
      }
      
      if (importRecord.id) {
        importIds.push(importRecord.id);
      }
    }
    
    if (importIds.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          docIds,
          transactionCount: 0,
        } as SmartImportSyncResult),
      };
    }
    
    console.log('[smart-import-sync] Found imports', { importIds });

    // 2. Ensure all imports are normalized (status='parsed')
    const readyImportIds: string[] = [];
    
    for (const importId of importIds) {
      // Get document_id for this import
      const { data: importRecord } = await sb
        .from('imports')
        .select('document_id, status')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!importRecord || !importRecord.document_id) {
        console.warn('[smart-import-sync] Import missing document_id:', importId);
        continue;
      }
      
      // If already parsed or committed, we're good
      if (importRecord.status === 'parsed' || importRecord.status === 'committed') {
        readyImportIds.push(importId);
        continue;
      }
      
      // Ensure normalized
      const normalized = await ensureNormalized(sb, importRecord.document_id, userId, netlifyUrl);
      
      if (normalized.ok && normalized.importId) {
        readyImportIds.push(normalized.importId);
      } else {
        // Wait a bit and check again
        const ready = await waitForImportReady(sb, importId, userId, 10000); // 10s wait
        if (ready) {
          readyImportIds.push(importId);
        }
      }
    }
    
    console.log('[smart-import-sync] Ready imports', { readyImportIds });

    // 3. Commit all ready imports
    let totalTransactionCount = 0;
    
    for (const importId of readyImportIds) {
      // Check if already committed
      const { data: importRecord } = await sb
        .from('imports')
        .select('status, committed_count')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (importRecord?.status === 'committed') {
        // Already committed, use existing count
        totalTransactionCount += importRecord.committed_count || 0;
        continue;
      }
      
      // Commit this import
      try {
        const commitRes = await fetch(`${netlifyUrl}/.netlify/functions/commit-import`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
          body: JSON.stringify({ importId }),
        });
        
        if (commitRes.ok) {
          const commitData = await commitRes.json();
          const committed = commitData.committed || commitData.insertedCount || 0;
          totalTransactionCount += committed;
          console.log('[smart-import-sync] Committed import', { importId, committed });
        } else {
          const errorText = await commitRes.text();
          console.error('[smart-import-sync] commit-import failed:', errorText);
        }
      } catch (err: any) {
        console.error('[smart-import-sync] Error calling commit-import:', err);
      }
    }
    
    // TODO: Trigger Tag AI to categorize new transactions for these docIds
    // e.g. call `tag-autocategorize` with userId + docIds or importIds
    // Note: commit-import already categorizes transactions using Tag learning,
    // so this might be redundant unless we want additional categorization passes
    
    console.log('[smart-import-sync] Sync complete', { docIds, transactionCount: totalTransactionCount });

    const result: SmartImportSyncResult = {
      docIds,
      transactionCount: totalTransactionCount,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error: any) {
    console.error('[smart-import-sync] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};


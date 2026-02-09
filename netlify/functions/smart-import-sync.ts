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
  importIds?: string[];
  transactionCount: number;
  // Optional: more fields later
  // categorizedCount?: number;
  // categoryCount?: number;
};

const MAX_WAIT_MS = 30000; // 30 seconds max wait for async jobs
const POLL_INTERVAL_MS = 1000; // Poll every 1 second
const OCR_DEBUG_ENABLED =
  process.env.OCR_DEBUG === '1' ||
  process.env.OCR_DEBUG === 'true' ||
  process.env.VITE_OCR_DEBUG === '1' ||
  process.env.VITE_OCR_DEBUG === 'true';

async function waitForOcrText(
  sb: any,
  docId: string,
  maxMs: number = 15000,
  pollMs: number = 500
): Promise<{ ok: boolean; len: number }> {
  const start = Date.now();
  console.log('[smart-import-sync] waitForOcrText start', { docId, maxMs, pollMs });

  while (Date.now() - start < maxMs) {
    const { data, error } = await sb
      .from('user_documents')
      .select('id, ocr_text, updated_at, mime_type, original_name, status')
      .eq('id', docId)
      .maybeSingle();

    if (error) {
      console.error('[smart-import-sync] waitForOcrText error', { docId, error });
      // keep waiting in case schema cache / transient
    } else {
      const mimeType = data?.mime_type || '';
      const fileName = data?.original_name || '';
      if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
        console.log('[smart-import-sync] waitForOcrText skip (CSV)', {
          docId,
          mimeType,
          fileName,
          elapsedMs: Date.now() - start,
        });
        return { ok: true, len: 0 };
      }

      const len = (data?.ocr_text || '').length;
      if (data && len === 0) {
        console.log('[smart-import-sync] OCR text empty', {
          docId,
          status: data.status,
          updatedAt: data.updated_at,
        });
      }
      if (len > 0) {
        console.log('[smart-import-sync] OCR text ready', {
          docId,
          len,
          elapsedMs: Date.now() - start,
        });
        return { ok: true, len };
      }
    }

    await new Promise(r => setTimeout(r, pollMs));
  }

  console.warn('[smart-import-sync] OCR text NOT ready before timeout', {
    docId,
    maxMs,
    elapsedMs: Date.now() - start,
  });
  return { ok: false, len: 0 };
}

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
    if (OCR_DEBUG_ENABLED) {
      console.log('[smart-import-sync] Normalize skipped (already parsed/committed)', {
        documentId,
        importId: existingImport.id,
        status: existingImport.status,
      });
    }
    return { ok: true, importId: existingImport.id };
  }
  
  // Trigger normalization
  try {
    if (OCR_DEBUG_ENABLED) {
      console.log('[smart-import-sync] Triggering normalize-transactions', { documentId });
    }
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
        const waitResult = await waitForOcrText(sb, docId, 15000, 500);
        if (!waitResult.ok) {
          console.log('[smart-import-sync] Skipping normalize; OCR not ready', { docId });
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              processing: true,
              reason: 'ocr_not_ready',
              docId,
              docIds,
              importIds: [],
              transactionCount: 0,
            }),
          };
        }
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
          importIds: [],
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
    const summaries: Record<string, any> = {};
    const issuesByImport: Record<string, any> = {};
    
    for (const importId of readyImportIds) {
      // Check if already committed
      const { data: importRecord } = await sb
        .from('imports')
        .select('status')
        .eq('id', importId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (importRecord?.status === 'committed') {
        const { count: committedCount } = await sb
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', importId)
          .eq('user_id', userId);
        totalTransactionCount += committedCount || 0;
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
          if (commitData?.summary) {
            summaries[importId] = commitData.summary;
          }
          if (commitData?.issues) {
            issuesByImport[importId] = commitData.issues;
          }
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

    // ⚡ BYTE ACTIVITY EVENT: Emit completion event for Prime/Custodian visibility
    // Only emit once per import run (idempotency via importRunId)
    try {
      const { logByteImportCompleted, generateImportRunId } = await import('./_shared/byteActivityEvents');
      const authToken = event.headers.authorization || event.headers['x-authorization'] || '';
      
      // Generate import run ID from first docId (or use requestId if available)
      const requestId = body.requestId;
      const importRunId = generateImportRunId(requestId, docIds);
      
      // Calculate duration (approximate - from first doc creation to sync completion)
      const { data: firstDoc } = await sb
        .from('user_documents')
        .select('created_at')
        .eq('id', docIds[0])
        .single();
      
      const durationMs = firstDoc?.created_at
        ? Date.now() - new Date(firstDoc.created_at).getTime()
        : 0;

      // Get document metadata for pages estimate
      const { data: docs } = await sb
        .from('user_documents')
        .select('id, mime_type, status')
        .in('id', docIds);
      
      const pages = docs?.filter(d => d.mime_type === 'application/pdf').length || 0;
      
      // Check for warnings (rejected docs, etc.)
      const warnings: string[] = [];
      const rejectedDocs = docs?.filter(d => d.status === 'rejected');
      if (rejectedDocs && rejectedDocs.length > 0) {
        warnings.push(`${rejectedDocs.length} document(s) rejected`);
      }

      await logByteImportCompleted(authToken, {
        userId,
        importRunId,
        docIds,
        docCount: docIds.length,
        pages,
        txnCount: totalTransactionCount,
        warnings: warnings.length > 0 ? warnings : undefined,
        durationMs,
      });

      // ⚡ CUSTODIAN INTEGRITY CHECK: Verify upload completeness and processing integrity
      // ⚡ CUSTODIAN SILENCE ON SUCCESS: Only stores integrity payload, no chat messages
      try {
        const { checkByteImportIntegrity, updateActivityEventWithIntegrity } = await import('./_shared/custodianIntegrityCheck');
        const integrityResult = await checkByteImportIntegrity(userId, docIds, importRunId);
        
        // Update event with integrity result (silent - no chat messages)
        await updateActivityEventWithIntegrity(userId, importRunId, integrityResult);
        
        // ⚡ EXCEPTION-ONLY: Only create warning event if verified=false
        if (!integrityResult.verified) {
          // Create warning event for Prime (not a chat message, but an activity event)
          try {
            const { logAiActivity } = await import('./_shared/logAiActivity.js');
            await logAiActivity(authToken, {
              employeeId: 'custodian',
              eventType: 'byte.import.integrity_warning',
              status: 'warning',
              label: `Integrity check failed for Byte import: ${integrityResult.reason}`,
              details: {
                import_run_id: importRunId,
                doc_ids: docIds,
                integrity_verified: false,
                integrity_reason: integrityResult.reason,
                integrity_warnings: integrityResult.warnings,
              },
            });
          } catch (warningError: any) {
            console.error('[smart-import-sync] Error creating integrity warning event:', warningError);
            // Don't fail sync if warning event creation fails
          }
        } else {
          // ⚡ CRYSTAL ANALYTICS: Trigger Crystal analytics after successful Custodian verification
          // Runs exactly once per import_run_id (idempotent via DB constraint)
          const DISABLE_CRYSTAL = process.env.DISABLE_CRYSTAL === '1' || process.env.DISABLE_CRYSTAL === 'true';
          if (DISABLE_CRYSTAL) {
            console.log('[crystal] disabled by env');
          } else {
            try {
              const { triggerCrystalAnalytics } = await import('./_shared/crystalAnalytics.js');
              await triggerCrystalAnalytics(userId, importRunId);
              // Silent on success - Crystal failures don't affect Custodian flow
            } catch (crystalError: any) {
              console.error('[smart-import-sync] Error triggering Crystal analytics:', crystalError);
              // Don't fail sync if Crystal analytics fails - it's a downstream consumer
            }
          }
        }
      } catch (error: any) {
        console.error('[smart-import-sync] Error performing integrity check:', error);
        // Don't fail sync if integrity check fails
      }
    } catch (error: any) {
      console.error('[smart-import-sync] Error logging Byte completion event:', error);
      // Don't fail sync if event logging fails
    }

    const result: SmartImportSyncResult & Record<string, any> = {
      docIds,
      importIds: readyImportIds,
      transactionCount: totalTransactionCount,
    };
    if (Object.keys(summaries).length > 0) {
      result.summaries = summaries;
      const firstImportId = readyImportIds[0];
      if (firstImportId && summaries[firstImportId]) {
        result.summary = summaries[firstImportId];
      }
    }
    if (Object.keys(issuesByImport).length > 0) {
      result.issuesByImport = issuesByImport;
      const firstImportId = readyImportIds[0];
      if (firstImportId && issuesByImport[firstImportId]) {
        result.issues = issuesByImport[firstImportId];
      }
    }

    if (OCR_DEBUG_ENABLED) {
      const debugItems: any[] = [];
      for (const docId of docIds) {
        let { data: docData } = await sb
          .from('user_documents')
          .select('id, user_id, ocr_text, ocr_engine, status, storage_path')
          .eq('id', docId)
          .eq('user_id', userId)
          .maybeSingle();
        const needsIdFallback = !docData || !docData.storage_path;
        if (needsIdFallback) {
          const { data: docDataById } = await sb
            .from('user_documents')
            .select('id, user_id, ocr_text, ocr_engine, status, storage_path')
            .eq('id', docId)
            .maybeSingle();
          if (docDataById) {
            docData = docDataById;
            if (OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] Debug doc lookup bypassed user_id filter', {
                docId,
                userId,
                docUserId: docDataById.user_id,
              });
            }
          }
        }

        const { data: importRecord } = await sb
          .from('imports')
          .select('id, error')
          .eq('document_id', docId)
          .eq('user_id', userId)
          .maybeSingle();

        let parsedTransactions: any[] = [];
        if (importRecord?.id) {
          const { data: stagingRows } = await sb
            .from('transactions_staging')
            .select('data_json, parsed_at, hash')
            .eq('import_id', importRecord.id)
            .eq('user_id', userId)
            .order('parsed_at', { ascending: true })
            .limit(50);
          parsedTransactions = (stagingRows || []).map((row: any) => row.data_json);
        }

        let rawText = String(docData?.ocr_text || '');
        let storagePath = docData?.storage_path || null;
        if (!storagePath) {
          try {
            const { data: files, error: listError } = await sb.storage
              .from('docs')
              .list(`${userId}/${docId}`, { limit: 1 });
            if (listError && OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] OCR storage list failed', {
                docId,
                prefix: `${userId}/${docId}`,
                error: listError.message || String(listError),
              });
            } else if (files && files.length > 0) {
              storagePath = `${userId}/${docId}/${files[0].name}`;
              if (OCR_DEBUG_ENABLED) {
                console.log('[smart-import-sync] Resolved storage path from list', {
                  docId,
                  storagePath,
                });
              }
            } else if (OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] OCR storage list empty', {
                docId,
                prefix: `${userId}/${docId}`,
              });
            }
          } catch (error: any) {
            if (OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] OCR storage list error', {
                docId,
                error: error?.message || String(error),
              });
            }
          }
        }
        if (OCR_DEBUG_ENABLED) {
          console.log('[smart-import-sync] Debug doc OCR text length', {
            docId,
            length: rawText.length,
            hasStoragePath: !!storagePath,
            docUserId: docData?.user_id || null,
          });
        }
        if (!rawText && storagePath) {
          try {
            const ocrKey = `${storagePath}.ocr.json`;
            const { data: ocrBlob, error: ocrError } = await sb.storage.from('docs').download(ocrKey);
            if (ocrError && OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] OCR storage download failed', {
                docId,
                ocrKey,
                error: ocrError.message || String(ocrError),
              });
            }
            if (ocrBlob) {
              let raw = '';
              if (typeof (ocrBlob as any).text === 'function') {
                raw = await (ocrBlob as any).text();
              } else if (typeof (ocrBlob as any).arrayBuffer === 'function') {
                const buffer = Buffer.from(await (ocrBlob as any).arrayBuffer());
                raw = buffer.toString('utf-8');
              } else if (Buffer.isBuffer(ocrBlob)) {
                raw = ocrBlob.toString('utf-8');
              } else if (ocrBlob instanceof ArrayBuffer) {
                raw = Buffer.from(ocrBlob).toString('utf-8');
              } else {
                raw = String(ocrBlob);
              }
              const parsed = JSON.parse(raw || '{}');
              rawText = String(parsed?.text || '');
              if (rawText && OCR_DEBUG_ENABLED) {
                console.log('[smart-import-sync] Loaded OCR storage text', {
                  docId,
                  length: rawText.length,
                });
              }
            }
          } catch (error: any) {
            if (OCR_DEBUG_ENABLED) {
              console.warn('[smart-import-sync] Failed to load OCR storage text', {
                docId,
                error: error?.message || String(error),
              });
            }
          }
        }
        const parseWarnings: string[] = [];
        if (!rawText) parseWarnings.push('missing_ocr_text');
        if (parsedTransactions.length === 0) parseWarnings.push('no_parsed_transactions');
        if (docData?.status === 'needs_review' || docData?.status === 'rejected') {
          parseWarnings.push(`doc_status:${docData.status}`);
        }

        debugItems.push({
          docId,
          importId: importRecord?.id || undefined,
          rawTextPreview: rawText.slice(0, 2000),
          rawTextLength: rawText.length,
          parsedTransactions,
          parseWarnings,
          parseError: importRecord?.error || null,
          ocrEngineUsed: docData?.ocr_engine || null,
        });
      }

      result.debug = { items: debugItems };
      if (debugItems.length === 1) {
        Object.assign(result, debugItems[0]);
      }
    }

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


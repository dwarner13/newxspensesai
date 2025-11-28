/**
 * Smart Import Supabase Persistence Service
 * 
 * Persists OCR results and transactions from worker pipeline directly into Supabase
 * Phase 1 schema: user_documents, imports, transactions_staging
 */

import { supabaseClient } from '../supabase.js';
import { createHash } from 'crypto';

export interface PersistSmartImportOptions {
  userId: string;
  originalFileUrl: string;
  docType: 'bank_statement' | 'receipt' | 'credit_card_statement';
  ocrText: string;
  piiTypes: string[];
  transactions: Array<{
    date?: string | null;
    merchant?: string | null;
    description?: string | null;
    amount: number;
    category?: string | null;
    subcategory?: string | null;
    direction?: 'debit' | 'credit';
    [key: string]: any; // Allow additional fields
  }>;
}

export interface PersistSmartImportResult {
  documentId: string;
  importId: string;
  stagingCount: number;
}

/**
 * Extract storage path from Supabase Storage URL
 * Handles multiple URL formats:
 * - Public URL: "https://.../storage/v1/object/public/docs/u/ab/abc123/abc123.pdf" -> "u/ab/abc123/abc123.pdf"
 * - Public URL (original_docs): "https://.../storage/v1/object/public/original_docs/userId/path" -> "userId/path"
 * - Direct path: "u/ab/abc123/abc123.pdf" -> "u/ab/abc123/abc123.pdf"
 */
function extractStoragePath(fileUrl: string): string | null {
  // Try to match docs bucket path (format: u/ab/abc123/abc123.pdf)
  const docsMatch = fileUrl.match(/\/docs\/(.+)$/);
  if (docsMatch) {
    return docsMatch[1];
  }
  
  // Try to match original_docs bucket path
  const originalDocsMatch = fileUrl.match(/\/original_docs\/(.+)$/);
  if (originalDocsMatch) {
    return originalDocsMatch[1];
  }
  
  // If it's already a path (doesn't contain http/https), return as-is
  if (!fileUrl.includes('http://') && !fileUrl.includes('https://')) {
    return fileUrl;
  }
  
  // Last resort: try to extract anything after the last slash
  const lastSlash = fileUrl.lastIndexOf('/');
  if (lastSlash !== -1) {
    return fileUrl.substring(lastSlash + 1);
  }
  
  return null;
}

/**
 * Infer MIME type from file URL or docType
 */
function inferFileType(fileUrl: string, docType: string): string {
  if (fileUrl.toLowerCase().endsWith('.pdf')) {
    return 'application/pdf';
  }
  if (fileUrl.toLowerCase().match(/\.(png|jpg|jpeg)$/i)) {
    return 'image/png'; // Default to PNG for images
  }
  if (docType === 'bank_statement' || docType === 'credit_card_statement') {
    return 'application/pdf'; // Default assumption
  }
  return 'application/pdf';
}

/**
 * Create deterministic hash for transaction deduplication
 * Format: SHA256(date-amount-merchant) truncated to 64 chars
 */
function createTransactionHash(tx: PersistSmartImportOptions['transactions'][0]): string {
  const date = tx.date || '';
  const amount = tx.amount || 0;
  const merchant = tx.merchant || tx.description || '';
  const hashInput = `${date}-${amount}-${merchant}`;
  return createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
}

/**
 * Persist Smart Import results to Supabase Phase 1 schema
 * 
 * This function:
 * 1. Upserts user_documents with OCR text
 * 2. Creates/updates imports row
 * 3. Upserts transactions_staging rows
 */
export async function persistSmartImportResults(
  options: PersistSmartImportOptions
): Promise<PersistSmartImportResult> {
  console.log('[SmartImportSupabase] Starting persist', {
    userId: options.userId,
    docType: options.docType,
    transactionCount: options.transactions.length,
    ocrTextLength: options.ocrText.length,
    originalFileUrl: options.originalFileUrl.substring(0, 100) + '...', // Log first 100 chars
  });

  const storagePath = extractStoragePath(options.originalFileUrl);
  if (!storagePath) {
    const errorMsg = `Could not extract storage_path from fileUrl: ${options.originalFileUrl}`;
    console.error('[SmartImportSupabase] ERROR:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[SmartImportSupabase] Extracted storage_path:', storagePath);

  const fileType = inferFileType(options.originalFileUrl, options.docType);
  const now = new Date().toISOString();

  // Step 1: Upsert user_documents
  console.log('[SmartImportSupabase] Step 1: Upserting user_documents', { storagePath, userId: options.userId });

  // First, try to find existing document by storage_path
  const { data: existingDoc, error: lookupError } = await supabaseClient
    .from('user_documents')
    .select('id, storage_path')
    .eq('storage_path', storagePath)
    .eq('user_id', options.userId)
    .maybeSingle();

  if (lookupError) {
    console.error('[SmartImportSupabase] ERROR: Failed to lookup user_documents', {
      table: 'user_documents',
      error: lookupError.message,
      code: lookupError.code,
      details: lookupError.details,
      storagePath,
      userId: options.userId,
    });
    throw new Error(`Failed to lookup user_documents: ${lookupError.message}`);
  }

  let documentId: string;

  if (existingDoc && existingDoc.id) {
    // Update existing document
    documentId = existingDoc.id;
    console.log('[SmartImportSupabase] Found existing user_documents row', { documentId, storage_path: existingDoc.storage_path });

    const updatePayload = {
      ocr_text: options.ocrText,
      ocr_completed_at: now,
      pii_types: options.piiTypes.length > 0 ? options.piiTypes : null,
      updated_at: now,
    };

    const { error: updateError } = await supabaseClient
      .from('user_documents')
      .update(updatePayload)
      .eq('id', documentId);

    if (updateError) {
      console.error('[SmartImportSupabase] ERROR: Failed to update user_documents', {
        table: 'user_documents',
        documentId,
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        payload: updatePayload,
      });
      throw new Error(`Failed to update user_documents: ${updateError.message}`);
    }

    console.log('[SmartImportSupabase] user_documents update OK', { id: documentId, storage_path: storagePath });
  } else {
    // Insert new document
    console.log('[SmartImportSupabase] Creating new user_documents row');

    const insertPayload = {
      user_id: options.userId,
      storage_path: storagePath,
      original_name: storagePath.split('/').pop() || 'document',
      doc_type: options.docType === 'receipt' ? 'receipt' : 'bank_statement',
      source: 'worker', // Column name from migration: source (not source_type)
      ocr_text: options.ocrText,
      ocr_completed_at: now,
      pii_types: options.piiTypes.length > 0 ? options.piiTypes : null,
      status: 'ready',
      created_at: now,
      updated_at: now,
    };

    const { data: newDoc, error: insertError } = await supabaseClient
      .from('user_documents')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[SmartImportSupabase] ERROR: Failed to insert user_documents', {
        table: 'user_documents',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        payload: insertPayload,
      });
      throw new Error(`Failed to insert user_documents: ${insertError.message} (code: ${insertError.code})`);
    }

    if (!newDoc || !newDoc.id) {
      console.error('[SmartImportSupabase] ERROR: Insert returned no data', {
        table: 'user_documents',
        payload: insertPayload,
      });
      throw new Error('Failed to insert user_documents: No data returned');
    }

    documentId = newDoc.id;
    console.log('[SmartImportSupabase] user_documents insert OK', { id: documentId, storage_path: storagePath });
  }

  // Step 2: Create or update imports row
  console.log('[SmartImportSupabase] Step 2: Upserting imports', { documentId });

  const { data: existingImport, error: importLookupError } = await supabaseClient
    .from('imports')
    .select('id')
    .eq('document_id', documentId)
    .eq('user_id', options.userId)
    .maybeSingle();

  if (importLookupError && importLookupError.code !== 'PGRST116') {
    // PGRST116 is "not found" which is OK, but other errors are not
    console.error('[SmartImportSupabase] ERROR: Failed to lookup imports', {
      table: 'imports',
      error: importLookupError.message,
      code: importLookupError.code,
      details: importLookupError.details,
      documentId,
      userId: options.userId,
    });
    throw new Error(`Failed to lookup imports: ${importLookupError.message}`);
  }

  let importId: string;

  if (existingImport && existingImport.id) {
    // Update existing import
    importId = existingImport.id;
    console.log('[SmartImportSupabase] Found existing imports row', { importId });

    const updatePayload = {
      file_url: options.originalFileUrl,
      file_type: fileType,
      status: 'parsed',
      updated_at: now,
    };

    const { error: updateError } = await supabaseClient
      .from('imports')
      .update(updatePayload)
      .eq('id', importId);

    if (updateError) {
      console.error('[SmartImportSupabase] ERROR: Failed to update imports', {
        table: 'imports',
        importId,
        error: updateError.message,
        code: updateError.code,
        details: updateError.details,
        payload: updatePayload,
      });
      throw new Error(`Failed to update imports: ${updateError.message}`);
    }

    console.log('[SmartImportSupabase] imports update OK', { id: importId, document_id: documentId });
  } else {
    // Insert new import
    console.log('[SmartImportSupabase] Creating new imports row');

    const insertPayload = {
      user_id: options.userId,
      document_id: documentId,
      file_url: options.originalFileUrl,
      file_type: fileType,
      status: 'parsed',
      created_at: now,
      updated_at: now,
    };

    const { data: newImport, error: insertError } = await supabaseClient
      .from('imports')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[SmartImportSupabase] ERROR: Failed to insert imports', {
        table: 'imports',
        error: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        payload: insertPayload,
      });
      throw new Error(`Failed to insert imports: ${insertError.message} (code: ${insertError.code})`);
    }

    if (!newImport || !newImport.id) {
      console.error('[SmartImportSupabase] ERROR: Insert returned no data', {
        table: 'imports',
        payload: insertPayload,
      });
      throw new Error('Failed to insert imports: No data returned');
    }

    importId = newImport.id;
    console.log('[SmartImportSupabase] imports insert OK', { id: importId, document_id: documentId });
  }

  // Step 3: Upsert transactions_staging rows
  console.log('[SmartImportSupabase] Step 3: Upserting transactions_staging', {
    importId,
    transactionCount: options.transactions.length,
  });

  if (options.transactions.length === 0) {
    console.log('[SmartImportSupabase] No transactions to stage - returning early');
    return {
      documentId,
      importId,
      stagingCount: 0,
    };
  }

  const stagingRows = options.transactions.map((tx) => {
    const hash = createTransactionHash(tx);

    return {
      import_id: importId,
      user_id: options.userId,
      data_json: {
        date: tx.date || null,
        posted_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
        merchant: tx.merchant || tx.description || null,
        description: tx.description || tx.merchant || 'Transaction',
        amount: tx.amount || 0,
        type: tx.amount && tx.amount < 0 ? 'income' : 'expense',
        currency: 'CAD', // Default to CAD
        category: tx.category || null,
        confidence: null,
        category_source: null,
        direction: tx.direction || (tx.amount < 0 ? 'credit' : 'debit'),
        subcategory: tx.subcategory || null,
        // Include any additional fields from the transaction
        ...Object.fromEntries(
          Object.entries(tx).filter(([key]) => 
            !['date', 'merchant', 'description', 'amount', 'category', 'subcategory', 'direction'].includes(key)
          )
        ),
      },
      hash,
    };
  });

  console.log('[SmartImportSupabase] Prepared staging rows', {
    count: stagingRows.length,
    sampleHash: stagingRows[0]?.hash?.substring(0, 16) + '...',
  });

  const { error: stagingError, data: stagingData } = await supabaseClient
    .from('transactions_staging')
    .upsert(stagingRows, {
      onConflict: 'import_id,hash',
      ignoreDuplicates: false,
    })
    .select('id');

  if (stagingError) {
    console.error('[SmartImportSupabase] ERROR: Failed to upsert transactions_staging', {
      table: 'transactions_staging',
      error: stagingError.message,
      code: stagingError.code,
      details: stagingError.details,
      hint: stagingError.hint,
      rowCount: stagingRows.length,
      sampleRow: stagingRows[0] ? {
        import_id: stagingRows[0].import_id,
        user_id: stagingRows[0].user_id,
        hash: stagingRows[0].hash,
        data_json_keys: Object.keys(stagingRows[0].data_json),
      } : null,
    });
    throw new Error(`Failed to upsert transactions_staging: ${stagingError.message} (code: ${stagingError.code})`);
  }

  const rowsInserted = stagingData?.length || stagingRows.length;
  console.log('[SmartImportSupabase] staging upsert OK', { rowsInserted, import_id: importId });

  const result = {
    documentId,
    importId,
    stagingCount: rowsInserted,
  };

  console.log('[SmartImportSupabase] Persistence completed successfully', result);
  return result;
}


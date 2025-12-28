/**
 * Delete Upload Endpoint
 * 
 * Securely deletes an upload and all related data:
 * - Deletes file from Supabase Storage
 * - Deletes related DB rows (imports, transactions_staging, transactions)
 * - Marks user_documents status as 'discarded'
 * - Logs guardrail event
 * 
 * Auth: Requires Supabase JWT in Authorization header
 * Security: Ensures upload belongs to requesting user
 */

import { Handler } from '@netlify/functions';
import { admin } from './_shared/upload';

const BUCKET = 'docs';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Extract auth token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const sb = admin();

    // Verify token and get user
    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      };
    }

    const userId = user.id;

    // Parse request body
    const { uploadId } = JSON.parse(event.body || '{}');
    if (!uploadId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing uploadId' }),
      };
    }

    // Fetch upload record and verify ownership
    const { data: upload, error: fetchError } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[delete-upload] Error fetching upload:', fetchError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database error', details: fetchError.message }),
      };
    }

    if (!upload) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Upload not found or access denied' }),
      };
    }

    // Track what we're deleting for the response
    const deletionSummary = {
      documentId: upload.id,
      storagePath: upload.storage_path,
      bucket: BUCKET,
      deletedRows: {
        imports: 0,
        transactionsStaging: 0,
        transactions: 0,
      },
    };

    // 1. Find related imports
    const { data: imports, error: importsError } = await sb
      .from('imports')
      .select('id')
      .eq('document_id', uploadId)
      .eq('user_id', userId);

    if (importsError) {
      console.error('[delete-upload] Error fetching imports:', importsError);
    }

    const importIds = (imports || []).map(imp => imp.id);
    deletionSummary.deletedRows.imports = importIds.length;

    // 2. Delete transactions_staging rows (by import_id)
    if (importIds.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .delete()
        .in('import_id', importIds)
        .eq('user_id', userId);

      if (stagingError) {
        console.error('[delete-upload] Error deleting transactions_staging:', stagingError);
      } else {
        // Count deleted rows (approximate)
        const { count } = await sb
          .from('transactions_staging')
          .select('*', { count: 'exact', head: true })
          .in('import_id', importIds)
          .eq('user_id', userId);
        // Note: Count is before deletion, so we'll estimate
      }
    }

    // 3. Delete transactions rows (by document_id and import_id)
    let transactionsDeleted = 0;
    if (uploadId) {
      const { error: txDocError } = await sb
        .from('transactions')
        .delete()
        .eq('document_id', uploadId)
        .eq('user_id', userId);

      if (txDocError) {
        console.error('[delete-upload] Error deleting transactions by document_id:', txDocError);
      }
    }

    if (importIds.length > 0) {
      const { error: txImportError } = await sb
        .from('transactions')
        .delete()
        .in('import_id', importIds)
        .eq('user_id', userId);

      if (txImportError) {
        console.error('[delete-upload] Error deleting transactions by import_id:', txImportError);
      }
    }

    // Count transactions deleted (approximate - before deletion)
    const { count: txCount } = await sb
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(`document_id.eq.${uploadId},import_id.in.(${importIds.join(',')})`)
      .eq('user_id', userId);

    deletionSummary.deletedRows.transactions = txCount || 0;

    // 4. Delete imports rows
    if (importIds.length > 0) {
      const { error: deleteImportsError } = await sb
        .from('imports')
        .delete()
        .in('id', importIds)
        .eq('user_id', userId);

      if (deleteImportsError) {
        console.error('[delete-upload] Error deleting imports:', deleteImportsError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to delete imports', details: deleteImportsError.message }),
        };
      }
    }

    // 5. Delete file from Storage
    let storageDeleted = false;
    if (upload.storage_path) {
      try {
        const { error: storageError } = await sb.storage
          .from(BUCKET)
          .remove([upload.storage_path]);

        if (storageError) {
          console.error('[delete-upload] Error deleting storage file:', storageError);
          // Don't fail if storage delete fails - DB cleanup is more important
        } else {
          storageDeleted = true;
        }

        // Also try to delete any associated .txt files (redacted OCR text)
        const txtPath = `${upload.storage_path}.txt`;
        await sb.storage.from(BUCKET).remove([txtPath]).catch(() => {
          // Ignore errors for .txt files (may not exist)
        });
      } catch (storageErr: any) {
        console.error('[delete-upload] Storage deletion error:', storageErr);
      }
    }

    // 6. Mark user_documents status as 'discarded'
    const { error: updateError } = await sb
      .from('user_documents')
      .update({
        status: 'discarded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[delete-upload] Error updating user_documents status:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update document status', details: updateError.message }),
      };
    }

    // 7. Log guardrail event
    try {
      await sb.from('guardrail_events').insert({
        user_id: userId,
        event_type: 'upload_discarded',
        severity: 'info',
        upload_id: uploadId,
        import_id: importIds.length > 0 ? importIds[0] : null,
        metadata: {
          storage_deleted: storageDeleted,
          bucket: BUCKET,
          storage_path: upload.storage_path,
          deleted_counts: deletionSummary.deletedRows,
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError: any) {
      // Don't fail if logging fails
      console.error('[delete-upload] Error logging guardrail event:', logError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Upload discarded successfully',
        deleted: deletionSummary,
        storage_deleted: storageDeleted,
      }),
    };
  } catch (error: any) {
    console.error('[delete-upload] Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};











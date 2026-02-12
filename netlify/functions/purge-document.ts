/**
 * Purge Document Endpoint
 *
 * Deletes stored OCR/source files while keeping transactions.
 * - Deletes file from Supabase Storage (docs bucket)
 * - Deletes OCR storage artifacts (.ocr.json, .txt if present)
 * - Clears OCR fields on user_documents
 *
 * Auth: Requires Supabase JWT in Authorization header
 * Security: Ensures document belongs to requesting user
 */

import { Handler } from '@netlify/functions';
import { admin } from './_shared/upload.js';

const BUCKET = 'docs';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

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

    const { data: { user }, error: authError } = await sb.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Invalid token' }),
      };
    }

    const { uploadId } = JSON.parse(event.body || '{}');
    if (!uploadId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing uploadId' }),
      };
    }

    const { data: upload, error: fetchError } = await sb
      .from('user_documents')
      .select('id, user_id, storage_path, original_name, file_name')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[purge-document] Error fetching document:', fetchError);
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
        body: JSON.stringify({ error: 'Document not found or access denied' }),
      };
    }

    let storageDeleted = false;
    if (upload.storage_path) {
      try {
        const { error: storageError } = await sb.storage
          .from(BUCKET)
          .remove([upload.storage_path]);
        if (storageError) {
          console.error('[purge-document] Error deleting storage file:', storageError);
        } else {
          storageDeleted = true;
        }

        const ocrJsonPath = `${upload.storage_path}.ocr.json`;
        await sb.storage.from(BUCKET).remove([ocrJsonPath]).catch(() => {
          // ignore missing OCR JSON
        });
        const txtPath = `${upload.storage_path}.txt`;
        await sb.storage.from(BUCKET).remove([txtPath]).catch(() => {
          // ignore missing TXT
        });
      } catch (storageErr: any) {
        console.error('[purge-document] Storage deletion error:', storageErr);
      }
    }

    const { error: updateError } = await sb
      .from('user_documents')
      .update({
        storage_path: null,
        ocr_text: null,
        redacted_text: null,
        redaction_summary: null,
        ocr_engine: null,
        ocr_completed_at: null,
        status: 'purged',
        updated_at: new Date().toISOString(),
      })
      .eq('id', uploadId)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[purge-document] Error updating user_documents:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update document', details: updateError.message }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Source document purged (transactions kept)',
        storage_deleted: storageDeleted,
      }),
    };
  } catch (error: any) {
    console.error('[purge-document] Unexpected error:', error);
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

import { Handler } from '@netlify/functions';
import { admin, createUserDocumentRow, storagePathFor, createSignedUploadUrl } from './_shared/upload';
import { isDemoUser } from './_shared/demo-user';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { 
        statusCode: 405, 
        body: JSON.stringify({ error: 'Method Not Allowed' }) 
      };
    }
    
    const { userId, filename, mime, source = 'upload' } = JSON.parse(event.body || '{}');
    if (!userId || !filename || !mime) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing userId/filename/mime' }) 
      };
    }

    const ext = (filename.split('.').pop() || '').toLowerCase();
    
    // Create user_documents row (this may fail if table doesn't exist)
    let result;
    try {
      result = await createUserDocumentRow(userId, source === 'chat' ? 'chat' : 'upload', filename, mime);
    } catch (e: any) {
      console.error('[smart-import-init] Error creating user_documents row:', e);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e.message || 'Failed to create document record',
          code: e.code || 'UNKNOWN',
          details: e.details || null,
          hint: e.hint || null,
          source: 'user_documents-insert',
        }),
      };
    }
    
    // Handle duplicate documents
    if (result.isDuplicate && result.existingDocumentId) {
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          docId: result.existingDocumentId, 
          isDuplicate: true,
          message: 'This document appears to be a duplicate of one you already uploaded.'
        }) 
      };
    }
    
    const doc = result.document;
    const path = storagePathFor(doc.id, ext);
    
    // Persist storage_path so downstream knows where file lives
    const sb = admin();
    const { error: updateError } = await sb.from('user_documents').update({ storage_path: path }).eq('id', doc.id);
    
    if (updateError) {
      console.error('[smart-import-init] Supabase error updating user_documents:', updateError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: updateError.message || 'Failed to update document storage path',
          code: updateError.code || 'UNKNOWN',
          details: updateError.details || null,
          hint: updateError.hint || null,
          source: 'user_documents-update',
        }),
      };
    }

    // Create imports record linked to user_documents
    // Skip for demo users since they may not exist in auth.users (foreign key constraint)
    let importRecord = null;
    if (isDemoUser(userId)) {
      console.log('[smart-import-init] Skipping imports insert for demo user');
    } else {
      const { data: importData, error: importError } = await sb
        .from('imports')
        .insert({
          user_id: userId,
          document_id: doc.id,
          file_url: path,
          file_type: mime,
          status: 'pending',
        })
        .select('id')
        .single();

      if (importError) {
        console.error('[smart-import-init] Supabase error inserting into imports:', importError);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: importError.message || 'Failed to create import record',
            code: importError.code || 'UNKNOWN',
            details: importError.details || null,
            hint: importError.hint || null,
            source: 'imports-insert',
          }),
        };
      }
      importRecord = importData;
    }

    // Create signed upload URL for Storage bucket
    let url: string;
    let token: string;
    try {
      const signedUrlResult = await createSignedUploadUrl(path);
      url = signedUrlResult.url;
      token = signedUrlResult.token;
    } catch (e: any) {
      console.error('[smart-import-init] Storage error (bucket might not exist):', e);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e.message || 'Failed to create signed upload URL',
          code: e.code || 'UNKNOWN',
          details: e.details || null,
          hint: e.hint || 'The storage bucket "docs" may not exist. Create it in Supabase → Storage → Buckets.',
          source: 'storage-bucket',
          bucket: 'docs',
        }),
      };
    }
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        docId: doc.id, 
        importId: importRecord?.id || null,
        path, 
        url, 
        token 
      }) 
    };
  } catch (e: any) {
    console.error('[smart-import-init] Unexpected error:', e);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: e.message || 'Internal server error',
        source: 'unexpected-error'
      }) 
    };
  }
};

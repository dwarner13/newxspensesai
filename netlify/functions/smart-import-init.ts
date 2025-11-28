import { Handler } from '@netlify/functions';
import { admin, createUserDocumentRow, storagePathFor, createSignedUploadUrl } from './_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { userId, filename, mime, source = 'upload' } = JSON.parse(event.body || '{}');
    if (!userId || !filename || !mime) return { statusCode: 400, body: 'Missing userId/filename/mime' };

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const result = await createUserDocumentRow(userId, source === 'chat' ? 'chat' : 'upload', filename, mime);
    
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
    await sb.from('user_documents').update({ storage_path: path }).eq('id', doc.id);

    // Create imports record linked to user_documents
    const { data: importRecord, error: importError } = await sb
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
      console.warn('[smart-import-init] Failed to create imports record:', importError);
      // Don't fail the upload, but log warning
    }

    const { url, token } = await createSignedUploadUrl(path);
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
    return { statusCode: 500, body: e.message };
  }
};

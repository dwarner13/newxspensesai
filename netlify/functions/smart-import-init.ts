import { Handler } from '@netlify/functions';
import { admin } from './_shared/upload.js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId, fileName, fileSize, mimeType } = JSON.parse(event.body || '{}');
    
    if (!userId || !fileName) {
      console.error('[smart-import-init] Missing required fields:', { userId: !!userId, fileName: !!fileName });
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: 'Missing required fields',
          missing: {
            userId: !userId,
            fileName: !fileName,
          },
        }) 
      };
    }

    const sb = admin();
    // Generate proper UUID for database
    const { data: docData, error: uuidError } = await sb
      .from('user_documents')
      .insert({ user_id: userId })
      .select('id')
      .single();
    
    if (uuidError || !docData) {
      console.error('[smart-import-init] Failed to generate UUID:', uuidError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to initialize document' })
      };
    }
    
    const docId = docData.id;
    const storagePath = `${userId}/${docId}/${fileName}`;

    console.log('[smart-import-init] Creating document:', { docId, fileName, userId });

    // Update the document record with file details
    const { error } = await sb
      .from('user_documents')
      .update({
        original_name: fileName,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        status: 'uploading'
      })
      .eq('id', docId);

    if (error) {
      console.error('[smart-import-init] Database error:', error);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to create document' }) 
      };
    }

    // Generate signed upload URL
    const { data: uploadData, error: urlError } = await sb.storage
      .from('docs')
      .createSignedUploadUrl(storagePath);

    if (urlError) {
      console.error('[smart-import-init] Upload URL error:', urlError);
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to generate upload URL' }) 
      };
    }

    console.log('[smart-import-init] ✅ Upload initialized:', { docId, storagePath });

    return {
      statusCode: 200,
      body: JSON.stringify({
        docId,
        uploadUrl: uploadData.signedUrl,
        storagePath
      })
    };
  } catch (e: any) {
    console.error('[smart-import-init] Error:', e);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message }) 
    };
  }
};

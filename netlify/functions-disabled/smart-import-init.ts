import { Handler } from '@netlify/functions';
import { admin, createUserDocumentRow, storagePathFor, createSignedUploadUrl } from './_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    const { userId, filename, mime, source = 'upload' } = JSON.parse(event.body || '{}');
    if (!userId || !filename || !mime) return { statusCode: 400, body: 'Missing userId/filename/mime' };

    const ext = (filename.split('.').pop() || '').toLowerCase();
    const doc = await createUserDocumentRow(userId, source === 'chat' ? 'chat' : 'upload', filename, mime);
    const path = storagePathFor(doc.id, ext);
    
    // Persist storage_path so downstream knows where file lives
    await admin().from('user_documents').update({ storage_path: path }).eq('id', doc.id);

    const { url, token } = await createSignedUploadUrl(path);
    return { statusCode: 200, body: JSON.stringify({ docId: doc.id, path, url, token }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message };
  }
};

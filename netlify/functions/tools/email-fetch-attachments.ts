/**
 * 📎 Email Fetch Attachments Tool for Prime
 * 
 * Purpose: Download attachments from a specific Gmail message and process via Smart Import
 * 
 * Security: All attachments go through Smart Import → Strict guardrails → OCR/parse
 * 
 * Flow:
 * 1. Fetch message details from Gmail API
 * 2. Download each attachment
 * 3. Create user_document record (source='gmail')
 * 4. Upload to Supabase Storage
 * 5. Call smart-import-finalize (triggers guardrails + processing)
 * 6. Send notification to user
 */

import { Handler } from '@netlify/functions';
import { admin, createUserDocumentRow } from '../_shared/upload';
import { notify } from '../_shared/notify';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const BUCKET = 'docs';

/**
 * Get valid Gmail access token (with refresh)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const sb = admin();
  const { data: row, error } = await sb
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !row) throw new Error('No Gmail connection for user');

  const willExpire = !row.expiry || new Date(row.expiry).getTime() - Date.now() < 60_000;
  if (!willExpire) return row.access_token as string;

  if (!row.refresh_token) throw new Error('Missing refresh_token');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: row.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed');

  const json = await res.json();
  const newExpiry = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  
  await sb
    .from('gmail_tokens')
    .update({
      access_token: json.access_token,
      expiry: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return json.access_token as string;
}

/**
 * Get message attachments from Gmail API
 */
async function getMessageAttachments(
  accessToken: string,
  messageId: string
): Promise<Array<{ filename: string; mimeType: string; data: Buffer; size: number }>> {
  // Get message with parts
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!msgRes.ok) throw new Error('Failed to fetch message');
  const message = await msgRes.json();

  const attachments: Array<{ filename: string; mimeType: string; data: Buffer; size: number }> = [];
  const parts = message.payload?.parts || [];

  for (const part of parts) {
    if (!part.filename || part.filename.length === 0) continue;
    if (!part.body?.attachmentId) continue;

    // Download attachment
    const attRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!attRes.ok) continue;
    const attData = await attRes.json();

    // Decode base64url
    const buffer = Buffer.from(attData.data, 'base64url');

    attachments.push({
      filename: part.filename,
      mimeType: part.mimeType || 'application/octet-stream',
      data: buffer,
      size: buffer.length
    });
  }

  return attachments;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, messageId } = JSON.parse(event.body || '{}');
    if (!userId || !messageId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/messageId' }) };
    }

    const sb = admin();

    // Get Gmail access token
    const accessToken = await getValidAccessToken(userId);

    // Fetch attachments
    const attachments = await getMessageAttachments(accessToken, messageId);

    if (attachments.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          docIds: [],
          message: 'No attachments found'
        })
      };
    }

    const processed: string[] = [];

    for (const att of attachments) {
      // Create document record (source='gmail')
      const doc = await createUserDocumentRow(
        userId,
        'gmail',
        att.filename,
        att.mimeType
      );

      // Generate storage path
      const { storagePathFor } = await import('../_shared/upload');
      const ext = (att.filename.split('.').pop() || '').toLowerCase();
      const storagePath = storagePathFor(doc.id, ext);

      // Update doc with storage path
      await sb.from('user_documents').update({ storage_path: storagePath }).eq('id', doc.id);

      // Upload file to storage (direct upload, server-side)
      await sb.storage.from(BUCKET).upload(storagePath, att.data, {
        contentType: att.mimeType,
        upsert: true
      });

      // Finalize: Triggers Smart Import → Guardrails (STRICT) → OCR/Parse → Normalize
      await fetch(`${process.env.URL}/.netlify/functions/smart-import-finalize`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, docId: doc.id })
      });

      processed.push(doc.id);
    }

    // Send notification
    await notify(userId, {
      type: 'import',
      title: `Processing ${processed.length} attachment${processed.length > 1 ? 's' : ''} from Gmail`,
      body: `Extracting and categorizing transactions...`,
      href: '/transactions?filter=new',
      meta: { messageId, docIds: processed, source: 'gmail_on_demand' }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        docIds: processed,
        count: processed.length
      })
    };
  } catch (e: any) {
    console.error('[Email Fetch Attachments Error]', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || 'Failed to fetch attachments' })
    };
  }
};


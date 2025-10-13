/**
 * 📧 Email Search Tool for Prime
 * 
 * Purpose: Find recent Gmail messages likely to be statements/invoices/receipts
 * 
 * Security: Query is sanitized via guardrails before Gmail API call
 * 
 * Returns: Top N ranked candidates with scores
 */

import { Handler } from '@netlify/functions';
import { admin } from '../_shared/upload';
import { runGuardrails, getGuardrailConfig } from '../_shared/guardrails';
import { scoreFinanceEmail, rankEmails, type FinanceEmail } from './_shared/email-scoring';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;

/**
 * Get valid Gmail access token (with refresh logic)
 */
async function getValidAccessToken(userId: string): Promise<string> {
  const sb = admin();
  const { data: row, error } = await sb
    .from('gmail_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !row) throw new Error('No Gmail connection for user');

  // Check if expired
  const willExpire = !row.expiry || new Date(row.expiry).getTime() - Date.now() < 60_000;

  if (!willExpire) return row.access_token as string;

  // Refresh token
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
 * Search Gmail messages
 */
async function listGmailCandidates(
  accessToken: string,
  query: string,
  days: number,
  limit: number
): Promise<FinanceEmail[]> {
  // Build Gmail search query
  const dayFilter = days > 0 ? `newer_than:${days}d` : '';
  const financeHints = '(subject:statement OR subject:invoice OR subject:receipt OR subject:bill OR category:finance)';
  const userQuery = query ? query : '';
  const fullQuery = [dayFilter, financeHints, userQuery].filter(Boolean).join(' ');

  // List messages
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}&q=${encodeURIComponent(fullQuery)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) throw new Error('Gmail API error');
  const list = await listRes.json();

  if (!list.messages || !Array.isArray(list.messages)) {
    return [];
  }

  // Fetch details for each message
  const messages: FinanceEmail[] = [];

  for (const m of list.messages.slice(0, limit)) {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const detail = await detailRes.json();
    const headers = detail.payload?.headers || [];
    
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';
    const dateStr = headers.find((h: any) => h.name === 'Date')?.value || new Date().toISOString();

    // Check for attachments
    const parts = detail.payload?.parts || [];
    const attachments = parts.filter((p: any) => p.filename && p.filename.length > 0);
    const hasAttachment = attachments.length > 0;
    const attachmentNames = attachments.map((p: any) => p.filename);

    messages.push({
      id: m.id,
      internalId: m.id,
      date: new Date(dateStr).toISOString(),
      from,
      subject,
      snippet: detail.snippet,
      hasAttachment,
      attachmentNames
    });
  }

  return messages;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, query = '', days = 90, limit = 10 } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

    // ✅ GUARDRAILS: Sanitize user query (chat preset - light protection)
    const cfg = await getGuardrailConfig(userId);
    const guardrailResult = await runGuardrails(query, userId, 'chat', cfg);
    
    if (!guardrailResult.ok) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Query blocked by safety policy' })
      };
    }

    const safeQuery = guardrailResult.text;

    // Get Gmail access token
    const accessToken = await getValidAccessToken(userId);

    // Search emails
    const candidates = await listGmailCandidates(accessToken, safeQuery, days, limit);

    // Rank by score
    const ranked = rankEmails(candidates, limit);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        messages: ranked,
        count: ranked.length,
        query: safeQuery
      })
    };
  } catch (e: any) {
    console.error('[Email Search Error]', e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message || 'Email search failed' })
    };
  }
};


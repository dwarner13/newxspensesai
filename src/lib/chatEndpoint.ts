// Chat endpoint configuration and utilities
// CANONICAL ENDPOINT: /.netlify/functions/chat

const devDefault = '/.netlify/functions/chat';
const prodDefault = '/.netlify/functions/chat'; // Single canonical endpoint

export const CHAT_ENDPOINT =
  import.meta.env.VITE_CHAT_ENDPOINT ?? (import.meta.env.PROD ? prodDefault : devDefault);

console.info(`🔗 Chat Endpoint: ${CHAT_ENDPOINT}`);

// Verify chat backend version from response headers
export function verifyChatBackend(resp: Response) {
  // Only enforce version on success; on errors we still want to read the body.
  if (resp.ok) {
    const v = resp.headers.get('X-Chat-Backend');
    if (v !== 'v2') console.warn('⚠️ Expected X-Chat-Backend: v2, got:', v);
  }
}

// Helper to make chat requests with proper headers
export async function chatRequest(body: {
  userId: string;
  message: string;
  sessionId?: string;
  employeeSlug?: string;
  stream?: boolean;
}) {
  const clientMessageId = (body as any).client_message_id || (typeof crypto !== 'undefined' && crypto.randomUUID ? `c_${crypto.randomUUID()}` : `c_${Date.now()}`);
  const payload = (body as any).client_message_id ? body : { ...body, client_message_id: clientMessageId };
  if (import.meta.env.DEV) {
    console.log('[CHAT SEND]', { client_message_id: clientMessageId, endpoint: CHAT_ENDPOINT });
  }
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  // Verify backend version
  verifyChatBackend(response);
  
  return response;
}
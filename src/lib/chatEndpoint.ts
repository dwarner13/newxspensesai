// Chat endpoint configuration and utilities

export const CHAT_ENDPOINT =
  import.meta.env.VITE_CHAT_ENDPOINT || "/.netlify/functions/chat";

if (typeof window !== 'undefined') {
  console.log('🔗 Chat Endpoint:', CHAT_ENDPOINT);
}

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
  mode?: 'strict' | 'balanced' | 'creative';
  versionFlag?: string;
}) {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  // Verify backend version
  verifyChatBackend(response);
  
  return response;
}
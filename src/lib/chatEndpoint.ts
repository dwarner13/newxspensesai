/**
 * Centralized Chat Endpoint Configuration
 * ========================================
 * All chat components MUST use this endpoint to ensure consistency
 * and make it easy to switch backends via environment variables.
 */

export const CHAT_ENDPOINT =
  import.meta.env.VITE_CHAT_ENDPOINT || "/.netlify/functions/chat";

// Log on import to verify correct endpoint is loaded
if (typeof window !== 'undefined') {
  console.log('🔗 Chat Endpoint:', CHAT_ENDPOINT);
}

/**
 * Verify backend version by checking response headers
 * Call this after making a chat request to ensure you're hitting v2
 */
export function verifyChatBackend(response: Response): boolean {
  const backendVersion = response.headers.get('X-Chat-Backend');
  const isV2 = backendVersion === 'v2';
  
  if (!isV2) {
    console.warn('⚠️  Expected X-Chat-Backend: v2, got:', backendVersion);
  } else {
    console.log('✅ Confirmed backend version:', backendVersion);
  }
  
  return isV2;
}


/**
 * Auth Verification Utility
 * 
 * Verifies JWT token from Authorization header and extracts userId.
 * For localhost development - validates Supabase JWT tokens.
 */

import { admin } from './supabase.js';

export interface AuthResult {
  userId: string;
  error?: string;
}

/**
 * Verify authentication from request headers
 * Extracts JWT from Authorization header and validates it
 * 
 * @param event - Netlify function event object
 * @returns AuthResult with userId or error
 */
export async function verifyAuth(event: any): Promise<AuthResult> {
  // Extract Authorization header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  
  if (!authHeader) {
    return { userId: '', error: 'Missing Authorization header' };
  }
  
  // Extract token (expects "Bearer <token>")
  if (!authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Invalid Authorization header format. Expected: Bearer <token>' };
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token) {
    return { userId: '', error: 'Missing token in Authorization header' };
  }
  
  try {
    const supabase = admin();
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('[verifyAuth] Token verification failed:', error.message);
      return { userId: '', error: `Invalid token: ${error.message}` };
    }
    
    if (!user || !user.id) {
      return { userId: '', error: 'User not found in token' };
    }
    
    // Return userId as text (matching profiles table id format)
    return { userId: user.id };
  } catch (error: any) {
    console.error('[verifyAuth] Unexpected error:', error);
    return { userId: '', error: `Auth verification failed: ${error.message || 'Unknown error'}` };
  }
}

/**
 * Get userId from request body (legacy support - for demo user)
 * Only use this if verifyAuth fails and you need demo user fallback
 * 
 * @param event - Netlify function event object
 * @returns userId from body or null
 */
export function getUserIdFromBody(event: any): string | null {
  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    return body?.userId || null;
  } catch {
    return null;
  }
}

















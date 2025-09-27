import * as jose from 'jose';
import { Result, Ok, Err } from '../types/result';
import { getSupabaseServerClient } from './db';

export interface AuthUser {
  id: string;
  email?: string;
  metadata?: Record<string, any>;
}

export async function validateJWT(token: string): Promise<Result<AuthUser>> {
  try {
    // Get Supabase JWT secret
    const secret = new TextEncoder().encode(
      process.env.SUPABASE_JWT_SECRET || 'your-jwt-secret'
    );
    
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: 'https://supabase.io',
      audience: 'authenticated',
    });
    
    if (!payload.sub) {
      return Err(new Error('Invalid token: no subject'));
    }
    
    return Ok({
      id: payload.sub,
      email: payload.email as string | undefined,
      metadata: payload.user_metadata as Record<string, any> | undefined,
    });
  } catch (error) {
    return Err(new Error(`JWT validation failed: ${error}`));
  }
}

export function extractToken(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Check cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...rest] = c.split('=');
        return [key, rest.join('=')];
      })
    );
    
    return cookies['sb-access-token'] || cookies['supabase-auth-token'] || null;
  }
  
  return null;
}

export async function requireAuth(request: Request): Promise<Result<AuthUser>> {
  const token = extractToken(request);
  
  if (!token) {
    return Err(new Error('No authentication token provided'));
  }
  
  return validateJWT(token);
}

export async function validateToken(event: any): Promise<string | null> {
  try {
    const token = extractToken(event);
    
    if (!token) {
      return null;
    }
    
    const result = await validateJWT(token);
    
    if (result.ok) {
      return result.value.id;
    }
    
    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Demo User Constants
 * Centralized demo user ID for consistent use across the application
 */

export const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

/**
 * Check if a user ID is the demo user
 */
export function isDemoUser(userId: string | null | undefined): boolean {
  return userId === DEMO_USER_ID || !userId;
}

/**
 * Get user ID, defaulting to demo user if null/undefined
 */
export function getUserId(userId: string | null | undefined): string {
  return userId || DEMO_USER_ID;
}











/**
 * Get the user ID with demo fallback
 * Returns session user ID if available, otherwise falls back to demo user ID
 */
export function getDemoUserId(session?: any): string {
  // If we have a real session, use that user ID
  if (session?.user?.id) {
    return session.user.id;
  }
  
  // Fall back to demo user ID from environment
  const demoUserId = import.meta.env.VITE_DEMO_USER_ID;
  if (demoUserId) {
    return demoUserId;
  }
  
  // Hardcoded fallback
  return "00000000-0000-4000-8000-000000000001";
}

/**
 * Check if the current user is a demo user
 */
export function isDemoUser(session?: any): boolean {
  return !session?.user?.id;
}
/**
 * Demo User Configuration
 * 
 * Use this for testing features before authentication is set up.
 * This user ID should be created in your Supabase database.
 */

export const DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-4000-8000-000000000001'

/**
 * Check if a user ID is the demo user
 */
export function isDemoUser(userId: string): boolean {
  return userId === DEMO_USER_ID
}

/**
 * Get user ID from request, falling back to demo user if not authenticated
 */
export function getUserIdOrDemo(event: any): string {
  // Try to get from auth header
  const authHeader = event.headers.authorization
  if (authHeader) {
    // Parse JWT and extract user ID (implement based on your auth)
    // For now, return from query params or body
  }
  
  // Try query params
  const userId = event.queryStringParameters?.userId
  if (userId && userId !== 'undefined') {
    return userId
  }
  
  // Try body
  if (event.body) {
    try {
      const body = JSON.parse(event.body)
      if (body.userId && body.userId !== 'undefined') {
        return body.userId
      }
    } catch (e) {
      // Invalid JSON, continue to demo user
    }
  }
  
  // Fallback to demo user
  console.log('⚠️ No authenticated user, using DEMO_USER_ID')
  return DEMO_USER_ID
}




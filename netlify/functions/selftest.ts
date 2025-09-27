import type { Handler } from '@netlify/functions';
import { getSupabaseServerClient } from '../../src/server/db';
import { isPrimeEnabled } from '../../src/env';

export const handler: Handler = async (event) => {
  // Check feature flag
  if (!isPrimeEnabled()) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Feature not enabled' }),
    };
  }
  
  const tests = {
    env: false,
    db: false,
    auth: false,
  };
  
  try {
    // Test environment variables
    tests.env = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test database connectivity
    if (tests.env) {
      const client = getSupabaseServerClient();
      const testId = `test_${Date.now()}`;
      
      // Insert test row
      const { error: insertError } = await client
        .from('audit_logs')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          agent_name: 'selftest',
          tool_id: 'connectivity_check',
          outcome: 'test',
          duration_ms: 0,
          metadata: { test_id: testId },
        });
      
      if (!insertError) {
        // Delete test row
        const { error: deleteError } = await client
          .from('audit_logs')
          .delete()
          .match({ 'metadata->test_id': testId });
        
        tests.db = !deleteError;
      }
    }
    
    // Test auth configuration
    tests.auth = !!(process.env.SUPABASE_JWT_SECRET);
    
    const allPassed = Object.values(tests).every(Boolean);
    
    return {
      statusCode: allPassed ? 200 : 500,
      body: JSON.stringify({
        ok: allPassed,
        tests,
        timestamp: new Date().toISOString(),
      }),
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        tests,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

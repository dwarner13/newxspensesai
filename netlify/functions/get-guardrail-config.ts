/**
 * Get Guardrail Configuration
 * ===========================
 * Retrieves user's guardrail configuration with defaults
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request
    const request = JSON.parse(event.body || '{}');
    const { userId } = request;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    // Get user's guardrail configuration
    const { data: config, error } = await supabase
      .from('user_guardrail_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Database error: ${error.message}`);
    }

    // Return configuration with defaults if not found
    const defaultConfig = {
      userId,
      piiDetection: true,        // Always on
      moderation: false,         // User configurable
      jailbreakProtection: true, // Always on
      hallucinationCheck: false, // User configurable
      piiEntities: ['credit_card', 'ssn', 'email', 'phone', 'bank_account'],
    };

    const userConfig = config ? {
      userId: config.user_id,
      piiDetection: config.pii_detection,
      moderation: config.moderation,
      jailbreakProtection: config.jailbreak_protection,
      hallucinationCheck: config.hallucination_check,
      piiEntities: config.pii_entities,
    } : defaultConfig;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(userConfig),
    };

  } catch (error) {
    const err = error as Error;
    console.error('Get guardrail config error:', err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: err.message,
      }),
    };
  }
};

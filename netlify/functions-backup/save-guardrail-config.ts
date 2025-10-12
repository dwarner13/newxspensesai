/**
 * Save Guardrail Configuration
 * ============================
 * Saves user's guardrail configuration
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
    const { userId, config } = request;

    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId required' }),
      };
    }

    if (!config || typeof config !== 'object') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'config required' }),
      };
    }

    // Validate PII entities
    if (!config.piiEntities || config.piiEntities.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one PII entity must be selected' }),
      };
    }

    // Ensure required PII entities are always included
    const requiredEntities = ['credit_card', 'us_ssn'];
    const piiEntities = [...new Set([...requiredEntities, ...config.piiEntities])];

    // Prepare data for database
    const dbConfig = {
      user_id: userId,
      pii_detection: true,        // Always true
      moderation: config.moderation || false,
      jailbreak_protection: true, // Always true
      hallucination_check: config.hallucinationCheck || false,
      pii_entities: piiEntities,
      updated_at: new Date().toISOString(),
    };

    // Upsert configuration
    const { data, error } = await supabase
      .from('user_guardrail_config')
      .upsert(dbConfig, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        config: {
          userId: data.user_id,
          piiDetection: data.pii_detection,
          moderation: data.moderation,
          jailbreakProtection: data.jailbreak_protection,
          hallucinationCheck: data.hallucination_check,
          piiEntities: data.pii_entities,
        },
      }),
    };

  } catch (error) {
    const err = error as Error;
    console.error('Save guardrail config error:', err);

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

import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'

/**
 * Get user's guardrail configuration
 * 
 * GET /.netlify/functions/guardrail-config-get?userId=<uuid>
 * 
 * Returns:
 * {
 *   preset: 'strict' | 'balanced' | 'creative',
 *   pii_enabled: boolean,
 *   moderation_enabled: boolean,
 *   jailbreak_enabled: boolean,
 *   hallucination_enabled: boolean
 * }
 */
export const handler: Handler = async (event) => {
  // CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const userId = event.queryStringParameters?.userId
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId required' })
      }
    }

    // Call Supabase function to get config (with defaults)
    const { data, error } = await supabaseAdmin
      .rpc('get_user_guardrail_config', { p_user_id: userId })

    if (error) throw error

    const config = data?.[0] || {
      preset: 'balanced',
      pii_enabled: true,
      moderation_enabled: true,
      jailbreak_enabled: true,
      hallucination_enabled: false
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(config)
    }
  } catch (error: any) {
    console.error('[Guardrail Config Get Error]', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to get config' })
    }
  }
}


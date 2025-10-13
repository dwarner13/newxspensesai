import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'

/**
 * Save user's guardrail configuration
 * 
 * POST /.netlify/functions/guardrail-config-save
 * Body:
 * {
 *   userId: string,
 *   preset: 'strict' | 'balanced' | 'creative',
 *   pii_enabled?: boolean,
 *   moderation_enabled?: boolean,
 *   jailbreak_enabled?: boolean,
 *   hallucination_enabled?: boolean
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const {
      userId,
      preset,
      pii_enabled,
      moderation_enabled,
      jailbreak_enabled,
      hallucination_enabled
    } = body

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'userId required' })
      }
    }

    if (preset && !['strict', 'balanced', 'creative'].includes(preset)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid preset. Must be strict, balanced, or creative' })
      }
    }

    // Upsert preferences
    const { data, error } = await supabaseAdmin
      .from('user_guardrail_preferences')
      .upsert({
        user_id: userId,
        preset: preset || 'balanced',
        pii_enabled,
        moderation_enabled,
        jailbreak_enabled,
        hallucination_enabled,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) throw error

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        config: data
      })
    }
  } catch (error: any) {
    console.error('[Guardrail Config Save Error]', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to save config' })
    }
  }
}


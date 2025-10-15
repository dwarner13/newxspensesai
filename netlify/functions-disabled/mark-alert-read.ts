import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'

export const handler: Handler = async (event) => {
  // Handle CORS preflight
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
    const { alertId, userId } = JSON.parse(event.body || '{}')
    
    if (!alertId || !userId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'alertId and userId required' })
      }
    }

    const { error } = await supabaseAdmin
      .from('sync_events')
      .update({ read: true })
      .eq('id', alertId)
      .eq('user_id', userId)

    if (error) throw error

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true })
    }
  } catch (err: any) {
    console.error('mark_alert_read_error', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'mark_read_failed' })
    }
  }
}





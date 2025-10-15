import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'

function rangeToHours(r?: string) {
  if (r === '7d') return 24 * 7
  return 24 // default 24h
}

export const handler: Handler = async (event) => {
  // Handle CORS preflight
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

  const range = event.queryStringParameters?.range || '24h'
  const hours = rangeToHours(range)

  try {
    const { data, error } = await supabaseAdmin.rpc('metrics_summary', { p_hours: hours })
    
    if (error) {
      console.error('metrics_summary_error', error)
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'metrics_summary_failed' })
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ hours, data })
    }
  } catch (err: any) {
    console.error('metrics_summary_error', err)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'metrics_summary_failed', detail: String(err?.message || err) })
    }
  }
}





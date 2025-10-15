import type { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'

/**
 * Get guardrail metrics summary
 * 
 * GET /.netlify/functions/guardrail-metrics?userId=<uuid>&hours=<number>
 * 
 * Returns summary of guardrail events:
 * - Total checks by stage (ingestion, chat, ocr)
 * - Block rates
 * - PII detections
 * - Moderation flags
 * - Jailbreak detections
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
    const userId = event.queryStringParameters?.userId || null
    const hours = parseInt(event.queryStringParameters?.hours || '24', 10)

    // Call summary function
    const { data, error } = await supabaseAdmin
      .rpc('guardrail_summary', {
        p_user_id: userId,
        p_hours: hours
      })

    if (error) throw error

    // Calculate totals
    const totals = {
      total_checks: 0,
      blocked_count: 0,
      pii_detections: 0,
      moderation_flags: 0,
      jailbreak_detections: 0
    }

    const byStage = data || []
    byStage.forEach((stage: any) => {
      totals.total_checks += parseInt(stage.total_checks, 10)
      totals.blocked_count += parseInt(stage.blocked_count, 10)
      totals.pii_detections += parseInt(stage.pii_detections, 10)
      totals.moderation_flags += parseInt(stage.moderation_flags, 10)
      totals.jailbreak_detections += parseInt(stage.jailbreak_detections, 10)
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        hours,
        totals,
        by_stage: byStage
      })
    }
  } catch (error: any) {
    console.error('[Guardrail Metrics Error]', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Failed to get metrics' })
    }
  }
}


import { supabaseAdmin } from '../supabase'

const PER_MINUTE = 8

export async function checkAndIncrementRate(user_id: string) {
  const { data: win } = await supabaseAdmin.rpc('current_minute')
  const window_start = win as string

  // Try to insert a new window row (count = 1); if exists, increment
  const { error: insErr } = await supabaseAdmin
    .from('chat_rate_limits')
    .insert([{ user_id, window_start, count: 1 }])
  
  if (insErr && !String(insErr.message).includes('duplicate key')) {
    throw insErr
  }
  
  if (insErr && String(insErr.message).includes('duplicate key')) {
    const { data: up, error: upErr } = await supabaseAdmin
      .rpc('increment_rate_limit', { p_user_id: user_id, p_window_start: window_start })
    if (upErr) throw upErr
    
    if ((up as any)?.count > PER_MINUTE) {
      const remaining = 60 // seconds (roughly) until next minute
      const e = new Error('rate_limited') as any
      e.retryAfter = remaining
      throw e
    }
  }
}





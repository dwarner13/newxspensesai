import { supabaseAdmin } from '../supabase'

type MetricBase = {
  user_id: string
  employee_slug: string
  model: string
}

export function nowMs() { return Date.now() }

export function startMetricTimer(base: MetricBase & { prompt_chars: number }) {
  const startedAt = nowMs()
  const prompt_tokens_est = Math.ceil((base.prompt_chars || 0) / 4)

  async function end(ok: boolean, extra: {
    completion_chars?: number
    error_code?: string
    latency_override_ms?: number
  } = {}) {
    const latency_ms = extra.latency_override_ms ?? (nowMs() - startedAt)
    const completion_chars = extra.completion_chars ?? 0
    const completion_tokens_est = Math.ceil((completion_chars || 0) / 4)

    const payload = {
      user_id: base.user_id,
      employee_slug: base.employee_slug,
      model: base.model,
      latency_ms,
      prompt_chars: base.prompt_chars,
      completion_chars,
      prompt_tokens_est,
      completion_tokens_est,
      success: ok,
      error_code: ok ? null : (extra.error_code || 'unknown'),
    }

    const { error } = await supabaseAdmin.from('xai_chat_metrics').insert([payload])
    if (error) {
      // Don't crash chat on metrics failure; just log.
      console.error('metrics_insert_failed', error)
    }
  }

  return { end }
}





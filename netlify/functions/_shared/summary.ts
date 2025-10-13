import { supabaseAdmin } from '../supabase'
import { openai, CHAT_MODEL } from './openai'

type Turn = { role: 'user'|'assistant'; content: string }

export async function getSummary(user_id: string, convo_id: string) {
  const { data, error } = await supabaseAdmin
    .from('chat_convo_summaries')
    .select('summary')
    .eq('user_id', user_id)
    .eq('convo_id', convo_id)
    .maybeSingle()
  if (error) throw error
  return data?.summary || ''
}

export async function saveSummary(user_id: string, convo_id: string, summary: string) {
  const { error } = await supabaseAdmin
    .from('chat_convo_summaries')
    .upsert({ 
      user_id, 
      convo_id, 
      summary, 
      updated_at: new Date().toISOString() 
    })
  if (error) throw error
}

export async function rollSummary({
  user_id, 
  convo_id, 
  prevSummary, 
  lastTurns
}: {
  user_id: string
  convo_id: string
  prevSummary: string
  lastTurns: Turn[]
}) {
  const prompt = [
    { 
      role: 'system' as const, 
      content: 'Maintain a compact running summary (<150 words), factual, reusable, no fluff.' 
    },
    { 
      role: 'user' as const, 
      content:
`Previous summary:
"""${prevSummary || '(empty)'}"""

New turns (latest last):
${lastTurns.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}

Update the summary under 150 words, focusing on stable facts, goals, preferences, and active tasks.`
    }
  ]

  const resp = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    messages: prompt
  })
  return resp.choices[0]?.message?.content?.trim() || prevSummary
}


import type { Handler } from '@netlify/functions'
import { PassThrough } from 'stream'
import { createHash } from 'crypto'
import { openai, CHAT_MODEL } from './_shared/openai'
import { supabaseAdmin } from './supabase'
import { saveMessage, saveFact } from './_shared/memory'
import { routeToEmployee } from './_shared/router'
import { checkAndIncrementRate } from './_shared/limits'
import { startMetricTimer } from './_shared/metrics'
import { buildContext } from './_shared/context'
import { sanitizeUserInput } from './_shared/guards'
import { withBackoff, withTimeout } from './_shared/retry'
import { getSummary, rollSummary, saveSummary } from './_shared/summary'
import { applyGuardrails, GUARDRAIL_PRESETS, logGuardrailEvent } from './_shared/guardrails'

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

  const { userId, messages, employee, convoId } = JSON.parse(event.body || '{}')
  if (!userId || !Array.isArray(messages) || messages.length === 0 || !convoId) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'bad_request', message: 'userId, messages, and convoId are required' }) 
    }
  }

  // Check rate limit
  try {
    await checkAndIncrementRate(userId)
  } catch (rateLimitErr: any) {
    if (rateLimitErr.message === 'rate_limited') {
      return {
        statusCode: 429,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Retry-After': String(rateLimitErr.retryAfter || 60)
        },
        body: JSON.stringify({ 
          error: 'rate_limited', 
          retryAfter: rateLimitErr.retryAfter || 60 
        })
      }
    }
    // If rate limit check fails for other reasons, log but continue
    console.log('Rate limit check failed:', rateLimitErr)
  }

  const stream = new PassThrough()
  const headers = {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  }

  // Start metrics timer
  const promptChars = messages.map(m => (m.content || '')).join('\n').length
  const metric = startMetricTimer({
    user_id: userId,
    employee_slug: employee ?? 'prime-boss',
    model: CHAT_MODEL,
    prompt_chars: promptChars,
  })

  // Start async work without blocking return
  ;(async () => {
    try {
      // ✅ APPLY GUARDRAILS (Balanced Preset for Chat)
      const last = messages[messages.length - 1]
      const originalContent = last.content || ''
      
      const guardrailResult = await applyGuardrails(
        originalContent,
        GUARDRAIL_PRESETS.balanced,  // Balanced: PII + moderation + jailbreak, but don't block
        userId
      )

      // Log guardrail event
      const inputHash = createHash('sha256').update(originalContent).digest('hex')
      await logGuardrailEvent({
        user_id: userId,
        stage: 'chat',
        preset: 'balanced',
        outcome: guardrailResult,
        input_hash: inputHash
      })

      // If blocked (e.g., severe moderation violation)
      if (!guardrailResult.ok) {
        stream.write(`event: error\ndata: ${JSON.stringify({ 
          message: 'Message blocked by safety policy',
          reasons: guardrailResult.reasons 
        })}\n\n`)
        stream.end()
        await metric.end(false, { error_code: 'guardrails_block' })
        return
      }

      // Use redacted content (PII masked)
      const safeContent = guardrailResult.redacted || originalContent
      last.content = sanitizeUserInput(safeContent, 8000)
      
      // Notify user if PII was found (optional, don't leak what was found)
      if (guardrailResult.signals?.piiFound) {
        console.log('[Chat] PII detected and redacted:', guardrailResult.signals.piiTypes)
        stream.write(`data: ${JSON.stringify({ 
          type: 'note', 
          note: 'Sensitive information detected and protected' 
        })}\n\n`)
      }
      
      const userMsgId = await saveMessage(userId, 'user', last.content, employee || 'prime-boss')

      // Get recent context
      let recalls: any[] = []
      try {
        const { data: recentMessages } = await supabaseAdmin
          .from('chat_messages')
          .select('content, role')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(6)
        
        recalls = (recentMessages || [])
          .reverse()
          .slice(0, 4)
          .map(m => ({ text: `${m.role}: ${m.content}` }))
      } catch (error) {
        console.log("Memory lookup failed:", error)
      }

      const target = routeToEmployee(employee ?? null, messages, recalls)

      // Load conversation summary for additional context
      const priorSummary = await getSummary(userId, conversationId)

      // Build context with token budget management
      const ctx = buildContext({
        systemPrompts: [
          target.systemPrompt,
          priorSummary ? `Conversation summary (for context): ${priorSummary}` : ''
        ].filter(Boolean),
        recalls: recalls.map(r => r.text),
        messages,
        maxTokens: 6000,
        reserveForAnswer: 1500
      })

      stream.write('retry: 1000\n\n')
      stream.write(`data: ${JSON.stringify({ type: 'employee', employee: target.slug })}\n\n`)

      // Notify user if context was trimmed
      if (ctx.overLimit) {
        console.log('Context trimmed: messages exceeded token budget')
        stream.write(`data: ${JSON.stringify({ type: 'note', note: 'Long conversation trimmed for speed' })}\n\n`)
      }

      let fullText = ''
      
      // Use retry logic with timeout for reliability
      const completion = await withTimeout(
        withBackoff(() => openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.3,
          stream: true,
          messages: [...ctx.system, ...ctx.history],
        })),
        25000 // 25s hard cap
      )

      for await (const part of completion) {
        const token = part.choices?.[0]?.delta?.content ?? ''
        if (token) {
          fullText += token
          stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
        }
      }

      const aiMsgId = await saveMessage(userId, 'assistant', fullText, target.slug)

      // Record success metric
      await metric.end(true, { completion_chars: fullText.length })

      // Extract facts (fire and forget)
      try {
        const toolResp = await openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0,
          messages: [
            { role: 'system', content: 'Extract max 2 crisp user facts as JSON: {"facts": ["fact1", "fact2"]}' },
            { role: 'user', content: fullText }
          ],
          response_format: { type: 'json_object' }
        })
        const raw = toolResp.choices[0]?.message?.content ?? '{"facts":[]}'
        const parsed = JSON.parse(raw || '{"facts":[]}')
        const facts: string[] = Array.isArray(parsed.facts) ? parsed.facts : []
        for (const f of facts) {
          if (typeof f === 'string' && f.trim().length > 5) {
            await saveFact(userId, f.trim(), aiMsgId)
          }
        }
      } catch (factErr) {
        console.log('Fact extraction failed:', factErr)
      }

      // Roll and save conversation summary (async, don't block stream)
      // Use last 3 messages + current assistant response
      const tail = messages.slice(-3).concat([{ role: 'assistant' as const, content: fullText }])
      rollSummary({ 
        user_id: userId, 
        convo_id: conversationId, 
        prevSummary: priorSummary, 
        lastTurns: tail 
      })
        .then(newSummary => saveSummary(userId, conversationId, newSummary))
        .catch(err => console.log('Summary generation failed:', err))

      stream.write(`data: ${JSON.stringify({ type: 'done', employee: target.slug })}\n\n`)
    } catch (err: any) {
      console.error('chat_stream_error', err)
      
      // Record error metric
      await metric.end(false, { error_code: String(err?.message || err) })
      
      stream.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`)
    } finally {
      stream.end()
    }
  })()

  // @ts-ignore Netlify accepts stream body in v1 handlers
  return { statusCode: 200, headers, body: stream }
}

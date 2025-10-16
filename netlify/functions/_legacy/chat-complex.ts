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
import { runGuardrails, getGuardrailConfig } from './_shared/guardrails-production'
import { OPENAI_TOOLS } from './_shared/tool-schemas'
import { executeTool } from './_shared/tool-executor'

export const handler: Handler = async (event) => {
  // Set function timeout to prevent 502 errors
  const timeoutId = setTimeout(() => {
    console.error('Function timeout - returning 502');
  }, 9000); // 9 seconds (Netlify limit is 10s)

  try {
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

  // Process the chat request
  try {
      console.log('Starting chat processing for user:', userId);
      
      // ✅ APPLY GUARDRAILS (Balanced Preset for Chat)
      const last = messages[messages.length - 1]
      const originalContent = last.content || ''
      
      const cfg = await getGuardrailConfig(userId)
      const guardrailResult = await runGuardrails(
        originalContent,
        userId,
        'chat',
        cfg
      )

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
      const safeContent = guardrailResult.text || originalContent
      last.content = sanitizeUserInput(safeContent, 8000)
      
      // Notify user if PII was found (optional, don't leak what was found)
      if (guardrailResult.signals?.pii) {
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
      const priorSummary = await getSummary(userId, convoId)

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
      let toolCalls: any[] = []
      
      // Use retry logic with timeout for reliability
      const completion = await withTimeout(
        withBackoff(() => openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.3,
          stream: true,
          messages: [...ctx.system, ...ctx.history],
          tools: OPENAI_TOOLS,  // ✅ Enable tool calling
          tool_choice: 'auto'
        })),
        25000 // 25s hard cap
      )

      for await (const part of completion) {
        const token = part.choices?.[0]?.delta?.content ?? ''
        if (token) {
          fullText += token
          stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
        }
        
        // ✅ Detect tool calls
        const toolCallDeltas = part.choices?.[0]?.delta?.tool_calls
        if (toolCallDeltas) {
          for (const tc of toolCallDeltas) {
            if (!toolCalls[tc.index]) {
              toolCalls[tc.index] = {
                id: tc.id || `call_${Date.now()}`,
                type: 'function',
                function: { name: '', arguments: '' }
              }
            }
            if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name
            if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments
          }
        }
      }

      // ✅ Execute tool calls if any
      if (toolCalls.length > 0) {
        stream.write(`data: ${JSON.stringify({ type: 'note', note: 'Using tools...' })}\n\n`)
        
        const toolMessages: any[] = []
        
        for (const toolCall of toolCalls) {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}')
          
          stream.write(`data: ${JSON.stringify({ type: 'tool_start', tool: toolName })}\n\n`)
          
          const toolResult = await executeTool(toolName as any, toolArgs, { 
            userId, 
            baseUrl: process.env.URL || 'http://localhost:8888' 
          })
          
          if (toolResult.ok) {
            stream.write(`data: ${JSON.stringify({ type: 'tool_result', tool: toolName, summary: 'Success' })}\n\n`)
            toolMessages.push({
              role: 'tool',
              content: JSON.stringify(toolResult.result),
              tool_call_id: toolCall.id
            })
          } else {
            stream.write(`data: ${JSON.stringify({ type: 'tool_error', tool: toolName, error: toolResult.error })}\n\n`)
            toolMessages.push({
              role: 'tool',
              content: JSON.stringify({ error: toolResult.error }),
              tool_call_id: toolCall.id
            })
          }
        }
        
        // Resume model with tool results
        const finalCompletion = await openai.chat.completions.create({
          model: CHAT_MODEL,
          temperature: 0.3,
          stream: true,
          messages: [
            ...ctx.system,
            ...ctx.history,
            { role: 'assistant', content: fullText || null, tool_calls: toolCalls },
            ...toolMessages
          ]
        })
        
        fullText = ''  // Reset for final answer
        for await (const part of finalCompletion) {
          const token = part.choices?.[0]?.delta?.content ?? ''
          if (token) {
            fullText += token
            stream.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)
          }
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
        convo_id: convoId, 
        prevSummary: priorSummary, 
        lastTurns: tail 
      })
        .then(newSummary => saveSummary(userId, convoId, newSummary))
        .catch(err => console.log('Summary generation failed:', err))

      stream.write(`data: ${JSON.stringify({ type: 'done', employee: target.slug })}\n\n`)
  } catch (err: any) {
    console.error('chat_stream_error', err)
    
    // Record error metric
    await metric.end(false, { error_code: String(err?.message || err) })
    
    stream.write(`event: error\ndata: ${JSON.stringify({ message: String(err?.message || err) })}\n\n`)
    stream.end()
  }

    // Clear timeout and return stream
    clearTimeout(timeoutId);
    // @ts-ignore Netlify accepts stream body in v1 handlers
    return { statusCode: 200, headers, body: stream }
  } catch (error) {
    console.error('Chat function error:', error);
    clearTimeout(timeoutId);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}

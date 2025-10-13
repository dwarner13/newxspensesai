import type { Handler } from '@netlify/functions'
import { openai } from './_shared/openai'
import { supabaseAdmin } from './supabase'
import { saveMessage, saveFact } from './_shared/memory'
import { routeToEmployee } from './_shared/router'

const CHAT_MODEL = 'gpt-4o-mini'

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

  try {
    const { userId, messages, employee } = JSON.parse(event.body || '{}')
    
    if (!userId || !Array.isArray(messages) || messages.length === 0) {
      return { 
        statusCode: 400,
        body: JSON.stringify({ error: 'bad_request' }) 
      }
    }

    // 1) Save user message
    const userMsg = messages[messages.length - 1]
    await saveMessage(userId, 'user', userMsg.content, employee || 'prime-boss')

    // 2) Get context
    let recalls: any[] = []
    try {
      const { data } = await supabaseAdmin
        .from('chat_messages')
        .select('content, role')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6)
      
      recalls = (data || [])
        .reverse()
        .slice(0, 4)
        .map(m => ({ text: `${m.role}: ${m.content}` }))
    } catch (error) {
      console.log("Memory lookup failed:", error)
    }

    // 3) Route
    const target = routeToEmployee(employee ?? null, messages, recalls)

    // 4) Stream from OpenAI and collect
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.3,
      stream: true,
      messages: [
        { role: 'system', content: target.systemPrompt },
        ...recalls.map(r => ({ role: 'system' as const, content: r.text })),
        ...messages
      ]
    })

    let fullText = ''
    const eventData: string[] = []
    
    // Build SSE response
    eventData.push('event: start\n')
    eventData.push(`data: ${JSON.stringify({ employee: target.slug })}\n\n`)

    for await (const part of completion) {
      const token = part.choices?.[0]?.delta?.content ?? ''
      if (token) {
        fullText += token
        eventData.push('event: token\n')
        eventData.push(`data: ${JSON.stringify({ token })}\n\n`)
      }
    }

    eventData.push('event: done\n')
    eventData.push(`data: ${JSON.stringify({ employee: target.slug })}\n\n`)

    // 5) Save response
    await saveMessage(userId, 'assistant', fullText, target.slug)

    // 6) Extract facts (async, don't wait)
    extractFacts(userId, fullText, target.slug).catch(e => console.log('Fact extraction failed:', e))

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      },
      body: eventData.join('')
    }
  } catch (err: any) {
    console.error('chat_sse_error', err)
    return { 
      statusCode: 500,
      body: JSON.stringify({ error: 'chat_failed' }) 
    }
  }
}

async function extractFacts(userId: string, text: string, messageId: string) {
  // Background fact extraction - fire and forget
  const resp = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: 'Extract max 2 user facts as JSON: {"facts": [...]}' },
      { role: 'user', content: text }
    ],
    response_format: { type: 'json_object' }
  })
  
  const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{"facts":[]}')
  const facts = Array.isArray(parsed.facts) ? parsed.facts : []
  
  for (const f of facts) {
    if (typeof f === 'string' && f.trim().length > 5) {
      await saveFact(userId, f.trim(), messageId)
    }
  }
}




